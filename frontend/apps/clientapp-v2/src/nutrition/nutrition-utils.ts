/**
 * Nutrition day view helpers. Slots come from the server nutrition-day payload.
 * A thin overlay handles an unsaved local option pick before the first
 * fulfilment. Consumed macros sum from diary row entries; targets from the day.
 */
import {type MacroTotals, MEAL_SLOT_LABELS} from '@easy/utils';

import {
  type FoodLogEntry,
  type NutritionDay,
  type NutritionDayOption,
  type NutritionDayOptionItem,
  type NutritionDaySlot,
  plannedItemCalories,
} from '@/api/nutrition';
import type {components} from '@/api/schema';

type MealLogDiaryRow = components['schemas']['MealLogDiaryRow'];
type MealLogPlannedItem = components['schemas']['MealLogPlannedItem'];

function macroSum(entries: FoodLogEntry[]): MacroTotals {
  const t: MacroTotals = {calories: 0, carbs: 0, fat: 0, protein: 0};
  for (const e of entries) {
    t.calories += e.calories ?? 0;
    t.protein += e.protein_g ?? 0;
    t.carbs += e.carbs_g ?? 0;
    t.fat += e.fat_g ?? 0;
  }
  return t;
}

/** One row on Today: either a live checklist item or a server diary row. */
export type SlotRow = {
  calories: null | number;
  entry: FoodLogEntry | null;
  mealItemId: null | string;
  name: string;
  plannedItem: null | NutritionDayOptionItem;
  /** as_planned / swapped / added are checked; checklist / skipped are not. */
  status: 'added' | 'as_planned' | 'checklist' | 'skipped' | 'swapped';
};

export type SlotView = {
  activeMealId: null | string;
  allPlannedLogged: boolean;
  hasLog: boolean;
  /** True when a fulfilment exists — switching options needs the confirm dialog. */
  hasPlannedLog: boolean;
  label: string;
  loggedCalories: number;
  mealId: null | string;
  options: NutritionDayOption[];
  plannedCalories: number;
  rows: SlotRow[];
  slot: string;
};

function activeOption(slot: NutritionDaySlot, selection: string | undefined): NutritionDayOption | null {
  if (selection) {
    const picked = slot.options.find((o) => o.meal_id === selection);
    if (picked) {
      return picked;
    }
  }
  if (slot.meal_id) {
    const chosen = slot.options.find((o) => o.meal_id === slot.meal_id);
    if (chosen) {
      return chosen;
    }
  }
  return slot.options[0] ?? null;
}

function plannedFulfilments(rows: MealLogDiaryRow[]): boolean {
  return rows.some((r) => r.status === 'as_planned' || r.status === 'swapped');
}

function checklistRow(item: NutritionDayOptionItem): SlotRow {
  return {
    calories: plannedItemCalories(item),
    entry: null,
    mealItemId: item.meal_item_id,
    name: item.food_name ?? 'Food',
    plannedItem: item,
    status: 'checklist',
  };
}

function freezeAsOptionItem(planned: MealLogPlannedItem): null | NutritionDayOptionItem {
  if (!planned.id) {
    return null;
  }
  return {
    amount: planned.amount ?? null,
    food_id: planned.food_id ?? null,
    food_name: planned.food_name ?? null,
    meal_item_id: planned.id,
    nutrition: planned.calories != null ? {calories: planned.calories} : null,
    position: 0,
    recipe_id: planned.recipe_id ?? null,
    unit: planned.unit ?? null,
    weight_g: planned.weight_g ?? null,
  };
}

function diaryRow(row: MealLogDiaryRow): SlotRow {
  const planned = row.planned ?? null;
  const entry = row.entry ?? null;
  const plannedItem = planned ? freezeAsOptionItem(planned) : null;

  if (row.status === 'added') {
    return {
      calories: entry?.calories ?? null,
      entry,
      mealItemId: null,
      name: entry?.food_name ?? 'Food',
      plannedItem: null,
      status: 'added',
    };
  }

  return {
    calories: entry?.calories ?? plannedItemCalories(plannedItem!) ?? planned?.calories ?? null,
    entry,
    mealItemId: planned?.id ?? null,
    name: entry?.food_name ?? planned?.food_name ?? 'Food',
    plannedItem,
    status: row.status,
  };
}

function extrasFromDiary(rows: MealLogDiaryRow[]): SlotRow[] {
  return rows.filter((r) => r.status === 'added').map(diaryRow);
}

function slotShell(
  slot: string,
  daySlot: NutritionDaySlot,
  option: NutritionDayOption | null,
  rows: SlotRow[],
  loggedCalories: number,
  plannedCalories: number,
  hasLog: boolean,
  hasPlannedLog: boolean,
): SlotView {
  const plannedRows = rows.filter((r) => r.status !== 'added' && r.status !== 'checklist');
  const allPlannedLogged =
    plannedRows.length > 0 && plannedRows.every((r) => r.status === 'as_planned' || r.status === 'swapped');

  return {
    activeMealId: option?.meal_id ?? daySlot.meal_id ?? null,
    allPlannedLogged,
    hasLog,
    hasPlannedLog,
    label: MEAL_SLOT_LABELS[slot as keyof typeof MEAL_SLOT_LABELS] ?? slot,
    loggedCalories,
    mealId: option?.meal_id ?? daySlot.meal_id ?? null,
    options: daySlot.options,
    plannedCalories,
    rows,
    slot,
  };
}

/**
 * Render slots from the nutrition-day payload. Unlogged → checklist from the
 * active option. Logged → diary rows. Past days never rebuild rows from the
 * live plan. A local option pick with no fulfilments yet shows the new checklist
 * plus diary extras until switch/first write pins.
 */
export function slotsFromDay(
  day: null | NutritionDay,
  selections: Record<string, string> = {},
  history = false,
): SlotView[] {
  if (!day) {
    return [];
  }

  return day.slots.map((daySlot) => {
    const option = activeOption(daySlot, selections[daySlot.meal_slot]);
    const rows = daySlot.rows ?? [];
    // Presence of any diary row (incl. skipped) means the slot has a meal log.
    const logged = rows.length > 0;
    const loggedCalories = daySlot.logged_calories ?? 0;

    if (!logged) {
      const checklist = history ? [] : (option?.items ?? []).map(checklistRow);
      const plannedCalories =
        daySlot.planned_calories ?? (option?.items ?? []).reduce((s, it) => s + (plannedItemCalories(it) ?? 0), 0);
      return slotShell(daySlot.meal_slot, daySlot, option, checklist, loggedCalories, plannedCalories, false, false);
    }

    const pinnedId = daySlot.meal_id ?? null;
    const selectedId = selections[daySlot.meal_slot] ?? pinnedId;
    const pendingSwitch = Boolean(selectedId) && selectedId !== pinnedId && !plannedFulfilments(rows) && option != null;

    if (pendingSwitch && option) {
      const overlay = [...option.items.map(checklistRow), ...extrasFromDiary(rows)];
      const plannedCalories = option.items.reduce((s, it) => s + (plannedItemCalories(it) ?? 0), 0);
      return slotShell(daySlot.meal_slot, daySlot, option, overlay, loggedCalories, plannedCalories, true, false);
    }

    return slotShell(
      daySlot.meal_slot,
      daySlot,
      option,
      rows.map(diaryRow),
      loggedCalories,
      daySlot.planned_calories ?? 0,
      true,
      plannedFulfilments(rows),
    );
  });
}

export function optionCalories(option: NutritionDayOption): number {
  return option.items.reduce((s, it) => s + (plannedItemCalories(it) ?? 0), 0);
}

export function dayConsumed(day: null | NutritionDay): MacroTotals {
  if (!day) {
    return {calories: 0, carbs: 0, fat: 0, protein: 0};
  }
  const entries = day.slots.flatMap((s) =>
    (s.rows ?? []).map((r) => r.entry).filter((e): e is FoodLogEntry => e != null),
  );
  return macroSum(entries);
}

export type Targets = {calories: null | number; carbs: null | number; fat: null | number; protein: null | number};

export function dayTargets(day: null | NutritionDay | undefined): Targets {
  const t = day?.targets;
  return {
    calories: t?.calories ?? null,
    carbs: t?.carbs_g ?? null,
    fat: t?.fat_g ?? null,
    protein: t?.protein_g ?? null,
  };
}

export type Adherence = 'none' | 'on' | 'over' | 'under';

export const ADHERENCE_RING: Record<Adherence, string> = {
  none: '#d6d8dc',
  on: 'var(--success)',
  over: 'var(--danger)',
  under: '#e2a33c',
};

export const ADHERENCE_TEXT: Record<Adherence, string> = {
  none: 'var(--field-placeholder)',
  on: 'var(--success-secondary)',
  over: 'var(--danger)',
  under: 'var(--warning)',
};

export function adherence(consumedCalories: number, targetCalories: null | number): Adherence {
  if (consumedCalories <= 0) {
    return 'none';
  }
  if (!targetCalories) {
    return 'on';
  }
  const pct = consumedCalories / targetCalories;
  return pct < 0.9 ? 'under' : pct > 1.1 ? 'over' : 'on';
}
