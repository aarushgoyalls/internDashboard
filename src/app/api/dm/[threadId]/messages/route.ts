import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/rbac";
import { canAccessDmThread } from "@/lib/access";
import { messageSchema } from "@/lib/validation";
import { notifyDmMessage } from "@/lib/messageNotify";

// GET /api/dm/:threadId/messages -> messages in a DM thread (participants only).
export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;
  const { threadId } = await params;

  if (!(await canAccessDmThread(guard.id, threadId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: { dmThreadId: threadId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { sender: { select: { id: true, name: true, email: true, image: true } } },
  });
  return NextResponse.json({ messages });
}

// POST /api/dm/:threadId/messages -> send a DM.
export async function POST(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;
  const { threadId } = await params;

  if (!(await canAccessDmThread(guard.id, threadId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const message = await prisma.message.create({
    data: { dmThreadId: threadId, senderId: guard.id, body: parsed.data.body },
    include: { sender: { select: { id: true, name: true, email: true, image: true } } },
  });

  // Notify the other participant (bell + best-effort email) after the
  // response is sent, so the sender's own send isn't slowed down by it.
  after(() =>
    notifyDmMessage({
      threadId,
      senderId: guard.id,
      senderLabel: message.sender.name ?? message.sender.email ?? "Someone",
      body: parsed.data.body,
    }).catch(() => {})
  );

  return NextResponse.json({ message }, { status: 201 });
}
