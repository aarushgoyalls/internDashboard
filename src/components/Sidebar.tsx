"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { Avatar } from "@/components/Avatar";
import { NotificationBell } from "@/components/NotificationBell";

type Me = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  department: string | null;
  isAlsoIntern: boolean;
};
type ChannelItem = { id: string; name: string; isGeneral: boolean };
type DmItem = { threadId: string; other: { id: string; name: string | null; email: string; image: string | null } };

const ROLE_LABEL: Record<Role, string> = {
  INTERN: "Intern",
  SUPERVISOR: "Supervisor",
  ADMIN: "Admin",
};

export function Sidebar({
  me,
  channels,
  dms,
  unreadCount,
}: {
  me: Me;
  channels: ChannelItem[];
  dms: DmItem[];
  unreadCount: number;
}) {
  const pathname = usePathname();

  // Role-based primary nav.
  const nav: { href: string; label: string }[] = [];
  if (me.role === "INTERN" || me.isAlsoIntern) nav.push({ href: "/form", label: "My daily update" });
  if (me.role === "SUPERVISOR" || me.role === "ADMIN") nav.push({ href: "/dashboard", label: "Dashboard" });
  if (me.role === "SUPERVISOR" || me.role === "ADMIN") nav.push({ href: "/projects", label: "Projects" });
  nav.push({ href: "/available-projects", label: "Projects Available" });
  if (me.role === "SUPERVISOR") nav.push({ href: "/questions", label: "Form questions" });
  nav.push({ href: "/meetings", label: "Meetings" });
  if (me.role === "ADMIN") nav.push({ href: "/admin", label: "Admin" });

  const linkCls = (active: boolean) =>
    `block rounded-btn px-2.5 py-1.5 text-sm truncate transition ${
      active ? "bg-accent-tint text-accent font-semibold" : "text-muted hover:bg-surface-muted hover:text-foreground"
    }`;

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <span className="flex items-center gap-2 font-display text-[15px] font-extrabold tracking-tight text-foreground">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          LeptonArgo
        </span>
        <NotificationBell initialUnread={unreadCount} />
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-5">
        {/* Primary nav */}
        <div className="space-y-0.5">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={linkCls(pathname === n.href || pathname.startsWith(n.href + "/"))}>
              {n.label}
            </Link>
          ))}
        </div>

        {/* Channels */}
        <div>
          <p className="eyebrow px-2.5 mb-1">Channels</p>
          <div className="space-y-0.5">
            {channels.map((c) => (
              <Link key={c.id} href={`/channels/${c.id}`} className={linkCls(pathname === `/channels/${c.id}`)}>
                <span className="text-subtle">#</span> {c.name}
              </Link>
            ))}
            {channels.length === 0 && <p className="px-2.5 text-xs text-subtle">No channels yet</p>}
          </div>
        </div>

        {/* Direct messages */}
        <div>
          <div className="flex items-center justify-between px-2.5 mb-1">
            <p className="eyebrow">Direct messages</p>
            <Link href="/dm" className="text-xs text-subtle hover:text-accent" title="New message">
              +
            </Link>
          </div>
          <div className="space-y-0.5">
            {dms.map((d) => (
              <Link key={d.threadId} href={`/dm/${d.threadId}`} className={linkCls(pathname === `/dm/${d.threadId}`)}>
                <span className="inline-flex items-center gap-2">
                  <Avatar name={d.other.name} email={d.other.email} image={d.other.image} size={20} />
                  <span className="truncate">{d.other.name ?? d.other.email}</span>
                </span>
              </Link>
            ))}
            {dms.length === 0 && (
              <Link href="/dm" className="px-2.5 text-xs text-subtle hover:text-accent block">
                Start a conversation →
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Footer: current user + sign out */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Avatar name={me.name} email={me.email} image={me.image} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{me.name ?? me.email}</p>
            <p className="truncate text-xs text-subtle">
              {ROLE_LABEL[me.role]}
              {me.department ? ` · ${me.department}` : ""}
            </p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost mt-2 w-full border border-border">
          Sign out
        </button>
      </div>
    </aside>
  );
}
