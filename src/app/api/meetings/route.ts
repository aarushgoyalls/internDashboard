import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/rbac";
import { getManagedInterns } from "@/lib/access";
import { meetingSchema } from "@/lib/validation";
import { NOTIFICATION_TYPES } from "@/lib/constants";

// POST /api/meetings -> supervisor/admin schedules a meeting with one or more
// of their interns. `startAt`/`recurrenceEndDate` are ISO instants (the
// client converts the browser's local datetime-local input before sending,
// so parsing here is timezone-safe regardless of server locale).
export async function POST(req: Request) {
  const guard = await requireApiRole("SUPERVISOR", "ADMIN");
  if (guard instanceof NextResponse) return guard;

  const parsed = meetingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const d = parsed.data;

  const managed = await getManagedInterns(guard);
  const managedIds = new Set(managed.map((i) => i.id));
  const attendeeIds = d.attendeeIds.filter((id) => managedIds.has(id));
  if (attendeeIds.length === 0)
    return NextResponse.json({ error: "Pick at least one of your interns" }, { status: 400 });

  const startAt = new Date(d.startAt);
  if (Number.isNaN(startAt.getTime()))
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  const recurrenceEndDate = d.recurrenceEndDate ? new Date(d.recurrenceEndDate) : null;

  const meeting = await prisma.meeting.create({
    data: {
      title: d.title,
      description: d.description?.trim() || null,
      organizerId: guard.id,
      startAt,
      durationMins: d.durationMins,
      location: d.location?.trim() || null,
      recurrence: d.recurrence,
      recurrenceEndDate,
      attendees: { create: attendeeIds.map((userId) => ({ userId })) },
    },
    include: { attendees: true },
  });

  await prisma.notification.createMany({
    data: attendeeIds.map((userId) => ({
      userId,
      type: NOTIFICATION_TYPES.MEETING_INVITE,
      body: `You've been invited to "${meeting.title}".`,
      link: "/meetings",
    })),
  });

  return NextResponse.json({ meeting }, { status: 201 });
}

// PATCH /api/meetings -> cancel a meeting (whole series). Organizer or admin only.
export async function PATCH(req: Request) {
  const guard = await requireApiRole("SUPERVISOR", "ADMIN");
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => null);
  const meetingId = typeof body?.meetingId === "string" ? body.meetingId : null;
  if (!meetingId) return NextResponse.json({ error: "meetingId is required" }, { status: 400 });

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId }, select: { organizerId: true } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (guard.role !== "ADMIN" && meeting.organizerId !== guard.id)
    return NextResponse.json({ error: "Only the organizer can cancel this meeting" }, { status: 403 });

  await prisma.meeting.update({ where: { id: meetingId }, data: { cancelledAt: new Date() } });
  return NextResponse.json({ ok: true });
}
