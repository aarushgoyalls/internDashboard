"use client";

import { useEffect, useRef, useState } from "react";

// Sidebar-footer popover — same outside-click-close mechanic as
// ScheduleMeetingForm/StatusEditor, opening upward (`bottom-full`) since the
// trigger sits at the bottom of the sidebar.
export function FeedbackForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setMessage("");
        setSent(true);
        setTimeout(() => {
          setOpen(false);
          setSent(false);
        }, 1200);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative mt-2" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost w-full border border-border">
        Feedback
      </button>

      {open && (
        <div className="card absolute bottom-full left-0 z-30 mb-2 w-72 p-3 shadow-lg">
          {sent ? (
            <p className="py-4 text-center text-sm text-success">Thanks — sent!</p>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                What should we add or fix?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                required
                autoFocus
                placeholder="A feature you'd like to see…"
                className="field"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary px-3 py-1 text-xs">
                  {saving ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
