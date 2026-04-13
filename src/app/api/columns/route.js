import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireLeader } from "@/lib/auth";

export async function POST(request) {
  try {
    const user = await requireUser();
    const { projectId, name } = await request.json();

    await requireLeader(user.id, projectId);

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const maxPosition = await prisma.column.aggregate({
      where: { projectId },
      _max: { position: true },
    });

    const column = await prisma.column.create({
      data: {
        name: name.trim(),
        position: (maxPosition._max.position ?? -1) + 1,
        projectId,
      },
      include: { cards: true },
    });

    return NextResponse.json(column, { status: 201 });
  } catch (err) {
    if (err.message === "Leader access required") {
      return NextResponse.json({ error: "Apenas líderes podem criar colunas" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao criar coluna" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await requireUser();
    const { id, name, projectId } = await request.json();

    await requireLeader(user.id, projectId);

    const column = await prisma.column.findUnique({ where: { id } });
    if (column.isDefault) {
      return NextResponse.json({ error: "Colunas padrão não podem ser renomeadas" }, { status: 400 });
    }

    const updated = await prisma.column.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar coluna" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await requireUser();
    const { id, projectId } = await request.json();

    await requireLeader(user.id, projectId);

    const column = await prisma.column.findUnique({ where: { id } });
    if (column.isDefault) {
      return NextResponse.json({ error: "Colunas padrão não podem ser excluídas" }, { status: 400 });
    }

    await prisma.column.delete({ where: { id } });

    return NextResponse.json({ message: "Coluna excluída" });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir coluna" }, { status: 500 });
  }
}
