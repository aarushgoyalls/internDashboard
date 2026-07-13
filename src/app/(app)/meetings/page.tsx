import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isSupervisorOrAdmin } from "@/lib/rbac";
import { getManagedInterns } from "@/lib/access";
import { getDayStart } from "@/lib/period";
import { buildMonthGrid, getOccurrencesInRange } from "@/lib/meetings";
import { CalendarGrid, type DayCell } from "@/components/CalendarGrid";
import { ScheduleMeetingForm } from "@/components/ScheduleMeetingForm";
import { CancelMeetingButton } from "@/components/CancelMeetingButton";

// Month calendar + upcoming list. Admins see every meeting; supervisors and
// interns see only ones they organize or are invited to. Recurring meetings
// are one DB row expanded on the fly for the visible month (see
// src/lib/meetings.ts) — there's no per-occurrence data to query.
export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const now = new Date();
  const year = sp.y ? parseInt(sp.y, 10) : now.getUTCFullYear();
  const monthIndex0 = sp.m ? parseInt(sp.m, 10) - 1 : now.getUTCMonth();

  const canSchedule = isSupervisorOrAdmin(me);
  const isAdmin = me.role === "ADMIN";

  const grid = buildMonthGrid(year, monthIndex0);
  const gridStart = grid[0];
  const gridEnd = new Date(grid[grid.length - 1].getTime() + 86_400_000);

  const [meetings, invitees] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        cancelledAt: null,
        startAt: { lt: gridEnd },
        AND: [
          { OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: gridStart } }] },
          ...(isAdmin ? [] : [{ OR: [{ organizerId: me.id }, { attendees: { some: { userId: me.id } } }] }]),
        ],
      },
      include: { attendees: { include: { user: true } } },
      orderBy: { startAt: "asc" },
    }),
    canSchedule ? getManagedInterns(me) : Promise.resolve([]),
  ]);

  const todayStart = getDayStart(now);
  const eventsByDay = new Map<string, { id: string; title: string; startISO: string; location: string | null }[]>();
  const upcoming: {
    key: string;
    meetingId: string;
    title: string;
    startISO: string;
    location: string | null;
    recurring: boolean;
    canCancel: boolean;
    attendeeNames: string;
  }[] = [];

  for (const m of meetings) {
    const occurrences = getOccurrencesInRange(m, gridStart, gridEnd);
    for (const occ of occurrences) {
      const dayKey = getDayStart(occ).toISOString();
      const list = eventsByDay.get(dayKey) ?? [];
      list.push({ id: `${m.id}:${occ.toISOString()}`, title: m.title, startISO: occ.toISOString(), location: m.location });
      eventsByDay.set(dayKey, list);

      if (occ >= todayStart) {
        upcoming.push({
          key: `${m.id}:${occ.toISOString()}`,
          meetingId: m.id,
          title: m.title,
          startISO: occ.toISOString(),
          location: m.location,
          recurring: m.recurrence !== "NONE",
          canCancel: isAdmin || m.organizerId === me.id,
          attendeeNames: m.attendees.map((a) => a.user.name ?? a.user.email).join(", "),
        });
      }
    }
  }
  upcoming.sort((a, b) => a.startISO.localeCompare(b.startISO));
  const upcomingLimited = upcoming.slice(0, 15);

  const weeks: DayCell[][] = [];
  for (let w = 0; w < grid.length / 7; w++) {
    weeks.push(
      grid.slice(w * 7, w * 7 + 7).map((d) => {
        const key = d.toISOString();
        return {
          dateISO: key.slice(0, 10),
          dayNum: d.getUTCDate(),
          inMonth: d.getUTCMonth() === ((monthIndex0 % 12) + 12) % 12,
          events: eventsByDay.get(key) ?? [],
        };
      })
    );
  }

  const monthLabel = new Date(Date.UTC(year, monthIndex0, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const navHref = (delta: number) => {
    let y = year;
    let m = monthIndex0 + delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    return `/meetings?y=${y}&m=${m + 1}`;
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="page-title">Meetings</h1>
          {canSchedule && <ScheduleMeetingForm invitees={invitees} />}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Link href={navHref(-1)} className="btn-ghost px-2 py-1 text-sm">← Prev</Link>
            <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
            <Link href={navHref(1)} className="btn-ghost px-2 py-1 text-sm">Next →</Link>
          </div>
          <div className="mt-3">
            <CalendarGrid weeks={weeks} />
          </div>
        </div>

        <section>
          <h2 className="section-title">Upcoming</h2>
          <div className="mt-3 space-y-2">
            {upcomingLimited.length === 0 && (
              <p className="card px-4 py-8 text-center text-sm text-subtle">No upcoming meetings.</p>
            )}
            {upcomingLimited.map((u) => (
              <div key={u.key} className="card flex flex-wrap items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {u.title}
                    {u.recurring && <span className="pill ml-2 border border-border bg-surface-muted text-[10px] text-muted">recurring</span>}
                  </p>
                  <p className="text-xs text-subtle">
                    {new Date(u.startISO).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {u.location ? ` · ${u.location}` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">With {u.attendeeNames}</p>
                </div>
                {u.canCancel && <CancelMeetingButton meetingId={u.meetingId} />}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
