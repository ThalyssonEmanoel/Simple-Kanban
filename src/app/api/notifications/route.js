import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// GET is strictly read-only. Reminder generation lives in
// /api/notifications/reminders (triggered by a scheduler), not on every poll.
export async function GET() {
  try {
    const user = await requireUser();

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          card: {
            select: {
              id: true,
              title: true,
              column: { select: { projectId: true } },
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request) {
  try {
    const user = await requireUser();
    const { notificationId, readAll } = await request.json();

    if (readAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: user.id },
        data: { read: true },
      });
    }

    return NextResponse.json({ message: "Atualizado" });
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
