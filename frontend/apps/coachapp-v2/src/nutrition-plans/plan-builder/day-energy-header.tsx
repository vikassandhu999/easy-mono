/**
 * DayEnergyHeader — the NB energy line: "{kcal} / {target} kcal" plus a
 * collapsible row of macro meters, computed live from the active day's meals.
 *
 * GAPS.md #5: the energy line and every macro meter are `ProgressBar` / `Meter`
 * (never a hand-styled div bar); the bar turns `warning` once the day is over
 * its target. Both need compound children (`Track` + `Fill`) or they render
 * empty.
 */
import {Button, Card, Meter, ProgressBar} from '@heroui/react';

import {INLINE_LINK} from './ui';

export interface DayMacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DayMacroTargets {
  calories: number | null | undefined;
  protein_g: number | null | undefined;
  carbs_g: number | null | undefined;
  fat_g: number | null | undefined;
}

interface DayEnergyHeaderProps {
  totals: DayMacroTotals;
  targets: DayMacroTargets;
  showMacros: boolean;
  onToggleMacros: () => void;
}

/** Percent of target, clamped to the bar's 0–100 range. */
function percent(value: number, target: number | null | undefined): number {
  if (!target || target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((value / target) * 100));
}

function isOver(value: number, target: number | null | undefined): boolean {
  return target != null && target > 0 && value > target;
}

interface MacroMeterProps {
  label: string;
  value: number;
  target: number | null | undefined;
  /** Only the first cell carries the style-diff anchors (manifests/NB.json). */
  testIds?: boolean;
}

function MacroMeter({label, value, target, testIds}: MacroMeterProps) {
  const over = isOver(value, target);
  return (
    <div data-testid={testIds ? 'nb-macro-cell' : undefined}>
      <div className="flex items-baseline justify-between">
        <span
          className="type-eyebrow font-semibold uppercase tracking-eyebrow text-muted"
          data-testid={testIds ? 'nb-macro-label' : undefined}
        >
          {label}
        </span>
        <span
          className="type-eyebrow text-muted"
          data-testid={testIds ? 'nb-macro-value' : undefined}
        >
          {Math.round(value)}
          {target != null ? ` / ${Math.round(target)}` : ''}g
        </span>
      </div>
      <Meter
        aria-label={label}
        color={over ? 'warning' : 'accent'}
        value={percent(value, target)}
      >
        <Meter.Track
          className="mt-1.5 h-1.25 overflow-hidden rounded-pill bg-surface-tertiary"
          data-testid={testIds ? 'nb-macro-track' : undefined}
        >
          <Meter.Fill
            className="h-full rounded-none"
            data-testid={testIds ? 'nb-macro-fill' : undefined}
          />
        </Meter.Track>
      </Meter>
    </div>
  );
}

export function DayEnergyHeader({totals, targets, showMacros, onToggleMacros}: DayEnergyHeaderProps) {
  const over = isOver(totals.calories, targets.calories);

  return (
    <Card
      className="flex flex-col gap-3 rounded-card border border-border bg-surface px-4 py-3 [box-shadow:none]"
      data-testid="nb-energy-card"
    >
      <>
        <div
          className="flex flex-wrap items-center gap-3"
          data-testid="nb-energy-row"
        >
          <div className="flex flex-none items-baseline gap-1">
            <span
              className="font-grotesk type-metric font-semibold text-foreground"
              data-testid="nb-kcal"
            >
              {Math.round(totals.calories).toLocaleString()}
            </span>
            <span
              className="type-eyebrow text-muted"
              data-testid="nb-kcal-target"
            >
              {targets.calories != null ? `/ ${Math.round(targets.calories).toLocaleString()} kcal` : 'kcal'}
            </span>
          </div>

          {targets.calories != null ? (
            <ProgressBar
              aria-label="Energy against target"
              className="min-w-40 flex-1"
              color={over ? 'warning' : 'accent'}
              value={percent(totals.calories, targets.calories)}
            >
              <ProgressBar.Track
                className="h-1.5 overflow-hidden rounded-pill bg-surface-tertiary"
                data-testid="nb-kcal-track"
              >
                <ProgressBar.Fill
                  className="h-full rounded-pill"
                  data-testid="nb-kcal-fill"
                />
              </ProgressBar.Track>
            </ProgressBar>
          ) : (
            <div className="flex-1" />
          )}

          <Button
            className={`${INLINE_LINK} shrink-0 type-eyebrow`}
            data-testid="nb-macros-toggle"
            onPress={onToggleMacros}
            size="sm"
            variant="ghost"
          >
            {showMacros ? 'Hide macros' : 'Show macros'}
          </Button>
        </div>

        {showMacros ? (
          <div
            className="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-3"
            data-testid="nb-macro-grid"
          >
            <MacroMeter
              label="Protein"
              target={targets.protein_g}
              testIds
              value={totals.protein_g}
            />
            <MacroMeter
              label="Carbs"
              target={targets.carbs_g}
              value={totals.carbs_g}
            />
            <MacroMeter
              label="Fat"
              target={targets.fat_g}
              value={totals.fat_g}
            />
          </div>
        ) : null}
      </>
    </Card>
  );
}
