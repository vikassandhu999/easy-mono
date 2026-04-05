import type {MacroTotals} from '@/@utils/nutrition-helpers';

import {formatMacroValue} from '@/@utils/nutrition-helpers';

type MacroBarProps = {
  consumed: number;
  fillClass: string;
  label: string;
  planned: number;
  unit: string;
};

function MacroBar({consumed, fillClass, label, planned, unit}: MacroBarProps) {
  const percent = planned > 0 ? Math.min((consumed / planned) * 100, 100) : 0;
  const isOver = consumed > planned && planned > 0;

  return (
    <div className="flex-1">
      <p className="text-xs text-foreground-400">{label}</p>
      <p className={`text-sm font-semibold ${isOver ? 'text-danger' : ''}`}>
        {formatMacroValue(consumed, unit === 'cal' ? '' : unit)}
        {planned > 0 ? (
          <span className="font-normal text-foreground-400">
            /{formatMacroValue(planned, unit === 'cal' ? '' : unit)}
          </span>
        ) : null}
        {unit === 'cal' ? ' cal' : ''}
      </p>
      <div className="progress-track mt-1">
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
    <div className="rounded-xl bg-default p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">Daily macros</p>
      <div className="flex gap-3">
        <MacroBar
          consumed={consumed.calories}
          fillClass="progress-fill-teal"
          label="Calories"
          planned={planned.calories}
          unit="cal"
        />
        <MacroBar
          consumed={consumed.protein}
          fillClass="progress-fill-blue"
          label="Protein"
          planned={planned.protein}
          unit="g"
        />
        <MacroBar
          consumed={consumed.carbs}
          fillClass="progress-fill-amber"
          label="Carbs"
          planned={planned.carbs}
          unit="g"
        />
        <MacroBar
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
