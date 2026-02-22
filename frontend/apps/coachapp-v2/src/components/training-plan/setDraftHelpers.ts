import type {PlannedSet} from '@/api/trainingPlans';

export type SetDraft = {
  distance_unit: string;
  distance_value: string;
  duration_seconds: string;
  intensity_target: string;
  load_unit: string;
  load_value: string;
  localId: string;
  notes: string;
  rest_seconds: string;
  set_type: string;
  target_reps: string;
  tempo: string;
};

const EMPTY_SET_TEMPLATE = {
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

export const newSetDraft = (): SetDraft => ({...EMPTY_SET_TEMPLATE, localId: crypto.randomUUID()});

export const LOAD_UNITS = ['none', 'kg', 'lbs', 'bodyweight', 'percent_1rm', 'rpe'] as const;

export const SET_TYPES = ['working', 'warmup', 'dropset', 'backoff', 'amrap', 'emom', 'cluster', 'rest_pause'] as const;

export const DISTANCE_UNITS = ['none', 'meters', 'km', 'miles', 'yards'] as const;

export const numberFromString = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const integerFromString = (value: string) => {
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
  localId: crypto.randomUUID(),
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

export const formatSetSummary = (draft: SetDraft): string => {
  const parts: string[] = [];
  if (draft.target_reps) parts.push(draft.target_reps);
  if (draft.load_value) {
    const unit = draft.load_unit !== 'none' ? draft.load_unit : '';
    parts.push(`${draft.load_value}${unit}`);
  }
  if (draft.rest_seconds) parts.push(`${draft.rest_seconds}s`);
  return parts.join(' · ') || 'Empty set';
};
