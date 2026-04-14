import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/auth";

export async function POST(request) {
  try {
    const user = await requireUser();
    const { title, description, priority, dueDate, reminderDate, columnId, assigneeId, projectId } =
      await request.json();

    await requireProjectAccess(user.id, projectId);

    if (!title?.trim()) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }

    const maxPosition = await prisma.card.aggregate({
      where: { columnId },
      _max: { position: true },
    });

    const card = await prisma.card.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        position: (maxPosition._max.position ?? -1) + 1,
        columnId,
        creatorId: user.id,
        assigneeId: assigneeId || null,
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CARD_CREATED",
        details: `Cartão "${card.title}" criado`,
        cardId: card.id,
        userId: user.id,
      },
    });

    // Notify assignee
    if (assigneeId && assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          type: "ASSIGNED",
          message: `${user.name} atribuiu a tarefa "${card.title}" a você`,
          userId: assigneeId,
          cardId: card.id,
        },
      });
    }

    return NextResponse.json(card, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar cartão" }, { status: 500 });
  }
}
