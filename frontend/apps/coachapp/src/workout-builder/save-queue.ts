import {metricKeys} from '@easy/workouts/metrics';
import type {Workout as SavedWorkout, WorkoutBody} from '../api/workouts';
import {bodyOf, problemsOf, type Workout} from './model.ts';

export type SaveState = 'saved' | 'saving' | 'failed';
export class WorkoutSaveQueue {
  draft: Workout;
  state: SaveState;
  error = '';
  private revision = 0;
  private saved = 0;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private write: (id: string, body: WorkoutBody) => Promise<SavedWorkout>;
  private publish: () => void;
  private persist: (draft: Workout | null) => void;
  constructor(
    initial: Workout,
    write: (id: string, body: WorkoutBody) => Promise<SavedWorkout>,
    publish: () => void,
    persist: (draft: Workout | null) => void,
    recovered = false,
  ) {
    this.write = write;
    this.publish = publish;
    this.persist = persist;
    this.draft = initial;
    this.state = recovered ? 'failed' : 'saved';
    if (recovered) {
      this.revision = 1;
      this.error = 'Recovered changes from this device. Retry to save them.';
    }
  }
  change(draft: Workout) {
    this.draft = {...draft, id: this.draft.id};
    this.revision += 1;
    this.persist(this.draft);
    this.state = 'saving';
    this.error = '';
    this.publish();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.flush();
    }, 450);
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.running || this.saved === this.revision) {
      return;
    }
    const problem = problemsOf(this.draft);
    if (problem) {
      this.state = 'failed';
      this.error = problem;
      this.publish();
      return;
    }
    this.running = true;
    this.state = 'saving';
    this.error = '';
    this.publish();
    try {
      while (this.saved < this.revision) {
        const revision = this.revision;
        const draft = this.draft;
        const problem = problemsOf(draft);
        if (problem) {
          throw new Error(problem);
        }
        const result = await this.write(draft.id, bodyOf(draft));
        // A past prescription edit returns a new workout id (W37). The next write must use it.
        this.draft = remapAfterSave(this.draft, draft, result);
        this.saved = revision;
        this.persist(this.saved === this.revision ? null : this.draft);
        this.publish();
      }
      this.state = 'saved';
    } catch (cause) {
      this.state = 'failed';
      this.error = cause instanceof Error ? cause.message : 'Could not save this workout.';
      this.persist(this.draft);
    } finally {
      this.running = false;
      this.publish();
    }
  }
  dispose() {
    clearTimeout(this.timer);
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
function targets(value: unknown) {
  return (
    object(value) &&
    Object.entries(value).every(
      ([key, target]) =>
        (key === 'rest' || key === 'grade' || metricKeys.some((metric) => metric === key)) &&
        object(target) &&
        (key === 'rest'
          ? ['exact', 'range', 'client_chooses', 'none']
          : ['exact', 'range', 'max', 'client_chooses']
        ).includes(String(target.mode)) &&
        ['v', 'min', 'max'].every((key) => target[key] === undefined || typeof target[key] === 'string'),
    )
  );
}
function sourceExercise(value: unknown) {
  return (
    object(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    ['movement', 'activity', 'sport', 'practice'].includes(String(value.kind)) &&
    typeof value.is_builtin === 'boolean' &&
    ['goals', 'places', 'muscles'].every((key) => strings(value[key])) &&
    ['instructions', 'equipment', 'archived_at'].every(
      (key) => value[key] === null || typeof value[key] === 'string',
    ) &&
    Array.isArray(value.metrics) &&
    value.metrics.every(
      (metric) =>
        object(metric) &&
        metricKeys.some((key) => key === metric.key) &&
        (metric.label === null || typeof metric.label === 'string'),
    ) &&
    Array.isArray(value.media) &&
    value.media.every(
      (item) =>
        object(item) &&
        typeof item.id === 'string' &&
        typeof item.url === 'string' &&
        (item.caption === null || typeof item.caption === 'string'),
    )
  );
}
export function readDraft(raw: string | null): Workout | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (
      !object(value) ||
      typeof value.id !== 'string' ||
      typeof value.name !== 'string' ||
      typeof value.description !== 'string' ||
      typeof value.video !== 'string' ||
      !['prescribed', 'video', 'open'].includes(String(value.type)) ||
      !Array.isArray(value.groups)
    ) {
      return null;
    }
    for (const group of value.groups) {
      if (
        !object(group) ||
        typeof group.id !== 'string' ||
        typeof group.name !== 'string' ||
        typeof group.rounds !== 'number' ||
        !Number.isInteger(group.rounds) ||
        group.rounds < 1 ||
        group.rounds > 100 ||
        !Array.isArray(group.exercises)
      ) {
        return null;
      }
      for (const exercise of group.exercises) {
        if (
          !object(exercise) ||
          typeof exercise.id !== 'string' ||
          !['combined', 'per_side'].includes(String(exercise.sideMode)) ||
          typeof exercise.perRound !== 'boolean' ||
          !targets(exercise.targets) ||
          !Array.isArray(exercise.roundTargets) ||
          !exercise.roundTargets.every(targets)
        ) {
          return null;
        }
        if (!sourceExercise(exercise.source)) {
          return null;
        }
        if (exercise.perRound && exercise.roundTargets.length !== group.rounds) {
          return null;
        }
      }
    }
    const workout = value as Workout;
    return {
      ...workout,
      groups: workout.groups.map((group) => ({
        ...group,
        uiId: typeof group.uiId === 'string' ? group.uiId : group.id,
        exercises: group.exercises.map((exercise) => ({
          ...exercise,
          uiId: typeof exercise.uiId === 'string' ? exercise.uiId : exercise.id,
        })),
      })),
    };
  } catch {
    return null;
  }
}

export function readDraftKeys(raw: string | null, prefix: string): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!object(value) || !Array.isArray(value.storageKeys)) {
      return [];
    }
    return value.storageKeys.filter((key): key is string => typeof key === 'string' && key.startsWith(prefix));
  } catch {
    return [];
  }
}

export function remapAfterSave(current: Workout, requested: Workout, saved: SavedWorkout): Workout {
  const groups = new Map<string, string>();
  const exercises = new Map<string, SavedWorkout['groups'][number]['exercises'][number]>();
  requested.groups.forEach((group, index) => {
    const returned = saved.groups[index];
    if (!returned) {
      return;
    }
    groups.set(group.id, returned.id);
    group.exercises.forEach((exercise, position) => {
      const row = returned.exercises[position];
      if (row && row.exercise_id === exercise.source.id) {
        exercises.set(exercise.id, row);
      }
    });
  });
  return {
    ...current,
    id: saved.id,
    groups: current.groups.map((group) => ({
      ...group,
      id: groups.get(group.id) ?? group.id,
      exercises: group.exercises.map((exercise) => {
        const row = exercises.get(exercise.id);
        return row ? {...exercise, id: row.id, source: row.exercise} : exercise;
      }),
    })),
  };
}
