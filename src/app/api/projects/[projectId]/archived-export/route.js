import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireLeader } from "@/lib/auth";

// Parse a YYYY-MM-DD value into a Date at the corresponding boundary.
// Returns null when the input is missing/invalid.
function parseDateBoundary(value, kind) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  // Use UTC noon to avoid DST edge cases. We compare against TIMESTAMPTZ stored UTC.
  if (kind === "start") {
    return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  }
  return new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
}

// Leader-only read of archived cards for the project, shaped for XLSX export.
// UI visibility is gated client-side, but the real access control lives here.
//
// Supports an optional date range filter applied to `createdAt`:
//   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// If only one bound is supplied the other side is open-ended. Invalid pairs
// (start > end) return 400 — Feature-5 requires explicit interval validation.
export async function GET(request, { params }) {
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

    const { searchParams } = new URL(request.url);
    const startRaw = searchParams.get("startDate");
    const endRaw = searchParams.get("endDate");
    const startDate = parseDateBoundary(startRaw, "start");
    const endDate = parseDateBoundary(endRaw, "end");

    if ((startRaw && !startDate) || (endRaw && !endDate)) {
      return NextResponse.json(
        { error: "Datas inválidas. Use o formato YYYY-MM-DD." },
        { status: 400 }
      );
    }
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      return NextResponse.json(
        { error: "A data inicial não pode ser posterior à data final." },
        { status: 400 }
      );
    }

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const cards = await prisma.card.findMany({
      where: {
        archived: true,
        column: { projectId },
        ...dateFilter,
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
        archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
        creatorName: c.creator?.name || "",
        assigneeNames,
      };
    });

    return NextResponse.json({
      project: { id: project.id, name: project.name },
      count: rows.length,
      filter: {
        startDate: startRaw || null,
        endDate: endRaw || null,
      },
      cards: rows,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
