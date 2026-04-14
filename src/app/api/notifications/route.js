import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    // Check for reminder notifications that need to be created
    const now = new Date();
    const cardsWithReminder = await prisma.card.findMany({
      where: {
        reminderDate: { lte: now },
        archived: false,
        OR: [
          { assigneeId: user.id },
          { creatorId: user.id },
        ],
      },
      include: {
        column: { select: { name: true } },
      },
    });

    for (const card of cardsWithReminder) {
      if (card.column.name === "Finalizadas" || card.column.name === "Done") continue;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          cardId: card.id,
          type: "REMINDER",
        },
      });

      if (!existing) {
        const dueDateStr = card.dueDate
          ? new Date(card.dueDate).toLocaleDateString("pt-BR")
          : "";
        await prisma.notification.create({
          data: {
            type: "REMINDER",
            message: `Lembrete: a tarefa "${card.title}" tem prazo até ${dueDateStr}`,
            userId: user.id,
            cardId: card.id,
          },
        });
      }
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        card: { select: { id: true, title: true, column: { select: { projectId: true } } } },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request) {
  try {
    const user = await requireUser();
    const { notificationId, readAll } = await request.json();

    if (readAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: user.id },
        data: { read: true },
      });
    }

    return NextResponse.json({ message: "Atualizado" });
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
