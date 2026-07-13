import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { canAccessChannel } from "@/lib/access";
import { MessagePanel } from "@/components/MessagePanel";

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: { department: true, _count: { select: { memberships: true } } },
  });
  if (!channel) notFound();

  // RBAC: must be a member (or admin). Non-members are sent to the browse page.
  if (!(await canAccessChannel(me.id, me.role, id))) redirect("/channels");

  const messages = await prisma.message.findMany({
    where: { channelId: id },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { sender: { select: { id: true, name: true, email: true, image: true } } },
  });

  return (
    <MessagePanel
      endpoint={`/api/channels/${id}/messages`}
      meId={me.id}
      initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      header={
        <div>
          <h1 className="font-display text-base font-extrabold text-foreground">
            <span className="text-subtle">#</span> {channel.name}
          </h1>
          <p className="text-xs text-subtle">
            {channel.isGeneral ? "Everyone" : channel.department?.name ?? "Channel"} ·{" "}
            {channel._count.memberships} member{channel._count.memberships === 1 ? "" : "s"}
          </p>
        </div>
      }
    />
  );
}
