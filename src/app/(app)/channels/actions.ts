"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/rbac";

// Join a channel (anyone). Upsert so re-joining is harmless.
export async function joinChannel(channelId: string) {
  const me = await requireUser();
  await prisma.channelMembership.upsert({
    where: { userId_channelId: { userId: me.id, channelId } },
    create: { userId: me.id, channelId },
    update: {},
  });
  revalidatePath("/channels");
  redirect(`/channels/${channelId}`);
}

// Leave a channel (anyone). Can't leave #general.
export async function leaveChannel(channelId: string) {
  const me = await requireUser();
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (channel && !channel.isGeneral) {
    await prisma.channelMembership.deleteMany({ where: { userId: me.id, channelId } });
  }
  revalidatePath("/channels");
  redirect("/channels");
}

// Create a channel (admin only — admins manage channels).
export async function createChannel(formData: FormData) {
  await requireRole("ADMIN");
  const me = await requireUser();
  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const departmentId = String(formData.get("departmentId") ?? "");
  if (!name) redirect("/channels");

  const ch = await prisma.channel.create({
    data: { name, departmentId: departmentId || null },
  });
  await prisma.channelMembership.create({ data: { userId: me.id, channelId: ch.id } });
  revalidatePath("/channels");
  redirect(`/channels/${ch.id}`);
}
