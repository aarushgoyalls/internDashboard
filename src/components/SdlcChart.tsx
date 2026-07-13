import { buildSdlcSeries } from "@/lib/analytics";
import { SDLC_STAGE_META, SDLC_STAGE_VALUES } from "@/lib/constants";
import { dayLabel } from "@/lib/period";
import type { SdlcStage } from "@prisma/client";

const STAGE_SHORT: Record<SdlcStage, string> = {
  PLANNING: "Plan",
  REQUIREMENTS: "Reqs",
  DESIGN: "Design",
  IMPLEMENTATION: "Impl",
  TESTING: "Test",
  DEPLOYMENT: "Deploy",
  MAINTENANCE: "Maint",
};

const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 10;
const CHART_W = 560;
const CHART_H = 160;
const PLOT_W = CHART_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CHART_H - PAD_TOP - PAD_BOTTOM;

const yFor = (stageIndex: number) =>
  PAD_TOP + PLOT_H - ((stageIndex - 1) / (SDLC_STAGE_VALUES.length - 1)) * PLOT_H;

// Step-line of a software intern's SDLC stage over time — shows actual
// project progression (Planning -> ... -> Maintenance), not just check-in
// activity. Single series, so no legend: the section heading names it.
export function SdlcChart({
  submissions,
}: {
  submissions: { periodStart: Date; sdlcStage: SdlcStage | null }[];
}) {
  const points = buildSdlcSeries(submissions);

  if (points.length === 0) {
    return (
      <p className="card bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
        No SDLC stage data yet.
      </p>
    );
  }

  const xFor = (i: number) =>
    points.length === 1 ? PAD_LEFT + PLOT_W / 2 : PAD_LEFT + (i / (points.length - 1)) * PLOT_W;
  const linePath = points.map((p, i) => `${xFor(i)},${yFor(p.stageIndex)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" role="img" aria-label="SDLC stage over time">
      {SDLC_STAGE_VALUES.map((stage, idx) => {
        const y = yFor(idx + 1);
        return (
          <g key={stage}>
            <line x1={PAD_LEFT} y1={y} x2={CHART_W - PAD_RIGHT} y2={y} className="stroke-border" strokeWidth={1} />
            <text x={PAD_LEFT - 8} y={y + 3} textAnchor="end" className="fill-subtle text-[9px]">
              {STAGE_SHORT[stage]}
            </text>
          </g>
        );
      })}

      {points.length > 1 && (
        <polyline
          points={linePath}
          fill="none"
          className="stroke-accent"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {points.map((p, i) => (
        <circle key={p.date.getTime()} cx={xFor(i)} cy={yFor(p.stageIndex)} r={4} className="fill-accent stroke-white" strokeWidth={2}>
          <title>{`${dayLabel(p.date)} — ${SDLC_STAGE_META[p.stage].label}`}</title>
        </circle>
      ))}

      <text x={xFor(points.length - 1)} y={yFor(last.stageIndex) - 10} textAnchor="end" className="fill-foreground text-[10px] font-semibold">
        {SDLC_STAGE_META[last.stage].label}
      </text>
    </svg>
  );
}
