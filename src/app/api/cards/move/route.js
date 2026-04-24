import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, getUserRole } from "@/lib/auth";

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
      select: { id: true, columnId: true, position: true, assigneeId: true, creatorId: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
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
