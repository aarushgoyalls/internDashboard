"use client";

// Purely presentational month grid. Occurrence math and day-bucketing happen
// server-side (src/lib/meetings.ts); this just lays out cells and formats
// each event's clock time in the viewer's own browser timezone (server
// components can't know that, so this one piece has to be client-side).
export type CalendarEvent = { id: string; title: string; startISO: string; location: string | null };
export type DayCell = { dateISO: string; dayNum: number; inMonth: boolean; events: CalendarEvent[] };

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({ weeks }: { weeks: DayCell[][] }) {
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-subtle">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((cell) => {
          const isToday = cell.dateISO === todayKey;
          return (
            <div
              key={cell.dateISO}
              className={`min-h-24 border-b border-r border-border p-1.5 last:border-r-0 ${
                cell.inMonth ? "bg-surface" : "bg-surface-muted"
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-accent font-semibold text-white"
                    : cell.inMonth
                    ? "text-foreground"
                    : "text-subtle"
                }`}
              >
                {cell.dayNum}
              </span>
              <div className="mt-1 space-y-0.5">
                {cell.events.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    title={`${e.title}${e.location ? ` · ${e.location}` : ""}`}
                    className="truncate rounded-btn bg-accent-tint px-1 py-0.5 text-[11px] font-medium text-accent"
                  >
                    {new Date(e.startISO).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {e.title}
                  </div>
                ))}
                {cell.events.length > 3 && (
                  <div className="px-1 text-[11px] text-subtle">+{cell.events.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
