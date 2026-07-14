"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { setSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/constants";
import { generateReminders } from "@/lib/reminders";
import { syncUserDepartmentChannels } from "@/lib/access";

const ROLES: Role[] = ["INTERN", "SUPERVISOR", "ADMIN"];

// Update reminder cadence settings (clamped to sane ranges).
export async function updateSettings(formData: FormData) {
  await requireRole("ADMIN");
  const interval = Math.max(0, Math.min(30, parseInt(String(formData.get("reminderIntervalDays")), 10) || 1));
  await setSetting(SETTING_KEYS.reminderIntervalDays, String(interval));
  revalidatePath("/admin");
}

export async function runRemindersNow() {
  await requireRole("ADMIN");
  await generateReminders();
  revalidatePath("/admin");
}

export async function createDepartment(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const isSoftware = formData.get("isSoftware") === "on";
  if (!name) return;
  try {
    await prisma.department.create({ data: { name, isSoftware } });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e; // ignore dup name
  }
  revalidatePath("/admin");
}

// Toggle whether a department's daily form asks the SDLC-stage question.
export async function toggleDepartmentSoftware(departmentId: string, formData: FormData) {
  await requireRole("ADMIN");
  const isSoftware = formData.get("isSoftware") === "on";
  await prisma.department.update({ where: { id: departmentId }, data: { isSoftware } });
  revalidatePath("/admin");
}

export async function createUser(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = (String(formData.get("role") ?? "INTERN") as Role);
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const internshipEndDate = String(formData.get("internshipEndDate") ?? "") || null;
  if (!email || !ROLES.includes(role)) return;
  try {
    const created = await prisma.user.create({
      data: {
        name: name || null,
        email,
        role,
        departmentId,
        internshipEndDate: internshipEndDate ? new Date(internshipEndDate) : null,
      },
    });
    await syncUserDepartmentChannels(created.id, departmentId);
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e; // ignore dup email
  }
  revalidatePath("/admin");
}

// Change a user's role, department, and/or internship end date.
export async function updateUser(userId: string, formData: FormData) {
  await requireRole("ADMIN");
  const role = String(formData.get("role") ?? "") as Role;
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const internshipEndDate = String(formData.get("internshipEndDate") ?? "") || null;
  if (!ROLES.includes(role)) return;
  await prisma.user.update({
    where: { id: userId },
    data: { role, departmentId, internshipEndDate: internshipEndDate ? new Date(internshipEndDate) : null },
  });
  await syncUserDepartmentChannels(userId, departmentId);
  revalidatePath("/admin");
}

// Deactivate/reactivate a user: blocks sign-in and hides them from pickers,
// but keeps their historical data (submissions, messages) intact — a real
// delete would cascade-destroy that history.
export async function setUserActive(userId: string, formData: FormData) {
  await requireRole("ADMIN");
  const active = formData.get("active") === "true";
  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin");
}

// Replace a supervisor's full set of assigned interns with the selection
// from the multi-select (independent of department).
export async function updateSupervisorAssignments(supervisorId: string, formData: FormData) {
  await requireRole("ADMIN");
  const internIds = formData.getAll("internIds").map(String).filter(Boolean);
  await prisma.$transaction([
    prisma.supervisorAssignment.deleteMany({ where: { supervisorId } }),
    prisma.supervisorAssignment.createMany({
      data: internIds.map((internId) => ({ supervisorId, internId })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/admin");
}
