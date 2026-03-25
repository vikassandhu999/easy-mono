import {Button, Input, Label, ListBox, Select} from '@heroui/react';
import {Plus, X} from 'lucide-react';
import {useId} from 'react';

import type {PlannedSet} from '@/api/trainingPlans';

const SET_TYPE_OPTIONS = [
  {label: 'Working', value: 'working'},
  {label: 'Warmup', value: 'warmup'},
  {label: 'Dropset', value: 'dropset'},
  {label: 'AMRAP', value: 'amrap'},
  {label: 'EMOM', value: 'emom'},
  {label: 'Rest-Pause', value: 'rest_pause'},
  {label: 'Backoff', value: 'backoff'},
  {label: 'Cluster', value: 'cluster'},
] as const;

const LOAD_UNIT_OPTIONS = [
  {label: 'kg', value: 'kg'},
  {label: 'lbs', value: 'lbs'},
  {label: 'BW', value: 'bodyweight'},
  {label: '% 1RM', value: 'percent_1rm'},
  {label: 'RPE', value: 'rpe'},
  {label: 'None', value: 'none'},
] as const;

const LOAD_UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  lbs: 'lbs',
  bodyweight: 'BW',
  percent_1rm: '% 1RM',
  rpe: 'RPE',
  none: '\u2014',
};

type SetDetailEditorProps = {
  /** Called on any change (add, remove, edit a set) */
  onChange: (sets: PlannedSet[]) => void;
  /** The current sets array */
  sets: PlannedSet[];
};

/**
 * Per-set editable table for mixed set types (warmup ramps, drop sets, pyramids).
 *
 * Desktop: table with inputs in every cell.
 * Mobile: each set is a compact card.
 *
 * All state is local — parent provides sets + onChange. No API calls.
 */
export default function SetDetailEditor({onChange, sets}: SetDetailEditorProps) {
  const uid = useId();

  const updateSet = (idx: number, patch: Partial<PlannedSet>) => {
    onChange(sets.map((s, i) => (i === idx ? {...s, ...patch} : s)));
  };

  const removeSet = (idx: number) => {
    onChange(sets.filter((_, i) => i !== idx));
  };

  const addSet = () => {
    const last = sets[sets.length - 1];
    const newSet: PlannedSet = last
      ? {
          set_type: last.set_type,
          target_reps: last.target_reps,
          load_value: last.load_value,
          load_unit: last.load_unit,
          rest_seconds: last.rest_seconds,
        }
      : {set_type: 'working'};
    onChange([...sets, newSet]);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Desktop: table layout */}
      <div className="hidden sm:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-divider">
              <th className="w-8 pb-1 pr-1 text-xs font-medium text-foreground-400">#</th>
              <th className="w-24 pb-1 pr-1 text-xs font-medium text-foreground-400">Type</th>
              <th className="w-20 pb-1 pr-1 text-xs font-medium text-foreground-400">Reps</th>
              <th className="w-16 pb-1 pr-1 text-xs font-medium text-foreground-400">Load</th>
              <th className="w-16 pb-1 pr-1 text-xs font-medium text-foreground-400">Unit</th>
              <th className="w-16 pb-1 pr-1 text-xs font-medium text-foreground-400">Rest</th>
              <th className="w-8 pb-1" />
            </tr>
          </thead>
          <tbody>
            {sets.map((set, idx) => (
              <tr
                className="border-b border-divider last:border-b-0"
                key={`${uid}-row-${idx}`}
              >
                <td className="py-1 pr-1 text-xs text-foreground-400">{idx + 1}</td>
                <td className="py-1 pr-1">
                  <Select
                    aria-label={`Set ${idx + 1} type`}
                    onSelectionChange={(key) => updateSet(idx, {set_type: String(key) as PlannedSet['set_type']})}
                    selectedKey={set.set_type ?? 'working'}
                  >
                    <Select.Trigger />
                    <Select.Popover>
                      <ListBox>
                        {SET_TYPE_OPTIONS.map((opt) => (
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
                </td>
                <td className="py-1 pr-1">
                  <Input
                    aria-label={`Set ${idx + 1} reps`}
                    onChange={(e) => updateSet(idx, {target_reps: e.target.value || null})}
                    placeholder="8-10"
                    value={set.target_reps ?? ''}
                  />
                </td>
                <td className="py-1 pr-1">
                  <Input
                    aria-label={`Set ${idx + 1} load`}
                    inputMode="decimal"
                    onChange={(e) => updateSet(idx, {load_value: e.target.value ? Number(e.target.value) : null})}
                    placeholder="\u2014"
                    type="number"
                    value={set.load_value != null ? String(set.load_value) : ''}
                  />
                </td>
                <td className="py-1 pr-1">
                  <Select
                    aria-label={`Set ${idx + 1} unit`}
                    onSelectionChange={(key) => updateSet(idx, {load_unit: String(key) as PlannedSet['load_unit']})}
                    selectedKey={set.load_unit ?? 'kg'}
                  >
                    <Select.Trigger />
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
                </td>
                <td className="py-1 pr-1">
                  <Input
                    aria-label={`Set ${idx + 1} rest`}
                    inputMode="numeric"
                    onChange={(e) => updateSet(idx, {rest_seconds: e.target.value ? Number(e.target.value) : null})}
                    placeholder="120"
                    type="number"
                    value={set.rest_seconds != null ? String(set.rest_seconds) : ''}
                  />
                </td>
                <td className="py-1 text-right">
                  <Button
                    aria-label={`Remove set ${idx + 1}`}
                    isIconOnly
                    onPress={() => removeSet(idx)}
                    size="sm"
                    variant="ghost"
                  >
                    <X size={12} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        {sets.map((set, idx) => (
          <div
            className="flex flex-col gap-1.5 rounded-lg border border-divider p-2"
            key={`${uid}-card-${idx}`}
          >
            {/* Card header: set number, type, remove */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground-400">Set {idx + 1}</span>
                <Select
                  aria-label={`Set ${idx + 1} type`}
                  className="w-24"
                  onSelectionChange={(key) => updateSet(idx, {set_type: String(key) as PlannedSet['set_type']})}
                  selectedKey={set.set_type ?? 'working'}
                >
                  <Select.Trigger />
                  <Select.Popover>
                    <ListBox>
                      {SET_TYPE_OPTIONS.map((opt) => (
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
              <Button
                aria-label={`Remove set ${idx + 1}`}
                isIconOnly
                onPress={() => removeSet(idx)}
                size="sm"
                variant="ghost"
              >
                <X size={12} />
              </Button>
            </div>
            {/* Card fields: reps, load+unit, rest */}
            <div className="flex flex-wrap gap-2">
              <div className="flex w-[calc(50%-4px)] flex-col gap-0.5">
                <label
                  className="text-[10px] text-foreground-400"
                  htmlFor={`${uid}-m-${idx}-reps`}
                >
                  Reps
                </label>
                <Input
                  id={`${uid}-m-${idx}-reps`}
                  onChange={(e) => updateSet(idx, {target_reps: e.target.value || null})}
                  placeholder="8-10"
                  value={set.target_reps ?? ''}
                />
              </div>
              <div className="flex w-[calc(50%-4px)] flex-col gap-0.5">
                <label
                  className="text-[10px] text-foreground-400"
                  htmlFor={`${uid}-m-${idx}-load`}
                >
                  Load
                </label>
                <div className="flex gap-1">
                  <Input
                    className="flex-1"
                    id={`${uid}-m-${idx}-load`}
                    inputMode="decimal"
                    onChange={(e) => updateSet(idx, {load_value: e.target.value ? Number(e.target.value) : null})}
                    placeholder="\u2014"
                    type="number"
                    value={set.load_value != null ? String(set.load_value) : ''}
                  />
                  <span className="flex shrink-0 items-center text-xs text-foreground-400">
                    {LOAD_UNIT_LABELS[set.load_unit ?? 'kg'] ?? set.load_unit ?? 'kg'}
                  </span>
                </div>
              </div>
              <div className="flex w-[calc(50%-4px)] flex-col gap-0.5">
                <label
                  className="text-[10px] text-foreground-400"
                  htmlFor={`${uid}-m-${idx}-rest`}
                >
                  Rest (s)
                </label>
                <Input
                  id={`${uid}-m-${idx}-rest`}
                  inputMode="numeric"
                  onChange={(e) => updateSet(idx, {rest_seconds: e.target.value ? Number(e.target.value) : null})}
                  placeholder="120"
                  type="number"
                  value={set.rest_seconds != null ? String(set.rest_seconds) : ''}
                />
              </div>
              <div className="flex w-[calc(50%-4px)] flex-col gap-0.5">
                <Select
                  aria-label={`Set ${idx + 1} unit`}
                  onSelectionChange={(key) => updateSet(idx, {load_unit: String(key) as PlannedSet['load_unit']})}
                  selectedKey={set.load_unit ?? 'kg'}
                >
                  <Label className="text-[10px]">Unit</Label>
                  <Select.Trigger />
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
            </div>
          </div>
        ))}
      </div>

      {/* Add set */}
      <Button
        onPress={addSet}
        size="sm"
        variant="ghost"
      >
        <Plus size={14} />
        Add set
      </Button>
    </div>
  );
}
