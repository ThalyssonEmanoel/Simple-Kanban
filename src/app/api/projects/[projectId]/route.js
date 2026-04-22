import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    await requireProjectAccess(user.id, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, image: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, image: true, email: true } },
          },
        },
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              where: { archived: false },
              orderBy: { position: "asc" },
              include: {
                creator: { select: { id: true, name: true, image: true } },
                assignee: { select: { id: true, name: true, image: true } },
                assignees: {
                  include: {
                    user: { select: { id: true, name: true, image: true } },
                  },
                },
                _count: { select: { comments: true, attachments: true } },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (err) {
    if (err.message === "Access denied") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    const role = await requireProjectAccess(user.id, projectId);

    if (role !== "LEADER") {
      return NextResponse.json({ error: "Apenas líderes podem editar" }, { status: 403 });
    }

    const { name, description } = await request.json();

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser();
    const { projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    if (project.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Apenas o proprietário pode excluir o projeto" },
        { status: 403 }
      );
    }

    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
