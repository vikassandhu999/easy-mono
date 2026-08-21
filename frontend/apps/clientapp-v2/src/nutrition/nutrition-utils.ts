/**
 * Nutrition day view helpers. Slots, statuses, totals, and adherence come from
 * the Nutrition Day contract; this module only maps them for display.
 */
import {MEAL_SLOT_LABELS} from '@easy/utils';

import type {
  NutritionDay,
  NutritionDayEntry,
  NutritionDayOption,
  NutritionDayOptionItem,
  NutritionDayRow,
  NutritionDaySlot,
} from '@/api/nutrition';

import {nutrientNumber} from './nutrition-summary';

export {
  ADHERENCE_RING,
  ADHERENCE_TEXT,
  type Adherence,
  adherenceDisplay,
  calorieShare,
  kcalText,
  nutrientNumber,
} from './nutrition-summary';

/** One row on Today: either a live checklist item or a server diary row. */
export type SlotRow = {
  calories: null | number;
  entry: NutritionDayEntry | null;
  mealItemId: null | string;
  name: string;
  plannedItem: null | NutritionDayOptionItem;
  /** as_planned / swapped / added / recorded are checked; checklist / skipped / pending are not. */
  status: NutritionDayRow['status'] | 'checklist';
};

export type SlotView = {
  activeMealId: null | string;
  allPlannedLogged: boolean;
  hasLog: boolean;
  /** True when a fulfilment exists — switching options needs the confirm dialog. */
  hasPlannedLog: boolean;
  label: string;
  loggedCalories: null | number;
  mealId: null | string;
  options: NutritionDayOption[];
  plannedCalories: null | number;
  revision: number;
  rows: SlotRow[];
  slot: NutritionDaySlot['meal_slot'];
  writeEligible: boolean;
};

function activeOption(slot: NutritionDaySlot): NutritionDayOption | null {
  if (slot.meal_id) {
    const chosen = slot.options.find((o) => o.meal_id === slot.meal_id);
    if (chosen) {
      return chosen;
    }
  }
  return slot.options[0] ?? null;
}

function plannedItemCalories(item: NutritionDayOptionItem): null | number {
  return item.nutrients.calories;
}

function plannedFulfilments(rows: NutritionDayRow[]): boolean {
  return rows.some((r) => r.status === 'as_planned' || r.status === 'swapped');
}

function checklistRow(item: NutritionDayOptionItem): SlotRow {
  return {
    calories: plannedItemCalories(item),
    entry: null,
    mealItemId: item.meal_item_id,
    name: item.name ?? 'Food',
    plannedItem: item,
    status: 'checklist',
  };
}

function diaryRow(row: NutritionDayRow): SlotRow {
  const planned = row.planned ?? null;
  const entry = row.entry ?? null;

  if (row.status === 'added' || row.status === 'recorded') {
    return {
      calories: entry?.nutrients.calories ?? null,
      entry,
      mealItemId: null,
      name: entry?.name ?? 'Food',
      plannedItem: null,
      status: row.status,
    };
  }

  return {
    calories: entry?.nutrients.calories ?? (planned ? plannedItemCalories(planned) : null),
    entry,
    mealItemId: planned?.meal_item_id ?? null,
    name: entry?.name ?? planned?.name ?? 'Food',
    plannedItem: planned,
    status: row.status,
  };
}

function slotShell(
  slot: NutritionDaySlot['meal_slot'],
  daySlot: NutritionDaySlot,
  option: NutritionDayOption | null,
  rows: SlotRow[],
  loggedCalories: null | number,
  plannedCalories: null | number,
  hasLog: boolean,
  hasPlannedLog: boolean,
): SlotView {
  const plannedRows = rows.filter((r) => r.status !== 'added' && r.status !== 'recorded' && r.status !== 'checklist');
  const allPlannedLogged =
    plannedRows.length > 0 && plannedRows.every((r) => r.status === 'as_planned' || r.status === 'swapped');

  return {
    activeMealId: option?.meal_id ?? daySlot.meal_id ?? null,
    allPlannedLogged,
    hasLog,
    hasPlannedLog,
    label: MEAL_SLOT_LABELS[slot],
    loggedCalories,
    mealId: option?.meal_id ?? daySlot.meal_id ?? null,
    options: daySlot.options,
    plannedCalories,
    revision: daySlot.revision ?? 1,
    rows,
    slot,
    writeEligible: daySlot.write_eligible,
  };
}

/**
 * Render slots from the nutrition-day payload. Unlogged → checklist from the
 * active frozen or live option. Logged → Diary rows, including extras from
 * inactive options. Past days never rebuild rows from live Programming.
 */
export function slotsFromDay(day: null | NutritionDay, history = false): SlotView[] {
  if (!day) {
    return [];
  }

  return day.slots.map((daySlot) => {
    const option = activeOption(daySlot);
    const rows = daySlot.rows ?? [];
    const logged = rows.length > 0;
    const loggedCalories = daySlot.logged_calories ?? null;

    if (!logged) {
      const checklist = history ? [] : (option?.items ?? []).map(checklistRow);
      return slotShell(
        daySlot.meal_slot,
        daySlot,
        option,
        checklist,
        loggedCalories,
        daySlot.planned_calories ?? null,
        false,
        false,
      );
    }

    return slotShell(
      daySlot.meal_slot,
      daySlot,
      option,
      rows.map(diaryRow),
      loggedCalories,
      daySlot.planned_calories ?? null,
      true,
      plannedFulfilments(rows),
    );
  });
}

export function optionCalories(option: NutritionDayOption): null | number {
  let total = 0;
  for (const item of option.items) {
    const calories = nutrientNumber(item.nutrients.calories);
    if (calories == null) {
      return null;
    }
    total += calories;
  }
  return total;
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
