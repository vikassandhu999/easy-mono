import type {
  CreateSet,
  PerformedSet,
  Session,
  SessionPlannedSet,
  SessionSnapshotExercise,
  TrainingPlanPlannedSet,
} from '../api/training';

export type Tracking = SessionSnapshotExercise['tracking_type'];
export const trackingOptions: {id: Tracking; label: string}[] = [
  {id: 'weight_reps', label: 'Weight and reps'},
  {id: 'bodyweight_reps', label: 'Bodyweight reps'},
  {id: 'weighted_bodyweight', label: 'Bodyweight with added weight'},
  {id: 'assisted_bodyweight', label: 'Assisted bodyweight'},
  {id: 'reps_only', label: 'Reps'},
  {id: 'duration', label: 'Time'},
  {id: 'weight_duration', label: 'Weight and time'},
  {id: 'distance_duration', label: 'Distance and time'},
  {id: 'weight_distance', label: 'Weight and distance'},
];
export type SetValues = {
  exercise_name: string;
  tracking: Tracking;
  reps: string;
  load_value: string;
  load_unit: 'kg' | 'lbs' | 'bodyweight' | 'none';
  duration_seconds: string;
  distance_value: string;
  distance_unit: 'meters' | 'km' | 'miles' | 'none';
  set_type: 'working' | 'warmup' | 'dropset';
  rpe: string;
  notes: string;
};
export type SetEntry = {
  key: string;
  exerciseId?: string | null;
  values: SetValues;
  operation: {kind: 'create'; requestId: string} | {kind: 'edit'; id: string};
  attempted: boolean;
};
export type WorkoutDraft = {
  version: 1;
  selected: string;
  notes: string;
  soreness: string;
  entries: SetEntry[];
};

export function measurementFields(tracking: Tracking) {
  return {
    reps: ['weight_reps', 'bodyweight_reps', 'weighted_bodyweight', 'assisted_bodyweight', 'reps_only'].includes(
      tracking,
    ),
    load: ['weight_reps', 'weighted_bodyweight', 'assisted_bodyweight', 'weight_duration', 'weight_distance'].includes(
      tracking,
    ),
    duration: ['duration', 'weight_duration', 'distance_duration'].includes(tracking),
    distance: ['distance_duration', 'weight_distance'].includes(tracking),
  };
}

export function emptySet(exercise: SessionSnapshotExercise | undefined, unit: 'kg' | 'lbs'): SetValues {
  return {
    exercise_name: exercise?.exercise_name ?? '',
    tracking: exercise?.tracking_type ?? 'weight_reps',
    reps: '',
    load_value: '',
    load_unit: unit,
    duration_seconds: '',
    distance_value: '',
    distance_unit: 'km',
    set_type: 'working',
    rpe: '',
    notes: '',
  };
}

export function setValues(
  set: PerformedSet,
  exercise: SessionSnapshotExercise | undefined,
  unit: 'kg' | 'lbs',
): SetValues {
  return {
    ...emptySet(exercise, unit),
    tracking:
      exercise?.tracking_type ??
      (set.duration_seconds !== null
        ? set.load_value !== null
          ? 'weight_duration'
          : set.distance_value !== null
            ? 'distance_duration'
            : 'duration'
        : set.distance_value !== null
          ? 'weight_distance'
          : 'weight_reps'),
    exercise_name: set.exercise_name,
    reps: set.reps ?? '',
    load_value: set.load_value ?? '',
    load_unit: loadUnit(set.load_unit) ?? unit,
    duration_seconds: set.duration_seconds === null ? '' : String(set.duration_seconds),
    distance_value: set.distance_value ?? '',
    distance_unit: distanceUnit(set.distance_unit) ?? 'km',
    set_type: set.set_type,
    rpe: set.rpe ?? '',
    notes: set.notes ?? '',
  };
}

function loadUnit(value: unknown) {
  return value === 'kg' || value === 'lbs' || value === 'bodyweight' || value === 'none' ? value : null;
}
function distanceUnit(value: unknown) {
  return value === 'meters' || value === 'km' || value === 'miles' || value === 'none' ? value : null;
}
function trackingType(value: unknown): value is Tracking {
  return trackingOptions.some((option) => option.id === value);
}
function isValues(value: unknown): value is SetValues {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return (
    'exercise_name' in value &&
    typeof value.exercise_name === 'string' &&
    'tracking' in value &&
    trackingType(value.tracking) &&
    'reps' in value &&
    typeof value.reps === 'string' &&
    'load_value' in value &&
    typeof value.load_value === 'string' &&
    'load_unit' in value &&
    loadUnit(value.load_unit) !== null &&
    'duration_seconds' in value &&
    typeof value.duration_seconds === 'string' &&
    'distance_value' in value &&
    typeof value.distance_value === 'string' &&
    'distance_unit' in value &&
    distanceUnit(value.distance_unit) !== null &&
    'set_type' in value &&
    ['working', 'warmup', 'dropset'].some((type) => type === value.set_type) &&
    'rpe' in value &&
    typeof value.rpe === 'string' &&
    'notes' in value &&
    typeof value.notes === 'string'
  );
}
function isEntry(value: unknown): value is SetEntry {
  if (
    !value ||
    typeof value !== 'object' ||
    !('key' in value) ||
    typeof value.key !== 'string' ||
    !('values' in value) ||
    !isValues(value.values) ||
    !('attempted' in value) ||
    typeof value.attempted !== 'boolean' ||
    !('operation' in value) ||
    !value.operation ||
    typeof value.operation !== 'object' ||
    !('kind' in value.operation)
  ) {
    return false;
  }
  const operation = value.operation;
  if ('exerciseId' in value && value.exerciseId !== null && typeof value.exerciseId !== 'string') {
    return false;
  }
  return (
    (operation.kind === 'create' &&
      'requestId' in operation &&
      typeof operation.requestId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operation.requestId)) ||
    (operation.kind === 'edit' && 'id' in operation && typeof operation.id === 'string')
  );
}
export function parseWorkoutDraft(value: unknown): WorkoutDraft | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('selected' in value) ||
    typeof value.selected !== 'string' ||
    !('notes' in value) ||
    typeof value.notes !== 'string' ||
    !('soreness' in value) ||
    typeof value.soreness !== 'string' ||
    !('entries' in value) ||
    !Array.isArray(value.entries) ||
    !value.entries.every(isEntry)
  ) {
    return null;
  }
  return {version: 1, selected: value.selected, notes: value.notes, soreness: value.soreness, entries: value.entries};
}

export function initialWorkoutDraft(session: Session): WorkoutDraft {
  return {
    version: 1,
    selected: session.prescription_snapshot?.workout.exercises[0]?.ref ?? 'freestyle',
    notes: session.notes ?? '',
    soreness: session.soreness_rating === null ? '' : String(session.soreness_rating),
    entries: [],
  };
}

export function setMeasurements(values: SetValues) {
  const fields = measurementFields(values.tracking);
  const number = (value: string) => (value.trim() === '' ? null : Number(value));
  return {
    set_type: values.set_type,
    reps: fields.reps ? values.reps.trim() || null : null,
    load_value: fields.load ? number(values.load_value) : null,
    load_unit: fields.load ? values.load_unit : null,
    duration_seconds: fields.duration ? number(values.duration_seconds) : null,
    distance_value: fields.distance ? number(values.distance_value) : null,
    distance_unit: fields.distance ? values.distance_unit : null,
    rpe: number(values.rpe),
    notes: values.notes.trim() || null,
  };
}

export function creationBody(entry: SetEntry): CreateSet {
  if (entry.operation.kind !== 'create') {
    throw new Error('This entry edits a saved set.');
  }
  return {
    ...setMeasurements(entry.values),
    request_id: entry.operation.requestId,
    exercise_name: entry.values.exercise_name.trim(),
    ...(entry.exerciseId ? {exercise_id: entry.exerciseId} : {}),
    ...(entry.key === 'freestyle' ? {} : {snapshot_exercise_ref: entry.key}),
  };
}

type Measurements = Pick<
  PerformedSet,
  'reps' | 'load_value' | 'load_unit' | 'duration_seconds' | 'distance_value' | 'distance_unit'
>;
export function measurementText(set: Measurements) {
  const parts = [
    set.reps ? `${set.reps} reps` : '',
    set.load_value !== null
      ? `${set.load_value}${set.load_unit && set.load_unit !== 'none' ? ` ${set.load_unit}` : ''}`
      : '',
    set.duration_seconds !== null ? `${set.duration_seconds} sec` : '',
    set.distance_value !== null
      ? `${set.distance_value}${set.distance_unit && set.distance_unit !== 'none' ? ` ${set.distance_unit}` : ''}`
      : '',
  ];
  return parts.filter(Boolean).join(' · ') || 'No measurements';
}

export function targetText(set: SessionPlannedSet | TrainingPlanPlannedSet) {
  return [
    measurementText(set),
    set.rpe ? `Effort ${set.rpe}/10` : '',
    set.rest_seconds ? `Rest ${set.rest_seconds} sec` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
export function sessionName(session: Session) {
  return session.prescription_snapshot?.workout.name ?? 'Freestyle workout';
}
export function dayLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
}
