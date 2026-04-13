import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateProjectCode } from "@/lib/utils";

export async function GET() {
  try {
    const user = await requireUser();

    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: user.id } },
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        members: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        _count: { select: { columns: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request) {
  try {
    const user = await requireUser();
    const { name, description } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const code = generateProjectCode();

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        code,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: "LEADER" },
        },
        columns: {
          createMany: {
            data: [
              { name: "To Do", position: 0, isDefault: true },
              { name: "Doing", position: 1, isDefault: true },
              { name: "Review", position: 2, isDefault: true },
              { name: "Done", position: 3, isDefault: true },
            ],
          },
        },
      },
      include: {
        columns: true,
        members: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar projeto" }, { status: 500 });
  }
}
