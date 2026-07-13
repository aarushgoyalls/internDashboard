"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getManagedInterns } from "@/lib/access";

export async function createProject(formData: FormData) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return;
  await prisma.project.create({ data: { name, description, createdById: me.id } });
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
// selection, restricted to interns the viewer actually manages.
export async function updateProjectAssignments(projectId: string, formData: FormData) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { createdById: true } });
  if (!project || (me.role !== "ADMIN" && project.createdById !== me.id)) return;

  const managed = await getManagedInterns(me);
  const managedIds = new Set(managed.map((i) => i.id));
  const internIds = formData.getAll("internIds").map(String).filter((id) => managedIds.has(id));

  await prisma.$transaction([
    prisma.projectAssignment.deleteMany({ where: { projectId } }),
    prisma.projectAssignment.createMany({
      data: internIds.map((internId) => ({ projectId, internId, assignedById: me.id })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/projects");
}
