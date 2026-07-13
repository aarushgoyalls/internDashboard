"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RECURRENCE_META, RECURRENCE_VALUES } from "@/lib/constants";
import type { RecurrenceFrequency } from "@prisma/client";

type Invitee = { id: string; name: string | null; email: string };

// Popover form for scheduling a meeting — same outside-click-close pattern as
// StatusEditor.tsx, just a bigger form. `date`/`time` are the browser's local
// wall-clock; converted to an ISO instant (.toISOString()) before sending, so
// the server never has to guess a timezone.
export function ScheduleMeetingForm({ invitees }: { invitees: Invitee[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMins, setDurationMins] = useState(30);
  const [location, setLocation] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>("NONE");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!date || !time || attendeeIds.length === 0) {
      setError("Fill in date, time, and at least one invitee");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const startAt = new Date(`${date}T${time}`).toISOString();
      const recurrenceEndISO = recurrenceEndDate ? new Date(`${recurrenceEndDate}T23:59:59`).toISOString() : null;
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          startAt,
          durationMins,
          location: location || null,
          recurrence,
          recurrenceEndDate: recurrenceEndISO,
          attendeeIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setOpen(false);
        setTitle("");
        setDescription("");
        setDate("");
        setTime("");
        setDurationMins(30);
        setLocation("");
        setRecurrence("NONE");
        setRecurrenceEndDate("");
        setAttendeeIds([]);
        router.refresh();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  const label = "block text-xs font-semibold text-foreground";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-primary">
        Schedule meeting
      </button>

      {open && (
        <div className="card absolute right-0 z-30 mt-2 w-96 p-4 shadow-lg">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className={label}>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required className="field mt-1" />
            </div>
            <div>
              <label className={label}>Agenda (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="field mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="field mt-1" />
              </div>
              <div>
                <label className={label}>Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="field mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Duration (mins)</label>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={durationMins}
                  onChange={(e) => setDurationMins(parseInt(e.target.value, 10) || 30)}
                  className="field mt-1"
                />
              </div>
              <div>
                <label className={label}>Location / link</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zoom/Meet URL" className="field mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Repeats</label>
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)} className="field mt-1">
                  {RECURRENCE_VALUES.map((r) => (
                    <option key={r} value={r}>{RECURRENCE_META[r].label}</option>
                  ))}
                </select>
              </div>
              {recurrence !== "NONE" && (
                <div>
                  <label className={label}>Repeat until (optional)</label>
                  <input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} className="field mt-1" />
                </div>
              )}
            </div>
            <div>
              <label className={label}>Invite</label>
              <select
                multiple
                value={attendeeIds}
                onChange={(e) => setAttendeeIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                required
                size={Math.min(5, Math.max(3, invitees.length))}
                className="field mt-1"
              >
                {invitees.map((i) => (
                  <option key={i.id} value={i.id}>{i.name ?? i.email}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1 text-xs">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary px-3 py-1 text-xs">
                {saving ? "Scheduling…" : "Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
