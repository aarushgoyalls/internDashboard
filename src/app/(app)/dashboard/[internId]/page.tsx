import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { canViewIntern } from "@/lib/access";
import { getInternDetail } from "@/lib/dashboard";
import { Avatar } from "@/components/Avatar";
import { StatusEditor } from "@/components/StatusEditor";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { SdlcChart } from "@/components/SdlcChart";
import { formatDate } from "@/lib/format";
import { SDLC_STAGE_META } from "@/lib/constants";

// Per-intern progress report: header + activity/SDLC charts + full submission
// history. Admins can open any intern; supervisors only interns explicitly
// mapped to them.
export default async function InternDetailPage({ params }: { params: Promise<{ internId: string }> }) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const { internId } = await params;

  const intern = await getInternDetail(internId);
  if (!intern) notFound();
  if (!(await canViewIntern(me, intern.id))) redirect("/dashboard");

  const projectAssignments = await prisma.projectAssignment.findMany({
    where: { internId, project: { archived: false } },
    include: { project: true },
  });

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <Link href="/dashboard" className="text-sm font-medium text-subtle hover:text-accent">
          ← All interns
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={intern.name} email={intern.email} image={intern.image} size={48} />
            <div>
              <h1 className="page-title">{intern.name ?? intern.email}</h1>
              <p className="text-sm text-subtle">
                {intern.email}
                {intern.department ? ` · ${intern.department}` : ""}
              </p>
            </div>
          </div>
          <StatusEditor internId={intern.id} status={intern.status} notes={intern.notes} />
        </div>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Assigned projects</h2>
            <Link href="/projects" className="text-xs font-medium text-accent hover:underline">Manage →</Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {projectAssignments.map((a) => (
              <span key={a.id} className="pill border border-border bg-surface-muted text-muted">{a.project.name}</span>
            ))}
            {projectAssignments.length === 0 && <span className="text-xs text-subtle">No project assigned yet</span>}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="card p-4">
            <h2 className="text-sm font-semibold text-foreground">Check-in activity</h2>
            <p className="text-xs text-subtle">Last 30 days</p>
            <div className="mt-3">
              <ActivityHeatmap submissions={intern.submissions} />
            </div>
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-semibold text-foreground">Project progress</h2>
            <p className="text-xs text-subtle">
              {intern.isSoftwareDept ? "SDLC stage over time" : "Not tracked for this department"}
            </p>
            <div className="mt-3">
              {intern.isSoftwareDept ? (
                <SdlcChart submissions={intern.submissions} />
              ) : (
                <p className="card bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
                  N/A — department isn&apos;t flagged as software
                </p>
              )}
            </div>
          </section>
        </div>

        <section>
          <h2 className="section-title">
            Progress reports ({intern.submissions.length})
          </h2>
          <div className="mt-3 space-y-3">
            {intern.submissions.length === 0 && (
              <p className="card px-4 py-8 text-center text-sm text-subtle">
                No submissions yet.
              </p>
            )}
            {intern.submissions.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(s.periodStart)} · {s.project}
                  </p>
                  {s.sdlcStage && (
                    <span className="pill border border-border bg-surface-muted text-muted">
                      {SDLC_STAGE_META[s.sdlcStage].label}
                    </span>
                  )}
                </div>
                <div className="mt-2 grid gap-3 text-sm text-muted sm:grid-cols-2">
                  <div>
                    <p className="eyebrow">Did</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{s.didThisWeek}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Planned next</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{s.planNextWeek}</p>
                  </div>
                </div>
                {s.blocked && (
                  <p className="mt-2 rounded-btn bg-danger-tint px-3 py-2 text-xs text-danger">
                    <span className="font-semibold">Blocked:</span> {s.blockerDetail || "No detail given"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
