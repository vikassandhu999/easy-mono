import type {Food} from '../api/foods';
import type {
  NutritionPreset,
  NutritionSchedule,
  NutritionTargets,
  NutritionWeek,
  PresetBody,
} from '../api/nutrition-week';

export type State = NutritionWeek;
export type Preset = NutritionPreset;
export type Schedule = NutritionSchedule;
export type Kind = Food['kind'];
type SavedOption = NutritionPreset['options'][number];
type SavedItem = SavedOption['items'][number];
export type Item = Pick<SavedItem, 'id' | 'food' | 'unit'> & {amount: string};
export type Option = Pick<SavedOption, 'id'> & {name: string; items: Item[]};
export type Meal = Pick<NutritionPreset, 'id'> & {name: string; instructions: string; options: Option[]};
export type MealRemoval =
  | {kind: 'item'; optionId: string; index: number; item: Item}
  | {kind: 'option'; index: number; option: Option};
export type MealDraft = {meal: Meal; removal: MealRemoval | null};
export type Bounds = NutritionTargets['targets'][string];
export type NutrientValues = Food['nutrients'];

export const weekdays = [
  {bit: 1, number: 1, short: 'Mon', long: 'Monday'},
  {bit: 2, number: 2, short: 'Tue', long: 'Tuesday'},
  {bit: 4, number: 3, short: 'Wed', long: 'Wednesday'},
  {bit: 8, number: 4, short: 'Thu', long: 'Thursday'},
  {bit: 16, number: 5, short: 'Fri', long: 'Friday'},
  {bit: 32, number: 6, short: 'Sat', long: 'Saturday'},
  {bit: 64, number: 7, short: 'Sun', long: 'Sunday'},
] as const;
export type Day = (typeof weekdays)[number];
export const coreCodes = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g'];

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

export const isAmount = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
export const baseLabel = (food: Food) =>
  food.basis === '1unit' ? food.unit_label || 'unit' : food.basis === '100ml' ? 'ml' : 'g';
const baseUnit = (food: Food) => (food.basis === '1unit' ? 'unit' : food.basis === '100ml' ? 'ml' : 'g');
const itemUnit = (food: Food, unit: string) => (unit === 'base' || unit === baseLabel(food) ? baseUnit(food) : unit);
export const perLabel = (food: Food) => (food.basis === '1unit' ? `1 ${baseLabel(food)}` : `100 ${baseLabel(food)}`);
export const unitsOf = (food: Food) => [
  {value: baseUnit(food), label: baseLabel(food)},
  ...food.servings.map((serving) => ({
    value: serving.label,
    label: `${serving.label} (${serving.amount} ${baseLabel(food)})`,
  })),
];
export const newItem = (food: Food): Item => ({
  id: crypto.randomUUID(),
  food,
  amount: food.servings[0] || food.basis === '1unit' ? '1' : '100',
  unit: food.servings[0]?.label ?? baseUnit(food),
});
export const newOption = (): Option => ({id: crypto.randomUUID(), name: '', items: []});
export const newMeal = (): Meal => ({id: crypto.randomUUID(), name: '', instructions: '', options: [newOption()]});

export function mealDraft(preset: Preset): Meal {
  return {
    id: preset.id,
    name: preset.name ?? '',
    instructions: preset.instructions ?? '',
    options: preset.options.map((option) => ({
      id: option.id,
      name: option.name ?? '',
      items: option.items.map((item) => ({
        id: item.id,
        food: item.food,
        amount: String(item.amount),
        unit: itemUnit(item.food, item.unit),
      })),
    })),
  };
}

export function mealBody(meal: Meal): PresetBody {
  return {
    type: 'meal',
    name: meal.name.trim(),
    instructions: meal.instructions,
    options: meal.options.map((option) => ({
      name: option.name.trim() || null,
      items: option.items.map((item) => ({food_id: item.food.id, amount: Number(item.amount), unit: item.unit})),
    })),
  };
}

export function directItem(preset: Preset): Item | null {
  return preset.food && preset.amount !== null && preset.unit !== null
    ? {id: preset.id, food: preset.food, amount: String(preset.amount), unit: itemUnit(preset.food, preset.unit)}
    : null;
}

// These values describe the unsaved portion. Persisted option totals come from the API.
export function itemNutrients(item: Item): NutrientValues {
  if (!isAmount(item.amount)) {
    return {};
  }
  const food = item.food;
  const unitAmount =
    itemUnit(food, item.unit) === baseUnit(food) ? 1 : food.servings.find((row) => row.label === item.unit)?.amount;
  if (unitAmount === undefined) {
    return {};
  }
  const factor = (Number(item.amount) * unitAmount) / (food.basis === '1unit' ? 1 : 100);
  return Object.fromEntries(Object.entries(food.nutrients).map(([code, value]) => [code, value * factor]));
}

export function nutrientLine(values: NutrientValues, incomplete = false) {
  if (coreCodes.every((code) => values[code] == null)) {
    return 'Nutrients not listed';
  }
  if (coreCodes.every((code) => values[code] === 0)) {
    return incomplete ? 'No calories · incomplete' : 'No calories';
  }
  const round = (code: string) => (values[code] == null ? '–' : String(Math.round(values[code])));
  const line = `${round('energy_kcal')} kcal · P ${round('protein_g')} · C ${round('carbs_g')} · F ${round('fat_g')}`;
  return incomplete || coreCodes.some((code) => values[code] == null) ? `${line} · incomplete` : line;
}

export function totalLine(items: Item[]) {
  const parts = items.map(itemNutrients);
  const values = Object.fromEntries(
    coreCodes.flatMap((code) => {
      const known = parts.flatMap((part) => (part[code] === undefined ? [] : [part[code]]));
      return known.length === 0 ? [] : [[code, known.reduce((sum, value) => sum + value, 0)]];
    }),
  );
  return nutrientLine(
    values,
    parts.some((part) => coreCodes.some((code) => part[code] == null)),
  );
}

export function amountLabel(item: Item) {
  return `${item.amount} ${item.unit === baseUnit(item.food) ? baseLabel(item.food) : item.unit}`;
}
export const optionLabel = (option: SavedOption) =>
  option.name?.trim() || option.items.map((item) => item.food.name).join(', ') || 'Empty option';
export const presetTitle = (preset: Preset) =>
  preset.type === 'meal' ? (preset.name ?? '') : (preset.food?.name ?? '');
export function presetSummary(preset: Preset) {
  if (preset.type === 'meal') {
    return preset.options.map(optionLabel).join(' or ');
  }
  const item = directItem(preset);
  return item ? amountLabel(item) : '';
}
export const presetOf = (state: State, id: string) => state.presets.find((preset) => preset.id === id);
export const usesOf = (state: State, id: string) =>
  state.schedules.filter((schedule) => schedule.nutrition_preset_id === id);
export const byTime = (a: Schedule, b: Schedule) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
export const targetsOn = (state: State, bit: number) => {
  const row = state.target_schedules.find((schedule) => (schedule.weekdays_mask ?? 0) & bit);
  return state.nutrition_targets.find((set) => set.id === row?.nutrition_targets_id);
};
export const daysOfTargets = (state: State, id: string) =>
  state.target_schedules
    .filter((row) => row.nutrition_targets_id === id)
    .reduce((mask, row) => mask | (row.weekdays_mask ?? 0), 0);
export const energyText = (set: NutritionTargets) =>
  set.targets.energy_kcal ? boundsText(set.targets.energy_kcal, 'kcal') : 'No energy target';

export type TargetMode = 'none' | 'exact' | 'min' | 'max' | 'range';
export type TargetDraft = {mode: TargetMode; min: string; max: string};
export function toDraft(bounds: Bounds | undefined): TargetDraft {
  const min = bounds?.min == null ? '' : String(bounds.min);
  const max = bounds?.max == null ? '' : String(bounds.max);
  const mode = !bounds ? 'none' : min && max ? (min === max ? 'exact' : 'range') : min ? 'min' : 'max';
  return {mode, min, max};
}

export function toBounds(draft: TargetDraft): Bounds | null | string {
  const parse = (value: string) =>
    value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : undefined;
  const min = parse(draft.min);
  const max = parse(draft.max);
  switch (draft.mode) {
    case 'none':
      return null;
    case 'exact':
      return draft.min.trim() === '' ? null : min === undefined ? 'Enter a number' : {min, max: min};
    case 'min':
      return draft.min.trim() === '' ? null : min === undefined ? 'Enter a number' : {min};
    case 'max':
      return draft.max.trim() === '' ? null : max === undefined ? 'Enter a number' : {max};
    case 'range':
      return draft.min.trim() === '' && draft.max.trim() === ''
        ? null
        : min === undefined || max === undefined
          ? 'Enter both numbers'
          : min > max
            ? 'From must not be above to'
            : {min, max};
  }
}

export function boundsText(bounds: Bounds, unit: string) {
  if (bounds.min != null && bounds.max != null) {
    return bounds.min === bounds.max ? `${bounds.min} ${unit}` : `${bounds.min}–${bounds.max} ${unit}`;
  }
  return bounds.min != null ? `≥ ${bounds.min} ${unit}` : `≤ ${bounds.max} ${unit}`;
}

export function mealProblems(meal: Meal) {
  const problems: Array<{key: string; message: string}> = [];
  if (!meal.name.trim()) {
    problems.push({key: 'name', message: 'Add a name.'});
  }
  meal.options.forEach((option, index) => {
    if (option.items.length === 0) {
      problems.push({key: option.id, message: `Add a food to option ${index + 1}.`});
    }
    for (const item of option.items) {
      if (!isAmount(item.amount)) {
        problems.push({key: item.id, message: 'Fix the amounts.'});
      }
    }
  });
  return problems;
}

export function removeMealItem(meal: Meal, optionId: string, itemId: string): MealDraft {
  const option = meal.options.find((row) => row.id === optionId);
  const index = option?.items.findIndex((item) => item.id === itemId) ?? -1;
  const item = option?.items[index];
  if (!item) {
    return {meal, removal: null};
  }
  return {
    meal: {
      ...meal,
      options: meal.options.map((row) =>
        row.id === optionId ? {...row, items: row.items.filter((other) => other.id !== itemId)} : row,
      ),
    },
    removal: {kind: 'item', optionId, index, item},
  };
}

export function removeMealOption(meal: Meal, optionId: string): MealDraft {
  const index = meal.options.findIndex((option) => option.id === optionId);
  const option = meal.options[index];
  if (!option) {
    return {meal, removal: null};
  }
  return {
    meal: {...meal, options: meal.options.filter((row) => row.id !== optionId)},
    removal: {kind: 'option', index, option},
  };
}

export function undoMealRemoval(draft: MealDraft): MealDraft {
  const {meal, removal} = draft;
  if (!removal) {
    return draft;
  }
  if (removal.kind === 'option') {
    if (meal.options.some((option) => option.id === removal.option.id)) {
      return {...draft, removal: null};
    }
    const options = [...meal.options];
    options.splice(removal.index, 0, removal.option);
    return {meal: {...meal, options}, removal: null};
  }
  return {
    meal: {
      ...meal,
      options: meal.options.map((option) => {
        if (option.id !== removal.optionId || option.items.some((item) => item.id === removal.item.id)) {
          return option;
        }
        const items = [...option.items];
        items.splice(removal.index, 0, removal.item);
        return {...option, items};
      }),
    },
    removal: null,
  };
}

export const discardMealDraft = (meal: Meal): MealDraft => ({meal, removal: null});
export const uncertainSave = (status: number | undefined) => status === undefined || status < 400 || status >= 500;
