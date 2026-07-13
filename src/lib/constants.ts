import type { Role, StatusValue, SdlcStage, RecurrenceFrequency } from "@prisma/client";

// Role list (mirrors the Prisma enum) for iteration in UI/seed.
export const ROLES: Role[] = ["INTERN", "SUPERVISOR", "ADMIN"];

// Status -> UI presentation. Tailwind classes kept here so color coding is
// defined in exactly one place (green / amber / red per the spec).
export const STATUS_META: Record<
  StatusValue,
  { label: string; dot: string; badge: string }
> = {
  ON_TRACK: {
    label: "On track",
    dot: "bg-success",
    badge: "bg-success-tint text-success border-transparent",
  },
  UNSATISFACTORY: {
    label: "Unsatisfactory",
    dot: "bg-warning",
    badge: "bg-warning-tint text-warning border-transparent",
  },
  BEHIND: {
    label: "Behind",
    dot: "bg-danger",
    badge: "bg-danger-tint text-danger border-transparent",
  },
};

export const STATUS_VALUES: StatusValue[] = ["ON_TRACK", "UNSATISFACTORY", "BEHIND"];

// SDLC stage -> label, for the daily form's dropdown (software departments only).
export const SDLC_STAGE_META: Record<SdlcStage, { label: string }> = {
  PLANNING: { label: "Planning" },
  REQUIREMENTS: { label: "Requirements & analysis" },
  DESIGN: { label: "Design" },
  IMPLEMENTATION: { label: "Implementation" },
  TESTING: { label: "Testing" },
  DEPLOYMENT: { label: "Deployment" },
  MAINTENANCE: { label: "Maintenance" },
};

export const SDLC_STAGE_VALUES: SdlcStage[] = [
  "PLANNING",
  "REQUIREMENTS",
  "DESIGN",
  "IMPLEMENTATION",
  "TESTING",
  "DEPLOYMENT",
  "MAINTENANCE",
];

// AppSetting keys + defaults. The form recurs daily; reminderIntervalDays is the
// grace window — an intern is overdue after this many days without a submission.
export const SETTING_KEYS = {
  reminderIntervalDays: "reminderIntervalDays",
} as const;

export const DEFAULT_SETTINGS = {
  reminderIntervalDays: 1, // overdue after 1 full day without an update
};

export const NOTIFICATION_TYPES = {
  FORM_REMINDER: "FORM_REMINDER",
  MEETING_INVITE: "MEETING_INVITE",
} as const;

export const RECURRENCE_META: Record<RecurrenceFrequency, { label: string }> = {
  NONE: { label: "Does not repeat" },
  DAILY: { label: "Daily" },
  WEEKLY: { label: "Weekly" },
  BIWEEKLY: { label: "Every 2 weeks" },
  MONTHLY: { label: "Monthly" },
};

export const RECURRENCE_VALUES: RecurrenceFrequency[] = ["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"];
