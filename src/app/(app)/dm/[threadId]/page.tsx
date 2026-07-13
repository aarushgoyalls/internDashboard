import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { canAccessDmThread } from "@/lib/access";
import { Avatar } from "@/components/Avatar";
import { MessagePanel } from "@/components/MessagePanel";

export default async function DmThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const me = await requireUser();
  const { threadId } = await params;

  // RBAC: only the two participants may view a DM thread.
  if (!(await canAccessDmThread(me.id, threadId))) redirect("/dm");

  const thread = await prisma.dMThread.findUnique({
    where: { id: threadId },
    include: { participants: { include: { user: { include: { department: true } } } } },
  });
  if (!thread) notFound();

  const other = thread.participants.find((p) => p.userId !== me.id)?.user;

  const messages = await prisma.message.findMany({
    where: { dmThreadId: threadId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { sender: { select: { id: true, name: true, email: true, image: true } } },
  });

  return (
    <MessagePanel
      endpoint={`/api/dm/${threadId}/messages`}
      meId={me.id}
      initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      header={
        <div className="flex items-center gap-3">
          <Avatar name={other?.name} email={other?.email} image={other?.image} size={32} />
          <div>
            <h1 className="font-display text-base font-extrabold text-foreground">{other?.name ?? other?.email ?? "Conversation"}</h1>
            <p className="text-xs text-subtle">{other?.department?.name ?? "Direct message"}</p>
          </div>
        </div>
      }
    />
  );
}
