import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, getUserRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PUT — edit a comment. Allowed for the comment author or any project Leader.
export async function PUT(request, { params }) {
  try {
    const user = await requireUser();
    const { commentId } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { card: { include: { column: { select: { projectId: true } } } } },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });
    }

    const projectId = comment.card.column.projectId;
    const role = await getUserRole(user.id, projectId);
    if (!role) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const isAuthor = comment.authorId === user.id;
    const isLeader = role === "LEADER";
    if (!isAuthor && !isLeader) {
      return NextResponse.json(
        { error: "Apenas o autor ou um Líder pode editar este comentário" },
        { status: 403 }
      );
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim(), editedAt: new Date() },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    await prisma.activityLog.create({
      data: {
        action: "COMMENT_EDITED",
        details: isAuthor ? "Comentário editado" : "Comentário editado por Líder",
        cardId: comment.cardId,
        userId: user.id,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao editar comentário" }, { status: 500 });
  }
}

// DELETE — remove a comment. Allowed for the author or a project Leader.
export async function DELETE(_request, { params }) {
  try {
    const user = await requireUser();
    const { commentId } = await params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { card: { include: { column: { select: { projectId: true } } } } },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });
    }

    const projectId = comment.card.column.projectId;
    const role = await getUserRole(user.id, projectId);
    if (!role) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const isAuthor = comment.authorId === user.id;
    const isLeader = role === "LEADER";
    if (!isAuthor && !isLeader) {
      return NextResponse.json(
        { error: "Apenas o autor ou um Líder pode excluir este comentário" },
        { status: 403 }
      );
    }

    await prisma.comment.delete({ where: { id: commentId } });

    await prisma.activityLog.create({
      data: {
        action: "COMMENT_DELETED",
        details: isAuthor ? "Comentário excluído" : "Comentário excluído por Líder",
        cardId: comment.cardId,
        userId: user.id,
      },
    });

    return NextResponse.json({ message: "Comentário excluído" });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir comentário" }, { status: 500 });
  }
}
