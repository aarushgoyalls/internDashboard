import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { joinChannel, createChannel } from "./actions";

// Browse all channels: open the ones you're in, join the ones you're not.
export default async function ChannelsIndex() {
  const me = await requireUser();

  const [channels, departments] = await Promise.all([
    prisma.channel.findMany({
      orderBy: [{ isGeneral: "desc" }, { name: "asc" }],
      include: {
        department: true,
        memberships: { where: { userId: me.id }, select: { id: true } },
        _count: { select: { memberships: true } },
      },
    }),
    me.role === "ADMIN" ? prisma.department.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  // Non-admins only browse channels they can actually reach: global ones,
  // their own department's, or ones they already belong to (see canAccessChannel).
  const visibleChannels =
    me.role === "ADMIN"
      ? channels
      : channels.filter(
          (c) => c.isGeneral || c.departmentId === null || c.departmentId === me.departmentId || c.memberships.length > 0
        );

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="page-title">Channels</h1>
        <p className="mt-1 text-sm text-muted">Join a channel to read and post messages.</p>

        {/* Admin: create channel */}
        {me.role === "ADMIN" && (
          <form action={createChannel} className="card mt-5 flex flex-wrap items-end gap-2 bg-surface-muted p-4">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-muted">Name</label>
              <input name="name" required placeholder="e.g. announcements" className="field mt-1" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted">Department</label>
              <select name="departmentId" className="field mt-1">
                <option value="">Global</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary">Create</button>
          </form>
        )}

        <ul className="card mt-6 divide-y divide-border">
          {visibleChannels.map((c) => {
            // Admins can already read/post in any channel (see canAccessChannel),
            // so let them open every channel here without an artificial "join".
            const canOpen = me.role === "ADMIN" || c.memberships.length > 0;
            return (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    <span className="text-subtle">#</span> {c.name}
                  </p>
                  <p className="text-xs text-subtle">
                    {c.isGeneral ? "Everyone" : c.department?.name ?? "Global"} · {c._count.memberships} members
                  </p>
                </div>
                {canOpen ? (
                  <Link href={`/channels/${c.id}`} className="btn-secondary px-3 py-1.5">
                    Open
                  </Link>
                ) : (
                  <form action={joinChannel.bind(null, c.id)}>
                    <button className="btn-primary px-3 py-1.5">Join</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
