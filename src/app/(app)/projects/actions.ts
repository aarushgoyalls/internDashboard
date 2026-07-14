"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getManagedInterns, activeProjectCount, MAX_ACTIVE_PROJECTS } from "@/lib/access";

export async function createProject(formData: FormData) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  // Every new project needs a timeline going forward.
  if (!name || !startDate || !endDate) return;
  await prisma.project.create({
    data: { name, description, departmentId, createdById: me.id, startDate: new Date(startDate), endDate: new Date(endDate) },
  });
  revalidatePath("/projects");
}

// Set/update an existing project's timeline (also backfills projects created
// before this feature existed, which have no dates yet).
export async function updateProjectTimeline(projectId: string, formData: FormData) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { createdById: true } });
  if (!project || (me.role !== "ADMIN" && project.createdById !== me.id)) return;

  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  if (!startDate || !endDate) return;
  await prisma.project.update({
    where: { id: projectId },
    data: { startDate: new Date(startDate), endDate: new Date(endDate) },
  });
  revalidatePath("/projects");
}

export async function archiveProject(projectId: string) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { createdById: true } });
  if (!project || (me.role !== "ADMIN" && project.createdById !== me.id)) return;
  await prisma.project.update({ where: { id: projectId }, data: { archived: true } });
  revalidatePath("/projects");
}

// Replace a project's full set of assigned interns with the multi-select
// selection, restricted to interns the viewer actually manages. Interns not
// already on this project are silently dropped if adding them would push
// them over the MAX_ACTIVE_PROJECTS cap.
export async function updateProjectAssignments(projectId: string, formData: FormData) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true, assignments: { select: { internId: true } } },
  });
  if (!project || (me.role !== "ADMIN" && project.createdById !== me.id)) return;

  const managed = await getManagedInterns(me);
  const managedIds = new Set(managed.map((i) => i.id));
  const requestedIds = formData.getAll("internIds").map(String).filter((id) => managedIds.has(id));
  const currentlyAssignedIds = new Set(project.assignments.map((a) => a.internId));

  const internIds: string[] = [];
  for (const internId of requestedIds) {
    if (currentlyAssignedIds.has(internId) || (await activeProjectCount(internId)) < MAX_ACTIVE_PROJECTS) {
      internIds.push(internId);
    }
  }

  await prisma.$transaction([
    prisma.projectAssignment.deleteMany({ where: { projectId } }),
    prisma.projectAssignment.createMany({
      data: internIds.map((internId) => ({ projectId, internId, assignedById: me.id })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/projects");
}
