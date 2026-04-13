import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let user = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        authId: authUser.id,
        name: authUser.user_metadata?.name || authUser.email.split("@")[0],
        email: authUser.email,
        image: authUser.user_metadata?.avatar_url || null,
      },
    });
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getUserRole(userId, projectId) {
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
  });
  return member?.role || null;
}

export async function requireProjectAccess(userId, projectId) {
  const role = await getUserRole(userId, projectId);
  if (!role) {
    throw new Error("Access denied");
  }
  return role;
}

export async function requireLeader(userId, projectId) {
  const role = await getUserRole(userId, projectId);
  if (role !== "LEADER") {
    throw new Error("Leader access required");
  }
  return role;
}
