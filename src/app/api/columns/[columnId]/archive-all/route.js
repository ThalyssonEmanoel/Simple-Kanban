import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, getUserRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PUT — archive every non-archived card currently in the column. Used by the
// "3 pontos" menu over the "Finalizadas" column. Restricted to project Leaders;
// the UI also asks for explicit confirmation before calling this endpoint.
export async function PUT(_request, { params }) {
  try {
    const user = await requireUser();
    const { columnId } = await params;

    const column = await prisma.column.findUnique({
      where: { id: columnId },
      select: { id: true, name: true, projectId: true },
    });
    if (!column) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 });
    }

    const role = await getUserRole(user.id, column.projectId);
    if (role !== "LEADER") {
      return NextResponse.json(
        { error: "Apenas Líderes podem arquivar tarefas em lote" },
        { status: 403 }
      );
    }

    const cards = await prisma.card.findMany({
      where: { columnId: column.id, archived: false },
      select: { id: true, columnId: true },
    });

    if (cards.length === 0) {
      return NextResponse.json({ message: "Nenhuma tarefa para arquivar", count: 0 });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.card.updateMany({
        where: { id: { in: cards.map((c) => c.id) } },
        data: { archived: true, archivedAt: now, previousColumnId: column.id },
      }),
      prisma.activityLog.createMany({
        data: cards.map((c) => ({
          action: "CARD_ARCHIVED",
          details: `Cartão arquivado em lote a partir da coluna "${column.name}"`,
          cardId: c.id,
          userId: user.id,
        })),
      }),
    ]);

    return NextResponse.json({ message: "Tarefas arquivadas", count: cards.length });
  } catch {
    return NextResponse.json({ error: "Erro ao arquivar tarefas" }, { status: 500 });
  }
}
