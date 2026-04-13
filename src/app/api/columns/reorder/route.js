import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, requireLeader } from "@/lib/auth";

export async function PUT(request) {
  try {
    const user = await requireUser();
    const { projectId, columns } = await request.json();

    await requireLeader(user.id, projectId);

    await prisma.$transaction(
      columns.map((col, index) =>
        prisma.column.update({
          where: { id: col.id },
          data: { position: index },
        })
      )
    );

    return NextResponse.json({ message: "Colunas reordenadas" });
  } catch {
    return NextResponse.json({ error: "Erro ao reordenar" }, { status: 500 });
  }
}
