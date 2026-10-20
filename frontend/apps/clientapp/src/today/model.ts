import type {Food as ApiFood, NutritionPreset} from '../api/foods';
import type {FoodLog as ApiFoodLog, NutritionLog as ApiNutritionLog} from '../api/nutrition-logs';

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

// Why another workout cannot start: a coach recording the client's session is not the client's to finish.
export function activeWorkoutReason(
  active: {recorded_by: 'client' | 'coach'; recorder_name: string; workout_id: string | null},
  workouts: readonly {id: string; name: string}[],
) {
  const name = workouts.find((row) => row.id === active.workout_id)?.name ?? 'your workout in progress';
  return active.recorded_by === 'coach'
    ? `${active.recorder_name} is recording ${name}. You can start this after it's finished.`
    : `Finish ${name} first.`;
}
