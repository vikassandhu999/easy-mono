// PROTOTYPE. Answers: "What does the client see today, and how do they record what they did?"
// Follows .scratch/client/concept.md (C1–C8) on the workout (W13, W18, W19, W27, W38) and nutrition (N12–N16,
// N38–N42) models. In-memory only; the dates are this week, relative to today.

// --- Catalogue (N32): values per 100 g, per 100 ml or per 1 unit; a missing value is unknown.
export type Macro = 'kcal' | 'protein' | 'carbs' | 'fat';
export type Values = Partial<Record<Macro, number>>;
export type Food = {
  id: string;
  name: string;
  kind: 'food' | 'supplement';
  base: 'g' | 'ml' | 'unit';
  unitLabel?: string;
  per: Values;
  servings: Array<{label: string; amount: number}>;
};

export const foods: Food[] = [
  {
    id: 'oats',
    name: 'Rolled oats',
    kind: 'food',
    base: 'g',
    per: {kcal: 379, protein: 13, carbs: 68, fat: 6.5},
    servings: [{label: 'cup', amount: 80}],
  },
  {
    id: 'milk',
    name: 'Milk, semi-skimmed',
    kind: 'food',
    base: 'ml',
    per: {kcal: 47, protein: 3.4, carbs: 4.8, fat: 1.7},
    servings: [{label: 'glass', amount: 250}],
  },
  {
    id: 'banana',
    name: 'Banana',
    kind: 'food',
    base: 'g',
    per: {kcal: 89, protein: 1.1, carbs: 23, fat: 0.3},
    servings: [{label: 'medium banana', amount: 118}],
  },
  {
    id: 'egg',
    name: 'Egg',
    kind: 'food',
    base: 'g',
    per: {kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5},
    servings: [{label: 'large egg', amount: 50}],
  },
  {
    id: 'toast',
    name: 'Wholegrain toast',
    kind: 'food',
    base: 'g',
    per: {kcal: 247, protein: 13, carbs: 41, fat: 3.4},
    servings: [{label: 'slice', amount: 30}],
  },
  {
    id: 'yogurt',
    name: 'Greek yogurt 2%',
    kind: 'food',
    base: 'g',
    per: {kcal: 73, protein: 9.9, carbs: 3.9, fat: 2},
    servings: [{label: 'pot', amount: 170}],
  },
  {
    id: 'berries',
    name: 'Mixed berries',
    kind: 'food',
    base: 'g',
    per: {kcal: 50, protein: 0.8, carbs: 12, fat: 0.3},
    servings: [],
  },
  {
    id: 'rice',
    name: 'Basmati rice, cooked',
    kind: 'food',
    base: 'g',
    per: {kcal: 121, protein: 3.5, carbs: 25, fat: 0.4},
    servings: [{label: 'cup', amount: 160}],
  },
  {
    id: 'chicken',
    name: 'Chicken breast, cooked',
    kind: 'food',
    base: 'g',
    per: {kcal: 165, protein: 31, carbs: 0, fat: 3.6},
    servings: [],
  },
  {
    id: 'salmon',
    name: 'Salmon fillet, baked',
    kind: 'food',
    base: 'g',
    per: {kcal: 206, protein: 22, carbs: 0, fat: 12},
    servings: [{label: 'fillet', amount: 150}],
  },
  {
    id: 'potato',
    name: 'Potatoes, boiled',
    kind: 'food',
    base: 'g',
    per: {kcal: 87, protein: 1.9, carbs: 20},
    servings: [],
  },
  {
    id: 'apple',
    name: 'Apple',
    kind: 'food',
    base: 'g',
    per: {kcal: 52, protein: 0.3, carbs: 14, fat: 0.2},
    servings: [{label: 'medium apple', amount: 180}],
  },
  {
    id: 'whey',
    name: 'Whey protein',
    kind: 'supplement',
    base: 'g',
    per: {kcal: 400, protein: 80, carbs: 8, fat: 6},
    servings: [{label: 'scoop', amount: 30}],
  },
  {
    id: 'creatine',
    name: 'Creatine monohydrate',
    kind: 'supplement',
    base: 'g',
    per: {kcal: 0, protein: 0, carbs: 0, fat: 0},
    servings: [],
  },
  {
    id: 'vitd',
    name: 'Vitamin D3 2000 IU',
    kind: 'supplement',
    base: 'unit',
    unitLabel: 'capsule',
    per: {},
    servings: [],
  },
];
export const foodOf = (id: string) => foods.find((food) => food.id === id) as Food;

// --- Prescription (coach side). Presets and workouts that applied never change (N36, W37).
export type Item = {id: string; foodId: string; amount: number; unit: string}; // unit: 'base' or a serving label
export type Option = {id: string; name: string; items: Item[]};
export type Preset =
  | {id: string; type: 'meal'; name: string; instructions: string; options: Option[]}
  | {id: string; type: 'food' | 'supplement'; item: Item};
export type Metric = 'reps' | 'weight' | 'duration';
export type Target = Partial<Record<Metric, number | 'max'>>;
export type WorkoutExercise = {
  id: string;
  name: string;
  metrics: Metric[];
  unilateral: boolean;
  targets: Target[];
  rest: string;
};
export type Workout = {
  id: string;
  name: string;
  type: 'prescribed' | 'video' | 'open';
  instructions: string;
  groups: Array<{id: string; label: string; rounds: number; exercises: WorkoutExercise[]}>;
};
export type Schedule =
  | {id: string; kind: 'nutrition'; presetId: string; time: string | null; mask: number}
  | {id: string; kind: 'workout'; workoutId: string; time: string | null; mask: number; place?: string; coach?: string};

const item = (id: string, foodId: string, amount: number, unit = 'base'): Item => ({id, foodId, amount, unit});
const same = (rounds: number, target: Target) => Array.from({length: rounds}, () => target);

export const presets: Preset[] = [
  {
    id: 'p1',
    type: 'meal',
    name: 'Breakfast',
    instructions: 'Cook the oats in the milk. Stir the whey in after cooking.',
    options: [
      {
        id: 'o1',
        name: 'Oats bowl',
        items: [
          item('i1', 'oats', 60),
          item('i2', 'milk', 200),
          item('i3', 'whey', 1, 'scoop'),
          item('i4', 'banana', 1, 'medium banana'),
        ],
      },
      {id: 'o2', name: 'Eggs on toast', items: [item('i5', 'egg', 3, 'large egg'), item('i6', 'toast', 2, 'slice')]},
    ],
  },
  {
    id: 'p2',
    type: 'meal',
    name: 'Lunch',
    instructions: '',
    options: [{id: 'o3', name: 'Chicken rice bowl', items: [item('i7', 'chicken', 150), item('i8', 'rice', 1, 'cup')]}],
  },
  {
    id: 'p3',
    type: 'meal',
    name: 'Snack',
    instructions: '',
    options: [
      {id: 'o4', name: '', items: [item('i9', 'yogurt', 1, 'pot'), item('i10', 'berries', 80)]},
      {id: 'o5', name: '', items: [item('i11', 'banana', 1, 'medium banana')]},
    ],
  },
  {
    id: 'p4',
    type: 'meal',
    name: 'Dinner',
    instructions: '',
    options: [
      {id: 'o6', name: 'Salmon and potatoes', items: [item('i12', 'salmon', 1, 'fillet'), item('i13', 'potato', 250)]},
      {id: 'o7', name: 'Chicken rice bowl', items: [item('i14', 'chicken', 150), item('i15', 'rice', 1, 'cup')]},
    ],
  },
  {id: 'p5', type: 'supplement', item: item('i16', 'creatine', 5)},
  {id: 'p6', type: 'supplement', item: item('i17', 'vitd', 1)},
];

export const workouts: Workout[] = [
  {
    id: 'w1',
    name: 'Lower A',
    type: 'prescribed',
    instructions: 'Warm up for 5 minutes first.',
    groups: [
      {
        id: 'g1',
        label: 'A · Straight sets',
        rounds: 3,
        exercises: [
          {
            id: 'we1',
            name: 'Back squat',
            metrics: ['reps', 'weight'],
            unilateral: false,
            targets: same(3, {reps: 5, weight: 100}),
            rest: 'Rest 3:00',
          },
        ],
      },
      {
        id: 'g2',
        label: 'B · Superset',
        rounds: 3,
        exercises: [
          {
            id: 'we2',
            name: 'Romanian deadlift',
            metrics: ['reps', 'weight'],
            unilateral: false,
            targets: [
              {reps: 8, weight: 80},
              {reps: 8, weight: 80},
              {reps: 'max', weight: 70},
            ],
            rest: 'Then B2',
          },
          {
            id: 'we3',
            name: 'Plank',
            metrics: ['duration'],
            unilateral: false,
            targets: same(3, {duration: 45}),
            rest: 'Rest 1:30',
          },
        ],
      },
      {
        id: 'g3',
        label: 'C · Straight sets',
        rounds: 2,
        exercises: [
          {
            id: 'we4',
            name: 'Bulgarian split squat',
            metrics: ['reps', 'weight'],
            unilateral: true,
            targets: same(2, {reps: 10, weight: 16}),
            rest: 'Rest 1:00',
          },
        ],
      },
    ],
  },
  {id: 'w2', name: 'Easy run', type: 'video', instructions: 'Follow the video. Keep it conversational.', groups: []},
  {id: 'w3', name: 'PT session', type: 'open', instructions: 'Bring water and trainers.', groups: []},
];
// The exercise done instead of a prescribed one (W19: the set keeps the link, the exercise changes). It records
// its own metrics; targets apply only where the metrics match.
export type DoneExercise = {name: string; metrics: Metric[]};
export const exerciseChoices: DoneExercise[] = [
  {name: 'Front squat', metrics: ['reps', 'weight']},
  {name: 'Leg press', metrics: ['reps', 'weight']},
  {name: 'Goblet squat', metrics: ['reps', 'weight']},
  {name: 'Hip thrust', metrics: ['reps', 'weight']},
  {name: 'Side plank', metrics: ['duration']},
  {name: 'Walking lunge', metrics: ['reps', 'weight']},
];

// Mon=1 … Sun=64 (W36).
export const schedules: Schedule[] = [
  {id: 's1', kind: 'nutrition', presetId: 'p1', time: '08:00', mask: 31},
  {id: 's2', kind: 'nutrition', presetId: 'p1', time: '10:30', mask: 96},
  {id: 's3', kind: 'nutrition', presetId: 'p2', time: '13:00', mask: 127},
  {id: 's4', kind: 'nutrition', presetId: 'p3', time: '16:00', mask: 31},
  {id: 's5', kind: 'nutrition', presetId: 'p4', time: '19:30', mask: 127},
  {id: 's6', kind: 'nutrition', presetId: 'p5', time: null, mask: 127},
  {id: 's7', kind: 'nutrition', presetId: 'p6', time: '08:00', mask: 127},
  {id: 'ws1', kind: 'workout', workoutId: 'w1', time: '07:00', mask: 1 | 8},
  {id: 'ws2', kind: 'workout', workoutId: 'w2', time: null, mask: 2 | 16},
  {id: 'ws3', kind: 'workout', workoutId: 'w3', time: '18:00', mask: 4, place: 'Iron Works gym', coach: 'Sam'},
];

export type Bounds = {min?: number; max?: number};
export const targetSets = {
  training: {name: 'Training day', kcal: {min: 2500, max: 2700}, protein: {min: 160}} as {name: string} & Partial<
    Record<Macro, Bounds>
  >,
  rest: {name: 'Rest day', kcal: {min: 2200, max: 2200}, protein: {min: 160}} as {name: string} & Partial<
    Record<Macro, Bounds>
  >,
};
export const targetsOn = (date: string) =>
  (weekdayBit(date) & (1 | 4 | 16)) !== 0 ? targetSets.training : targetSets.rest;

// --- Records (client side)
export type FoodLog = {
  id: string;
  mealItemId: string | null; // N39: null = an extra item
  food: Food; // N40: copied at save; corrections recalculate from this copy
  amount: number;
  unit: string;
};
export type NutritionLog = {
  id: string;
  date: string;
  time: string;
  type: 'meal' | 'food' | 'supplement'; // N38: set by the app, never chosen
  scheduleId: string | null;
  presetId: string | null;
  optionId: string | null;
  items: FoodLog[];
};
export type SetLog = {
  id: string;
  exerciseId: string;
  name: string;
  round: number;
  side: 'L' | 'R' | null;
  values: Partial<Record<Metric, number>>;
};
export type WorkoutLog = {
  id: string;
  date: string;
  scheduleId: string | null;
  workoutId: string; // W38: points to the workout, which never changes once applied
  state: 'active' | 'completed';
  sets: SetLog[];
  swaps: Record<string, DoneExercise>; // workout exercise id → exercise done instead
  difficulty?: 'too_easy' | 'just_right' | 'too_hard';
  pain?: boolean;
  painNote?: string;
  // Unsaved input stays on the device (N41): values typed into sets not yet ticked, and rounds added.
  inputs: Record<string, Partial<Record<Metric, string>>>;
  extraRounds: Record<string, number>;
};
export const rowKey = (exerciseId: string, round: number, side: SetLog['side']) =>
  `${exerciseId}:${round}:${side ?? '-'}`;

// A meal draft kept on the device until it is saved or discarded (N41).
export type MealDraft = Omit<NutritionLog, 'id' | 'type' | 'items'> & {
  id?: string;
  items: Array<FoodLog & {input: string}>;
};
export const draftKey = (date: string, scheduleId: string | null, logId: string | undefined) =>
  `${date}:${scheduleId ?? 'extra'}:${logId ?? 'new'}`;

export const difficultyLabel = {too_easy: 'Too easy', just_right: 'Just right', too_hard: 'Too hard'} as const;

export type State = {nutrition: NutritionLog[]; workouts: WorkoutLog[]};

// --- Dates: this week, client-local.
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const now = new Date();
export const today = toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
const mondayOffset = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
export const week = Array.from({length: 7}, (_, index) =>
  toIso(new Date(Date.parse(`${today}T00:00:00Z`) + (index - mondayOffset) * 86_400_000)),
);
export const weekdayBit = (date: string) => 1 << ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7);
export const dayLabel = (date: string, style: 'short' | 'long' = 'long') =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en', {
    weekday: style,
    ...(style === 'long' ? {day: 'numeric', month: 'short'} : {}),
    timeZone: 'UTC',
  });
// The client's word for a day: Today, Yesterday, Tomorrow, else the weekday.
export function dayName(date: string) {
  const offset = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return offset === 0
    ? 'Today'
    : offset === -1
      ? 'Yesterday'
      : offset === 1
        ? 'Tomorrow'
        : (dayLabel(date, 'long').split(',')[0] ?? date);
}
export const nowTime = () => `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

// --- Lookups
export const presetOf = (id: string) => presets.find((row) => row.id === id) as Preset;
export const workoutOf = (id: string) => workouts.find((row) => row.id === id) as Workout;
export const schedulesOn = (date: string) =>
  schedules
    .filter((row) => row.mask & weekdayBit(date))
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
export const nutritionFor = (state: State, scheduleId: string, date: string) =>
  state.nutrition.find((log) => log.scheduleId === scheduleId && log.date === date);
export const workoutFor = (state: State, scheduleId: string, date: string) =>
  state.workouts.find((log) => log.scheduleId === scheduleId && log.date === date);
export const extrasOn = (state: State, date: string) =>
  state.nutrition.filter((log) => !log.scheduleId && log.date === date);

// --- Nutrient arithmetic (N34): add known values; say "incomplete" when one is unknown.
export const baseLabel = (food: Food) => (food.base === 'unit' ? (food.unitLabel ?? 'unit') : food.base);
export const unitsOf = (food: Food) => [
  {value: 'base', label: baseLabel(food)},
  ...food.servings.map((serving) => ({
    value: serving.label,
    label: `${serving.label} (${serving.amount} ${food.base})`,
  })),
];
export const amountText = (food: Food, amount: number, unit: string) =>
  `${amount} ${unit === 'base' ? baseLabel(food) : unit}`;

const macros: Macro[] = ['kcal', 'protein', 'carbs', 'fat'];
export function valuesOf(food: Food, amount: number, unit: string): Values {
  const serving = unit === 'base' ? 1 : (food.servings.find((row) => row.label === unit)?.amount ?? 0);
  const factor = (amount * serving) / (food.base === 'unit' ? 1 : 100);
  return Object.fromEntries(
    macros.flatMap((key) => (food.per[key] === undefined ? [] : [[key, food.per[key] * factor]])),
  );
}

export type Total = {values: Values; incomplete: boolean; empty: boolean};
export function totalOf(parts: Array<{food: Food; amount: number; unit: string}>): Total {
  const each = parts.map((part) => valuesOf(part.food, part.amount, part.unit));
  const values = Object.fromEntries(
    macros.flatMap((key) =>
      each.some((row) => row[key] !== undefined) ? [[key, each.reduce((sum, row) => sum + (row[key] ?? 0), 0)]] : [],
    ),
  );
  return {
    values,
    incomplete: each.some((row) => macros.some((key) => row[key] === undefined)),
    empty: parts.length === 0,
  };
}
export function valuesLine(total: Total) {
  if (macros.every((key) => total.values[key] === undefined)) {
    return 'Nutrients not listed';
  }
  const round = (key: Macro) => (total.values[key] === undefined ? '–' : String(Math.round(total.values[key])));
  const line = `${round('kcal')} kcal · P ${round('protein')} · C ${round('carbs')} · F ${round('fat')}`;
  return total.incomplete ? `${line} · incomplete` : line;
}

// The day's recorded total (C7): only what was recorded; alternatives add nothing until recorded.
export const dayTotal = (state: State, date: string) =>
  totalOf(state.nutrition.filter((log) => log.date === date).flatMap((log) => log.items));

export function boundsText(bounds: Bounds, unit: string) {
  if (bounds.min !== undefined && bounds.max !== undefined) {
    return bounds.min === bounds.max ? `${bounds.min} ${unit}` : `${bounds.min}–${bounds.max} ${unit}`;
  }
  return bounds.min !== undefined ? `at least ${bounds.min} ${unit}` : `at most ${bounds.max} ${unit}`;
}

export const optionLabel = (option: Option) =>
  option.name || option.items.map((row) => foodOf(row.foodId).name).join(', ');
export const presetTitle = (preset: Preset) => (preset.type === 'meal' ? preset.name : foodOf(preset.item.foodId).name);

export function targetText(target: Target, metric: Metric) {
  const value = target[metric];
  if (value === undefined) {
    return 'any';
  }
  if (value === 'max') {
    return 'max';
  }
  return metric === 'weight' ? `${value} kg` : metric === 'duration' ? `${value} s` : `${value}`;
}

// Accepts "1.5" and "1,5"; anything else is not a valid amount.
export const parseAmount = (input: string) => {
  const value = Number(input.trim().replace(',', '.'));
  return input.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
};

// --- Actions
let nextId = 100;
const newId = (prefix: string) => `${prefix}${nextId++}`;

export const newFoodLog = (food: Food, amount: number, unit: string, mealItemId: string | null = null): FoodLog => ({
  id: newId('f'),
  mealItemId,
  food,
  amount,
  unit,
});

// N38: the app sets the type. A planned record takes its preset's type; an unplanned one follows its items.
export function logType(preset: Preset | null, items: FoodLog[]): NutritionLog['type'] {
  if (preset) {
    return preset.type;
  }
  if (items.length === 1) {
    return items[0]?.food.kind ?? 'food';
  }
  return 'meal';
}

export const actions = {
  saveNutrition: (state: State, log: Omit<NutritionLog, 'id' | 'type'> & {id?: string}): State => {
    const preset = log.presetId ? presetOf(log.presetId) : null;
    const saved: NutritionLog = {...log, id: log.id ?? newId('n'), type: logType(preset, log.items)};
    const others = state.nutrition.filter((row) => row.id !== saved.id);
    return {...state, nutrition: [...others, saved]};
  },
  deleteNutrition: (state: State, id: string): State => ({
    ...state,
    nutrition: state.nutrition.filter((row) => row.id !== id),
  }),
  // W18: one active log per client.
  startWorkout: (state: State, scheduleId: string | null, workoutId: string, date: string): [State, string] => {
    const log: WorkoutLog = {
      id: newId('l'),
      date,
      scheduleId,
      workoutId,
      state: 'active',
      sets: [],
      swaps: {},
      inputs: {},
      extraRounds: {},
    };
    return [{...state, workouts: [...state.workouts, log]}, log.id];
  },
  updateWorkout: (state: State, log: WorkoutLog): State => ({
    ...state,
    workouts: state.workouts.map((row) => (row.id === log.id ? log : row)),
  }),
  discardWorkout: (state: State, id: string): State => ({
    ...state,
    workouts: state.workouts.filter((row) => row.id !== id),
  }),
  newSet: (
    exercise: WorkoutExercise,
    name: string,
    round: number,
    side: SetLog['side'],
    values: SetLog['values'],
  ): SetLog => ({
    id: newId('x'),
    exerciseId: exercise.id,
    name,
    round,
    side,
    values,
  }),
};

// --- Seed: yesterday has records; today has the supplement taken.
// Yesterday is seeded only when it is in this week (today is not Monday).
const yesterday = mondayOffset > 0 ? (week[mondayOffset - 1] ?? null) : null;
const prescribed = (presetId: string, optionId: string) => {
  const preset = presetOf(presetId);
  const option = preset.type === 'meal' ? preset.options.find((row) => row.id === optionId) : undefined;
  return (option?.items ?? []).map((row) => newFoodLog(foodOf(row.foodId), row.amount, row.unit, row.id));
};

export function seed(): State {
  const nutrition: NutritionLog[] = [];
  if (yesterday) {
    const bit = weekdayBit(yesterday);
    const breakfast = schedules.find((row) => row.kind === 'nutrition' && row.presetId === 'p1' && row.mask & bit);
    if (breakfast) {
      nutrition.push({
        id: 'n1',
        date: yesterday,
        time: '08:20',
        type: 'meal',
        scheduleId: breakfast.id,
        presetId: 'p1',
        optionId: 'o2',
        items: prescribed('p1', 'o2'),
      });
    }
    // Rice replaced by potatoes: the item link tells a swap from an addition (N39).
    const lunch = prescribed('p2', 'o3');
    nutrition.push({
      id: 'n2',
      date: yesterday,
      time: '13:10',
      type: 'meal',
      scheduleId: 's3',
      presetId: 'p2',
      optionId: 'o3',
      items: [lunch[0] as FoodLog, newFoodLog(foodOf('potato'), 200, 'base', 'i8')],
    });
    nutrition.push({
      id: 'n3',
      date: yesterday,
      time: '15:00',
      type: 'food',
      scheduleId: null,
      presetId: null,
      optionId: null,
      items: [newFoodLog(foodOf('apple'), 1, 'medium apple')],
    });
  }
  nutrition.push({
    id: 'n4',
    date: today,
    time: '08:05',
    type: 'supplement',
    scheduleId: 's7',
    presetId: 'p6',
    optionId: null,
    items: [newFoodLog(foodOf('vitd'), 1, 'base', 'i17')],
  });
  return {nutrition, workouts: []};
}
