import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const period = searchParams.get("period") || "week";

    if (!projectId) {
      return NextResponse.json({ error: "projectId é obrigatório" }, { status: 400 });
    }

    await requireProjectAccess(user.id, projectId);

    const now = new Date();
    let startDate;
    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Tasks completed in period
    const doneColumn = await prisma.column.findFirst({
      where: { projectId, name: "Done" },
    });

    const completedCards = doneColumn
      ? await prisma.card.findMany({
          where: {
            columnId: doneColumn.id,
            updatedAt: { gte: startDate },
          },
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            activityLogs: {
              where: { action: "CARD_MOVED" },
              orderBy: { createdAt: "asc" },
            },
          },
        })
      : [];

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
      const done = cards.filter((c) => c.column.name === "Done").length;
      const inProgress = cards.filter((c) => c.column.name === "Doing").length;
      const total = cards.length;

      return {
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
        role: m.role,
        total,
        done,
        inProgress,
        todo: total - done - inProgress,
      };
    });

    // Lead time calculation (average time from creation to Done)
    let avgLeadTime = 0;
    if (completedCards.length > 0) {
      const leadTimes = completedCards.map((card) => {
        const createdAt = new Date(card.createdAt);
        const completedAt = new Date(card.updatedAt);
        return (completedAt - createdAt) / (1000 * 60 * 60); // hours
      });
      avgLeadTime = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
    }

    // Column distribution
    const columns = await prisma.column.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        _count: { select: { cards: true } },
      },
    });

    const columnStats = columns.map((col) => ({
      name: col.name,
      count: col._count.cards,
    }));

    // Overdue cards
    const overdueCards = await prisma.card.count({
      where: {
        column: { projectId },
        archived: false,
        dueDate: { lt: now },
        column: { name: { not: "Done" } },
      },
    });

    return NextResponse.json({
      completedCount: completedCards.length,
      avgLeadTimeHours: Math.round(avgLeadTime * 10) / 10,
      memberStats,
      columnStats,
      overdueCards,
      period,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
