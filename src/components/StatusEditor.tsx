"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { StatusValue } from "@prisma/client";
import { STATUS_META, STATUS_VALUES } from "@/lib/constants";

// Inline editor for an intern's supervisor-set status (green/amber/red) + notes.
// Renders the current badge; clicking opens a popover to change it.
export function StatusEditor({
  internId,
  status,
  notes,
}: {
  internId: string;
  status: StatusValue | null;
  notes: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<StatusValue>(status ?? "ON_TRACK");
  const [noteText, setNoteText] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId, status: value, notes: noteText }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const badge = status ? STATUS_META[status] : null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`pill border ${badge ? badge.badge : "border-border bg-surface-muted text-subtle"}`}
      >
        {badge ? (
          <>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </>
        ) : (
          "Set status"
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-20 mt-1 w-60 p-3 shadow-lg">
          <div className="space-y-1">
            {STATUS_VALUES.map((s) => {
              const meta = STATUS_META[s];
              return (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded-btn px-2 py-1 hover:bg-surface-muted">
                  <input type="radio" name="status" checked={value === s} onChange={() => setValue(s)} className="accent-accent" />
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <span className="text-sm text-foreground">{meta.label}</span>
                </label>
              );
            })}
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={2}
            placeholder="Notes (optional)"
            className="field mt-2"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-ghost px-2 py-1 text-xs">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="btn-primary px-3 py-1 text-xs">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
