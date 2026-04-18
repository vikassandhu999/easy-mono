import {Button, Input, Label, ListBox, Select} from '@heroui/react';
import {useId} from 'react';

import type {PlannedSet} from '@/api/trainingPlans';

const LOAD_UNIT_OPTIONS = [
  {label: 'kg', value: 'kg'},
  {label: 'lbs', value: 'lbs'},
  {label: 'BW', value: 'bodyweight'},
  {label: '% 1RM', value: 'percent_1rm'},
  {label: 'RPE', value: 'rpe'},
  {label: 'None', value: 'none'},
] as const;

const PRESETS = [
  {label: '3\u00d710', reps: '10', sets: '3'},
  {label: '4\u00d78-12', reps: '8-12', sets: '4'},
  {label: '5\u00d75', reps: '5', sets: '5'},
  {label: '3\u00d715', reps: '15', sets: '3'},
] as const;

export type SetSchemeValues = {
  loadUnit: string;
  loadValue: string;
  reps: string;
  rest: string;
  sets: string;
  /** Optional warmup sets prepended before working sets (default: empty = 0) */
  warmupSets: string;
};

function toOptionalNonNegativeInt(value: string): null | number {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.trunc(parsed));
}

function toOptionalNonNegativeNumber(value: string): null | number {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, parsed);
}

/** Build warmup + working sets from the compact scheme values */
export function buildPlannedSetsFromScheme(values: SetSchemeValues): PlannedSet[] {
  const warmupCount = toOptionalNonNegativeInt(values.warmupSets) ?? 0;
  const workingCount = Math.max(1, toOptionalNonNegativeInt(values.sets) ?? 1);
  const loadValue = toOptionalNonNegativeNumber(values.loadValue);
  const restSeconds = toOptionalNonNegativeInt(values.rest);
  const loadUnit = (values.loadUnit || 'kg') as PlannedSet['load_unit'];

  const warmups: PlannedSet[] = Array.from({length: warmupCount}, () => ({
    set_type: 'warmup' as const,
    ...(values.reps && {target_reps: values.reps}),
    load_unit: loadUnit,
    rest_seconds: 60,
  }));

  const working: PlannedSet[] = Array.from({length: workingCount}, () => ({
    set_type: 'working' as const,
    ...(values.reps && {target_reps: values.reps}),
    ...(loadValue != null && {load_value: loadValue}),
    load_unit: loadUnit,
    ...(restSeconds != null && {rest_seconds: restSeconds}),
  }));

  return [...warmups, ...working];
}

/** Derive SetSchemeValues from an existing planned_sets array (for editing) */
export function deriveSchemeFromSets(sets: PlannedSet[]): SetSchemeValues {
  const warmups = sets.filter((s) => s.set_type === 'warmup');
  const working = sets.filter((s) => s.set_type !== 'warmup');
  const first = working[0] ?? sets[0];
  if (!first) {
    return {sets: '3', reps: '', loadValue: '', loadUnit: 'kg', rest: '', warmupSets: ''};
  }
  return {
    sets: String(working.length || sets.length),
    reps: first.target_reps ?? '',
    loadValue: first.load_value != null ? String(first.load_value) : '',
    loadUnit: first.load_unit ?? 'kg',
    rest: first.rest_seconds != null ? String(first.rest_seconds) : '',
    warmupSets: warmups.length > 0 ? String(warmups.length) : '',
  };
}

type SetSchemeInputProps = {
  /** Current values */
  values: SetSchemeValues;
  /** Called on any field change */
  onChange: (values: SetSchemeValues) => void;
  /** Whether to show preset chips above the fields */
  showPresets?: boolean;
};

/**
 * Compact set scheme input: Sets, Reps, Load + Unit, Rest.
 *
 * Used in both "add exercise" flow and "edit exercise" uniform editor.
 * Single row on desktop (flex gap-2), wraps to two rows on mobile (flex-wrap):
 *   Row 1 (mobile): Sets + Reps
 *   Row 2 (mobile): Load + Unit + Rest
 */
export default function SetSchemeInput({onChange, showPresets = false, values}: SetSchemeInputProps) {
  const uid = useId();

  const update = (patch: Partial<SetSchemeValues>) => {
    onChange({...values, ...patch});
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Presets */}
      {showPresets && (
        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              onPress={() => update({sets: p.sets, reps: p.reps})}
              size="sm"
              variant={values.sets === p.sets && values.reps === p.reps ? 'secondary' : 'ghost'}
            >
              {p.label}
            </Button>
          ))}
        </div>
      )}

      {/* Fields — flex-wrap: 2 per row on mobile, all on 1 row on sm+ */}
      <div className="flex flex-wrap gap-2">
        <div className="flex w-[calc(50%-4px)] flex-col gap-1 sm:w-16">
          <label
            className="text-xs text-foreground-400"
            htmlFor={`${uid}-warmup`}
          >
            Warmup
          </label>
          <Input
            id={`${uid}-warmup`}
            inputMode="numeric"
            onChange={(e) => update({warmupSets: e.target.value})}
            placeholder="0"
            type="number"
            value={values.warmupSets}
          />
        </div>

        <div className="flex w-[calc(50%-4px)] flex-col gap-1 sm:w-12">
          <label
            className="text-xs text-foreground-400"
            htmlFor={`${uid}-sets`}
          >
            Sets
          </label>
          <Input
            id={`${uid}-sets`}
            inputMode="numeric"
            onChange={(e) => update({sets: e.target.value})}
            placeholder="3"
            type="number"
            value={values.sets}
          />
        </div>

        <div className="flex w-[calc(50%-4px)] flex-col gap-1 sm:w-20">
          <label
            className="text-xs text-foreground-400"
            htmlFor={`${uid}-reps`}
          >
            Reps
          </label>
          <Input
            id={`${uid}-reps`}
            onChange={(e) => update({reps: e.target.value})}
            placeholder="e.g. 8-10"
            value={values.reps}
          />
        </div>

        <div className="flex w-[calc(50%-4px)] flex-col gap-1 sm:w-16">
          <label
            className="text-xs text-foreground-400"
            htmlFor={`${uid}-load`}
          >
            Load
          </label>
          <Input
            id={`${uid}-load`}
            inputMode="decimal"
            onChange={(e) => update({loadValue: e.target.value})}
            placeholder="\u2014"
            type="number"
            value={values.loadValue}
          />
        </div>

        <div className="flex w-[calc(50%-4px)] flex-col gap-1 sm:w-16">
          <Select
            onSelectionChange={(key) => update({loadUnit: String(key)})}
            selectedKey={values.loadUnit}
          >
            <Label className="text-xs">Unit</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {LOAD_UNIT_OPTIONS.map((opt) => (
                  <ListBox.Item
                    id={opt.value}
                    key={opt.value}
                    textValue={opt.label}
                  >
                    {opt.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <div className="flex w-[calc(50%-4px)] flex-col gap-1 sm:w-16">
          <label
            className="text-xs text-foreground-400"
            htmlFor={`${uid}-rest`}
          >
            Rest (s)
          </label>
          <Input
            id={`${uid}-rest`}
            inputMode="numeric"
            onChange={(e) => update({rest: e.target.value})}
            placeholder="e.g. 120"
            type="number"
            value={values.rest}
          />
        </div>
      </div>
    </div>
  );
}
