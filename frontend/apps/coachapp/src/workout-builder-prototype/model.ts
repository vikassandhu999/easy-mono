// PROTOTYPE — throwaway. Answers: "What should the workout builder look like?"
// Model follows .scratch/workout/concept.md (W4, W5, W25–W27, W30). In-memory only.

export type MetricKey =
  | 'reps'
  | 'weight'
  | 'duration'
  | 'distance'
  | 'effort'
  | 'height'
  | 'speed'
  | 'incline'
  | 'rest';
export type Mode = 'exact' | 'range' | 'max' | 'choose' | 'percent' | 'none';
export type Target = {mode: Mode; v?: string; min?: string; max?: string};
export type Targets = Partial<Record<MetricKey, Target>>;
export type Kind = 'movement' | 'activity' | 'sport' | 'practice';

export type Exercise = {
  id: string;
  name: string;
  kind: Kind;
  metrics: MetricKey[];
  unilateral: boolean;
  perRound: boolean;
  targets: Targets;
  roundTargets: Targets[];
};
export type Group = {id: string; name: string; rounds: number; exercises: Exercise[]};
export type WorkoutType = 'prescribed' | 'video' | 'open';
export type Workout = {name: string; description: string; type: WorkoutType; groups: Group[]};

export const metricInfo: Record<MetricKey, {label: string; unit: string; modes: Mode[]}> = {
  reps: {label: 'Reps', unit: 'reps', modes: ['exact', 'range', 'max', 'choose']},
  weight: {label: 'Weight', unit: 'kg', modes: ['exact', 'range', 'percent', 'choose']},
  duration: {label: 'Time', unit: 'm:ss', modes: ['exact', 'range', 'max', 'choose']},
  distance: {label: 'Distance', unit: 'm', modes: ['exact', 'range', 'max', 'choose']},
  effort: {label: 'Effort', unit: 'RPE', modes: ['exact', 'range', 'choose']},
  height: {label: 'Height', unit: 'cm', modes: ['exact', 'range', 'max', 'choose']},
  speed: {label: 'Speed', unit: 'km/h', modes: ['exact', 'range', 'choose']},
  incline: {label: 'Incline', unit: '%', modes: ['exact', 'range', 'choose']},
  rest: {label: 'Rest', unit: 'm:ss', modes: ['exact', 'range', 'none']},
};

export const modeLabels: Record<Mode, string> = {
  exact: 'Exact',
  range: 'Range',
  max: 'As much as possible',
  choose: 'Client chooses',
  percent: '% of 1RM',
  none: 'No rest',
};

export const kindLabels: Record<Kind, string> = {
  movement: 'Movement',
  activity: 'Activity',
  sport: 'Sport',
  practice: 'Practice',
};

export const typeLabels: Record<WorkoutType, string> = {prescribed: 'Exercises', video: 'Video', open: 'Open session'};

export type LibraryExercise = Pick<Exercise, 'name' | 'kind' | 'metrics' | 'unilateral'>;
export const library: LibraryExercise[] = [
  {name: 'Bench press', kind: 'movement', metrics: ['reps', 'weight'], unilateral: false},
  {name: 'Pull-up', kind: 'movement', metrics: ['reps', 'weight'], unilateral: false},
  {name: 'Bulgarian split squat', kind: 'movement', metrics: ['reps', 'weight'], unilateral: true},
  {name: 'Side plank', kind: 'movement', metrics: ['duration'], unilateral: true},
  {name: 'Box jump', kind: 'movement', metrics: ['reps', 'height'], unilateral: false},
  {name: 'Treadmill run', kind: 'activity', metrics: ['duration', 'distance', 'speed', 'incline'], unilateral: false},
  {name: 'Rowing machine', kind: 'activity', metrics: ['distance', 'duration', 'effort'], unilateral: false},
  {name: 'Yoga flow', kind: 'practice', metrics: ['duration'], unilateral: false},
];

export const keysOf = (exercise: Exercise): MetricKey[] => [...exercise.metrics, 'rest'];
export const letterOf = (index: number) => 'ABCDEFGHIJKLMNOP'[index] ?? '?';

const parseNumber = (text?: string) => {
  if (!text) {
    return Number.NaN;
  }
  const [minutes, seconds] = text.split(':');
  return text.includes(':') ? Number(minutes) * 60 + Number(seconds || 0) : Number(text);
};

const formatTime = (text?: string) => {
  const seconds = parseNumber(text);
  if (!Number.isFinite(seconds)) {
    return '–';
  }
  if (seconds < 60) {
    return `${seconds} s`;
  }
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
};

export function formatValue(key: MetricKey, value?: string) {
  if (!value) {
    return '–';
  }
  switch (key) {
    case 'duration':
    case 'rest':
      return formatTime(value);
    case 'weight':
      return `${value} kg`;
    case 'distance':
      return Number(value) >= 1000 ? `${Number(value) / 1000} km` : `${value} m`;
    case 'effort':
      return `RPE ${value}`;
    case 'height':
      return `${value} cm`;
    case 'speed':
      return `${value} km/h`;
    case 'incline':
      return `${value}%`;
    default:
      return value;
  }
}

export function formatTarget(key: MetricKey, target: Target | undefined, unilateral = false) {
  if (!target || target.mode === 'choose') {
    return 'Any';
  }
  if (target.mode === 'none') {
    return 'None';
  }
  if (target.mode === 'max') {
    return 'Max';
  }
  if (target.mode === 'percent') {
    return `${target.v || '–'}% 1RM`;
  }
  const text =
    target.mode === 'range'
      ? `${formatValue(key, target.min)}–${formatValue(key, target.max)}`
      : formatValue(key, target.v);
  return unilateral && (key === 'reps' || key === 'duration') ? `${text} each side` : text;
}

const restText = (exercise: Exercise) => {
  if (exercise.perRound) {
    return 'rest varies';
  }
  const rest = exercise.targets.rest;
  return !rest || rest.mode === 'none' ? 'no rest' : `rest ${formatTarget('rest', rest)}`;
};

// One line in coach vocabulary: the structure and what happens between rounds.
// Coach vocabulary, derived from the number of exercises. "Group" is a model word and never shown.
export function groupKind(group: Group) {
  const count = group.exercises.length;
  if (count === 0) {
    return 'Empty';
  }
  return count === 1 ? 'Straight sets' : count === 2 ? 'Superset' : 'Circuit';
}

export const groupLabel = (group: Group, index: number) => `${letterOf(index)} · ${groupKind(group)}`;
export const groupTitle = (group: Group, index: number) => group.name || letterOf(index);

export function groupSummary(group: Group, index: number) {
  const [first] = group.exercises;
  const last = group.exercises.at(-1);
  if (!first || !last) {
    return 'Add an exercise';
  }
  if (group.exercises.length === 1) {
    return `${restText(first)[0]?.toUpperCase()}${restText(first).slice(1)} between rounds`;
  }
  const letter = letterOf(index);
  const order = group.exercises.map((_, position) => `${letter}${position + 1}`).join(' → ');
  return `${order}, then ${restText(last)}`;
}

export function targetHint(target: Target, key: MetricKey, isLastInGroup: boolean) {
  const hints: Record<Mode, string> = {
    exact: key === 'rest' ? 'The rest timer starts at this time.' : 'The client sees this and records what they did.',
    range: key === 'rest' ? 'The rest timer shows this range.' : 'The client aims inside this range.',
    max: 'The client goes as far as they can.',
    choose: 'No target. The client records what they did.',
    percent: 'Shown in kg from the client’s latest 1RM, for example 75% · 105 kg.',
    none: 'The client goes straight to the next exercise.',
  };
  const lastNote = key === 'rest' && isLastInGroup ? 'Last in the group, so this is the rest between rounds. ' : '';
  return lastNote + hints[target.mode];
}

let nextId = 100;
const id = () => String(nextId++);

export const blankTargets = (metrics: MetricKey[]): Targets => ({
  ...Object.fromEntries(metrics.map((key) => [key, {mode: 'choose'}])),
  rest: {mode: 'none'},
});

export function newExercise(source: LibraryExercise): Exercise {
  return {...source, id: id(), perRound: false, targets: blankTargets(source.metrics), roundTargets: []};
}

export const initialWorkout: Workout = {
  name: 'Lower A',
  description: 'Warm up 10 minutes before you start. Stop a set if your form breaks down.',
  type: 'prescribed',
  groups: [
    {
      id: 'g1',
      name: 'Main lift',
      rounds: 4,
      exercises: [
        {
          id: 'e1',
          name: 'Back squat',
          kind: 'movement',
          metrics: ['reps', 'weight'],
          unilateral: false,
          perRound: false,
          targets: {
            reps: {mode: 'exact', v: '5'},
            weight: {mode: 'percent', v: '75'},
            rest: {mode: 'exact', v: '3:00'},
          },
          roundTargets: [],
        },
      ],
    },
    {
      id: 'g2',
      name: 'Posterior chain',
      rounds: 3,
      exercises: [
        {
          id: 'e2',
          name: 'Romanian deadlift',
          kind: 'movement',
          metrics: ['reps', 'weight'],
          unilateral: false,
          perRound: false,
          targets: {reps: {mode: 'range', min: '8', max: '10'}, weight: {mode: 'choose'}, rest: {mode: 'none'}},
          roundTargets: [],
        },
        {
          id: 'e3',
          name: 'Walking lunge',
          kind: 'movement',
          metrics: ['reps', 'weight'],
          unilateral: true,
          perRound: false,
          targets: {
            reps: {mode: 'exact', v: '10'},
            weight: {mode: 'exact', v: '16'},
            rest: {mode: 'range', min: '1:30', max: '2:00'},
          },
          roundTargets: [],
        },
      ],
    },
    {
      id: 'g3',
      name: 'Core',
      rounds: 3,
      exercises: [
        {
          id: 'e4',
          name: 'Plank',
          kind: 'movement',
          metrics: ['duration'],
          unilateral: false,
          perRound: true,
          targets: {duration: {mode: 'exact', v: '30'}, rest: {mode: 'exact', v: '45'}},
          roundTargets: [
            {duration: {mode: 'exact', v: '30'}, rest: {mode: 'exact', v: '45'}},
            {duration: {mode: 'exact', v: '40'}, rest: {mode: 'exact', v: '45'}},
            {duration: {mode: 'max'}, rest: {mode: 'none'}},
          ],
        },
      ],
    },
    {
      id: 'g4',
      name: 'Finisher',
      rounds: 1,
      exercises: [
        {
          id: 'e5',
          name: 'Rowing machine',
          kind: 'activity',
          metrics: ['distance', 'duration', 'effort'],
          unilateral: false,
          perRound: false,
          targets: {
            distance: {mode: 'exact', v: '2000'},
            duration: {mode: 'choose'},
            effort: {mode: 'range', min: '7', max: '8'},
            rest: {mode: 'none'},
          },
          roundTargets: [],
        },
      ],
    },
  ],
};

// Pure updates. `round` null = the target shared by all rounds.
export type Where = {group: number; exercise: number; key: MetricKey; round: number | null};

export function getTarget(exercise: Exercise, key: MetricKey, round: number | null) {
  return exercise.perRound && round !== null ? exercise.roundTargets[round]?.[key] : exercise.targets[key];
}

const mapGroup = (workout: Workout, index: number, change: (group: Group) => Group): Workout => ({
  ...workout,
  groups: workout.groups.map((group, position) => (position === index ? change(group) : group)),
});

const mapExercise = (workout: Workout, group: number, index: number, change: (exercise: Exercise) => Exercise) =>
  mapGroup(workout, group, (current) => ({
    ...current,
    exercises: current.exercises.map((exercise, position) => (position === index ? change(exercise) : exercise)),
  }));

export const actions: {
  putTarget: (workout: Workout, where: Where, target: Target) => Workout;
  setTarget: (workout: Workout, where: Where, patch: Partial<Target>) => Workout;
  togglePerRound: (workout: Workout, group: number, index: number) => Workout;
  setRounds: (workout: Workout, group: number, rounds: number) => Workout;
  renameGroup: (workout: Workout, group: number, name: string) => Workout;
  addExercise: (workout: Workout, group: number, source: LibraryExercise) => Workout;
  removeExercise: (workout: Workout, group: number, index: number) => Workout;
  addGroup: (workout: Workout) => Workout;
  removeGroup: (workout: Workout, group: number) => Workout;
  moveGroup: (workout: Workout, group: number, by: -1 | 1) => Workout;
  moveExercise: (workout: Workout, group: number, index: number, by: -1 | 1) => Workout;
  moveExerciseToGroup: (workout: Workout, group: number, index: number, target: number) => Workout;
} = {
  putTarget: (workout: Workout, where: Where, target: Target) =>
    mapExercise(workout, where.group, where.exercise, (exercise) => {
      if (exercise.perRound && where.round !== null) {
        const round = where.round;
        return {
          ...exercise,
          roundTargets: exercise.roundTargets.map((targets, position) =>
            position === round ? {...targets, [where.key]: target} : targets,
          ),
        };
      }
      return {...exercise, targets: {...exercise.targets, [where.key]: target}};
    }),
  setTarget: (workout: Workout, where: Where, patch: Partial<Target>) => {
    const exercise = workout.groups[where.group]?.exercises[where.exercise];
    const current = (exercise && getTarget(exercise, where.key, where.round)) ?? {mode: 'choose'};
    return actions.putTarget(workout, where, {...current, ...patch});
  },
  togglePerRound: (workout: Workout, group: number, index: number) =>
    mapExercise(workout, group, index, (exercise) =>
      exercise.perRound
        ? {...exercise, perRound: false, targets: exercise.roundTargets[0] ?? exercise.targets, roundTargets: []}
        : {
            ...exercise,
            perRound: true,
            roundTargets: Array.from({length: workout.groups[group]?.rounds ?? 1}, () => ({...exercise.targets})),
          },
    ),
  setRounds: (workout: Workout, group: number, rounds: number) =>
    mapGroup(workout, group, (current) => ({
      ...current,
      rounds,
      exercises: current.exercises.map((exercise) =>
        exercise.perRound
          ? {
              ...exercise,
              roundTargets: Array.from(
                {length: rounds},
                (_, position) => exercise.roundTargets[position] ?? exercise.roundTargets.at(-1) ?? exercise.targets,
              ),
            }
          : exercise,
      ),
    })),
  renameGroup: (workout: Workout, group: number, name: string) =>
    mapGroup(workout, group, (current) => ({...current, name})),
  // The rest after the last exercise is the rest between rounds (W30), so it moves to the new last exercise.
  addExercise: (workout: Workout, group: number, source: LibraryExercise) =>
    mapGroup(workout, group, (current) => {
      const added = newExercise(source);
      const last = current.exercises.at(-1);
      if (!last || last.perRound) {
        return {...current, exercises: [...current.exercises, added]};
      }
      return {
        ...current,
        exercises: [
          ...current.exercises.slice(0, -1),
          {...last, targets: {...last.targets, rest: {mode: 'none'}}},
          {...added, targets: {...added.targets, rest: last.targets.rest ?? {mode: 'none'}}},
        ],
      };
    }),
  removeExercise: (workout: Workout, group: number, index: number) =>
    mapGroup(workout, group, (current) => ({
      ...current,
      exercises: current.exercises.filter((_, position) => position !== index),
    })),
  addGroup: (workout: Workout): Workout => ({
    ...workout,
    groups: [...workout.groups, {id: id(), name: '', rounds: 3, exercises: []}],
  }),
  removeGroup: (workout: Workout, group: number): Workout => ({
    ...workout,
    groups: workout.groups.filter((_, position) => position !== group),
  }),
  moveGroup: (workout, group, by) => ({...workout, groups: swap(workout.groups, group, group + by)}),
  moveExercise: (workout, group, index, by) =>
    mapGroup(workout, group, (current) => ({...current, exercises: swap(current.exercises, index, index + by)})),
  moveExerciseToGroup: (workout, group, index, target) => {
    const exercise = workout.groups[group]?.exercises[index];
    const destination = workout.groups[target];
    if (!exercise || !destination || group === target) {
      return workout;
    }
    const fitted = exercise.perRound
      ? {
          ...exercise,
          roundTargets: Array.from(
            {length: destination.rounds},
            (_, position) => exercise.roundTargets[position] ?? exercise.roundTargets.at(-1) ?? exercise.targets,
          ),
        }
      : exercise;
    const without = actions.removeExercise(workout, group, index);
    return mapGroup(without, target, (current) => ({...current, exercises: [...current.exercises, fitted]}));
  },
};

function swap<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) {
    next.splice(to, 0, item);
  }
  return next;
}
