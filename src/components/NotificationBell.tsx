"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/format";

type Note = { id: string; body: string; link: string | null; read: boolean; createdAt: string };

// Polls the notifications API (Vercel serverless can't push, so we poll — same
// approach as the message panes). Shows an unread badge + a dropdown list.
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unread);
      setItems(data.items);
    } catch {
      /* ignore transient errors */
    }
  }

  // Poll every 20s.
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/read", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-btn p-1.5 text-muted hover:bg-surface-muted hover:text-foreground transition"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-20 mt-2 w-72 shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-subtle">You&apos;re all caught up</p>}
            {items.map((n) => {
              const body = (
                <div className={`px-3 py-2 text-sm ${n.read ? "text-muted" : "text-foreground bg-accent-tint/60"}`}>
                  <p>{n.body}</p>
                  <p className="mt-0.5 text-xs text-subtle">{timeAgo(n.createdAt)}</p>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block hover:bg-surface-muted">
                  {body}
                </Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
