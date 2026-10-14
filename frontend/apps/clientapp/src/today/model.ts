import type {Workout as ApiWorkout, Exercise, WorkoutTarget, WorkoutTargets} from '../api/exercises';
import type {Food as ApiFood, NutritionPreset} from '../api/foods';
import type {FoodLog as ApiFoodLog, NutritionLog as ApiNutritionLog} from '../api/nutrition-logs';
import type {WorkoutLog as ApiWorkoutLog, ExerciseSetWrite} from '../api/workout-logs';

export type Food = Pick<ApiFood, 'id' | 'name' | 'kind' | 'basis' | 'unit_label' | 'nutrients' | 'servings'>;
export type Item = {id: string; food: Food; amount: number; unit: string};
export type Option = {id: string; name: string; items: Item[]};
export type Preset = Pick<NutritionPreset, 'id' | 'type'> & {
  name: string;
  instructions: string;
  options: Option[];
  item: Item | null;
};
export type FoodLog = {id: string; mealItemId: string | null; food: Food; amount: number; unit: string};
export type NutritionLog = Pick<ApiNutritionLog, 'id' | 'type'> & {
  date: string;
  time: string;
  scheduleId: string | null;
  presetId: string | null;
  optionId: string | null;
  items: FoodLog[];
};
export type MealDraft = Omit<NutritionLog, 'id' | 'type' | 'items'> & {
  id?: string;
  changed?: boolean;
  items: Array<FoodLog & {input: string}>;
};
export const draftKey = (date: string, scheduleId: string | null, logId?: string) =>
  `meal.${date}.${scheduleId ?? 'extra'}.${logId ?? 'new'}`;
export function asPreset(row: NutritionPreset): Preset {
  return {
    ...row,
    name: row.name ?? '',
    instructions: row.instructions ?? '',
    options: row.options.map((option) => ({
      ...option,
      name: option.name ?? '',
      items: option.items.map((item) => ({id: item.id, food: item.food, amount: item.amount, unit: item.unit})),
    })),
    item:
      row.food && row.amount !== null && row.unit
        ? {id: row.id, food: row.food, amount: row.amount, unit: row.unit}
        : null,
  };
}
export const foodCopy = (row: ApiFoodLog): Food => ({
  id: row.food_id,
  name: row.name,
  kind: row.kind,
  basis: row.basis,
  unit_label: row.unit_label,
  servings: row.servings,
  nutrients: row.nutrients,
});
export const asNutritionLog = (row: ApiNutritionLog): NutritionLog => ({
  id: row.id,
  type: row.type,
  date: row.logged_on,
  time: (row.logged_at ?? '').slice(0, 5),
  scheduleId: row.nutrition_schedule_id,
  presetId: row.nutrition_preset_id,
  optionId: row.meal_option_id,
  items: row.food_logs.map((item) => ({
    id: item.id,
    mealItemId: item.meal_item_id,
    food: foodCopy(item),
    amount: item.amount,
    unit: item.unit,
  })),
});
export const newFoodLog = (food: Food, amount: number, unit: string, mealItemId: string | null = null): FoodLog => ({
  id: crypto.randomUUID(),
  food,
  amount,
  unit,
  mealItemId,
});
export const optionLabel = (option: Option) => option.name || option.items.map((row) => row.food.name).join(', ');
export const presetTitle = (preset: Preset) =>
  preset.type === 'meal' ? preset.name : (preset.item?.food.name ?? preset.name);
export const baseLabel = (food: Food) =>
  food.basis === '1unit' ? (food.unit_label ?? 'unit') : food.basis === '100ml' ? 'ml' : 'g';
export const baseUnit = (food: Food) => (food.basis === '1unit' ? 'unit' : food.basis === '100ml' ? 'ml' : 'g');
export const unitsOf = (food: Food) => [
  {value: baseUnit(food), label: baseLabel(food)},
  ...food.servings.map((serving) => ({
    value: serving.label,
    label: `${serving.label} (${serving.amount} ${baseLabel(food)})`,
  })),
];
export const amountText = (food: Food, amount: number, unit: string) =>
  `${amount} ${unit === baseUnit(food) ? baseLabel(food) : unit}`;
export const parseAmount = (input: string) => {
  const text = input.trim().replace(',', '.');
  if (!/^\d+(?:\.\d*)?$|^\.\d+$/.test(text)) {
    return null;
  }
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : null;
};
export type Total = {values: Record<string, number>; incomplete: boolean; empty: boolean};
export const macroCodes = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g'] as const;
export function totalOf(parts: Array<{food: Food; amount: number; unit: string}>): Total {
  const values: Record<string, number> = {};
  let incomplete = false;
  for (const part of parts) {
    const factor =
      (part.amount *
        (part.unit === baseUnit(part.food)
          ? 1
          : (part.food.servings.find((s) => s.label === part.unit)?.amount ?? 0))) /
      (part.food.basis === '1unit' ? 1 : 100);
    for (const [code, value] of Object.entries(part.food.nutrients)) {
      values[code] = (values[code] ?? 0) + value * factor;
    }
    incomplete ||= macroCodes.some((code) => part.food.nutrients[code] === undefined);
  }
  return {values, incomplete, empty: parts.length === 0};
}
export function valuesLine(total: Total) {
  if (macroCodes.every((code) => total.values[code] === undefined)) {
    return 'Nutrients not listed';
  }
  const n = (code: string) => (total.values[code] === undefined ? '–' : String(Math.round(total.values[code] ?? 0)));
  return `${n('energy_kcal')} kcal · P ${n('protein_g')} · C ${n('carbs_g')} · F ${n('fat_g')}${total.incomplete ? ' · incomplete' : ''}`;
}
export function boundsText(bounds: {min?: number; max?: number}, unit: string) {
  return bounds.min !== undefined && bounds.max !== undefined
    ? bounds.min === bounds.max
      ? `${bounds.min} ${unit}`
      : `${bounds.min}–${bounds.max} ${unit}`
    : bounds.min !== undefined
      ? `at least ${bounds.min} ${unit}`
      : `at most ${bounds.max} ${unit}`;
}
export const dayLabel = (date: string, style: 'short' | 'long' = 'long') =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en', {
    weekday: style,
    ...(style === 'long' ? {day: 'numeric', month: 'short'} : {}),
    timeZone: 'UTC',
  });
export const dayName = (date: string, today: string) => {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return days === 0
    ? 'Today'
    : days === -1
      ? 'Yesterday'
      : days === 1
        ? 'Tomorrow'
        : (dayLabel(date).split(',')[0] ?? date);
};
export const weekOf = (date: string) => {
  const start = Date.parse(`${date}T00:00:00Z`);
  const offset = (new Date(start).getUTCDay() + 6) % 7;
  return Array.from({length: 7}, (_, i) => new Date(start + (i - offset) * 86400000).toISOString().slice(0, 10));
};
export const nowTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export type Metric = Exercise['metrics'][number];
export type Target = WorkoutTargets;
export type DoneExercise = Pick<
  Exercise,
  'id' | 'name' | 'metrics' | 'unilateral' | 'grade_scale' | 'count_label' | 'is_builtin'
>;
export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  name: string;
  metrics: Metric[];
  unilateral: boolean;
  targets: Target[];
  rest: string;
  restByRound: string[];
  code: string;
  original: DoneExercise;
};
export type Workout = Pick<ApiWorkout, 'id' | 'name' | 'type' | 'video'> & {
  instructions: string;
  groups: Array<{id: string; label: string; rounds: number; exercises: WorkoutExercise[]}>;
};
export type SetLog = {
  id: string;
  persisted: boolean;
  exerciseId: string;
  performedId: string;
  name: string;
  round: number;
  side: 'L' | 'R' | null;
  values: Partial<Record<Metric, number | string>>;
};
export type WorkoutDraft = {
  inputs: Record<string, Partial<Record<Metric, string>>>;
  extraRounds: Record<string, number>;
};
export type WorkoutLog = Pick<ApiWorkoutLog, 'id' | 'date' | 'state' | 'difficulty' | 'pain'> &
  WorkoutDraft & {
    scheduleId: string | null;
    workoutId: string;
    sets: SetLog[];
    swaps: Record<string, DoneExercise>;
    painNote: string;
  };
export const metricFields = {
  reps: 'reps',
  weight: 'weight_kg',
  duration: 'duration_s',
  distance: 'distance_m',
  elevation_gain: 'elevation_gain_m',
  height: 'height_cm',
  calories: 'calories_kcal',
  speed: 'speed_m_s',
  incline: 'incline_pct',
  level: 'level',
  power: 'power_w',
  cadence: 'cadence_rpm',
  heart_rate: 'heart_rate_bpm',
  effort: 'effort',
  reserve: 'reserve',
  successes: 'successes',
  attempts: 'attempts',
  score: 'score',
  result: 'result',
  grade: 'grade',
} as const;
export const metricLabel: Record<string, string> = {
  reps: 'Reps',
  weight: 'kg',
  duration: 'Seconds',
  distance: 'Metres',
  elevation_gain: 'Elevation m',
  height: 'cm',
  calories: 'kcal',
  speed: 'm/s',
  incline: 'Incline %',
  level: 'Level',
  power: 'Watts',
  cadence: 'Per minute',
  heart_rate: 'bpm',
  effort: 'RPE',
  reserve: 'RIR',
  successes: 'Successes',
  attempts: 'Attempts',
  score: 'Points',
  result: 'Result',
  grade: 'Grade',
};
export const difficultyLabel = {too_easy: 'Too easy', just_right: 'Just right', too_hard: 'Too hard'} as const;
export const rowKey = (id: string, round: number, side: SetLog['side']) => `${id}:${round}:${side ?? '-'}`;
export function targetText(target: Target, metric: Metric) {
  const value = target[metric];
  if (!value) {
    return 'any';
  }
  const suffix = metric === 'weight' ? ' kg' : metric === 'duration' ? ' s' : '';
  return value.mode === 'max'
    ? 'max'
    : value.mode === 'range'
      ? `${value.min}–${value.max}${suffix}`
      : `${value.value}${suffix}`;
}
export function targetValue(target: Target, metric: Metric): string {
  const value = target[metric];
  return !value || value.mode === 'max' ? '' : String(value.mode === 'range' ? value.min : value.value);
}
export const restText = (target: WorkoutTarget | null | undefined) => {
  const time = (value: number | string) => {
    const n = Number(value);
    return Number.isFinite(n) ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : String(value);
  };
  return !target || target.mode === 'max'
    ? ''
    : target.mode === 'exact'
      ? `Rest ${time(target.value)}`
      : `Rest ${time(target.min)}–${time(target.max)}`;
};
export function asWorkout(row: ApiWorkout): Workout {
  return {
    ...row,
    instructions: row.description ?? '',
    groups: row.groups.map((group, i) => {
      const letter = String.fromCharCode(65 + i);
      return {
        ...group,
        label: `${letter} · ${group.name || (group.exercises.length === 1 ? 'Straight sets' : group.exercises.length === 2 ? 'Superset' : 'Circuit')}`,
        exercises: group.exercises.map((item, index) => {
          const rests = Array.from({length: group.rounds}, (_, round) =>
            restText(item.rest[item.targets_mode === 'same_for_all' ? 0 : round]),
          );
          const varies = new Set(rests).size > 1;
          return {
            id: item.id,
            exerciseId: item.exercise_id,
            name: item.exercise.name,
            metrics: item.exercise.metrics,
            unilateral: item.exercise.unilateral,
            original: item.exercise,
            code: `${letter}${index + 1}`,
            targets: Array.from(
              {length: group.rounds},
              (_, round) => item.targets[item.targets_mode === 'same_for_all' ? 0 : round] ?? {},
            ),
            rest: varies
              ? 'Rest varies by set'
              : rests[0] || (index < group.exercises.length - 1 ? `Then ${letter}${index + 2}` : ''),
            restByRound: varies ? rests : [],
          };
        }),
      };
    }),
  };
}

export function asWorkoutLog(row: ApiWorkoutLog, draft: WorkoutDraft = {inputs: {}, extraRounds: {}}): WorkoutLog {
  const swaps: Record<string, DoneExercise> = {};
  for (const id of Object.keys(row.swaps)) {
    const exercise = row.swap_exercises[id];
    if (exercise) {
      swaps[id] = exercise;
    }
  }
  const sets = row.sets.map((set) => ({
    id: set.id,
    persisted: true,
    exerciseId: set.workout_exercise_id ?? set.exercise_id,
    performedId: set.exercise_id,
    name: set.exercise.name,
    round: set.round,
    side: set.side === 'left' ? ('L' as const) : set.side === 'right' ? ('R' as const) : null,
    values: Object.fromEntries(
      Object.entries(metricFields).flatMap(([metric, field]) => {
        const value = set[field];
        return value === null || value === undefined ? [] : [[metric, value]];
      }),
    ),
  }));
  return {
    ...row,
    ...draft,
    scheduleId: row.schedule_id,
    workoutId: row.workout_id ?? '',
    sets,
    swaps,
    painNote: row.pain_note ?? '',
  };
}
const metricBaseUnits: Record<string, string> = {
  reps: 'reps',
  weight: 'kg',
  duration: 's',
  distance: 'm',
  elevation_gain: 'm',
  height: 'cm',
  calories: 'kcal',
  speed: 'm/s',
  incline: '%',
  level: 'level',
  power: 'W',
  cadence: 'rpm',
  heart_rate: 'bpm',
  effort: 'RPE',
  reserve: 'RIR',
  successes: 'count',
  attempts: 'count',
  score: 'points',
};
export function setInput(row: SetLog): ExerciseSetWrite {
  const metrics = Object.fromEntries(
    Object.entries(row.values).map(([metric, value]) => [
      metricFields[metric as keyof typeof metricFields] ?? metric,
      value,
    ]),
  );
  return {
    ...(row.persisted ? {id: row.id} : {}),
    workout_exercise_id: row.exerciseId,
    exercise_id: row.performedId,
    round: row.round,
    entered_units: Object.fromEntries(
      Object.entries(row.values).flatMap(([metric, value]) =>
        typeof value === 'number' && metricBaseUnits[metric] ? [[metric, metricBaseUnits[metric]]] : [],
      ),
    ),
    side: row.side === 'L' ? 'left' : row.side === 'R' ? 'right' : null,
    ...metrics,
  };
}
export const actions = {
  newSet: (
    exercise: WorkoutExercise,
    done: DoneExercise,
    round: number,
    side: SetLog['side'],
    values: SetLog['values'],
  ): SetLog => ({
    id: crypto.randomUUID(),
    persisted: false,
    exerciseId: exercise.id,
    performedId: done.id,
    name: done.name,
    round,
    side,
    values,
  }),
};
export function parseWorkoutDraft(raw: unknown): WorkoutDraft | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('inputs' in raw) ||
    !('extraRounds' in raw) ||
    typeof raw.inputs !== 'object' ||
    raw.inputs === null ||
    Array.isArray(raw.inputs) ||
    typeof raw.extraRounds !== 'object' ||
    raw.extraRounds === null ||
    Array.isArray(raw.extraRounds)
  ) {
    return null;
  }
  if (
    Object.values(raw.extraRounds).some((value) => typeof value !== 'number' || !Number.isInteger(value) || value < 0)
  ) {
    return null;
  }
  for (const row of Object.values(raw.inputs)) {
    if (
      !row ||
      typeof row !== 'object' ||
      Array.isArray(row) ||
      Object.values(row).some((value) => typeof value !== 'string')
    ) {
      return null;
    }
  }
  return raw as WorkoutDraft;
}
export function parseMealDraft(raw: unknown): MealDraft | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('date' in raw) ||
    typeof raw.date !== 'string' ||
    !('time' in raw) ||
    typeof raw.time !== 'string' ||
    !('items' in raw) ||
    !Array.isArray(raw.items)
  ) {
    return null;
  }
  for (const item of raw.items) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.id !== 'string' ||
      typeof item.input !== 'string' ||
      typeof item.unit !== 'string' ||
      !item.food ||
      typeof item.food.id !== 'string' ||
      !Array.isArray(item.food.servings) ||
      !item.food.nutrients
    ) {
      return null;
    }
  }
  return raw as MealDraft;
}
export function mealSeed(
  date: string,
  scheduleId: string | null,
  preset: Preset | null,
  time: string | null,
  saved: NutritionLog | undefined,
  today: string,
): MealDraft {
  if (saved) {
    return {...saved, items: saved.items.map((row) => ({...row, input: String(row.amount)}))};
  }
  const only = preset?.options.length === 1 ? preset.options[0] : undefined;
  const source = preset?.type === 'meal' ? (only?.items ?? []) : preset?.item ? [preset.item] : [];
  return {
    date,
    time: time && date !== today ? time : nowTime(),
    scheduleId,
    presetId: preset?.id ?? null,
    optionId: only?.id ?? null,
    items: source.map((row) => ({
      ...newFoodLog(row.food, row.amount, row.unit, preset?.type === 'meal' ? row.id : null),
      input: String(row.amount),
    })),
  };
}
export function metricValue(input: string, metric: Metric, exercise: DoneExercise): number | string | null {
  const text = input.trim();
  if (metric === 'result') {
    return ['win', 'draw', 'loss'].includes(text) ? text : null;
  }
  if (metric === 'grade') {
    return exercise.grade_scale.includes(text) ? text : null;
  }
  if (!/^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) {
    return null;
  }
  const n = Number(text.replace(',', '.'));
  if (
    !Number.isFinite(n) ||
    (['reps', 'duration', 'level', 'cadence', 'heart_rate', 'successes', 'attempts'].includes(metric) &&
      !Number.isInteger(n))
  ) {
    return null;
  }
  if (
    (!['weight', 'incline', 'score'].includes(metric) && n < 0) ||
    (metric === 'effort' && (n < 1 || n > 10)) ||
    (metric === 'reserve' && n > 10)
  ) {
    return null;
  }
  return n;
}
export function workoutInput(
  log: Pick<WorkoutLog, 'inputs' | 'sets'>,
  exerciseId: string,
  round: number,
  side: SetLog['side'],
  target: Target,
  metric: Metric,
): string {
  const typed = log.inputs[rowKey(exerciseId, round, side)]?.[metric];
  if (typed !== undefined) {
    return typed;
  }
  const recorded = log.sets.find((set) => set.exerciseId === exerciseId && set.round === round && set.side === side);
  if (recorded) {
    const value = recorded.values[metric];
    return value === undefined ? '' : String(value);
  }
  return targetValue(target, metric);
}
export function pendingSetCorrections(
  log: Pick<WorkoutLog, 'state' | 'sets' | 'inputs' | 'swaps'>,
  workout: Workout,
): {sets: SetLog[]; pending: boolean} {
  if (log.state !== 'active') {
    return {sets: log.sets, pending: false};
  }
  let pending = false;
  const exercises = workout.groups.flatMap((group) => group.exercises);
  const sets = log.sets.flatMap((set) => {
    const inputs = log.inputs[rowKey(set.exerciseId, set.round, set.side)];
    const prescribed = exercises.find((exercise) => exercise.id === set.exerciseId);
    if (!inputs || !prescribed) {
      return [set];
    }
    const done = log.swaps[set.exerciseId] ?? prescribed.original;
    const values = {...set.values};
    for (const [metric, input] of Object.entries(inputs)) {
      if (input === undefined || !done.metrics.includes(metric)) {
        continue;
      }
      const value = metricValue(input, metric, done);
      if (input.trim() !== '' && value === null) {
        pending = true;
        continue;
      }
      if ((value ?? undefined) !== set.values[metric]) {
        pending = true;
      }
      if (value === null) {
        delete values[metric];
      } else {
        values[metric] = value;
      }
    }
    return Object.keys(values).length > 0 ? [{...set, values}] : [];
  });
  return {sets, pending};
}
