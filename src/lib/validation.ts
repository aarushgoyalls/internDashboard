import { z } from "zod";

// Shared zod schemas — the "bouncer" that validates request bodies before they
// touch the DB. Defined once, reused across routes.

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(4000),
});

export const formSubmissionSchema = z
  .object({
    departmentId: z.string().min(1, "Department is required"),
    // Either a picked assigned project (projectId) or, for interns with none
    // assigned yet, free text — one of the two is required (see .refine below).
    projectId: z.string().optional().nullable(),
    project: z.string().trim().max(200).optional(),
    didThisWeek: z.string().trim().min(1, "Required").max(4000),
    planNextWeek: z.string().trim().min(1, "Required").max(4000),
    blocked: z.boolean(),
    blockerDetail: z.string().trim().max(4000).optional().nullable(),
    sdlcStage: z
      .enum(["PLANNING", "REQUIREMENTS", "DESIGN", "IMPLEMENTATION", "TESTING", "DEPLOYMENT", "MAINTENANCE"])
      .optional()
      .nullable(),
    answers: z
      .array(z.object({ questionId: z.string().min(1), answer: z.string().trim().max(2000) }))
      .optional(),
  })
  .refine((d) => !!d.projectId || !!d.project?.trim(), {
    message: "Project is required",
    path: ["project"],
  });

export const statusSchema = z.object({
  internId: z.string().min(1),
  status: z.enum(["ON_TRACK", "UNSATISFACTORY", "BEHIND"]),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const meetingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  startAt: z.string().min(1, "Start time is required"), // ISO datetime-local string
  durationMins: z.number().int().min(5).max(480),
  location: z.string().trim().max(500).optional().nullable(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  recurrenceEndDate: z.string().optional().nullable(),
  attendeeIds: z.array(z.string().min(1)).min(1, "Pick at least one invitee"),
});
