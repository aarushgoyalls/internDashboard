import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Can this user read/post in this channel? Members can; admins can see all.
export async function canAccessChannel(
  userId: string,
  role: Role,
  channelId: string
): Promise<boolean> {
  if (role === "ADMIN") return true;
  const membership = await prisma.channelMembership.findUnique({
    where: { userId_channelId: { userId, channelId } },
  });
  return !!membership;
}

// Can this user read/post in this DM thread? Only its two participants.
export async function canAccessDmThread(userId: string, threadId: string): Promise<boolean> {
  const p = await prisma.dMParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
  });
  return !!p;
}

// Can this viewer open an intern's detail/progress-report page, assign them a
// project, add form questions for them, or invite them to a meeting? Admins
// see everyone; supervisors only interns explicitly mapped to them via
// SupervisorAssignment (independent of department).
export async function canViewIntern(
  viewer: { role: Role; id: string },
  internId: string
): Promise<boolean> {
  if (viewer.role === "ADMIN") return true;
  if (viewer.role === "SUPERVISOR") {
    const assignment = await prisma.supervisorAssignment.findUnique({
      where: { supervisorId_internId: { supervisorId: viewer.id, internId } },
    });
    return !!assignment;
  }
  return false;
}

export type ManagedIntern = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

// Every intern a viewer can manage: admins get everyone active; supervisors
// get only interns explicitly mapped to them. Backs project assignment,
// meeting invitee pickers, and form-question authorship scoping.
export async function getManagedInterns(viewer: { role: Role; id: string }): Promise<ManagedIntern[]> {
  const internWhere = { OR: [{ role: "INTERN" as const }, { isAlsoIntern: true }], active: true };

  if (viewer.role === "ADMIN") {
    return prisma.user.findMany({
      where: internWhere,
      select: { id: true, name: true, email: true, image: true },
      orderBy: [{ name: "asc" }],
    });
  }

  if (viewer.role === "SUPERVISOR") {
    return prisma.user.findMany({
      where: { ...internWhere, assignedSupervisors: { some: { supervisorId: viewer.id } } },
      select: { id: true, name: true, email: true, image: true },
      orderBy: [{ name: "asc" }],
    });
  }

  return [];
}
