import {useId} from 'react';
import type {NutritionTargets} from '../api/nutrition-plans';
import {nutrientFields} from '../api/nutrition-values';
import {Input} from '../ui/input';

export function TargetsEditor({
  value,
  onChange,
  label,
}: {
  value: NutritionTargets;
  onChange: (targets: NutritionTargets) => void;
  label: string;
}) {
  const prefix = useId();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enter the same minimum and maximum for an exact target. Enter only a minimum for “at least”. Blank means no
        target.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nutrientFields.map(([code, name, unit]) => (
          <fieldset
            key={code}
            className="min-w-0 space-y-2"
          >
            <legend className="text-sm font-medium">
              {name} · {unit}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(['min', 'max'] as const).map((bound) => (
                <label
                  key={bound}
                  htmlFor={`${prefix}-${code}-${bound}`}
                  className="grid gap-1 text-xs text-muted-foreground"
                >
                  {bound === 'min' ? 'Minimum' : 'Maximum'}
                  <Input
                    id={`${prefix}-${code}-${bound}`}
                    aria-label={`${label} ${name} ${bound === 'min' ? 'minimum' : 'maximum'}`}
                    type="number"
                    min={0}
                    step="any"
                    value={value[code]?.[bound] ?? ''}
                    onChange={(event) => {
                      const next = {...value};
                      const range = {...next[code]};
                      if (event.target.value === '') {
                        delete range[bound];
                      } else {
                        range[bound] = Number(event.target.value);
                      }
                      if (range.min == null && range.max == null) {
                        delete next[code];
                      } else {
                        next[code] = range;
                      }
                      onChange(next);
                    }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
