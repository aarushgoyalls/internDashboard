/**
 * One-time backfill: creates a SupervisorAssignment row for every current
 * (supervisor, intern) pair that shares a departmentId, so introducing the
 * explicit mapping doesn't change anyone's visibility on day one. Admin
 * adjusts the mapping from there via /admin.
 * Safe to re-run — skips pairs that already have an assignment.
 * Run with: npx tsx prisma/backfill-supervisor-assignments.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [supervisors, interns] = await Promise.all([
    prisma.user.findMany({ where: { role: "SUPERVISOR" }, select: { id: true, departmentId: true } }),
    prisma.user.findMany({
      where: { OR: [{ role: "INTERN" }, { isAlsoIntern: true }] },
      select: { id: true, departmentId: true },
    }),
  ]);

  const pairs: { supervisorId: string; internId: string }[] = [];
  for (const s of supervisors) {
    if (!s.departmentId) continue;
    for (const i of interns) {
      if (i.departmentId === s.departmentId) pairs.push({ supervisorId: s.id, internId: i.id });
    }
  }

  const result = await prisma.supervisorAssignment.createMany({ data: pairs, skipDuplicates: true });
  console.log(`Backfilled ${result.count} supervisor<->intern assignments (${pairs.length} candidate pairs).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
