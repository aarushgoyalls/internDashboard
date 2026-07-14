/**
 * One-time backfill: bring every active user's channel memberships in line
 * with the department-channel enforcement added in
 * src/lib/access.ts (syncUserDepartmentChannels) — join global channels plus
 * their own department's, leave any other department's. Idempotent — safe
 * to re-run.
 * Run with: npx tsx prisma/sync-department-channels.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function syncUserDepartmentChannels(userId: string, departmentId: string | null) {
  const [joinable, leave] = await Promise.all([
    prisma.channel.findMany({
      where: departmentId ? { OR: [{ isGeneral: true }, { departmentId }] } : { isGeneral: true },
      select: { id: true },
    }),
    prisma.channel.findMany({
      where: departmentId
        ? { departmentId: { not: null }, NOT: { departmentId } }
        : { departmentId: { not: null } },
      select: { id: true },
    }),
  ]);

  await prisma.$transaction([
    prisma.channelMembership.deleteMany({
      where: { userId, channelId: { in: leave.map((c) => c.id) } },
    }),
    prisma.channelMembership.createMany({
      data: joinable.map((c) => ({ userId, channelId: c.id })),
      skipDuplicates: true,
    }),
  ]);
}

async function main() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, departmentId: true },
  });

  console.log(`Syncing channel memberships for ${users.length} active users...`);
  for (const u of users) {
    await syncUserDepartmentChannels(u.id, u.departmentId);
    console.log(`  ${u.name ?? u.email}`);
  }
  console.log("Done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
