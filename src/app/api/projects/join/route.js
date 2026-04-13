import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(request) {
  try {
    const user = await requireUser();
    const { code } = await request.json();

    if (!code?.trim()) {
      return NextResponse.json({ error: "Código é obrigatório" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    const existing = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId: user.id, projectId: project.id },
      },
    });

    if (existing) {
      return NextResponse.json({ projectId: project.id, message: "Você já é membro" });
    }

    await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: "MEMBER",
      },
    });

    return NextResponse.json({ projectId: project.id, message: "Entrou no projeto" });
  } catch {
    return NextResponse.json({ error: "Erro ao entrar no projeto" }, { status: 500 });
  }
}
