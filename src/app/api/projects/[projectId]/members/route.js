import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireLeader } from "@/lib/auth";

export async function PUT(request, { params }) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    await requireLeader(user.id, projectId);

    const { memberId, role } = await request.json();

    if (!["LEADER", "MEMBER"].includes(role)) {
      return NextResponse.json({ error: "Role inválido" }, { status: 400 });
    }

    const member = await prisma.projectMember.update({
      where: { id: memberId, projectId },
      data: { role },
    });

    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar membro" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    await requireLeader(user.id, projectId);

    const { memberId } = await request.json();

    await prisma.projectMember.delete({
      where: { id: memberId, projectId },
    });

    return NextResponse.json({ message: "Membro removido" });
  } catch {
    return NextResponse.json({ error: "Erro ao remover membro" }, { status: 500 });
  }
}
