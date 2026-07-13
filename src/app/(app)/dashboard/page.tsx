import { requireRole } from "@/lib/rbac";
import { getInternRows } from "@/lib/dashboard";
import { InternTable } from "@/components/InternTable";

export default async function DashboardPage() {
  // Supervisors + admins only.
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const isAdmin = me.role === "ADMIN";

  // Supervisors are scoped to interns explicitly mapped to them; admins see everyone.
  const rows = await getInternRows(me);

  const overdue = rows.filter((r) => r.state === "overdue").length;
  const unsatisfactory = rows.filter((r) => r.status === "UNSATISFACTORY").length;
  const behind = rows.filter((r) => r.status === "BEHIND").length;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="page-title">
            {isAdmin ? "All interns" : "My interns"}
          </h1>
          <span className="text-sm text-subtle">{rows.length} intern{rows.length === 1 ? "" : "s"}</span>
        </div>

        {/* Summary tiles */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Tile label="Overdue today" value={overdue} tone={overdue > 0 ? "danger" : "neutral"} />
          <Tile label="Unsatisfactory" value={unsatisfactory} tone={unsatisfactory > 0 ? "warning" : "neutral"} />
          <Tile label="Behind" value={behind} tone={behind > 0 ? "danger" : "neutral"} />
        </div>

        <div className="mt-6">
          <InternTable rows={rows} showDepartment />
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "neutral" }) {
  const toneCls = {
    danger: "border-danger/20 bg-danger-tint text-danger",
    warning: "border-warning/20 bg-warning-tint text-warning",
    neutral: "border-border bg-surface text-foreground",
  }[tone];
  return (
    <div className={`rounded-card border px-4 py-3.5 ${toneCls}`}>
      <p className="font-display text-2xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-xs font-medium">{label}</p>
    </div>
  );
}
