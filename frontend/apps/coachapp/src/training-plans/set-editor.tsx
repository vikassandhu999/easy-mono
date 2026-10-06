import {useId, useState} from 'react';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import type {DraftSet} from './prescription';

export function SetEditor({set, onChange}: {set: DraftSet; onChange: (set: DraftSet) => void}) {
  const [emptyLoadUnit, setEmptyLoadUnit] = useState<'kg' | 'lb'>(set.load?.entered_unit ?? 'kg');
  const [emptyDistanceUnit, setEmptyDistanceUnit] = useState<'m' | 'km' | 'mi'>(set.distance?.entered_unit ?? 'm');
  const loadUnit = set.load?.entered_unit ?? emptyLoadUnit;
  const distanceUnit = set.distance?.entered_unit ?? emptyDistanceUnit;
  const change = (patch: Partial<DraftSet>) => onChange({...set, ...patch});
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <SelectField
        aria-label="Set kind"
        value={set.kind}
        onChange={(kind) => {
          if (kind === 'warmup' || kind === 'working' || kind === 'drop') {
            change({kind});
          }
        }}
      >
        <SelectItem id="working">Working</SelectItem>
        <SelectItem id="warmup">Warm-up</SelectItem>
        <SelectItem id="drop">Drop</SelectItem>
      </SelectField>
      <SelectField
        aria-label="Rep target"
        value={set.reps?.type ?? 'none'}
        onChange={(type) =>
          change({
            reps:
              type === 'exact'
                ? {type, value: 8}
                : type === 'range'
                  ? {type, min: 8, max: 12}
                  : type === 'amrap'
                    ? {type}
                    : null,
          })
        }
      >
        <SelectItem id="none">No rep target</SelectItem>
        <SelectItem id="exact">Exact</SelectItem>
        <SelectItem id="range">Range</SelectItem>
        <SelectItem id="amrap">AMRAP</SelectItem>
      </SelectField>
      {set.reps?.type === 'exact' && (
        <NumberField
          label="Reps"
          value={set.reps.value}
          onChange={(value) => change({reps: {type: 'exact', value}})}
        />
      )}
      {set.reps?.type === 'range' && (
        <>
          <NumberField
            label="Minimum reps"
            value={set.reps.min}
            onChange={(value) =>
              change({
                reps: {
                  ...set.reps,
                  type: 'range',
                  min: value,
                  max: set.reps?.type === 'range' ? (set.reps.max ?? null) : null,
                },
              })
            }
          />
          <NumberField
            label="Maximum reps"
            value={set.reps.max}
            onChange={(value) =>
              change({
                reps: {
                  ...set.reps,
                  type: 'range',
                  max: value,
                  min: set.reps?.type === 'range' ? (set.reps.min ?? null) : null,
                },
              })
            }
          />
        </>
      )}
      <NumberField
        label={`Load (${loadUnit})`}
        value={set.load ? Number(set.load.kg) / (set.load.entered_unit === 'lb' ? 0.45359237 : 1) : null}
        min={undefined}
        step="any"
        onChange={(value) =>
          change({
            load:
              value === null
                ? null
                : {
                    kg: value * (loadUnit === 'lb' ? 0.45359237 : 1),
                    entered_unit: loadUnit,
                  },
          })
        }
      />
      <SelectField
        aria-label="Load unit"
        value={loadUnit}
        onChange={(entered_unit) => {
          if (entered_unit === 'kg' || entered_unit === 'lb') {
            setEmptyLoadUnit(entered_unit);
            if (set.load) {
              change({load: {...set.load, entered_unit}});
            }
          }
        }}
      >
        <SelectItem id="kg">kg</SelectItem>
        <SelectItem id="lb">lb</SelectItem>
      </SelectField>
      <NumberField
        label="RPE"
        value={set.rpe}
        min={1}
        max={10}
        step="0.5"
        onChange={(rpe) => change({rpe})}
      />
      <NumberField
        label="RIR"
        value={set.rir}
        max={10}
        onChange={(rir) => change({rir})}
      />
      <label
        htmlFor={`tempo-${set.id}`}
        className="grid gap-2 text-sm font-medium"
      >
        Tempo
        <Input
          id={`tempo-${set.id}`}
          value={set.tempo ?? ''}
          onChange={(event) => change({tempo: event.target.value || null})}
          placeholder="3010"
        />
      </label>
      <NumberField
        label="Duration (s)"
        value={set.duration_s}
        onChange={(duration_s) => change({duration_s})}
      />
      <NumberField
        label={`Distance (${distanceUnit})`}
        value={set.distance ? Number(set.distance.m) / distanceFactor(set.distance.entered_unit) : null}
        step="any"
        onChange={(value) =>
          change({
            distance:
              value === null
                ? null
                : {
                    m: value * distanceFactor(distanceUnit),
                    entered_unit: distanceUnit,
                  },
          })
        }
      />
      <SelectField
        aria-label="Distance unit"
        value={distanceUnit}
        onChange={(entered_unit) => {
          if (entered_unit === 'm' || entered_unit === 'km' || entered_unit === 'mi') {
            setEmptyDistanceUnit(entered_unit);
            if (set.distance) {
              change({distance: {...set.distance, entered_unit}});
            }
          }
        }}
      >
        <SelectItem id="m">m</SelectItem>
        <SelectItem id="km">km</SelectItem>
        <SelectItem id="mi">mi</SelectItem>
      </SelectField>
      <NumberField
        label="Rest (s)"
        value={set.rest_s}
        onChange={(rest_s) => change({rest_s})}
      />
      <label
        htmlFor={`notes-${set.id}`}
        className="grid gap-2 text-sm font-medium col-span-2"
      >
        Set notes
        <Input
          id={`notes-${set.id}`}
          value={set.notes ?? ''}
          onChange={(event) => change({notes: event.target.value || null})}
        />
      </label>
    </div>
  );
}
function distanceFactor(unit: 'm' | 'km' | 'mi') {
  return unit === 'km' ? 1000 : unit === 'mi' ? 1609.344 : 1;
}
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = '1',
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number | undefined;
  max?: number;
  step?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="grid gap-2 text-sm font-medium"
    >
      {label}
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value == null ? '' : Number(value.toFixed(6))}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      />
    </label>
  );
}
