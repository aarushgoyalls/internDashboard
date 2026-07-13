import { buildActivityWindow } from "@/lib/analytics";
import { dayLabel } from "@/lib/period";

// A GitHub-style activity strip: one cell per day, filled if the intern
// submitted a progress report that day. Reads left (oldest) to right (today).
export function ActivityHeatmap({
  submissions,
  days = 30,
}: {
  submissions: { periodStart: Date }[];
  days?: number;
}) {
  const window = buildActivityWindow(submissions, days);
  const submittedCount = window.filter((d) => d.submitted).length;

  return (
    <div>
      <div className="flex flex-wrap gap-[3px]">
        {window.map((d) => (
          <div
            key={d.date.getTime()}
            title={`${dayLabel(d.date)} — ${d.submitted ? "Submitted" : "Missed"}`}
            aria-label={`${dayLabel(d.date)}: ${d.submitted ? "submitted" : "missed"}`}
            className={`h-3.5 w-3.5 rounded-[4px] ${d.submitted ? "bg-success" : "bg-surface-muted"}`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-success" /> Submitted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-surface-muted border border-border" /> Missed
        </span>
        <span className="ml-auto text-muted">{submittedCount}/{days} days</span>
      </div>
    </div>
  );
}
