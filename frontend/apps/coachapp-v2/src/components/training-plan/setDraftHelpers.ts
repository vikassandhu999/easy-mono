import type {PlannedSet} from '@/api/trainingPlans';

/** crypto.randomUUID() requires a secure context (HTTPS / localhost).
 *  Mobile devices accessing dev via http://192.168.x.x fail — fall back to getRandomValues. */
const generateId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

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

export const newSetDraft = (): SetDraft => ({...EMPTY_SET_TEMPLATE, localId: generateId()});

export const cloneSetDraft = (draft: SetDraft): SetDraft => ({...draft, localId: generateId()});

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
  localId: generateId(),
  notes: plannedSet.notes ?? '',
  rest_seconds: plannedSet.rest_seconds?.toString() ?? '',
  set_type: plannedSet.set_type ?? 'working',
  target_reps: plannedSet.target_reps ?? '',
  tempo: plannedSet.tempo ?? '',
});

export const fromSetDraft = (draft: SetDraft): PlannedSet => ({
  distance_unit: (draft.distance_unit as PlannedSet['distance_unit']) || undefined,
  distance_value: numberFromString(draft.distance_value),
  duration_seconds: integerFromString(draft.duration_seconds),
  intensity_target: draft.intensity_target.trim() || undefined,
  load_unit: (draft.load_unit as PlannedSet['load_unit']) || undefined,
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

const UNIFORM_KEYS = ['set_type', 'target_reps', 'load_value', 'load_unit', 'rest_seconds'] as const;

export const areSetsUniform = (sets: SetDraft[]): boolean => {
  if (sets.length <= 1) return true;
  const first = sets[0];
  if (!first) return true;
  return sets.every((s) => UNIFORM_KEYS.every((key) => s[key] === first[key]));
};
