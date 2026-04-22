import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const user = await requireUser();
    const {
      title,
      description,
      priority,
      dueDate,
      reminderDate,
      columnId,
      assigneeId,
      assigneeIds,
      projectId,
    } = await request.json();

    await requireProjectAccess(user.id, projectId);

    if (!title?.trim()) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }

    const maxPosition = await prisma.card.aggregate({
      where: { columnId },
      _max: { position: true },
    });

    // Normalize assignee input: prefer assigneeIds (array); fall back to legacy assigneeId
    const normalizedAssigneeIds = Array.isArray(assigneeIds)
      ? [...new Set(assigneeIds.filter(Boolean))]
      : assigneeId
        ? [assigneeId]
        : [];

    const primaryAssigneeId = normalizedAssigneeIds[0] || null;

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
        assigneeId: primaryAssigneeId,
        assignees: {
          create: normalizedAssigneeIds.map((uid) => ({ userId: uid })),
        },
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "CARD_CREATED",
        details: `Cartão "${card.title}" criado`,
        cardId: card.id,
        userId: user.id,
      },
    });

    // Notify every assignee (except self)
    const notifyIds = normalizedAssigneeIds.filter((uid) => uid !== user.id);
    if (notifyIds.length > 0) {
      await prisma.notification.createMany({
        data: notifyIds.map((uid) => ({
          type: "ASSIGNED",
          message: `${user.name} atribuiu a tarefa "${card.title}" a você`,
          userId: uid,
          cardId: card.id,
        })),
      });
    }

    return NextResponse.json(card, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar cartão" }, { status: 500 });
  }
}
