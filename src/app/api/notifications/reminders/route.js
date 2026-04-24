import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Write endpoint to be called by a scheduled job (Vercel cron, external scheduler, etc.).
// Generates REMINDER notifications for cards whose reminderDate has passed.
// Protected by CRON_SECRET so it cannot be spammed from the browser.
export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") || request.headers.get("authorization");
  if (!secret || !provided || provided.replace(/^Bearer\s+/i, "") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const dueCards = await prisma.card.findMany({
    where: {
      reminderDate: { lte: now, not: null },
      archived: false,
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      creatorId: true,
      assigneeId: true,
      assignees: { select: { userId: true } },
      column: { select: { name: true } },
    },
  });

  let created = 0;

  for (const card of dueCards) {
    if (card.column?.name === "Finalizadas" || card.column?.name === "Done") continue;

    const targetUserIds = new Set();
    if (card.creatorId) targetUserIds.add(card.creatorId);
    if (card.assigneeId) targetUserIds.add(card.assigneeId);
    for (const a of card.assignees) targetUserIds.add(a.userId);

    if (targetUserIds.size === 0) continue;

    const existing = await prisma.notification.findMany({
      where: { cardId: card.id, type: "REMINDER", userId: { in: [...targetUserIds] } },
      select: { userId: true },
    });
    const already = new Set(existing.map((e) => e.userId));

    const toCreate = [...targetUserIds].filter((uid) => !already.has(uid));
    if (toCreate.length === 0) continue;

    const dueDateStr = card.dueDate
      ? new Date(card.dueDate).toLocaleDateString("pt-BR")
      : "";

    await prisma.notification.createMany({
      data: toCreate.map((uid) => ({
        type: "REMINDER",
        message: `Lembrete: a tarefa "${card.title}" tem prazo até ${dueDateStr}`,
        userId: uid,
        cardId: card.id,
      })),
    });
    created += toCreate.length;
  }

  return NextResponse.json({ ok: true, created });
}
