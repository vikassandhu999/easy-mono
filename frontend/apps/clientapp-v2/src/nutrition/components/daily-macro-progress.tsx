import type {MacroTotals} from '@easy/utils';

import {formatMacroValue} from '@easy/utils';

type MacroRowProps = {
  consumed: number;
  fillClass: string;
  label: string;
  planned: number;
  unit: 'cal' | 'g';
};

function MacroRow({consumed, fillClass, label, planned, unit}: MacroRowProps) {
  const percent = planned > 0 ? Math.min((consumed / planned) * 100, 100) : 0;

  const consumedDisplay = formatMacroValue(consumed, unit === 'cal' ? '' : unit);
  const plannedDisplay = formatMacroValue(planned, unit === 'cal' ? '' : unit);
  const suffix = unit === 'cal' ? '' : unit;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-muted">
          {consumedDisplay} / {plannedDisplay}
          {suffix}
        </p>
      </div>
      <div className="progress-track">
        <div
          className={fillClass}
          style={{width: `${percent}%`}}
        />
      </div>
    </div>
  );
}

export default function DailyMacroProgress({consumed, planned}: {consumed: MacroTotals; planned: MacroTotals}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="space-y-3">
        <MacroRow
          consumed={consumed.protein}
          fillClass="progress-fill-green"
          label="Protein"
          planned={planned.protein}
          unit="g"
        />
        <MacroRow
          consumed={consumed.calories}
          fillClass="progress-fill-teal"
          label="Calories"
          planned={planned.calories}
          unit="cal"
        />
        <MacroRow
          consumed={consumed.carbs}
          fillClass="progress-fill-amber"
          label="Carbs"
          planned={planned.carbs}
          unit="g"
        />
        <MacroRow
          consumed={consumed.fat}
          fillClass="progress-fill-red"
          label="Fats"
          planned={planned.fat}
          unit="g"
        />
      </div>
    </div>
  );
}
