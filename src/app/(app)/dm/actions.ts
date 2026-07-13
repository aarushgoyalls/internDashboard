"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

// Open (or lazily create) the 1:1 thread between me and another user, then go
// to it. The deterministic `key` means the pair always maps to one thread.
export async function openDm(otherUserId: string) {
  const me = await requireUser();
  if (otherUserId === me.id) redirect("/dm");

  const key = [me.id, otherUserId].sort().join(":");
  let thread = await prisma.dMThread.findUnique({ where: { key } });
  if (!thread) {
    thread = await prisma.dMThread.create({
      data: {
        key,
        participants: { create: [{ userId: me.id }, { userId: otherUserId }] },
      },
    });
  }
  redirect(`/dm/${thread.id}`);
}
