import { prisma } from "@/lib/prisma";
import { getReminderSettings } from "@/lib/settings";
import { getDayStart, daysBetween } from "@/lib/period";
import { NOTIFICATION_TYPES } from "@/lib/constants";

// Core reminder logic, shared by the cron route and the admin "Run now" button.
// Daily cadence: reminds interns who are overdue (haven't submitted for more than
// the grace window) and haven't submitted today. Deduped to one reminder/day.
export async function generateReminders(): Promise<{ created: number }> {
  const settings = await getReminderSettings();
  const now = new Date();
  const today = getDayStart(now);

  const [interns, remindedToday] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ role: "INTERN" }, { isAlsoIntern: true }] },
      include: { submissions: { orderBy: { periodStart: "desc" }, take: 1 } },
    }),
    prisma.notification.findMany({
      where: { type: NOTIFICATION_TYPES.FORM_REMINDER, createdAt: { gte: today } },
      select: { userId: true },
    }),
  ]);

  const alreadyReminded = new Set(remindedToday.map((n) => n.userId));

  const toRemind = interns.filter((i) => {
    if (alreadyReminded.has(i.id)) return false; // one per day
    const latest = i.submissions[0];
    const hasToday = !!latest && latest.periodStart.getTime() === today.getTime();
    if (hasToday) return false;
    const daysSince = latest ? daysBetween(now, latest.periodStart) : Infinity;
    return daysSince > settings.reminderIntervalDays; // overdue
  });

  if (toRemind.length > 0) {
    await prisma.notification.createMany({
      data: toRemind.map((i) => ({
        userId: i.id,
        type: NOTIFICATION_TYPES.FORM_REMINDER,
        body: "Your daily update is overdue. Please submit it.",
        link: "/form",
      })),
    });
  }
  // Email delivery is a documented drop-in here later (see README).
  return { created: toRemind.length };
}
