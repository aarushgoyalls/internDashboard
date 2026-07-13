import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/rbac";
import { canAccessChannel } from "@/lib/access";
import { messageSchema } from "@/lib/validation";

// GET /api/channels/:id/messages -> latest messages (polled by MessagePanel).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  if (!(await canAccessChannel(guard.id, guard.role, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: { channelId: id },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { sender: { select: { id: true, name: true, email: true, image: true } } },
  });
  return NextResponse.json({ messages });
}

// POST /api/channels/:id/messages -> send a message.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  if (!(await canAccessChannel(guard.id, guard.role, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const message = await prisma.message.create({
    data: { channelId: id, senderId: guard.id, body: parsed.data.body },
    include: { sender: { select: { id: true, name: true, email: true, image: true } } },
  });
  return NextResponse.json({ message }, { status: 201 });
}
