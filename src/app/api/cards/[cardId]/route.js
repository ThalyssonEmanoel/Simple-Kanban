import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, getUserRole } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const user = await requireUser();
    const { cardId } = await params;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { include: { project: { select: { id: true } } } },
        creator: { select: { id: true, name: true, image: true, email: true } },
        assignee: { select: { id: true, name: true, image: true, email: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          include: {
            uploader: { select: { id: true, name: true } },
          },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    return NextResponse.json(card);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireUser();
    const { cardId } = await params;
    const data = await request.json();

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { include: { project: true } } },
    });

    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    const projectId = card.column.projectId;
    const role = await getUserRole(user.id, projectId);

    if (!role) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Members can only edit their own cards
    if (role === "MEMBER" && card.assigneeId !== user.id && card.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Você só pode editar cartões atribuídos a você" },
        { status: 403 }
      );
    }

    const updateData = {};
    const logDetails = [];

    if (data.title !== undefined) {
      updateData.title = data.title.trim();
      logDetails.push("título atualizado");
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
      logDetails.push("descrição atualizada");
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
      logDetails.push(`prioridade alterada para ${data.priority}`);
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      logDetails.push("prazo atualizado");
    }
    if (data.assigneeId !== undefined) {
      updateData.assigneeId = data.assigneeId || null;
      logDetails.push("responsável alterado");

      if (data.assigneeId && data.assigneeId !== user.id) {
        await prisma.notification.create({
          data: {
            type: "ASSIGNED",
            message: `${user.name} atribuiu a tarefa "${card.title}" a você`,
            userId: data.assigneeId,
            cardId: card.id,
          },
        });
      }
    }
    if (data.archived !== undefined) {
      updateData.archived = data.archived;
      logDetails.push(data.archived ? "cartão arquivado" : "cartão restaurado");
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    if (logDetails.length > 0) {
      await prisma.activityLog.create({
        data: {
          action: "CARD_UPDATED",
          details: logDetails.join(", "),
          cardId: card.id,
          userId: user.id,
        },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar cartão" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser();
    const { cardId } = await params;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: true },
    });

    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    const role = await getUserRole(user.id, card.column.projectId);
    if (role !== "LEADER") {
      return NextResponse.json({ error: "Apenas líderes podem excluir" }, { status: 403 });
    }

    await prisma.card.delete({ where: { id: cardId } });

    return NextResponse.json({ message: "Cartão excluído" });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
