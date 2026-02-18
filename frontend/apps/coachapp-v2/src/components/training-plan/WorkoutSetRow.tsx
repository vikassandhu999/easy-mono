import {Button, Card, Input, Label, ListBox, Select, TextField} from '@heroui/react';
import {Trash2} from 'lucide-react';

import type {PlannedSet} from '@/api/trainingPlans';

export type SetDraft = {
  distance_unit: string;
  distance_value: string;
  duration_seconds: string;
  intensity_target: string;
  load_unit: string;
  load_value: string;
  notes: string;
  rest_seconds: string;
  set_type: string;
  target_reps: string;
  tempo: string;
};

export const EMPTY_SET: SetDraft = {
  distance_unit: 'none',
  distance_value: '',
  duration_seconds: '',
  intensity_target: '',
  load_unit: 'none',
  load_value: '',
  notes: '',
  rest_seconds: '',
  set_type: 'working',
  target_reps: '',
  tempo: '',
};

const LOAD_UNITS = ['none', 'kg', 'lbs', 'bodyweight', 'percent_1rm', 'rpe'] as const;

const SET_TYPES = ['working', 'warmup', 'dropset', 'backoff', 'amrap', 'emom', 'cluster', 'rest_pause'] as const;

const numberFromString = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const integerFromString = (value: string) => {
  const parsed = numberFromString(value);
  return parsed !== undefined ? Math.round(parsed) : undefined;
};

export const toSetDraft = (plannedSet: PlannedSet): SetDraft => ({
  distance_unit: plannedSet.distance_unit ?? 'none',
  distance_value: plannedSet.distance_value?.toString() ?? '',
  duration_seconds: plannedSet.duration_seconds?.toString() ?? '',
  intensity_target: plannedSet.intensity_target ?? '',
  load_unit: plannedSet.load_unit ?? 'none',
  load_value: plannedSet.load_value?.toString() ?? '',
  notes: plannedSet.notes ?? '',
  rest_seconds: plannedSet.rest_seconds?.toString() ?? '',
  set_type: plannedSet.set_type ?? 'working',
  target_reps: plannedSet.target_reps ?? '',
  tempo: plannedSet.tempo ?? '',
});

export const fromSetDraft = (draft: SetDraft): PlannedSet => ({
  distance_unit: draft.distance_unit === 'none' ? undefined : (draft.distance_unit as PlannedSet['distance_unit']),
  distance_value: numberFromString(draft.distance_value),
  duration_seconds: integerFromString(draft.duration_seconds),
  intensity_target: draft.intensity_target.trim() || undefined,
  load_unit: draft.load_unit === 'none' ? undefined : (draft.load_unit as PlannedSet['load_unit']),
  load_value: numberFromString(draft.load_value),
  notes: draft.notes.trim() || undefined,
  rest_seconds: integerFromString(draft.rest_seconds),
  set_type: draft.set_type ? (draft.set_type as PlannedSet['set_type']) : undefined,
  target_reps: draft.target_reps.trim() || undefined,
  tempo: draft.tempo.trim() || undefined,
});

type SetRowProps = {
  onChange: (next: SetDraft) => void;
  onRemove: () => void;
  setDraft: SetDraft;
  setIndex: number;
};

export function SetRow({onChange, onRemove, setDraft, setIndex}: SetRowProps) {
  const updateField = <K extends keyof SetDraft>(field: K, value: SetDraft[K]) => {
    onChange({...setDraft, [field]: value});
  };

  return (
    <Card className="rounded-xl border border-separator bg-background p-4">
      <div className="flex flex-col gap-3">
        {/* Set header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-secondary text-xs font-bold text-foreground">
              {setIndex + 1}
            </span>
            <span
              className="inline-flex items-center rounded-full border border-separator bg-surface-secondary px-2 py-0.5 text-xs font-medium capitalize text-foreground"
            >
              {setDraft.set_type.replace('_', ' ')}
            </span>
          </div>
          <Button
            className="min-h-8 min-w-8"
            isIconOnly
            onPress={onRemove}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Fields grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField>
            <Label className="text-xs font-medium text-muted">Reps</Label>
            <Input
              className="min-h-10"
              onChange={(e) => updateField('target_reps', e.target.value)}
              placeholder="e.g. 8-10"
              value={setDraft.target_reps}
              variant="secondary"
            />
          </TextField>
          <div className="flex gap-2">
            <TextField className="flex-1">
              <Label className="text-xs font-medium text-muted">Load</Label>
              <Input
                className="min-h-10"
                onChange={(e) => updateField('load_value', e.target.value)}
                type="number"
                value={setDraft.load_value}
                variant="secondary"
              />
            </TextField>
            <Select
              onChange={(value) => updateField('load_unit', value?.toString() ?? 'none')}
              selectedKey={setDraft.load_unit}
            >
              <Label className="text-xs font-medium text-muted">Unit</Label>
              <Select.Trigger className="min-h-10 w-20" />
              <Select.Popover>
                <ListBox>
                  {LOAD_UNITS.map((unit) => (
                    <ListBox.Item
                      key={unit}
                      textValue={unit}
                    >
                      {unit}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <Select
            onChange={(value) => updateField('set_type', value?.toString() ?? 'working')}
            selectedKey={setDraft.set_type}
          >
            <Label className="text-xs font-medium text-muted">Type</Label>
            <Select.Trigger className="min-h-10 w-full" />
            <Select.Popover>
              <ListBox>
                {SET_TYPES.map((type) => (
                  <ListBox.Item
                    key={type}
                    textValue={type}
                  >
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <div className="flex gap-2">
            <TextField className="flex-1">
              <Label className="text-xs font-medium text-muted">Rest</Label>
              <Input
                className="min-h-10"
                onChange={(e) => updateField('rest_seconds', e.target.value)}
                placeholder="sec"
                type="number"
                value={setDraft.rest_seconds}
                variant="secondary"
              />
            </TextField>
            <TextField className="flex-1">
              <Label className="text-xs font-medium text-muted">Tempo</Label>
              <Input
                className="min-h-10"
                onChange={(e) => updateField('tempo', e.target.value)}
                placeholder="3010"
                value={setDraft.tempo}
                variant="secondary"
              />
            </TextField>
          </div>
        </div>
      </div>
    </Card>
  );
}
