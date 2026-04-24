import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireLeader } from "@/lib/auth";

// Leader-only read of archived cards for the project, shaped for XLSX export.
// UI visibility is gated client-side, but the real access control lives here.
export async function GET(_request, { params }) {
  try {
    const user = await requireUser();
    const { projectId } = await params;

    try {
      await requireLeader(user.id, projectId);
    } catch {
      return NextResponse.json(
        { error: "Apenas líderes podem exportar tarefas arquivadas" },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    const cards = await prisma.card.findMany({
      where: {
        archived: true,
        column: { projectId },
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        column: { select: { name: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    const rows = cards.map((c) => {
      const assigneeNames =
        Array.isArray(c.assignees) && c.assignees.length > 0
          ? c.assignees.map((a) => a.user?.name).filter(Boolean).join(", ")
          : c.assignee?.name || "Não atribuído";

      return {
        id: c.id,
        columnName: c.column?.name || "",
        title: c.title,
        description: c.description || "",
        priority: c.priority,
        dueDate: c.dueDate ? c.dueDate.toISOString() : null,
        reminderDate: c.reminderDate ? c.reminderDate.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        creatorName: c.creator?.name || "",
        creatorEmail: c.creator?.email || "",
        assigneeNames,
      };
    });

    return NextResponse.json({
      project: { id: project.id, name: project.name },
      count: rows.length,
      cards: rows,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
