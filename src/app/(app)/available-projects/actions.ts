"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/rbac";
import { activeProjectCount, MAX_ACTIVE_PROJECTS } from "@/lib/access";
import { NOTIFICATION_TYPES } from "@/lib/constants";

const MAX_DESCRIPTION_WORDS = 300;
const MAX_SKILLS_WORDS = 50;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Not quite requireRole("INTERN") since isAlsoIntern lets a non-intern
// participate too — same OR check used across the daily form / sidebar nav.
async function requireIntern() {
  const me = await requireUser();
  if (me.role !== "INTERN" && !me.isAlsoIntern) redirect("/");
  return me;
}

export async function createListedProject(formData: FormData) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const skillsRequired = String(formData.get("skillsRequired") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  if (!name) return;
  if (countWords(description) > MAX_DESCRIPTION_WORDS) return;
  if (countWords(skillsRequired) > MAX_SKILLS_WORDS) return;

  await prisma.project.create({
    data: {
      name,
      description: description || null,
      skillsRequired: skillsRequired || null,
      departmentId,
      createdById: me.id,
      listed: true,
    },
  });
  revalidatePath("/available-projects");
}

export async function unlistProject(projectId: string) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { createdById: true } });
  if (!project || (me.role !== "ADMIN" && project.createdById !== me.id)) return;
  await prisma.project.update({ where: { id: projectId }, data: { listed: false } });
  revalidatePath("/available-projects");
}

export async function addToWishlist(projectId: string) {
  const me = await requireIntern();
  await prisma.projectWishlist.createMany({
    data: [{ projectId, internId: me.id }],
    skipDuplicates: true,
  });
  revalidatePath("/available-projects");
}

export async function removeFromWishlist(projectId: string) {
  const me = await requireIntern();
  await prisma.projectWishlist.deleteMany({ where: { projectId, internId: me.id } });
  revalidatePath("/available-projects");
}

// Separate from wishlisting — explicitly signals the supervisor, which a
// private bookmark should not do.
export async function expressInterest(projectId: string) {
  const me = await requireIntern();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true, name: true },
  });
  if (!project) return;

  const created = await prisma.projectInterest.createMany({
    data: [{ projectId, internId: me.id }],
    skipDuplicates: true,
  });
  if (created.count > 0) {
    await prisma.notification.create({
      data: {
        userId: project.createdById,
        type: NOTIFICATION_TYPES.PROJECT_INTEREST,
        body: `${me.name ?? me.email} is interested in ${project.name}`,
        link: "/available-projects",
      },
    });
  }
  revalidatePath("/available-projects");
}

export async function withdrawInterest(projectId: string) {
  const me = await requireIntern();
  await prisma.projectInterest.deleteMany({ where: { projectId, internId: me.id } });
  revalidatePath("/available-projects");
}

// Supervisor picks one interested intern and assigns them directly — reuses
// the same ProjectAssignment table /projects manages, so it instantly shows
// up there and in the intern's daily-form project dropdown. Silently blocked
// if the intern is already at the MAX_ACTIVE_PROJECTS cap.
export async function assignInterestedIntern(projectId: string, internId: string) {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true, name: true },
  });
  if (!project || (me.role !== "ADMIN" && project.createdById !== me.id)) return;
  if ((await activeProjectCount(internId)) >= MAX_ACTIVE_PROJECTS) return;

  await prisma.projectAssignment.createMany({
    data: [{ projectId, internId, assignedById: me.id }],
    skipDuplicates: true,
  });
  await prisma.notification.create({
    data: {
      userId: internId,
      type: NOTIFICATION_TYPES.PROJECT_ASSIGNED,
      body: `You've been assigned to ${project.name}`,
      link: "/form",
    },
  });
  revalidatePath("/available-projects");
  revalidatePath("/projects");
}
