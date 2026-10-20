import {historicalMetrics, type MetricInfo, type MetricKey, metricCatalogue, metricLabel} from '@easy/workouts/metrics';
import {formatRest, formatTarget, type RestTarget, type Target as SavedTarget} from '@easy/workouts/targets';
import type {Exercise as CatalogueExercise} from '../api/exercises';
import type {Workout as SavedWorkout, WorkoutBody} from '../api/workouts';
import {move} from '../exercises/exercise.ts';

export type Mode = SavedTarget['mode'] | 'none';
export type Target = {mode: Mode; v?: string; min?: string; max?: string};
export type Targets = Record<string, Target>;
export type Exercise = {
  id: string;
  uiId: string;
  source: CatalogueExercise;
  sideMode: 'combined' | 'per_side';
  perRound: boolean;
  targets: Targets;
  roundTargets: Targets[];
};
export type Group = {id: string; uiId: string; name: string; rounds: number; exercises: Exercise[]};
export type Workout = Pick<SavedWorkout, 'name' | 'type'> & {
  id: string;
  description: string;
  video: string;
  groups: Group[];
};
export type WorkoutType = Workout['type'];
export type Where = {group: number; exercise: number; key: string; round: number | null};
export const modeLabels: Record<Mode, string> = {
  exact: 'Exact',
  range: 'Range',
  max: 'As much as possible',
  client_chooses: 'Client chooses',
  none: 'None',
};
export const typeLabels = {prescribed: 'Exercises', video: 'Video', open: 'Open session'};
export const letterOf = (index: number) => (index < 26 ? String.fromCharCode(65 + index) : String(index + 1));
export const keysOf = (exercise: Exercise) => [...exercise.source.metrics.map((metric) => metric.key), 'rest'];
export function infoFor(key: string): MetricInfo | undefined {
  return key === 'rest'
    ? {label: 'Rest', unit: 'seconds or m:ss'}
    : key === 'grade'
      ? historicalMetrics.grade
      : metricCatalogue[key as MetricKey];
}
export function labelFor(key: string, exercise?: CatalogueExercise) {
  return key === 'rest'
    ? 'Rest'
    : metricLabel(
        key as MetricKey | 'grade',
        exercise?.metrics.find((metric) => metric.key === key),
      );
}
export const groupLabel = (group: Group, index: number) =>
  `${letterOf(index)} · ${group.exercises.length === 1 ? 'Straight sets' : group.exercises.length === 2 ? 'Superset' : 'Circuit'}`;
export const groupTitle = (group: Group, index: number) => group.name || letterOf(index);
export function parseNumber(text: string) {
  if (!text.trim()) {
    return Number.NaN;
  }
  return text.includes(':') ? text.split(':').reduce((seconds, part) => seconds * 60 + Number(part), 0) : Number(text);
}
export function targetLabel(key: string, target?: Target) {
  return key === 'rest'
    ? formatRest(restBody(target))
    : formatTarget(key as MetricKey | 'grade', target ? metricBody(key, target) : null);
}
export function groupSummary(group: Group, index: number) {
  const last = group.exercises.at(-1);
  if (!last) {
    return '';
  }
  const rest = last.perRound ? 'rest varies by round' : `rest ${targetLabel('rest', last.targets.rest)}`;
  return group.exercises.length === 1
    ? `${rest[0]?.toUpperCase()}${rest.slice(1)} between rounds`
    : `${group.exercises.map((_, i) => `${letterOf(index)}${i + 1}`).join(' → ')}, then ${rest}`;
}
export function getTarget(exercise: Exercise, key: string, round: number | null) {
  return exercise.perRound && round !== null ? exercise.roundTargets[round]?.[key] : exercise.targets[key];
}
const decode = (target: SavedTarget | null | undefined): Target => {
  if (!target) {
    return {mode: 'client_chooses'};
  }
  if (target.mode === 'client_chooses' || target.mode === 'max') {
    return {mode: target.mode};
  }
  if (target.mode === 'range') {
    return {mode: 'range', min: String(target.min), max: String(target.max)};
  }
  return {mode: 'exact', v: String(target.value)};
};
const decodeRest = (target: RestTarget): Target => {
  if (target.mode === 'exact') {
    return {mode: 'exact', v: String(target.value_s)};
  }
  if (target.mode === 'range') {
    return {mode: 'range', min: String(target.min_s), max: String(target.max_s)};
  }
  return {mode: target.mode};
};
export function draftOf(workout: SavedWorkout): Workout {
  return {
    id: workout.id,
    name: workout.name,
    description: workout.description ?? '',
    type: workout.type,
    video: workout.video?.url ?? '',
    groups: workout.groups.map((group) => ({
      id: group.id,
      uiId: group.id,
      name: group.name ?? '',
      rounds: group.rounds,
      exercises: group.exercises.map((exercise) => {
        const rows = exercise.targets.map(({rest, ...targets}) => ({
          ...Object.fromEntries(
            Object.entries(targets)
              .filter(([, value]) => value)
              .map(([key, value]) => [key, decode(value)]),
          ),
          rest: decodeRest(rest),
        }));
        return {
          id: exercise.id,
          uiId: exercise.id,
          source: exercise.exercise,
          sideMode: exercise.side_mode,
          perRound: exercise.targets_mode === 'per_round',
          targets: rows[0] ?? {rest: {mode: 'client_chooses'}},
          roundTargets: exercise.targets_mode === 'per_round' ? rows : [],
        };
      }),
    })),
  };
}
const metricBody = (key: string, target: Target): SavedTarget =>
  target.mode === 'max' || target.mode === 'client_chooses'
    ? {mode: target.mode}
    : target.mode === 'range'
      ? {mode: 'range' as const, min: parseNumber(target.min ?? ''), max: parseNumber(target.max ?? '')}
      : {mode: 'exact' as const, value: infoFor(key)?.text ? (target.v ?? '') : parseNumber(target.v ?? '')};
const restBody = (target?: Target): RestTarget =>
  target?.mode === 'exact'
    ? {mode: 'exact', value_s: parseNumber(target.v ?? '')}
    : target?.mode === 'range'
      ? {mode: 'range', min_s: parseNumber(target.min ?? ''), max_s: parseNumber(target.max ?? '')}
      : {mode: target?.mode === 'none' ? 'none' : 'client_chooses'};
export function bodyOf(workout: Workout): WorkoutBody {
  return {
    name: workout.name.trim(),
    description: workout.description || null,
    type: workout.type,
    video_url: workout.type === 'video' ? workout.video || null : null,
    groups:
      workout.type !== 'prescribed'
        ? []
        : workout.groups.map((group) => ({
            id: group.id,
            name: group.name || null,
            rounds: group.rounds,
            exercises: group.exercises.map((exercise) => {
              const rows = exercise.perRound ? exercise.roundTargets : [exercise.targets];
              return {
                id: exercise.id,
                exercise_id: exercise.source.id,
                side_mode: exercise.sideMode,
                targets_mode: exercise.perRound ? 'per_round' : 'same_for_all',
                targets: rows.map((row) => ({
                  ...Object.fromEntries(
                    Object.entries(row)
                      .filter(([key, target]) => key !== 'rest' && target.mode !== 'client_chooses')
                      .map(([key, target]) => [key, metricBody(key, target)]),
                  ),
                  rest: restBody(row.rest),
                })),
              };
            }),
          })),
  };
}
export function problemsOf(workout: Workout) {
  if (!workout.name.trim()) {
    return 'Enter a workout name.';
  }
  if (workout.type === 'video' && !validUrl(workout.video)) {
    return 'Enter a video URL that starts with https:// or http://.';
  }
  for (const group of workout.groups) {
    for (const exercise of group.exercises) {
      for (const row of exercise.perRound ? exercise.roundTargets : [exercise.targets]) {
        for (const [key, target] of Object.entries(row)) {
          if (
            target.mode === 'exact' &&
            (infoFor(key)?.text ? !target.v?.trim() : !Number.isFinite(parseNumber(target.v ?? '')))
          ) {
            return `Enter a valid ${labelFor(key, exercise.source)} value for ${exercise.source.name}.`;
          }
          if (
            target.mode === 'range' &&
            (!Number.isFinite(parseNumber(target.min ?? '')) ||
              !Number.isFinite(parseNumber(target.max ?? '')) ||
              parseNumber(target.min ?? '') > parseNumber(target.max ?? ''))
          ) {
            return `Enter a valid ${labelFor(key, exercise.source)} range for ${exercise.source.name}.`;
          }
        }
      }
    }
  }
  return null;
}
export function validUrl(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
const mapGroup = (workout: Workout, index: number, change: (group: Group) => Group) => ({
  ...workout,
  groups: workout.groups.map((group, i) => (i === index ? change(group) : group)),
});
const mapExercise = (workout: Workout, group: number, index: number, change: (exercise: Exercise) => Exercise) =>
  mapGroup(workout, group, (current) => ({
    ...current,
    exercises: current.exercises.map((exercise, i) => (i === index ? change(exercise) : exercise)),
  }));
const fitted = (rows: Targets[], rounds: number, fallback: Targets) =>
  Array.from({length: rounds}, (_, i) => structuredClone(rows[i] ?? rows.at(-1) ?? fallback));
export function newExercise(source: CatalogueExercise): Exercise {
  const id = crypto.randomUUID();
  return {
    id,
    uiId: id,
    source,
    sideMode: 'combined',
    perRound: false,
    targets: {rest: {mode: 'client_chooses'}},
    roundTargets: [],
  };
}
export const actions = {
  setSideMode: (workout: Workout, group: number, index: number, sideMode: Exercise['sideMode']) =>
    mapExercise(workout, group, index, (exercise) => ({...exercise, sideMode})),
  putTarget: (workout: Workout, where: Where, target: Target) =>
    mapExercise(workout, where.group, where.exercise, (exercise) =>
      exercise.perRound && where.round !== null
        ? {
            ...exercise,
            roundTargets: exercise.roundTargets.map((row, i) =>
              i === where.round ? {...row, [where.key]: target} : row,
            ),
          }
        : {...exercise, targets: {...exercise.targets, [where.key]: target}},
    ),
  togglePerRound: (workout: Workout, group: number, index: number) =>
    mapExercise(workout, group, index, (exercise) =>
      exercise.perRound
        ? {...exercise, perRound: false, targets: exercise.roundTargets[0] ?? exercise.targets, roundTargets: []}
        : {...exercise, perRound: true, roundTargets: fitted([], workout.groups[group]?.rounds ?? 1, exercise.targets)},
    ),
  setRounds: (workout: Workout, group: number, rounds: number) =>
    mapGroup(workout, group, (current) => ({
      ...current,
      rounds,
      exercises: current.exercises.map((exercise) =>
        exercise.perRound
          ? {...exercise, roundTargets: fitted(exercise.roundTargets, rounds, exercise.targets)}
          : exercise,
      ),
    })),
  renameGroup: (workout: Workout, group: number, name: string) =>
    mapGroup(workout, group, (current) => ({...current, name})),
  addExercise: (workout: Workout, group: number | 'new', source: CatalogueExercise): Workout => {
    const added = newExercise(source);
    if (group === 'new') {
      return {
        ...workout,
        groups: [
          ...workout.groups,
          {id: crypto.randomUUID(), uiId: crypto.randomUUID(), name: '', rounds: 3, exercises: [added]},
        ],
      };
    }
    return mapGroup(workout, group, (current) => {
      const last = current.exercises.at(-1);
      if (!last) {
        return {...current, exercises: [added]};
      }
      const cleared = {
        ...last,
        targets: {...last.targets, rest: {mode: 'none' as const}},
        roundTargets: last.roundTargets.map((row) => ({...row, rest: {mode: 'none' as const}})),
      };
      const next = last.perRound
        ? {
            ...added,
            perRound: true,
            roundTargets: fitted(
              last.roundTargets.map((row) => ({rest: row.rest ?? {mode: 'none'}})),
              current.rounds,
              {rest: {mode: 'none'}},
            ),
          }
        : {...added, targets: {...added.targets, rest: last.targets.rest ?? {mode: 'none' as const}}};
      return {...current, exercises: [...current.exercises.slice(0, -1), cleared, next]};
    });
  },
  removeExercise: (workout: Workout, group: number, index: number) => {
    const next = mapGroup(workout, group, (current) => ({
      ...current,
      exercises: current.exercises.filter((_, i) => i !== index),
    }));
    return {...next, groups: next.groups.filter((row) => row.exercises.length > 0)};
  },
  removeGroup: (workout: Workout, group: number) => ({
    ...workout,
    groups: workout.groups.filter((_, i) => i !== group),
  }),
  moveGroup: (workout: Workout, group: number, by: -1 | 1) => ({
    ...workout,
    groups: move(workout.groups, group, group + by),
  }),
  moveExercise: (workout: Workout, group: number, index: number, by: -1 | 1) =>
    mapGroup(workout, group, (current) => ({...current, exercises: move(current.exercises, index, index + by)})),
  moveExerciseToGroup: (workout: Workout, group: number, index: number, target: number) => {
    const exercise = workout.groups[group]?.exercises[index];
    const destination = workout.groups[target];
    if (!exercise || !destination || group === target) {
      return workout;
    }
    const adjusted = exercise.perRound
      ? {...exercise, roundTargets: fitted(exercise.roundTargets, destination.rounds, exercise.targets)}
      : exercise;
    return {
      ...workout,
      groups: workout.groups
        .map((row, i) =>
          i === group
            ? {...row, exercises: row.exercises.filter((_, j) => j !== index)}
            : i === target
              ? {...row, exercises: [...row.exercises, adjusted]}
              : row,
        )
        .filter((row) => row.exercises.length > 0),
    };
  },
};

export function restoreRemoval(current: Workout, before: Workout): Workout {
  const groups = [...current.groups];
  before.groups.forEach((old, index) => {
    const found = groups.findIndex((group) => group.uiId === old.uiId);
    if (found < 0) {
      groups.splice(Math.min(index, groups.length), 0, old);
      return;
    }
    const group = groups[found];
    if (!group) {
      return;
    }
    const exercises = [...group.exercises];
    old.exercises.forEach((exercise, position) => {
      if (!current.groups.some((row) => row.exercises.some((item) => item.uiId === exercise.uiId))) {
        exercises.splice(Math.min(position, exercises.length), 0, exercise);
      }
    });
    groups[found] = {...group, exercises};
  });
  return {...current, groups};
}
