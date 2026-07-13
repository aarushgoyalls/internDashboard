"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { formatDateTime } from "@/lib/format";

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string | null; email: string; image: string | null };
};

// Reusable chat pane for channels AND DMs. The only difference between the two
// is `endpoint` (where to GET/POST messages) — access control lives server-side
// in those routes. Real-time-ish via 3s polling (no websockets on Vercel).
export function MessagePanel({
  endpoint,
  meId,
  initialMessages,
  header,
}: {
  endpoint: string;
  meId: string;
  initialMessages: ChatMessage[];
  header: React.ReactNode;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  async function load() {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
    } catch {
      /* ignore transient poll errors */
    }
  }

  // Poll for new messages.
  useEffect(() => {
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  // Track whether the user is scrolled to the bottom (so we don't yank them up).
  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // Auto-scroll to bottom when messages change and the user was already at bottom.
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        atBottomRef.current = true;
        await load();
      } else {
        setText(body); // restore on failure
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface px-6 py-3">{header}</div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-subtle py-10">No messages yet. Say hello 👋</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <Avatar name={m.sender.name} email={m.sender.email} image={m.sender.image} size={36} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {m.sender.id === meId ? "You" : m.sender.name ?? m.sender.email}
                </span>
                <span className="text-xs text-subtle">{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-surface p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            className="field flex-1 resize-none"
          />
          <button onClick={send} disabled={sending || !text.trim()} className="btn-primary">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
