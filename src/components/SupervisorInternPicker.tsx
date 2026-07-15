"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";

type Intern = { id: string; name: string | null; email: string; image?: string | null };

// Chip list of currently-picked interns plus a "+ Add intern" dropdown to
// stage more. Nothing is persisted here — it just keeps a hidden
// `internIds` input per chip in sync so the surrounding <form>'s server
// action (and its Save button) still submit the full selection.
export function SupervisorInternPicker({
  interns,
  initialAssignedIds,
}: {
  interns: Intern[];
  initialAssignedIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialAssignedIds);

  const selected = interns.filter((i) => selectedIds.includes(i.id));
  const available = interns.filter((i) => !selectedIds.includes(i.id));

  function remove(id: string) {
    setSelectedIds((ids) => ids.filter((existing) => existing !== id));
  }

  function add(id: string) {
    if (!id) return;
    setSelectedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  return (
    <div className="flex min-w-56 flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((i) => (
          <span key={i.id} className="pill border border-border bg-surface-muted text-muted">
            <Avatar name={i.name} email={i.email} image={i.image} size={16} />
            {i.name ?? i.email}
            <button
              type="button"
              onClick={() => remove(i.id)}
              aria-label={`Remove ${i.name ?? i.email}`}
              className="text-subtle hover:text-danger"
            >
              ×
            </button>
          </span>
        ))}
        {selected.length === 0 && <span className="text-xs text-subtle">No interns assigned</span>}
      </div>

      {available.length > 0 && (
        <select value="" onChange={(e) => add(e.target.value)} className="field text-sm">
          <option value="">+ Add intern</option>
          {available.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name ?? i.email}
            </option>
          ))}
        </select>
      )}

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="internIds" value={id} />
      ))}
    </div>
  );
}
