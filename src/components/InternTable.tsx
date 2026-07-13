import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { StatusEditor } from "@/components/StatusEditor";
import { timeAgo } from "@/lib/format";
import type { InternRow } from "@/lib/dashboard";

// Weekly submission state -> small badge.
function WeekBadge({ state }: { state: InternRow["state"] }) {
  const map = {
    submitted: { cls: "bg-success-tint text-success", label: "Submitted" },
    pending: { cls: "bg-warning-tint text-warning", label: "Pending" },
    overdue: { cls: "bg-danger-tint text-danger", label: "Overdue" },
  } as const;
  const m = map[state];
  return <span className={`pill ${m.cls}`}>{m.label}</span>;
}

// Shared table for the supervisor + admin dashboards. Overdue rows are tinted.
export function InternTable({ rows, showDepartment }: { rows: InternRow[]; showDepartment: boolean }) {
  if (rows.length === 0) {
    return <p className="card px-4 py-8 text-center text-sm text-subtle">No interns to show.</p>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-subtle">
            <th className="px-4 py-2.5 font-semibold">Intern</th>
            {showDepartment && <th className="px-4 py-2.5 font-semibold">Department</th>}
            <th className="px-4 py-2.5 font-semibold">Project</th>
            <th className="px-4 py-2.5 font-semibold">Last update</th>
            <th className="px-4 py-2.5 font-semibold">Today</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id} className={r.state === "overdue" ? "bg-danger-tint/50" : "hover:bg-surface-muted/60"}>
              <td className="px-4 py-3">
                <Link href={`/dashboard/${r.id}`} className="flex items-center gap-2.5 hover:opacity-80">
                  <Avatar name={r.name} email={r.email} image={r.image} size={32} />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{r.name ?? r.email}</p>
                    <p className="truncate text-xs text-subtle">{r.email}</p>
                  </div>
                </Link>
              </td>
              {showDepartment && <td className="px-4 py-3 text-muted">{r.department ?? "—"}</td>}
              <td className="px-4 py-3 text-muted">{r.project ?? "—"}</td>
              <td className="px-4 py-3 text-subtle">{r.lastSubmittedAt ? timeAgo(r.lastSubmittedAt) : "Never"}</td>
              <td className="px-4 py-3"><WeekBadge state={r.state} /></td>
              <td className="px-4 py-3">
                <StatusEditor internId={r.id} status={r.status} notes={r.notes} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
