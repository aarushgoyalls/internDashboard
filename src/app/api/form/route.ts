import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/rbac";
import { formSubmissionSchema } from "@/lib/validation";
import { getDayStart } from "@/lib/period";

// POST /api/form -> intern submits (or revises) today's update.
// Keyed on (internId, periodStart) so re-submitting the same day updates it.
export async function POST(req: Request) {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;
  if (guard.role !== "INTERN" && !guard.isAlsoIntern)
    return NextResponse.json({ error: "Only interns submit the daily form" }, { status: 403 });

  const parsed = formSubmissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const d = parsed.data;
  const periodStart = getDayStart(new Date());
  const blockerDetail = d.blocked ? d.blockerDetail?.trim() || null : null;

  // Only persist the SDLC stage for software departments — ignore it otherwise,
  // even if a client sends one for a non-software department.
  const department = await prisma.department.findUnique({ where: { id: d.departmentId }, select: { isSoftware: true } });
  const sdlcStage = department?.isSoftware ? d.sdlcStage ?? null : null;

  // Resolve the Project field: a picked project's current name always wins
  // over stale client-side text (guards against a rename after the page loaded).
  let projectId: string | null = d.projectId ?? null;
  let project = d.project?.trim() ?? "";
  if (projectId) {
    const proj = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    if (proj) project = proj.name;
    else projectId = null; // stale/deleted id — fall back to whatever free text was sent
  }
  if (!project)
    return NextResponse.json({ error: "Project is required" }, { status: 400 });

  const submission = await prisma.formSubmission.upsert({
    where: { internId_periodStart: { internId: guard.id, periodStart } },
    create: {
      internId: guard.id,
      departmentId: d.departmentId,
      project,
      projectId,
      didThisWeek: d.didThisWeek,
      planNextWeek: d.planNextWeek,
      blocked: d.blocked,
      blockerDetail,
      sdlcStage,
      periodStart,
    },
    update: {
      departmentId: d.departmentId,
      project,
      projectId,
      didThisWeek: d.didThisWeek,
      planNextWeek: d.planNextWeek,
      blocked: d.blocked,
      blockerDetail,
      sdlcStage,
    },
  });

  // Upsert custom-question answers (skip blanks) for this submission.
  const answers = (d.answers ?? []).filter((a) => a.answer.trim().length > 0);
  await Promise.all(
    answers.map((a) =>
      prisma.formAnswer.upsert({
        where: { submissionId_questionId: { submissionId: submission.id, questionId: a.questionId } },
        create: { submissionId: submission.id, questionId: a.questionId, answer: a.answer.trim() },
        update: { answer: a.answer.trim() },
      })
    )
  );

  return NextResponse.json({ submission }, { status: 201 });
}
