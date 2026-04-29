import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, getUserRole } from "@/lib/auth";

const ARCHIVED_COLUMN_ID = "__archived__";

export async function PUT(request) {
  try {
    const user = await requireUser();
    const { cardId, sourceColumnId, destinationColumnId, newPosition, projectId } =
      await request.json();

    const role = await getUserRole(user.id, projectId);
    if (!role) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        columnId: true,
        position: true,
        assigneeId: true,
        creatorId: true,
        archived: true,
        previousColumnId: true,
      },
    });
    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    // Special "Arquivadas" column flows. The archived column does not exist as a real row
    // — it's synthesized for Leaders by the project GET — so dragging into/out of it
    // toggles `archived` instead of issuing a normal move.
    const draggingIntoArchive = destinationColumnId === ARCHIVED_COLUMN_ID;
    const draggingOutOfArchive = sourceColumnId === ARCHIVED_COLUMN_ID;

    if (draggingIntoArchive || draggingOutOfArchive) {
      if (role !== "LEADER") {
        return NextResponse.json(
          { error: "Apenas Líderes podem mover cartões para/da coluna Arquivadas" },
          { status: 403 }
        );
      }

      if (draggingIntoArchive) {
        await prisma.$transaction([
          // Vacate the slot in the source column.
          prisma.card.updateMany({
            where: {
              columnId: card.columnId,
              archived: false,
              position: { gt: card.position },
            },
            data: { position: { decrement: 1 } },
          }),
          prisma.card.update({
            where: { id: cardId },
            data: {
              archived: true,
              archivedAt: new Date(),
              previousColumnId: card.columnId,
            },
          }),
          prisma.activityLog.create({
            data: {
              action: "CARD_ARCHIVED",
              details: "Cartão arquivado",
              cardId,
              userId: user.id,
            },
          }),
        ]);

        return NextResponse.json({
          message: "Cartão arquivado",
          cardId,
          archived: true,
        });
      }

      // Out-of-archive: reactivate the card. Destination column must be a real column.
      const targetColumnId = card.previousColumnId || destinationColumnId;
      const targetColumn = await prisma.column.findUnique({
        where: { id: targetColumnId },
        select: { id: true, name: true, projectId: true },
      });
      if (!targetColumn || targetColumn.projectId !== projectId) {
        return NextResponse.json(
          { error: "Coluna de destino inválida para reativação" },
          { status: 400 }
        );
      }

      const tail = await prisma.card.aggregate({
        where: { columnId: targetColumn.id, archived: false },
        _max: { position: true },
      });
      const insertPosition = (tail._max.position ?? -1) + 1;

      await prisma.$transaction([
        prisma.card.update({
          where: { id: cardId },
          data: {
            archived: false,
            archivedAt: null,
            previousColumnId: null,
            columnId: targetColumn.id,
            position: insertPosition,
          },
        }),
        prisma.activityLog.create({
          data: {
            action: "CARD_RESTORED",
            details: `Cartão restaurado para "${targetColumn.name}"`,
            cardId,
            userId: user.id,
          },
        }),
      ]);

      return NextResponse.json({
        message: "Cartão restaurado",
        cardId,
        columnId: targetColumn.id,
        position: insertPosition,
      });
    }

    // Members can only move their own cards
    if (role === "MEMBER" && card.assigneeId !== user.id && card.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Você só pode mover cartões atribuídos a você" },
        { status: 403 }
      );
    }

    const oldPosition = card.position;
    const sameColumn = sourceColumnId === destinationColumnId;

    if (sameColumn) {
      if (oldPosition === newPosition) {
        return NextResponse.json({ message: "Sem alteração" });
      }

      // Range-based shift: only cards between old and new index are touched.
      const ops =
        newPosition > oldPosition
          ? [
              prisma.card.updateMany({
                where: {
                  columnId: sourceColumnId,
                  archived: false,
                  id: { not: cardId },
                  position: { gt: oldPosition, lte: newPosition },
                },
                data: { position: { decrement: 1 } },
              }),
              prisma.card.update({
                where: { id: cardId },
                data: { position: newPosition },
              }),
            ]
          : [
              prisma.card.updateMany({
                where: {
                  columnId: sourceColumnId,
                  archived: false,
                  id: { not: cardId },
                  position: { gte: newPosition, lt: oldPosition },
                },
                data: { position: { increment: 1 } },
              }),
              prisma.card.update({
                where: { id: cardId },
                data: { position: newPosition },
              }),
            ];

      await prisma.$transaction(ops);
    } else {
      // Cross-column move: shift source tail up, destination tail down,
      // then place the card. Single transaction, at most 4 writes + 1 log.
      const [sourceColumn, destColumn] = await Promise.all([
        prisma.column.findUnique({ where: { id: sourceColumnId }, select: { name: true } }),
        prisma.column.findUnique({ where: { id: destinationColumnId }, select: { name: true } }),
      ]);

      await prisma.$transaction([
        prisma.card.updateMany({
          where: {
            columnId: sourceColumnId,
            archived: false,
            position: { gt: oldPosition },
          },
          data: { position: { decrement: 1 } },
        }),
        prisma.card.updateMany({
          where: {
            columnId: destinationColumnId,
            archived: false,
            position: { gte: newPosition },
          },
          data: { position: { increment: 1 } },
        }),
        prisma.card.update({
          where: { id: cardId },
          data: { columnId: destinationColumnId, position: newPosition },
        }),
        prisma.activityLog.create({
          data: {
            action: "CARD_MOVED",
            details: `Movido de "${sourceColumn?.name ?? ""}" para "${destColumn?.name ?? ""}"`,
            cardId,
            userId: user.id,
          },
        }),
      ]);
    }

    // Minimal response — enough for client reconciliation without a full project reload.
    return NextResponse.json({
      message: "Cartão movido",
      cardId,
      columnId: destinationColumnId,
      position: newPosition,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao mover cartão" }, { status: 500 });
  }
}
