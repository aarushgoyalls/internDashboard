import { prisma } from "@/lib/prisma";
import { getManagedInterns } from "@/lib/access";
import { getDayStart } from "@/lib/period";
import { sendEmail } from "@/lib/email";

// Daily email to every supervisor: how many of their interns have submitted
// today's form, and who hasn't. Mirrors generateReminders() in reminders.ts,
// but the audience is supervisors (a summary) instead of interns (a nudge).
export async function generateSupervisorDigest(): Promise<{ sent: number }> {
  const now = new Date();
  const today = getDayStart(now);

  const supervisors = await prisma.user.findMany({
    where: { role: "SUPERVISOR", active: true },
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  for (const supervisor of supervisors) {
    const interns = await getManagedInterns({ role: "SUPERVISOR", id: supervisor.id });
    if (interns.length === 0) continue;

    const submittedToday = await prisma.formSubmission.findMany({
      where: { internId: { in: interns.map((i) => i.id) }, periodStart: today },
      select: { internId: true },
    });
    const submittedIds = new Set(submittedToday.map((s) => s.internId));
    const missing = interns.filter((i) => !submittedIds.has(i.id));

    const lines = [
      `${submittedIds.size}/${interns.length} interns submitted today's form.`,
      "",
      missing.length > 0
        ? `Missing:\n${missing.map((i) => `- ${i.name ?? i.email}`).join("\n")}`
        : "Everyone's submitted. Nice.",
    ];

    await sendEmail({
      to: supervisor.email,
      subject: `Daily submissions: ${submittedIds.size}/${interns.length} interns`,
      text: lines.join("\n"),
    });
    sent++;
  }

  return { sent };
}
