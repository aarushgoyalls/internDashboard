import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/rbac";

// POST /api/notifications/read -> mark all of the user's notifications read.
export async function POST() {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;

  await prisma.notification.updateMany({
    where: { userId: guard.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
