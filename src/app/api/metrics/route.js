import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/auth";
import { buildColumnStats } from "@/lib/metrics";

export async function GET(request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const period = searchParams.get("period") || "week";

    if (!projectId) {
      return NextResponse.json({ error: "projectId é obrigatório" }, { status: 400 });
    }

    const currentUserRole = await requireProjectAccess(user.id, projectId);

    const now = new Date();
    let startDate;
    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Tasks completed in period (supports both old "Done" and new "Finalizadas")
    const doneColumn = await prisma.column.findFirst({
      where: { projectId, name: { in: ["Finalizadas", "Done"] } },
    });

    const completedCards = doneColumn
      ? await prisma.card.findMany({
          where: {
            columnId: doneColumn.id,
            updatedAt: { gte: startDate },
            archived: false,
          },
        })
      : [];

    // Tasks in "A fazer" / "To Do" column
    const todoColumn = await prisma.column.findFirst({
      where: { projectId, name: { in: ["A fazer", "To Do"] } },
    });

    const todoCount = todoColumn
      ? await prisma.card.count({
          where: { columnId: todoColumn.id, archived: false },
        })
      : 0;

    // Tasks not finished (all cards NOT in "Finalizadas"/"Done")
    const doneColumnIds = await prisma.column.findMany({
      where: { projectId, name: { in: ["Finalizadas", "Done"] } },
      select: { id: true },
    });
    const doneIds = doneColumnIds.map((c) => c.id);

    const notFinishedCount = await prisma.card.count({
      where: {
        column: { projectId },
        archived: false,
        ...(doneIds.length > 0 ? { columnId: { notIn: doneIds } } : {}),
      },
    });

    // Tasks per member
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            assignedCards: {
              where: {
                column: { projectId },
                archived: false,
              },
              include: { column: { select: { name: true } } },
            },
          },
        },
      },
    });

    const memberStats = members.map((m) => {
      const cards = m.user.assignedCards;
      const done = cards.filter((c) => c.column.name === "Finalizadas" || c.column.name === "Done").length;
      const total = cards.length;

      return {
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
        role: m.role,
        total,
        done,
        todo: total - done,
      };
    });

    // Column distribution — archived cards must NOT be counted.
    // Two-query pattern: fetch columns in order, then groupBy cards where archived = false.
    const [columns, cardGroups] = await Promise.all([
      prisma.column.findMany({
        where: { projectId },
        orderBy: { position: "asc" },
        select: { id: true, name: true },
      }),
      prisma.card.groupBy({
        by: ["columnId"],
        where: { column: { projectId }, archived: false },
        _count: { _all: true },
      }),
    ]);

    const columnStats = buildColumnStats(columns, cardGroups);

    return NextResponse.json({
      completedCount: completedCards.length,
      todoCount,
      notFinishedCount,
      memberStats,
      columnStats,
      period,
      // New field (additive, backward-compatible). Lets the UI gate leader-only
      // controls. Backend role checks are still enforced independently.
      currentUserRole,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
