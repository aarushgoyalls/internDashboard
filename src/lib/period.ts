// Daily-cadence math. Everything is computed in UTC so results are identical
// regardless of server timezone (important on Vercel).
//
// The progress form recurs DAILY: each submission covers one calendar day.
// An intern is "overdue" once they haven't submitted for more than
// reminderIntervalDays days (the configurable grace window).

/** Midnight 00:00:00 UTC of the day containing `d`. */
export function getDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole days between two dates (by day boundary), a - b. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((getDayStart(a).getTime() - getDayStart(b).getTime()) / 86_400_000);
}

export type SubmissionState = "submitted" | "pending" | "overdue";

/**
 * Where an intern stands today.
 * - submitted: they filed today's update
 * - overdue:   last submission is more than the grace window ago (or never)
 * - pending:   nothing today yet, but still within the grace window
 */
export function submissionState(
  hasSubmittedToday: boolean,
  lastSubmissionDay: Date | null,
  now: Date,
  settings: { reminderIntervalDays: number }
): SubmissionState {
  if (hasSubmittedToday) return "submitted";
  const daysSince = lastSubmissionDay ? daysBetween(now, lastSubmissionDay) : Infinity;
  return daysSince > settings.reminderIntervalDays ? "overdue" : "pending";
}

/** Human label like "Mon, Jul 13" for a day. */
export function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
