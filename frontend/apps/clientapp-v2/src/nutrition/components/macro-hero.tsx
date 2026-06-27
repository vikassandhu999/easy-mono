/**
 * Macro hero (spec 01-today, option A): a calorie ring + three macro bars showing
 * consumed-vs-target. Updates live as entries are logged. `compact` is the smaller
 * variant used on the logging sheet / past-day header.
 */
import type {MacroTotals} from '@easy/utils';

import type {Targets} from '@/nutrition/nutrition-utils';

const PROTEIN = '#6c8cff';
const CARBS = '#e0a14d';
const FAT = '#e06c9c';

function pct(value: number, target: null | number): number {
  return target ? Math.min(100, Math.round((value / target) * 100)) : 0;
}

function Bar({label, value, target, color}: {color: string; label: string; target: null | number; value: number}) {
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="flex items-baseline justify-between text-[10px] text-[#9aa]">
        <span>{label}</span>
        <span>
          {Math.round(value)}/{target ?? '—'}g
        </span>
      </div>
      <div className="mt-1 h-[5px] overflow-hidden rounded-[3px] bg-[#23232b]">
        <div
          className="h-full rounded-[3px]"
          style={{background: color, width: `${pct(value, target)}%`}}
        />
      </div>
    </div>
  );
}

export default function MacroHero({
  consumed,
  targets,
  compact,
  statusLine,
}: {
  compact?: boolean;
  consumed: MacroTotals;
  statusLine?: React.ReactNode;
  targets: Targets;
}) {
  const calPct = pct(consumed.calories, targets.calories);
  const ring = compact ? 'size-15' : 'size-21';
  const inner = compact ? 'size-[46px]' : 'size-[66px]';
  const calText = compact ? 'text-[13px]' : 'text-[17px]';

  return (
    <div className="mb-3 flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-3.5">
      <div
        className={`grid ${ring} shrink-0 place-items-center rounded-full`}
        style={{background: `conic-gradient(#3ad07a 0% ${calPct}%, #23232b ${calPct}% 100%)`}}
      >
        <div className={`grid ${inner} place-items-center rounded-full bg-background text-center`}>
          <div className="leading-none">
            <div className={`font-bold ${calText}`}>{Math.round(consumed.calories)}</div>
            <div className="mt-0.5 text-[8px] text-muted">of {targets.calories ?? '—'}</div>
          </div>
        </div>
      </div>
      <div className="flex-1">
        <Bar
          color={PROTEIN}
          label="Protein"
          target={targets.protein}
          value={consumed.protein}
        />
        <Bar
          color={CARBS}
          label="Carbs"
          target={targets.carbs}
          value={consumed.carbs}
        />
        <Bar
          color={FAT}
          label="Fat"
          target={targets.fat}
          value={consumed.fat}
        />
        {statusLine}
      </div>
    </div>
  );
}
