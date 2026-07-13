import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getReminderSettings } from "@/lib/settings";
import { getDayStart, submissionState, dayLabel } from "@/lib/period";
import { formatDate } from "@/lib/format";
import { ProgressForm } from "@/components/ProgressForm";
import { SDLC_STAGE_META } from "@/lib/constants";

export default async function FormPage() {
  const me = await requireUser();
  // The daily form is intern-only, plus anyone flagged isAlsoIntern (e.g. an
  // admin who's also carrying an intern-style project); others go to their dashboard.
  if (me.role !== "INTERN" && !me.isAlsoIntern) redirect("/dashboard");

  const today = getDayStart(new Date());
  const [departments, current, history, settings, myProjectAssignments, mySupervisorIds] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.formSubmission.findUnique({ where: { internId_periodStart: { internId: me.id, periodStart: today } } }),
    prisma.formSubmission.findMany({ where: { internId: me.id }, orderBy: { periodStart: "desc" }, take: 14 }),
    getReminderSettings(),
    prisma.projectAssignment.findMany({
      where: { internId: me.id, project: { archived: false } },
      include: { project: true },
    }),
    prisma.supervisorAssignment.findMany({ where: { internId: me.id }, select: { supervisorId: true } }),
  ]);

  // Union of active questions authored by any supervisor mapped to this intern.
  const questions = await prisma.formQuestion.findMany({
    where: { supervisorId: { in: mySupervisorIds.map((s) => s.supervisorId) }, active: true },
    orderBy: { order: "asc" },
  });
  const existingAnswers = current
    ? await prisma.formAnswer.findMany({ where: { submissionId: current.id } })
    : [];

  const lastDay = history[0]?.periodStart ?? null;
  const state = submissionState(!!current, lastDay, new Date(), settings);

  const banner =
    state === "submitted"
      ? { cls: "border-success/20 bg-success-tint text-success", text: "✓ You've submitted today's update. You can revise it below." }
      : state === "overdue"
      ? { cls: "border-danger/20 bg-danger-tint text-danger", text: "Your daily update is overdue. Please submit it now." }
      : { cls: "border-accent/20 bg-accent-tint text-accent", text: "Fill in today's update below." };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="page-title">Daily update</h1>
          <span className="text-sm text-subtle">{dayLabel(today)}</span>
        </div>

        <div className={`mt-4 rounded-card border px-4 py-3 text-sm font-medium ${banner.cls}`}>{banner.text}</div>

        <div className="mt-6 panel p-6">
          <ProgressForm
            departments={departments.map((d) => ({ id: d.id, name: d.name, isSoftware: d.isSoftware }))}
            defaultDepartmentId={me.departmentId}
            existing={current}
            projects={myProjectAssignments.map((a) => ({ id: a.project.id, name: a.project.name }))}
            questions={questions.map((q) => ({ id: q.id, prompt: q.prompt }))}
            existingAnswers={existingAnswers.map((a) => ({ questionId: a.questionId, answer: a.answer }))}
          />
        </div>

        {/* History */}
        <h2 className="section-title mt-10">Recent submissions</h2>
        <div className="mt-3 space-y-3">
          {history.length === 0 && <p className="text-sm text-subtle">No submissions yet.</p>}
          {history.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{dayLabel(s.periodStart)}</p>
                <span className="text-xs text-subtle">Submitted {formatDate(s.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                Project: {s.project}
                {s.sdlcStage && <span> · {SDLC_STAGE_META[s.sdlcStage].label}</span>}
              </p>
              <p className="mt-2 text-sm text-foreground"><span className="text-subtle">Did:</span> {s.didThisWeek}</p>
              <p className="mt-1 text-sm text-foreground"><span className="text-subtle">Next:</span> {s.planNextWeek}</p>
              {s.blocked && (
                <p className="mt-2 rounded-btn bg-danger-tint px-2 py-1 text-sm text-danger">
                  🚧 Blocked{s.blockerDetail ? `: ${s.blockerDetail}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
