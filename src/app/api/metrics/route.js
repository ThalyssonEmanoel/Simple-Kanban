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

    // Run all read queries in parallel — they're independent.
    const [columns, cardGroups, members] = await Promise.all([
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
      prisma.projectMember.findMany({
        where: { projectId },
        select: {
          role: true,
          user: { select: { id: true, name: true, image: true } },
        },
      }),
    ]);

    const doneColumnIds = columns
      .filter((c) => c.name === "Finalizadas" || c.name === "Done")
      .map((c) => c.id);
    const todoColumnIds = columns
      .filter((c) => c.name === "A fazer" || c.name === "To Do")
      .map((c) => c.id);

    const memberIds = members.map((m) => m.user.id);

    const [completedCount, todoCount, notFinishedCount, perMemberTotal, perMemberDone] = await Promise.all([
      doneColumnIds.length > 0
        ? prisma.card.count({
            where: {
              columnId: { in: doneColumnIds },
              updatedAt: { gte: startDate },
              archived: false,
            },
          })
        : Promise.resolve(0),
      todoColumnIds.length > 0
        ? prisma.card.count({
            where: { columnId: { in: todoColumnIds }, archived: false },
          })
        : Promise.resolve(0),
      prisma.card.count({
        where: {
          column: { projectId },
          archived: false,
          ...(doneColumnIds.length > 0 ? { columnId: { notIn: doneColumnIds } } : {}),
        },
      }),
      // Cards per member (legacy single-assignee relation, matching prior semantics).
      memberIds.length > 0
        ? prisma.card.groupBy({
            by: ["assigneeId"],
            where: {
              assigneeId: { in: memberIds },
              column: { projectId },
              archived: false,
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      memberIds.length > 0 && doneColumnIds.length > 0
        ? prisma.card.groupBy({
            by: ["assigneeId"],
            where: {
              assigneeId: { in: memberIds },
              column: { projectId },
              archived: false,
              columnId: { in: doneColumnIds },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const totalByUser = new Map(perMemberTotal.map((g) => [g.assigneeId, g._count._all]));
    const doneByUser = new Map(perMemberDone.map((g) => [g.assigneeId, g._count._all]));

    const memberStats = members.map((m) => {
      const total = totalByUser.get(m.user.id) ?? 0;
      const done = doneByUser.get(m.user.id) ?? 0;
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

    const columnStats = buildColumnStats(columns, cardGroups);

    return NextResponse.json({
      completedCount,
      todoCount,
      notFinishedCount,
      memberStats,
      columnStats,
      period,
      currentUserRole,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
