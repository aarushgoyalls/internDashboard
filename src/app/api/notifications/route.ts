import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/rbac";

// GET /api/notifications -> unread count + latest notifications for the user.
export async function GET() {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;
  const user = guard;

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return NextResponse.json({ unread, items });
}
