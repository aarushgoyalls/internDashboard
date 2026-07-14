import { google } from "googleapis";
import type { RecurrenceFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Maps our RecurrenceFrequency (one Meeting row = one series, expanded
// on-the-fly for display — see src/lib/meetings.ts) onto a Google Calendar
// RRULE, so the synced event repeats natively on the organizer's real
// calendar instead of only showing its first occurrence.
function toRRule(recurrence: RecurrenceFrequency, recurrenceEndDate: Date | null): string[] | undefined {
  if (recurrence === "NONE") return undefined;
  const freq = { DAILY: "DAILY", WEEKLY: "WEEKLY", BIWEEKLY: "WEEKLY", MONTHLY: "MONTHLY" }[recurrence];
  const interval = recurrence === "BIWEEKLY" ? ";INTERVAL=2" : "";
  const until = recurrenceEndDate
    ? `;UNTIL=${recurrenceEndDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`
    : "";
  return [`RRULE:FREQ=${freq}${interval}${until}`];
}

// Best-effort Google Calendar sync for meetings. Every function here is
// designed to fail soft: an organizer who hasn't (or can't) grant Calendar
// access just doesn't get sync — the in-app Meeting still works normally.
// This matters because most seeded/dev-switcher accounts have no Google
// Account row at all, and real users who signed in before the calendar
// scope was added won't have a refresh_token yet either.

// Builds an OAuth2 client loaded with this user's stored Google tokens, or
// null if they've never granted Calendar access (no Account row, or no
// refresh_token because they signed in before the scope existed).
async function getOAuth2ClientForUser(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId, provider: "google" } });
  if (!account?.refresh_token) return null;

  const oauth2Client = new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET);
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // googleapis auto-refreshes the access token when it's expired; persist
  // the new one so the next call doesn't have to refresh again.
  oauth2Client.on("tokens", (tokens) => {
    prisma.account
      .update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token ?? undefined,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
        },
      })
      .catch(() => {}); // best-effort; a failed token save just means a refresh next call too
  });

  return oauth2Client;
}

// Creates the event on the organizer's primary calendar and emails invites
// to attendees. Returns the Google event id to store on the Meeting row, or
// null if sync was skipped/failed.
export async function createCalendarEvent(
  organizerId: string,
  meeting: {
    title: string;
    description: string | null;
    startAt: Date;
    durationMins: number;
    attendeeEmails: string[];
    recurrence: RecurrenceFrequency;
    recurrenceEndDate: Date | null;
  }
): Promise<string | null> {
  const auth = await getOAuth2ClientForUser(organizerId);
  if (!auth) return null;

  try {
    const calendar = google.calendar({ version: "v3", auth });
    const endAt = new Date(meeting.startAt.getTime() + meeting.durationMins * 60_000);
    const event = await calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: {
        summary: meeting.title,
        description: meeting.description ?? undefined,
        start: { dateTime: meeting.startAt.toISOString() },
        end: { dateTime: endAt.toISOString() },
        attendees: meeting.attendeeEmails.map((email) => ({ email })),
        recurrence: toRRule(meeting.recurrence, meeting.recurrenceEndDate),
      },
    });
    return event.data.id ?? null;
  } catch (e) {
    console.error("Google Calendar sync (create) failed:", e);
    return null;
  }
}

// Cancels the synced event. No-op if the organizer never had Calendar access.
export async function cancelCalendarEvent(organizerId: string, googleEventId: string): Promise<void> {
  const auth = await getOAuth2ClientForUser(organizerId);
  if (!auth) return;

  try {
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId, sendUpdates: "all" });
  } catch (e) {
    console.error("Google Calendar sync (cancel) failed:", e);
  }
}
