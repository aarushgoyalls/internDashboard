import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { Sidebar } from "@/components/Sidebar";

// Shared shell for every authenticated page. requireUser() redirects to /login
// if there's no session, so no page nested here ever renders unauthenticated.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();

  // Everything the sidebar needs, fetched once on the server.
  const [dbUser, channels, dmThreads, unread] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id }, include: { department: true } }),
    prisma.channel.findMany({
      // Admins see every channel in the sidebar, not just ones they've joined
      // (they already have read/post access to all — see canAccessChannel).
      where: me.role === "ADMIN" ? {} : { memberships: { some: { userId: me.id } } },
      orderBy: [{ isGeneral: "desc" }, { name: "asc" }],
    }),
    prisma.dMThread.findMany({
      where: { participants: { some: { userId: me.id } } },
      include: { participants: { include: { user: true } } },
    }),
    prisma.notification.count({ where: { userId: me.id, read: false } }),
  ]);

  const dms = dmThreads
    .map((t) => {
      const other = t.participants.find((p) => p.userId !== me.id)?.user;
      return other
        ? { threadId: t.id, other: { id: other.id, name: other.name, email: other.email, image: other.image } }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (a.other.name ?? "").localeCompare(b.other.name ?? ""));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        me={{
          id: me.id,
          name: dbUser?.name ?? null,
          email: dbUser?.email ?? null,
          image: dbUser?.image ?? null,
          role: me.role,
          department: dbUser?.department?.name ?? null,
          isAlsoIntern: dbUser?.isAlsoIntern ?? false,
        }}
        channels={channels.map((c) => ({ id: c.id, name: c.name, isGeneral: c.isGeneral }))}
        dms={dms}
        unreadCount={unread}
      />
      <main className="flex-1 min-w-0 overflow-hidden bg-background">{children}</main>
    </div>
  );
}
