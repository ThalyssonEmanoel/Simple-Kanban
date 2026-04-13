import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(request) {
  try {
    const user = await requireUser();
    const { cardId, content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        cardId,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "COMMENT_ADDED",
        details: `Comentário adicionado`,
        cardId,
        userId: user.id,
      },
    });

    // Notify card creator and assignee
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { creatorId: true, assigneeId: true, title: true },
    });

    const notifyIds = new Set(
      [card.creatorId, card.assigneeId].filter((id) => id && id !== user.id)
    );

    // Check for @mentions
    const mentionRegex = /@(\S+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUser = await prisma.user.findFirst({
        where: { name: { contains: match[1] } },
      });
      if (mentionedUser && mentionedUser.id !== user.id) {
        notifyIds.add(mentionedUser.id);
      }
    }

    for (const userId of notifyIds) {
      await prisma.notification.create({
        data: {
          type: "COMMENT",
          message: `${user.name} comentou em "${card.title}"`,
          userId,
          cardId,
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao comentar" }, { status: 500 });
  }
}
