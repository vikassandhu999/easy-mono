// The kcal + P/C/F ratio-bar + legend card shared by the food detail, recipe
// detail, and recipe form screens. Callers resolve their own macro keys (Food
// stores `*_per_100g`, recipe totals store `*_g`) and pass already-computed
// segments, so this component owns presentation only.

import {ProgressBar, Typography} from '@heroui/react';

export type MacroSegment = {color: 'accent' | 'success' | 'warning'; label: string; value: number};

const LEGEND_DOT: Record<string, string> = {
  accent: 'bg-accent',
  muted: 'bg-muted',
  success: 'bg-success',
  warning: 'bg-warning',
};

function LegendEntry({dot, label, value}: {dot: string; label: string; value: number}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${LEGEND_DOT[dot]}`} />
        <Typography
          color="muted"
          type="body-sm"
        >
          {label}
        </Typography>
      </div>
      <Typography
        className="tabular-nums"
        type="body"
        weight="semibold"
      >
        {Math.round(value * 10) / 10}
        <span className="text-xs font-normal text-muted">g</span>
      </Typography>
    </div>
  );
}

export function MacroBreakdownCard({
  caption = 'kcal',
  fiber,
  kcal,
  segments,
}: {
  /** Unit label beside the calorie figure — "kcal" per 100 g, "kcal total" for recipe totals. */
  caption?: string;
  fiber?: null | number;
  kcal?: null | number;
  segments: MacroSegment[];
}) {
  return (
    <div className="mt-3 rounded-card border border-border bg-surface p-5">
      {kcal != null && (
        <div className="flex items-baseline gap-2">
          <Typography
            className="tabular-nums"
            type="h1"
          >
            {Math.round(kcal)}
          </Typography>
          <Typography color="muted">{caption}</Typography>
        </div>
      )}
      {segments.length > 0 && (
        <>
          <div className="mt-4 flex gap-0.5">
            {segments.map((s) => (
              <div
                className="min-w-4"
                key={s.label}
                // ponytail: flexGrow is the one genuinely dynamic value here
                // (ratio bar) — allowlisted per UI-CONTRACT §1.
                style={{flexGrow: s.value}} /* ui-contract-allow */
              >
                <ProgressBar
                  aria-label={`${s.label} share`}
                  color={s.color}
                  value={100}
                >
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-10">
            {segments.map((s) => (
              <LegendEntry
                dot={s.color}
                key={s.label}
                label={s.label}
                value={s.value}
              />
            ))}
            {fiber != null && fiber > 0 && (
              <LegendEntry
                dot="muted"
                label="Fiber"
                value={fiber}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
