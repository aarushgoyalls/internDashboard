/**
 * One-time load of real, named projects Aarush provided (title, manager,
 * assigned intern(s), department). Idempotent — safe to re-run: skips a
 * project if one with the same name + creator already exists, and
 * intern/supervisor assignments use skipDuplicates.
 * Run with: npx tsx prisma/add-real-projects.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Cross-department pairs: the project's manager doesn't already manage this
// intern under the department-based backfill, so we add an explicit
// SupervisorAssignment before assigning the project.
const EXTRA_SUPERVISOR_ASSIGNMENTS: { supervisorEmail: string; internEmail: string }[] = [
  { supervisorEmail: "brijesh.sharma@leptonsoftware.com", internEmail: "ujjwal.gupta@leptonsoftware.com" },
  { supervisorEmail: "rajeev.saraf@leptonsoftware.com", internEmail: "claude15@leptonmaps.com" }, // Aarush Goyal, Rail Transit
];

const PROJECTS: { name: string; managerEmail: string; deptName: string; internEmails: string[] }[] = [
  { name: "Payments and Expenses Tracking", managerEmail: "brijesh.sharma@leptonsoftware.com", deptName: "Finance", internEmails: ["ujjwal.gupta@leptonsoftware.com", "rithvik.devarasetty@leptonsoftware.com"] },
  { name: "All PO and customer agreements tracking", managerEmail: "sushant.tripathi@leptonsoftware.com", deptName: "Sales", internEmails: ["ujjwal.gupta@leptonsoftware.com"] },
  { name: "Google Earth Validation (survey data validation)", managerEmail: "ravendra@leptonsoftware.com", deptName: "GIS", internEmails: ["piyush.kumar@leptonsoftware.com"] },
  { name: "GeoCoding", managerEmail: "ravendra@leptonsoftware.com", deptName: "GIS", internEmails: ["anamika.bhaskar@leptonsoftware.com"] },
  { name: "Bus Transit (Production)", managerEmail: "rohit.baluni@leptonsoftware.com", deptName: "Transit", internEmails: ["santosh.peddu@leptonsoftware.com"] },
  { name: "IOCL", managerEmail: "sonu.yadav@leptonsoftware.com", deptName: "Software", internEmails: ["akshat.pundhir@leptonsoftware.com"] },
  { name: "BOQ generation", managerEmail: "jitendra.kumar@leptonsoftware.com", deptName: "GIS", internEmails: ["piyush.kumar@leptonsoftware.com"] },
  { name: "ABP creation", managerEmail: "ravendra@leptonsoftware.com", deptName: "GIS", internEmails: ["vibha@leptonsoftware.com"] },
  { name: "CISF", managerEmail: "jitendra.kumar@leptonsoftware.com", deptName: "GIS", internEmails: ["mayank.yadav@leptonmaps.com"] },
  { name: "Bus Transit (Fetching Data)", managerEmail: "rohit.baluni@leptonsoftware.com", deptName: "Transit", internEmails: [] }, // Anmol -- no account yet, see logged warning
  { name: "Bus Transit (Validation)", managerEmail: "rohit.baluni@leptonsoftware.com", deptName: "Transit", internEmails: ["shikhar@leptonsoftware.com"] },
  { name: "Rail Transit", managerEmail: "rajeev.saraf@leptonsoftware.com", deptName: "Transit", internEmails: ["claude15@leptonmaps.com"] },
  { name: "PMAY(housing)", managerEmail: "ravendra@leptonsoftware.com", deptName: "GIS", internEmails: ["abhimanyu.rao@leptonsoftware.com"] },
  { name: "Vendor Report App", managerEmail: "ravendra@leptonsoftware.com", deptName: "GIS", internEmails: ["abhimanyu.rao@leptonsoftware.com"] },
];

async function main() {
  console.log("Adding extra cross-department supervisor assignments...");
  for (const { supervisorEmail, internEmail } of EXTRA_SUPERVISOR_ASSIGNMENTS) {
    const [supervisor, intern] = await Promise.all([
      prisma.user.findUnique({ where: { email: supervisorEmail } }),
      prisma.user.findUnique({ where: { email: internEmail } }),
    ]);
    if (!supervisor || !intern) {
      console.warn(`  SKIP: couldn't find ${supervisorEmail} or ${internEmail}`);
      continue;
    }
    await prisma.supervisorAssignment.upsert({
      where: { supervisorId_internId: { supervisorId: supervisor.id, internId: intern.id } },
      create: { supervisorId: supervisor.id, internId: intern.id },
      update: {},
    });
    console.log(`  ${supervisor.name} <-> ${intern.name}`);
  }

  console.log("Adding projects...");
  const missingUsers = new Set<string>();
  for (const p of PROJECTS) {
    const manager = await prisma.user.findUnique({ where: { email: p.managerEmail } });
    const department = await prisma.department.findUnique({ where: { name: p.deptName } });
    if (!manager) {
      console.warn(`  SKIP "${p.name}": manager ${p.managerEmail} not found`);
      continue;
    }

    let project = await prisma.project.findFirst({ where: { name: p.name, createdById: manager.id } });
    if (!project) {
      project = await prisma.project.create({
        data: { name: p.name, createdById: manager.id, departmentId: department?.id ?? null },
      });
      console.log(`  Created "${p.name}" (${p.deptName}) -> ${manager.name}`);
    } else {
      console.log(`  Exists  "${p.name}" -> ${manager.name}`);
    }

    for (const internEmail of p.internEmails) {
      const intern = await prisma.user.findUnique({ where: { email: internEmail } });
      if (!intern) {
        missingUsers.add(internEmail);
        continue;
      }
      await prisma.projectAssignment.upsert({
        where: { projectId_internId: { projectId: project.id, internId: intern.id } },
        create: { projectId: project.id, internId: intern.id, assignedById: manager.id },
        update: {},
      });
    }
  }

  console.warn('\n"Bus Transit (Fetching Data)" created with NO intern assigned -- Anmol has no email/account yet.');
  console.warn("Create their User in /admin (role INTERN, dept Transit), then assign them on /projects.");

  if (missingUsers.size > 0) {
    console.warn("\nAlso not assigned -- no User account found for:");
    for (const email of missingUsers) console.warn(`  - ${email}`);
  }

  console.log("\nDone.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
