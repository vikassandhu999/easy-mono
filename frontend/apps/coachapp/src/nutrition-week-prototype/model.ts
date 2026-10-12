// PROTOTYPE. Answers: "How does a coach design a client's repeating nutrition week?"
// One week, no dates (V1). A schedule says when; its preset says what (.scratch/nutrition/concept.md N3–N7, N29).
// A meal preset has options: one = eat this, two or more = choose one. A food or supplement preset is one item.
// The UI never says "preset" (N31). Targets are bounds, scheduled on weekdays by target schedules (N33).
// Every change applies from today and keeps earlier weeks (W14). In-memory only.

// --- Catalogue (N32): values per 100 g, per 100 ml or per 1 unit; null = not listed, never zero.
export type Kind = 'food' | 'supplement';
export type Base = 'g' | 'ml' | 'unit';
export type NutrientKey = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium';
export type Nutrients = Partial<Record<NutrientKey, number | null>>;
export type Food = {
  id: string;
  name: string;
  kind: Kind;
  base: Base;
  unitLabel?: string; // base 'unit': capsule, tablet
  per: Nutrients;
  servings: Array<{label: string; amount: number}>; // amount in the base unit
};

export const nutrients: Array<{key: NutrientKey; label: string; unit: string}> = [
  {key: 'kcal', label: 'Energy', unit: 'kcal'},
  {key: 'protein', label: 'Protein', unit: 'g'},
  {key: 'carbs', label: 'Carbs (total)', unit: 'g'},
  {key: 'fat', label: 'Fat', unit: 'g'},
  {key: 'fiber', label: 'Fiber', unit: 'g'},
  {key: 'sugar', label: 'Sugar', unit: 'g'},
  {key: 'sodium', label: 'Sodium', unit: 'mg'},
];
const macros = ['kcal', 'protein', 'carbs', 'fat'] as const;
export const coreNutrients = nutrients.filter((nutrient) => (macros as readonly string[]).includes(nutrient.key));

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
    per: {kcal: 87, protein: 1.9, carbs: 20, fat: null}, // fat not listed by the source
    servings: [],
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
  // A capsule with no gram mass and no listed energy: nothing is invented (N32).
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

export const foodOf = (id: string) => foods.find((food) => food.id === id);
const baseLabel = (food: Food) => (food.base === 'unit' ? (food.unitLabel ?? 'unit') : food.base);
export const perLabel = (food: Food) => (food.base === 'unit' ? `1 ${baseLabel(food)}` : `100 ${food.base}`);
export const unitsOf = (food: Food) => [
  {value: 'base', label: baseLabel(food)},
  ...food.servings.map((serving) => ({
    value: serving.label,
    label: `${serving.label} (${serving.amount} ${food.base})`,
  })),
];

// --- Prescription
export type Item = {id: string; foodId: string; amount: string; unit: string}; // unit: 'base' or a serving label
export type Option = {id: string; name: string; items: Item[]};
export type Preset =
  | {id: string; type: 'meal'; name: string; instructions: string; options: Option[]}
  | {id: string; type: Kind; item: Item};
export type Meal = Extract<Preset, {type: 'meal'}>;
export type Schedule = {
  id: string;
  presetId: string;
  time: string | null;
  mask: number;
  from: string;
  until: string | null;
};

// --- Targets (N33): bounds only; the editor derives exact / at least / at most / between.
export type Bounds = {min?: number; max?: number};
export type NutritionTargets = {id: string; name: string; targets: Partial<Record<NutrientKey, Bounds>>};
export type TargetSchedule = {targetsId: string; mask: number}; // at most one targetSchedule per weekday

export type State = {
  presets: Preset[];
  schedules: Schedule[];
  nutritionTargets: NutritionTargets[];
  targetSchedules: TargetSchedule[];
};

export const weekdays = [
  {bit: 1, short: 'Mon', long: 'Monday'},
  {bit: 2, short: 'Tue', long: 'Tuesday'},
  {bit: 4, short: 'Wed', long: 'Wednesday'},
  {bit: 8, short: 'Thu', long: 'Thursday'},
  {bit: 16, short: 'Fri', long: 'Friday'},
  {bit: 32, short: 'Sat', long: 'Saturday'},
  {bit: 64, short: 'Sun', long: 'Sunday'},
] as const;
export type Day = (typeof weekdays)[number];

const local = new Date();
export const today = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()))
  .toISOString()
  .slice(0, 10);
const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export function daysLabel(mask: number) {
  if (mask === 127) {
    return 'Every day';
  }
  if (mask === 31) {
    return 'Mon–Fri';
  }
  if (mask === 96) {
    return 'Sat–Sun';
  }
  return weekdays
    .filter((day) => mask & day.bit)
    .map((day) => day.short)
    .join(' · ');
}

// --- Nutrient arithmetic. Unknown stays unknown: a total with an unknown part is incomplete (N34).
const isAmount = (value: string) => Number(value) > 0;

export {isAmount};

function baseAmount(food: Food, item: Item) {
  if (!isAmount(item.amount)) {
    return null;
  }
  const amount = Number(item.amount);
  if (item.unit === 'base') {
    return amount;
  }
  const serving = food.servings.find((option) => option.label === item.unit);
  return serving ? amount * serving.amount : null;
}

export function itemNutrients(item: Item): Nutrients {
  const food = foodOf(item.foodId);
  const amount = food ? baseAmount(food, item) : null;
  const factor = food && amount !== null ? (food.base === 'unit' ? amount : amount / 100) : null;
  return Object.fromEntries(
    macros.map((key) => {
      const per = food?.per[key];
      return [key, factor === null || per == null ? null : per * factor];
    }),
  );
}

// A total adds the known values and says "incomplete" when any value is not listed (N34).
export function totalLine(items: Item[]) {
  const parts = items.map(itemNutrients);
  const sum = (key: (typeof macros)[number]) =>
    parts.every((part) => part[key] == null) ? null : parts.reduce((acc, part) => acc + (part[key] ?? 0), 0);
  const line = nutrientLine(Object.fromEntries(macros.map((key) => [key, sum(key)])));
  const known = parts.every((part) => macros.every((key) => part[key] != null));
  return known || line.endsWith('incomplete') || line === 'Nutrients not listed' ? line : `${line} · incomplete`;
}

export function nutrientLine(values: Nutrients) {
  if (macros.every((key) => values[key] == null)) {
    return 'Nutrients not listed';
  }
  if (macros.every((key) => values[key] === 0)) {
    return 'No calories';
  }
  const round = (key: (typeof macros)[number]) => (values[key] == null ? '–' : String(Math.round(values[key])));
  const line = `${round('kcal')} kcal · P ${round('protein')} · C ${round('carbs')} · F ${round('fat')}`;
  return macros.some((key) => values[key] == null) ? `${line} · incomplete` : line;
}

export function amountLabel(item: Item) {
  const food = foodOf(item.foodId);
  if (!food) {
    return '';
  }
  return item.unit === 'base' ? `${item.amount} ${baseLabel(food)}` : `${item.amount} ${item.unit}`;
}

// --- Display (N30, N31): an option without a name shows its foods.
export const optionLabel = (option: Option) =>
  option.name.trim() || option.items.map((item) => foodOf(item.foodId)?.name).join(', ') || 'Empty option';

export function presetTitle(preset: Preset) {
  return preset.type === 'meal' ? preset.name : (foodOf(preset.item.foodId)?.name ?? '');
}

export function presetSummary(preset: Preset) {
  return preset.type === 'meal' ? preset.options.map(optionLabel).join(' or ') : amountLabel(preset.item);
}

// --- Targets: editor values <-> bounds
export type TargetMode = 'none' | 'exact' | 'min' | 'max' | 'range';
export type TargetDraft = {mode: TargetMode; min: string; max: string}; // exact/min use min, max uses max

export function toDraft(bounds: Bounds | undefined): TargetDraft {
  const min = bounds?.min === undefined ? '' : String(bounds.min);
  const max = bounds?.max === undefined ? '' : String(bounds.max);
  const mode: TargetMode = !bounds ? 'none' : min && max ? (min === max ? 'exact' : 'range') : min ? 'min' : 'max';
  return {mode, min, max};
}

// Returns the bounds, null for "no target", or an error message.
export function toBounds(draft: TargetDraft): Bounds | null | string {
  const parse = (value: string) => (value.trim() === '' || !(Number(value) >= 0) ? undefined : Number(value));
  const min = parse(draft.min);
  const max = parse(draft.max);
  switch (draft.mode) {
    case 'none':
      return null;
    case 'exact':
      return min === undefined ? 'Enter a number' : {min, max: min};
    case 'min':
      return min === undefined ? 'Enter a number' : {min};
    case 'max':
      return max === undefined ? 'Enter a number' : {max};
    case 'range':
      return min === undefined || max === undefined
        ? 'Enter both numbers'
        : min > max
          ? 'From must not be above to'
          : {min, max};
  }
}

export function boundsText(bounds: Bounds, unit: string) {
  if (bounds.min !== undefined && bounds.max !== undefined) {
    return bounds.min === bounds.max ? `${bounds.min} ${unit}` : `${bounds.min}–${bounds.max} ${unit}`;
  }
  return bounds.min !== undefined ? `≥ ${bounds.min} ${unit}` : `≤ ${bounds.max} ${unit}`;
}

// --- Queries
export const current = (state: State) => state.schedules.filter((schedule) => !schedule.until);
export const presetOf = (state: State, id: string) => state.presets.find((preset) => preset.id === id);
export const usesOf = (state: State, presetId: string) =>
  current(state).filter((schedule) => schedule.presetId === presetId);
export const byTime = (a: Schedule, b: Schedule) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
export const targetsOn = (state: State, bit: number) => {
  const targetSchedule = state.targetSchedules.find((row) => row.mask & bit);
  return targetSchedule ? state.nutritionTargets.find((set) => set.id === targetSchedule.targetsId) : undefined;
};
// The day card shows the target set's name and energy only (NU2).
export const energyText = (set: NutritionTargets) =>
  set.targets.kcal ? boundsText(set.targets.kcal, 'kcal') : 'No energy target';
export const daysOfTargets = (state: State, targetsId: string) =>
  state.targetSchedules.find((row) => row.targetsId === targetsId)?.mask ?? 0;

// --- Actions
let nextId = 100;
export const newId = (prefix: string) => `${prefix}${nextId++}`;

export const newItem = (food: Food): Item => ({
  id: newId('i'),
  foodId: food.id,
  amount: food.servings[0] || food.base === 'unit' ? '1' : '100',
  unit: food.servings[0]?.label ?? 'base',
});
export const newOption = (): Option => ({id: newId('o'), name: '', items: []});
export const newMeal = (): Meal => ({id: newId('p'), type: 'meal', name: '', instructions: '', options: [newOption()]});

type Timing = Pick<Schedule, 'presetId' | 'time' | 'mask'>;

// A row that started today is edited in place; an older row ends yesterday and a new row starts today (W14).
function replace(state: State, old: Schedule, next: Timing): State {
  const others = state.schedules.filter((schedule) => schedule.id !== old.id);
  const ended = old.from < today ? [{...old, until: yesterday}] : [];
  const replacement = next.mask === 0 ? [] : [{...next, id: newId('s'), from: today, until: null}];
  return {...state, schedules: [...others, ...ended, ...replacement]};
}

const withPreset = (state: State, preset: Preset): State =>
  state.presets.some((row) => row.id === preset.id)
    ? {...state, presets: state.presets.map((row) => (row.id === preset.id ? preset : row))}
    : {...state, presets: [...state.presets, preset]};

export const actions = {
  savePreset: withPreset,
  addSchedule: (state: State, timing: Timing): State => ({
    ...state,
    schedules: [...state.schedules, {...timing, id: newId('s'), from: today, until: null}],
  }),
  updateSchedule: replace,
  removeFromDay: (state: State, schedule: Schedule, bit: number) =>
    replace(state, schedule, {...schedule, mask: schedule.mask & ~bit}),
  // One target set per day: giving a day to a set takes it from every other set (N19).
  scheduleTargets: (state: State, bit: number, targetsId: string | null): State => {
    const taken = state.targetSchedules.map((row) => ({...row, mask: row.mask & ~bit}));
    const withDay = targetsId
      ? taken.some((row) => row.targetsId === targetsId)
        ? taken.map((row) => (row.targetsId === targetsId ? {...row, mask: row.mask | bit} : row))
        : [...taken, {targetsId, mask: bit}]
      : taken;
    return {...state, targetSchedules: withDay.filter((row) => row.mask !== 0)};
  },
  saveTargets: (state: State, set: NutritionTargets): State =>
    state.nutritionTargets.some((row) => row.id === set.id)
      ? {...state, nutritionTargets: state.nutritionTargets.map((row) => (row.id === set.id ? set : row))}
      : {...state, nutritionTargets: [...state.nutritionTargets, set]},
};

// --- Seed
const started = '2026-09-14';
const item = (id: string, foodId: string, amount: string, unit = 'base'): Item => ({id, foodId, amount, unit});

export const initialState: State = {
  presets: [
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
            item('i1', 'oats', '60'),
            item('i2', 'milk', '200'),
            item('i3', 'whey', '1', 'scoop'),
            item('i4', 'banana', '1', 'medium banana'),
          ],
        },
        {
          id: 'o2',
          name: 'Eggs on toast',
          items: [item('i5', 'egg', '3', 'large egg'), item('i6', 'toast', '2', 'slice')],
        },
      ],
    },
    {
      id: 'p2',
      type: 'meal',
      name: 'Lunch',
      instructions: '',
      options: [
        {id: 'o3', name: 'Chicken rice bowl', items: [item('i7', 'chicken', '150'), item('i8', 'rice', '1', 'cup')]},
      ],
    },
    {
      id: 'p3',
      type: 'meal',
      name: 'Snack',
      instructions: '',
      options: [
        {id: 'o4', name: '', items: [item('i9', 'yogurt', '1', 'pot'), item('i10', 'berries', '80')]},
        {id: 'o5', name: '', items: [item('i11', 'banana', '1', 'medium banana')]},
      ],
    },
    {
      id: 'p4',
      type: 'meal',
      name: 'Dinner',
      instructions: '',
      options: [
        {
          id: 'o6',
          name: 'Salmon and potatoes',
          items: [item('i12', 'salmon', '1', 'fillet'), item('i13', 'potato', '250')],
        },
        {id: 'o7', name: 'Chicken rice bowl', items: [item('i14', 'chicken', '150'), item('i15', 'rice', '1', 'cup')]},
      ],
    },
    {id: 'p5', type: 'supplement', item: item('i16', 'creatine', '5')},
    {id: 'p6', type: 'supplement', item: item('i17', 'vitd', '1')},
  ],
  // One Breakfast preset, two schedules: weekdays at 08:00, weekends at 10:30. Edit it once (N29).
  schedules: [
    {id: 's1', presetId: 'p1', time: '08:00', mask: 31, from: started, until: null},
    {id: 's2', presetId: 'p1', time: '10:30', mask: 96, from: started, until: null},
    {id: 's3', presetId: 'p2', time: '13:00', mask: 127, from: started, until: null},
    {id: 's4', presetId: 'p3', time: '16:00', mask: 31, from: started, until: null},
    {id: 's5', presetId: 'p4', time: '19:30', mask: 127, from: started, until: null},
    {id: 's6', presetId: 'p5', time: null, mask: 127, from: started, until: null},
    {id: 's7', presetId: 'p6', time: '08:00', mask: 127, from: started, until: null},
  ],
  nutritionTargets: [
    {
      id: 't1',
      name: 'Training day',
      targets: {kcal: {min: 2500, max: 2700}, protein: {min: 160}, fat: {min: 60, max: 80}, sodium: {max: 2300}},
    },
    {id: 't2', name: 'Rest day', targets: {kcal: {min: 2200, max: 2200}, protein: {min: 160}}},
  ],
  targetSchedules: [
    {targetsId: 't1', mask: 1 | 4 | 16},
    {targetsId: 't2', mask: 2 | 8 | 32 | 64},
  ],
};
