import { prisma } from "@/lib/prisma";
import { getReminderSettings } from "@/lib/settings";
import { getDayStart, submissionState, type SubmissionState } from "@/lib/period";
import { getManagedInterns } from "@/lib/access";
import type { StatusValue, SdlcStage, Role } from "@prisma/client";

export type InternRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  department: string | null;
  project: string | null;
  lastSubmittedAt: Date | null;
  state: SubmissionState; // today's submission state
  status: StatusValue | null; // supervisor-set health
  notes: string | null;
};

// Builds the per-intern dashboard rows for a viewer: admins see everyone,
// supervisors see only interns explicitly mapped to them (SupervisorAssignment).
export async function getInternRows(viewer: { role: Role; id: string }): Promise<InternRow[]> {
  const settings = await getReminderSettings();
  const today = getDayStart(new Date());
  const now = new Date();

  const managed = await getManagedInterns(viewer);
  const managedIds = managed.map((m) => m.id);
  if (viewer.role === "SUPERVISOR" && managedIds.length === 0) return [];

  const interns = await prisma.user.findMany({
    where: {
      OR: [{ role: "INTERN" }, { isAlsoIntern: true }],
      ...(viewer.role === "SUPERVISOR" ? { id: { in: managedIds } } : {}),
    },
    include: {
      department: true,
      status: true,
      submissions: { orderBy: { periodStart: "desc" }, take: 1 },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });

  return interns.map((i) => {
    const latest = i.submissions[0] ?? null;
    const hasToday = !!latest && latest.periodStart.getTime() === today.getTime();
    return {
      id: i.id,
      name: i.name,
      email: i.email,
      image: i.image,
      department: i.department?.name ?? null,
      project: latest?.project ?? null,
      lastSubmittedAt: latest?.createdAt ?? null,
      state: submissionState(hasToday, latest?.periodStart ?? null, now, settings),
      status: i.status?.status ?? null,
      notes: i.status?.notes ?? null,
    };
  });
}

export type InternDetail = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  departmentId: string | null;
  department: string | null;
  isSoftwareDept: boolean;
  status: StatusValue | null;
  notes: string | null;
  submissions: {
    id: string;
    periodStart: Date;
    project: string;
    didThisWeek: string;
    planNextWeek: string;
    blocked: boolean;
    blockerDetail: string | null;
    sdlcStage: SdlcStage | null;
  }[];
};

// Full profile for one intern: header info + their entire submission history
// (most recent first). Powers the per-intern progress-report page.
export async function getInternDetail(internId: string): Promise<InternDetail | null> {
  const intern = await prisma.user.findFirst({
    where: { id: internId, OR: [{ role: "INTERN" }, { isAlsoIntern: true }] },
    include: {
      department: true,
      status: true,
      submissions: { orderBy: { periodStart: "desc" } },
    },
  });
  if (!intern) return null;

  return {
    id: intern.id,
    name: intern.name,
    email: intern.email,
    image: intern.image,
    departmentId: intern.departmentId,
    department: intern.department?.name ?? null,
    isSoftwareDept: intern.department?.isSoftware ?? false,
    status: intern.status?.status ?? null,
    notes: intern.status?.notes ?? null,
    submissions: intern.submissions,
  };
}
