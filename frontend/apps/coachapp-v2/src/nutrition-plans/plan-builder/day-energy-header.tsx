/**
 * DayEnergyHeader — the NB energy line: "{kcal} / {target} kcal" plus a
 * collapsible row of macro meters, computed live from the active day's meals.
 *
 * GAPS.md #5: the energy line and every macro meter are `ProgressBar` / `Meter`
 * (never a hand-styled div bar); the bar turns `warning` once the day is over
 * its target. Both need compound children (`Track` + `Fill`) or they render
 * empty.
 */
import {Button, Card, Meter, ProgressBar, Typography} from '@heroui/react';

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
}

function MacroMeter({label, value, target}: MacroMeterProps) {
  const over = isOver(value, target);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Typography
        className="truncate"
        color="muted"
        type="body-xs"
      >
        {label} {Math.round(value)}
        {target != null ? ` / ${Math.round(target)}` : ''}g
      </Typography>
      <Meter
        aria-label={label}
        color={over ? 'warning' : 'accent'}
        value={percent(value, target)}
      >
        <Meter.Track>
          <Meter.Fill />
        </Meter.Track>
      </Meter>
    </div>
  );
}

export function DayEnergyHeader({totals, targets, showMacros, onToggleMacros}: DayEnergyHeaderProps) {
  const over = isOver(totals.calories, targets.calories);

  return (
    <Card className="rounded-card border border-border bg-surface">
      <Card.Content className="flex flex-col gap-3 px-4 py-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-1.5">
            <Typography type="h3">{Math.round(totals.calories).toLocaleString()}</Typography>
            <Typography
              color="muted"
              type="body-sm"
            >
              {targets.calories != null ? `/ ${Math.round(targets.calories).toLocaleString()} kcal` : 'kcal'}
            </Typography>
          </div>

          {targets.calories != null ? (
            <ProgressBar
              aria-label="Energy against target"
              className="min-w-40 flex-1"
              color={over ? 'warning' : 'accent'}
              value={percent(totals.calories, targets.calories)}
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          ) : (
            <div className="flex-1" />
          )}

          <Button
            className="min-h-11 shrink-0 text-xs font-semibold text-accent "
            onPress={onToggleMacros}
            size="sm"
            variant="ghost"
          >
            {showMacros ? 'Hide macros' : 'Show macros'}
          </Button>
        </div>

        {showMacros ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MacroMeter
              label="Protein"
              target={targets.protein_g}
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
      </Card.Content>
    </Card>
  );
}
