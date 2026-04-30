import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, getUserRole } from "@/lib/auth";
import { toggleChecklistItem } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Reminder dates set in the past are rejected — they are useless and signal a typo.
function isReminderInPast(value) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return false;
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

export async function GET(request, { params }) {
  try {
    await requireUser();
    const { cardId } = await params;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { include: { project: { select: { id: true } } } },
        creator: { select: { id: true, name: true, image: true, email: true } },
        assignee: { select: { id: true, name: true, image: true, email: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, image: true, email: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
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
      include: {
        column: { include: { project: true } },
        assignees: true,
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    const projectId = card.column.projectId;
    const role = await getUserRole(user.id, projectId);

    if (!role) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const isAssigned =
      card.assigneeId === user.id ||
      card.assignees.some((a) => a.userId === user.id);

    if (role === "MEMBER" && !isAssigned && card.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Você só pode editar cartões atribuídos a você" },
        { status: 403 }
      );
    }

    const updateData = {};
    const logDetails = [];
    const extraLogs = [];

    if (data.title !== undefined) {
      updateData.title = data.title.trim();
      logDetails.push("título atualizado");
    }

    // Checklist toggle: pass `{ toggleChecklistIndex: <lineIndex> }` to flip a single item.
    // The description is rewritten and a dedicated activity log entry is emitted with
    // the item text, the new state, and the actor — meeting the Feature-5 audit requirement.
    if (data.toggleChecklistIndex !== undefined) {
      const idx = Number(data.toggleChecklistIndex);
      if (Number.isInteger(idx)) {
        const result = toggleChecklistItem(card.description || "", idx);
        if (result.item) {
          updateData.description = result.description;
          extraLogs.push({
            action: result.item.checked ? "CHECKLIST_CHECKED" : "CHECKLIST_UNCHECKED",
            details: `${result.item.checked ? "Marcou" : "Desmarcou"} item da lista: "${result.item.text}"`,
          });
        }
      }
    } else if (data.description !== undefined) {
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
    if (data.reminderDate !== undefined) {
      if (data.reminderDate && isReminderInPast(data.reminderDate)) {
        return NextResponse.json(
          { error: "A data do lembrete não pode ser anterior à data atual" },
          { status: 400 }
        );
      }
      updateData.reminderDate = data.reminderDate ? new Date(data.reminderDate) : null;
      logDetails.push("data de lembrete atualizada");
    }
    if (data.archived !== undefined) {
      // Toggling archive is restricted: the card's responsável (any assignee or
      // primary assignee) or a Leader can archive; only Leaders can un-archive
      // (reactivation flow described in Feature-5).
      if (data.archived === true) {
        const canArchive = role === "LEADER" || isAssigned;
        if (!canArchive) {
          return NextResponse.json(
            { error: "Apenas o responsável pela tarefa ou um Líder pode arquivá-la" },
            { status: 403 }
          );
        }
      } else if (role !== "LEADER") {
        return NextResponse.json(
          { error: "Apenas Líderes podem reativar tarefas arquivadas" },
          { status: 403 }
        );
      }

      updateData.archived = data.archived;
      if (data.archived) {
        updateData.archivedAt = new Date();
        // Remember where the card lived before archive so a Leader can restore it.
        updateData.previousColumnId = card.columnId;
      } else {
        updateData.archivedAt = null;
        // Move the card back to its previous column if it still exists; otherwise
        // leave it where the move endpoint placed it.
        if (card.previousColumnId && data.columnId === undefined) {
          updateData.columnId = card.previousColumnId;
        }
        updateData.previousColumnId = null;
      }
      logDetails.push(data.archived ? "cartão arquivado" : "cartão restaurado");
    }

    // Multi-assignee handling. Only the leader or the card creator may change assignees.
    // Legacy `assigneeId` input is mapped onto the new array for compatibility.
    let assigneeUpdate = null;
    if (data.assigneeIds !== undefined) {
      assigneeUpdate = Array.isArray(data.assigneeIds)
        ? [...new Set(data.assigneeIds.filter(Boolean))]
        : [];
    } else if (data.assigneeId !== undefined) {
      assigneeUpdate = data.assigneeId ? [data.assigneeId] : [];
    }

    if (assigneeUpdate !== null) {
      const canChangeAssignees = role === "LEADER" || card.creatorId === user.id;
      if (!canChangeAssignees) {
        return NextResponse.json(
          { error: "Apenas líderes ou o criador do cartão podem alterar os responsáveis" },
          { status: 403 }
        );
      }

      const previousIds = new Set(card.assignees.map((a) => a.userId));
      const nextIds = new Set(assigneeUpdate);

      const toAdd = assigneeUpdate.filter((id) => !previousIds.has(id));
      const toRemoveIds = card.assignees
        .filter((a) => !nextIds.has(a.userId))
        .map((a) => a.userId);

      await prisma.$transaction([
        ...(toRemoveIds.length > 0
          ? [
              prisma.cardAssignee.deleteMany({
                where: { cardId: card.id, userId: { in: toRemoveIds } },
              }),
            ]
          : []),
        ...(toAdd.length > 0
          ? [
              prisma.cardAssignee.createMany({
                data: toAdd.map((uid) => ({ cardId: card.id, userId: uid })),
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);

      updateData.assigneeId = assigneeUpdate[0] || null;
      logDetails.push("responsáveis atualizados");

      // Notify newly added assignees
      const newAssignees = toAdd.filter((uid) => uid !== user.id);
      if (newAssignees.length > 0) {
        await prisma.notification.createMany({
          data: newAssignees.map((uid) => ({
            type: "ASSIGNED",
            message: `${user.name} atribuiu a tarefa "${card.title}" a você`,
            userId: uid,
            cardId: card.id,
          })),
        });
      }
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
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

    for (const entry of extraLogs) {
      await prisma.activityLog.create({
        data: {
          action: entry.action,
          details: entry.details,
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
