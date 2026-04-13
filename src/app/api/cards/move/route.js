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

    const card = await prisma.card.findUnique({ where: { id: cardId } });
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

    if (sourceColumnId === destinationColumnId) {
      // Reorder within same column
      const cards = await prisma.card.findMany({
        where: { columnId: sourceColumnId, archived: false },
        orderBy: { position: "asc" },
      });

      const reordered = cards.filter((c) => c.id !== cardId);
      reordered.splice(newPosition, 0, card);

      await prisma.$transaction(
        reordered.map((c, index) =>
          prisma.card.update({
            where: { id: c.id },
            data: { position: index },
          })
        )
      );
    } else {
      // Move to different column
      const sourceColumn = await prisma.column.findUnique({
        where: { id: sourceColumnId },
      });
      const destColumn = await prisma.column.findUnique({
        where: { id: destinationColumnId },
      });

      // Update card column and position
      await prisma.card.update({
        where: { id: cardId },
        data: { columnId: destinationColumnId, position: newPosition },
      });

      // Reorder source column
      const sourceCards = await prisma.card.findMany({
        where: { columnId: sourceColumnId, archived: false, id: { not: cardId } },
        orderBy: { position: "asc" },
      });
      await prisma.$transaction(
        sourceCards.map((c, index) =>
          prisma.card.update({
            where: { id: c.id },
            data: { position: index },
          })
        )
      );

      // Reorder destination column
      const destCards = await prisma.card.findMany({
        where: { columnId: destinationColumnId, archived: false },
        orderBy: { position: "asc" },
      });
      const reordered = destCards.filter((c) => c.id !== cardId);
      reordered.splice(newPosition, 0, { ...card, columnId: destinationColumnId });
      await prisma.$transaction(
        reordered.map((c, index) =>
          prisma.card.update({
            where: { id: c.id },
            data: { position: index },
          })
        )
      );

      // Log
      await prisma.activityLog.create({
        data: {
          action: "CARD_MOVED",
          details: `Movido de "${sourceColumn.name}" para "${destColumn.name}"`,
          cardId,
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ message: "Cartão movido" });
  } catch {
    return NextResponse.json({ error: "Erro ao mover cartão" }, { status: 500 });
  }
}
