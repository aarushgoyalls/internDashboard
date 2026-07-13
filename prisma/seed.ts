/**
 * Seed: real org departments, managers (supervisors), and interns.
 * Clears app data first, then recreates, so you can re-run it.
 * No fabricated daily-submission history — real interns start with a clean
 * slate and fill in their own updates.
 * Run with: npm run db:seed
 */
import { PrismaClient, type Role } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "claude15@leptonmaps.com"; // Aarush Goyal -> logs in via Google

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const DEPARTMENTS = [
  "Founder's Office",
  "Software",
  "GIS",
  "Transit",
  "IT",
  "Legal",
  "Sales",
  "Finance",
  "Marketing",
];
const SOFTWARE_DEPARTMENTS = new Set(["Software"]);

// Managers (supervisors), by department. The first person listed sends that
// department's channel welcome message. DevOps is folded into Software;
// Management is folded into Founder's Office.
const SUPERVISORS: Record<string, { name: string; email: string }[]> = {
  "Founder's Office": [{ name: "Rajeev Saraf", email: "rajeev.saraf@leptonsoftware.com" }],
  Software: [
    { name: "Sonu Yadav", email: "sonu.yadav@leptonsoftware.com" },
    { name: "Nikhil Saraf", email: "nikhil.saraf@leptonsoftware.com" },
  ],
  GIS: [
    { name: "Ravendra", email: "ravendra@leptonsoftware.com" },
    { name: "Jitendra Kumar", email: "jitendra.kumar@leptonsoftware.com" },
  ],
  Transit: [{ name: "Rohit Baluni", email: "rohit.baluni@leptonsoftware.com" }],
  IT: [{ name: "Umang Saraf", email: "umang.saraf@leptonsoftware.com" }],
  Sales: [{ name: "Sushant Tripathi", email: "sushant.tripathi@leptonsoftware.com" }],
  Finance: [{ name: "Brijesh Sharma", email: "brijesh.sharma@leptonsoftware.com" }],
};

// Real interns. dept: null = not yet assigned a department.
// Deferred until real emails are available: Anmol (Transit, Bus Transit -
// Fetching Data) and the GIS intern on BOQ generation.
const INTERNS: { name: string; email: string; dept: string | null }[] = [
  { name: "Rithvik Devarasetty", email: "rithvik.devarasetty@leptonsoftware.com", dept: "Finance" },
  { name: "Ujjwal Gupta", email: "ujjwal.gupta@leptonsoftware.com", dept: "Sales" },
  { name: "Piyush Kumar", email: "piyush.kumar@leptonsoftware.com", dept: "GIS" },
  { name: "Anamika Bhaskar", email: "anamika.bhaskar@leptonsoftware.com", dept: "GIS" },
  { name: "Vibha", email: "vibha@leptonsoftware.com", dept: "GIS" },
  { name: "Mayank Yadav", email: "mayank.yadav@leptonmaps.com", dept: "GIS" },
  { name: "Santosh Harshavardhan Peddu", email: "santosh.peddu@leptonsoftware.com", dept: "Transit" },
  { name: "Shikhar", email: "shikhar@leptonsoftware.com", dept: "Transit" },
  { name: "Akshat Pundhir", email: "akshat.pundhir@leptonsoftware.com", dept: "Software" },
  { name: "Piyush Srivastava", email: "piyush.srivastava@leptonsoftware.com", dept: "IT" },
  { name: "Abhimanyu Rao", email: "abhimanyu.rao@leptonsoftware.com", dept: "GIS" },
  { name: "Boggarapu Kailas", email: "boggarapu.kailas@leptonsoftware.com", dept: null },
];

async function main() {
  console.log("Clearing existing app data...");
  // Order matters: children before parents (FKs).
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.dMParticipant.deleteMany();
  await prisma.dMThread.deleteMany();
  await prisma.channelMembership.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.internStatus.deleteMany();
  await prisma.formAnswer.deleteMany();
  await prisma.formQuestion.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.meetingAttendee.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.supervisorAssignment.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.appSetting.deleteMany();

  console.log("Creating departments...");
  const deptByName = new Map<string, string>();
  for (const name of DEPARTMENTS) {
    const d = await prisma.department.create({ data: { name, isSoftware: SOFTWARE_DEPARTMENTS.has(name) } });
    deptByName.set(name, d.id);
  }

  console.log("Creating admin (also carries the real Rail Transit assignment)...");
  const admin = await prisma.user.create({
    data: {
      name: "Aarush Goyal",
      email: ADMIN_EMAIL,
      role: "ADMIN" as Role,
      isAlsoIntern: true,
      departmentId: deptByName.get("Transit"),
    },
  });

  console.log("Creating supervisors...");
  const supervisorsByDept = new Map<string, { id: string; name: string }[]>();
  for (const [dept, people] of Object.entries(SUPERVISORS)) {
    const created: { id: string; name: string }[] = [];
    for (const p of people) {
      const u = await prisma.user.create({
        data: { name: p.name, email: p.email, role: "SUPERVISOR" as Role, departmentId: deptByName.get(dept) },
      });
      created.push({ id: u.id, name: u.name as string });
    }
    supervisorsByDept.set(dept, created);
  }

  console.log("Creating interns...");
  const internRecords: { id: string; dept: string | null }[] = [];
  for (const it of INTERNS) {
    const u = await prisma.user.create({
      data: {
        name: it.name,
        email: it.email,
        role: "INTERN" as Role,
        departmentId: it.dept ? deptByName.get(it.dept) : null,
      },
    });
    internRecords.push({ id: u.id, dept: it.dept });
  }

  console.log("Creating supervisor<->intern assignments...");
  // Starting mapping: every supervisor owns every intern in their department.
  // Admin can reshape this later from /admin.
  for (const [dept, supervisors] of supervisorsByDept) {
    const deptInterns = internRecords.filter((r) => r.dept === dept);
    for (const sup of supervisors) {
      for (const intern of deptInterns) {
        await prisma.supervisorAssignment.create({
          data: { supervisorId: sup.id, internId: intern.id },
        });
      }
    }
  }

  console.log("Creating channels + memberships...");
  // Global #general everyone joins.
  const general = await prisma.channel.create({ data: { name: "general", isGeneral: true } });
  const allSupervisorIds = [...supervisorsByDept.values()].flat().map((s) => s.id);
  const allMemberIds = [admin.id, ...internRecords.map((r) => r.id), ...allSupervisorIds];
  for (const uid of allMemberIds) {
    await prisma.channelMembership.create({ data: { userId: uid, channelId: general.id } });
  }

  // One channel per department; members = admin + that dept's supervisors + interns.
  for (const dept of DEPARTMENTS) {
    const ch = await prisma.channel.create({
      data: { name: slug(dept), departmentId: deptByName.get(dept) },
    });
    const members = new Set<string>([admin.id]);
    (supervisorsByDept.get(dept) ?? []).forEach((s) => members.add(s.id));
    internRecords.filter((r) => r.dept === dept).forEach((r) => members.add(r.id));
    for (const uid of members) {
      await prisma.channelMembership.create({ data: { userId: uid, channelId: ch.id } });
    }
    const firstSupervisor = (supervisorsByDept.get(dept) ?? [])[0];
    if (firstSupervisor) {
      await prisma.message.create({
        data: {
          channelId: ch.id,
          senderId: firstSupervisor.id,
          body: `Welcome to #${slug(dept)}! Post your daily updates and blockers here.`,
        },
      });
    }
  }
  await prisma.message.create({
    data: { channelId: general.id, senderId: admin.id, body: "👋 Welcome everyone! Remember to fill your daily update." },
  });

  // Default reminder setting: overdue after 1 day without a submission.
  await prisma.appSetting.create({ data: { key: "reminderIntervalDays", value: "1" } });

  const counts = {
    departments: await prisma.department.count(),
    users: await prisma.user.count(),
    channels: await prisma.channel.count(),
  };
  console.log("Seed complete:", counts);
  console.log(`Admin login (Google): ${ADMIN_EMAIL}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
