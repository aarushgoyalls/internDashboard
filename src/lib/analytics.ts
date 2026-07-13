// Turns raw FormSubmission rows into the two per-intern chart series.

import { getDayStart } from "@/lib/period";
import { SDLC_STAGE_VALUES } from "@/lib/constants";
import type { SdlcStage } from "@prisma/client";

const DAY_MS = 86_400_000;

export type ActivityDay = { date: Date; submitted: boolean };

// Fixed-length window of the last `days` calendar days (oldest -> newest),
// flagging which ones have a submission. Powers the activity heatmap strip.
export function buildActivityWindow(
  submissions: { periodStart: Date }[],
  days = 30,
  now: Date = new Date()
): ActivityDay[] {
  const submittedDays = new Set(submissions.map((s) => s.periodStart.getTime()));
  const today = getDayStart(now);
  return Array.from({ length: days }, (_, i) => {
    const offset = days - 1 - i;
    const date = new Date(today.getTime() - offset * DAY_MS);
    return { date, submitted: submittedDays.has(date.getTime()) };
  });
}

export type SdlcPoint = { date: Date; stage: SdlcStage; stageIndex: number };

// Chronological SDLC-stage checkpoints (software departments only), oldest
// first. stageIndex is 1-based (Planning=1 .. Maintenance=7) for plotting.
export function buildSdlcSeries(
  submissions: { periodStart: Date; sdlcStage: SdlcStage | null }[]
): SdlcPoint[] {
  return submissions
    .filter((s): s is { periodStart: Date; sdlcStage: SdlcStage } => s.sdlcStage !== null)
    .map((s) => ({
      date: s.periodStart,
      stage: s.sdlcStage,
      stageIndex: SDLC_STAGE_VALUES.indexOf(s.sdlcStage) + 1,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
