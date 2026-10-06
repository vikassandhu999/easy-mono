import type {CreateSet, PerformedSet, Session, TrainingPlan} from '../api/training';

export type Workout = TrainingPlan['content']['workouts'][number];
export type Item = Workout['blocks'][number]['items'][number];
export type TargetSet = Item['sets'][number];
export type LoadUnit = 'kg' | 'lb';
export type DistanceUnit = 'm' | 'km' | 'mi';
export type SetValues = {
  exercise_name: string;
  reps: string;
  load_value: string;
  load_unit: LoadUnit;
  duration_s: string;
  distance_value: string;
  distance_unit: DistanceUnit;
  kind: 'working' | 'warmup' | 'drop';
  outcome: 'done' | 'failed' | 'skipped';
  rpe: string;
  rir: string;
  notes: string;
};
export type SetEntry = {
  key: string;
  exerciseId?: string | null;
  itemId?: string | undefined;
  setId?: string | undefined;
  values: SetValues;
  operation: {kind: 'create'; requestId: string} | {kind: 'edit'; id: string};
  attempted: boolean;
  dirty?: boolean;
  expectedRevision?: number;
};
export type WorkoutDraft = {
  version: 2;
  revision?: number;
  date?: string;
  selected: string;
  notes: string;
  entries: SetEntry[];
};

export function workoutItems(session: Session): Item[] {
  return session.prescription?.blocks.flatMap((block) => block.items) ?? [];
}

export function emptySet(exercise: Item | undefined, unit: LoadUnit, target?: TargetSet): SetValues {
  return {
    exercise_name: exercise?.exercise_name ?? '',
    reps: '',
    load_value: '',
    load_unit: unit,
    duration_s: '',
    distance_value: '',
    distance_unit: unit === 'lb' ? 'mi' : 'km',
    kind: target?.kind ?? 'working',
    outcome: 'done',
    rpe: '',
    rir: '',
    notes: '',
  };
}

export function enteredLoad(kg: string | number, unit: LoadUnit) {
  return Number(kg) / (unit === 'lb' ? 0.45359237 : 1);
}
export function enteredDistance(m: string | number, unit: DistanceUnit) {
  return Number(m) / (unit === 'mi' ? 1609.344 : unit === 'km' ? 1000 : 1);
}
function displayNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}
export function setValues(set: PerformedSet, exercise: Item | undefined, unit: LoadUnit): SetValues {
  return {
    ...emptySet(exercise, unit),
    exercise_name: set.exercise_name ?? exercise?.exercise_name ?? '',
    reps: set.reps === null ? '' : String(set.reps),
    load_value: set.load_kg === null ? '' : String(enteredLoad(set.load_kg, set.entered_load_unit ?? unit)),
    load_unit: set.entered_load_unit ?? unit,
    duration_s: set.duration_s === null ? '' : String(set.duration_s),
    distance_value:
      set.distance_m === null ? '' : String(enteredDistance(set.distance_m, set.entered_distance_unit ?? 'm')),
    distance_unit: set.entered_distance_unit ?? (unit === 'lb' ? 'mi' : 'km'),
    kind: set.kind,
    outcome: set.outcome,
    rpe: set.rpe === null ? '' : String(set.rpe),
    rir: set.rir === null ? '' : String(set.rir),
    notes: set.notes ?? '',
  };
}

function isValues(value: unknown): value is SetValues {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const strings = ['exercise_name', 'reps', 'load_value', 'duration_s', 'distance_value', 'rpe', 'rir', 'notes'];
  return (
    strings.every((key) => typeof Reflect.get(value, key) === 'string') &&
    ['kg', 'lb'].includes(Reflect.get(value, 'load_unit')) &&
    ['m', 'km', 'mi'].includes(Reflect.get(value, 'distance_unit')) &&
    ['working', 'warmup', 'drop'].includes(Reflect.get(value, 'kind')) &&
    ['done', 'failed', 'skipped'].includes(Reflect.get(value, 'outcome'))
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
  if (
    'expectedRevision' in value &&
    (typeof value.expectedRevision !== 'number' ||
      !Number.isInteger(value.expectedRevision) ||
      value.expectedRevision < 1)
  ) {
    return false;
  }
  if (
    ['exerciseId', 'itemId', 'setId'].some(
      (key) =>
        Reflect.has(value, key) && Reflect.get(value, key) != null && typeof Reflect.get(value, key) !== 'string',
    )
  ) {
    return false;
  }
  if ('dirty' in value && typeof value.dirty !== 'boolean') {
    return false;
  }
  const operation = value.operation;
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
    value.version !== 2 ||
    !('selected' in value) ||
    typeof value.selected !== 'string' ||
    !('notes' in value) ||
    typeof value.notes !== 'string' ||
    !('entries' in value) ||
    !Array.isArray(value.entries) ||
    !value.entries.every(isEntry) ||
    ('date' in value && typeof value.date !== 'string') ||
    ('revision' in value &&
      (typeof value.revision !== 'number' || !Number.isInteger(value.revision) || value.revision < 1))
  ) {
    return null;
  }
  return {
    version: 2,
    selected: value.selected,
    notes: value.notes,
    entries: value.entries,
    ...('date' in value && typeof value.date === 'string' ? {date: value.date} : {}),
    ...('revision' in value && typeof value.revision === 'number' ? {revision: value.revision} : {}),
  };
}
export function initialWorkoutDraft(session: Session): WorkoutDraft {
  return {
    version: 2,
    revision: session.revision,
    date: session.local_date,
    selected: workoutItems(session)[0]?.sets[0]?.id ?? 'freestyle',
    notes: session.notes ?? '',
    entries: [],
  };
}
export function setMeasurements(values: SetValues) {
  const number = (value: string) => (value.trim() === '' ? null : Number(value));
  const load = number(values.load_value);
  const distance = number(values.distance_value);
  return {
    kind: values.kind,
    outcome: values.outcome,
    reps: number(values.reps),
    load_value: load,
    load_unit: load === null ? null : values.load_unit,
    duration_s: number(values.duration_s),
    distance_value: distance,
    distance_unit: distance === null ? null : values.distance_unit,
    rpe: number(values.rpe),
    rir: number(values.rir),
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
    ...(entry.exerciseId ? {exercise_id: entry.exerciseId} : {exercise_name: entry.values.exercise_name.trim()}),
    ...(entry.itemId ? {item_id: entry.itemId} : {}),
    ...(entry.setId ? {set_id: entry.setId} : {}),
  };
}
type Measurements = Pick<
  PerformedSet,
  'reps' | 'load_kg' | 'entered_load_unit' | 'duration_s' | 'distance_m' | 'entered_distance_unit'
>;
export function measurementText(set: Measurements) {
  return (
    [
      set.reps !== null ? `${set.reps} reps` : '',
      set.load_kg !== null
        ? `${displayNumber(enteredLoad(set.load_kg, set.entered_load_unit ?? 'kg'))} ${set.entered_load_unit ?? 'kg'}`
        : '',
      set.duration_s !== null ? `${set.duration_s} sec` : '',
      set.distance_m !== null
        ? `${displayNumber(enteredDistance(set.distance_m, set.entered_distance_unit ?? 'm'))} ${set.entered_distance_unit ?? 'm'}`
        : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'No measurements'
  );
}
export function targetText(set: TargetSet) {
  const reps =
    set.reps?.type === 'exact'
      ? `${set.reps.value} reps`
      : set.reps?.type === 'range'
        ? `${set.reps.min}–${set.reps.max} reps`
        : set.reps?.type === 'amrap'
          ? 'AMRAP'
          : '';
  return (
    [
      reps,
      set.load ? `${displayNumber(enteredLoad(set.load.kg, set.load.entered_unit))} ${set.load.entered_unit}` : '',
      set.duration_s != null ? `${set.duration_s} sec` : '',
      set.distance
        ? `${displayNumber(enteredDistance(set.distance.m, set.distance.entered_unit))} ${set.distance.entered_unit}`
        : '',
      set.rpe != null ? `RPE ${set.rpe}` : '',
      set.rir != null ? `RIR ${set.rir}` : '',
      set.tempo ? `Tempo ${set.tempo}` : '',
      set.rest_s != null ? `Rest ${set.rest_s} sec` : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'No set targets'
  );
}
export function sessionName(session: Session) {
  return session.prescription?.name ?? 'Freestyle workout';
}
export function dayLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
}
