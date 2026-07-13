import type { RecurrenceFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDayStart } from "@/lib/period";

// Recurrence math, same manual Date.UTC style as period.ts (no date library
// installed). A Meeting is one row per series; occurrences are expanded on
// the fly for whatever range is being viewed, rather than materialized —
// edit/cancel always applies to the whole series.

export type RecurringMeeting = {
  startAt: Date;
  recurrence: RecurrenceFrequency;
  recurrenceEndDate: Date | null;
};

// Safety cap on how many occurrences we'll ever step through for one meeting.
const MAX_OCCURRENCES = 1000;

function stepForward(d: Date, recurrence: RecurrenceFrequency): Date {
  const next = new Date(d);
  switch (recurrence) {
    case "DAILY":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "BIWEEKLY":
      next.setUTCDate(next.getUTCDate() + 14);
      break;
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "NONE":
      break;
  }
  return next;
}

/** All occurrence start times for `meeting` that fall within [rangeStart, rangeEnd). */
export function getOccurrencesInRange(
  meeting: RecurringMeeting,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  if (meeting.recurrence === "NONE") {
    return meeting.startAt >= rangeStart && meeting.startAt < rangeEnd ? [meeting.startAt] : [];
  }

  const occurrences: Date[] = [];
  let cursor = meeting.startAt;
  let count = 0;
  while (cursor < rangeEnd && count < MAX_OCCURRENCES) {
    if (meeting.recurrenceEndDate && cursor > meeting.recurrenceEndDate) break;
    if (cursor >= rangeStart) occurrences.push(cursor);
    cursor = stepForward(cursor, meeting.recurrence);
    count++;
  }
  return occurrences;
}

/** [start, end) of a calendar month, both UTC midnight. monthIndex0 is 0-11. */
export function monthBounds(year: number, monthIndex0: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, monthIndex0, 1)),
    end: new Date(Date.UTC(year, monthIndex0 + 1, 1)),
  };
}

/** Every day cell (UTC midnight) needed to render a Sun-start calendar grid for this month. */
export function buildMonthGrid(year: number, monthIndex0: number): Date[] {
  const { start, end } = monthBounds(year, monthIndex0);
  const startWeekday = start.getUTCDay(); // 0 = Sunday
  const gridStart = new Date(start.getTime() - startWeekday * 86_400_000);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => new Date(gridStart.getTime() + i * 86_400_000));
}

// Day-of reminders for every attendee whose meeting has an occurrence today.
// Dedup key is `MEETING_REMINDER:<meetingId>:<todayISO>` per attendee — a
// plain meetingId isn't enough to distinguish occurrences of a recurring
// series, so the occurrence day is baked into the notification `type`
// (same freeform-type + createdAt-cutoff dedup pattern as generateReminders()).
export async function generateMeetingReminders(): Promise<{ created: number }> {
  const now = new Date();
  const todayStart = getDayStart(now);
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  const meetings = await prisma.meeting.findMany({
    where: { cancelledAt: null },
    include: { attendees: true },
  });

  const todaysMeetings = meetings
    .map((m) => ({ meeting: m, occurrences: getOccurrencesInRange(m, todayStart, todayEnd) }))
    .filter((x) => x.occurrences.length > 0);

  if (todaysMeetings.length === 0) return { created: 0 };

  const types = todaysMeetings.map(({ meeting }) => `MEETING_REMINDER:${meeting.id}:${todayStart.toISOString()}`);
  const existing = await prisma.notification.findMany({
    where: { type: { in: types }, createdAt: { gte: todayStart } },
    select: { userId: true, type: true },
  });
  const alreadyNotified = new Set(existing.map((n) => `${n.type}:${n.userId}`));

  const toCreate: { userId: string; type: string; body: string; link: string }[] = [];
  for (const { meeting } of todaysMeetings) {
    const type = `MEETING_REMINDER:${meeting.id}:${todayStart.toISOString()}`;
    for (const a of meeting.attendees) {
      const key = `${type}:${a.userId}`;
      if (alreadyNotified.has(key)) continue;
      toCreate.push({ userId: a.userId, type, body: `Reminder: "${meeting.title}" is today.`, link: "/meetings" });
    }
  }

  if (toCreate.length > 0) await prisma.notification.createMany({ data: toCreate });
  return { created: toCreate.length };
}
