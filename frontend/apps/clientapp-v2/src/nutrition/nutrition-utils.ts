/**
 * Nutrition day view helpers. Slots come from the server nutrition-day payload.
 * Frozen option order and the active choice are Diary-owned; this module does
 * not overlay a local pick. Consumed macros sum from diary row entries; targets from the day.
 */
import {type MacroTotals, MEAL_SLOT_LABELS} from '@easy/utils';

import type {
  NutritionDay,
  NutritionDayEntry,
  NutritionDayOption,
  NutritionDayOptionItem,
  NutritionDayRow,
  NutritionDaySlot,
} from '@/api/nutrition';

function macroSum(entries: NutritionDayEntry[]): MacroTotals {
  const t: MacroTotals = {calories: 0, carbs: 0, fat: 0, protein: 0};
  for (const e of entries) {
    t.calories += e.nutrients.calories ?? 0;
    t.protein += e.nutrients.protein ?? 0;
    t.carbs += e.nutrients.carbohydrates ?? 0;
    t.fat += e.nutrients.fat ?? 0;
  }
  return t;
}

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
  loggedCalories: number;
  mealId: null | string;
  options: NutritionDayOption[];
  plannedCalories: number;
  revision: number;
  rows: SlotRow[];
  slot: string;
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
  slot: string,
  daySlot: NutritionDaySlot,
  option: NutritionDayOption | null,
  rows: SlotRow[],
  loggedCalories: number,
  plannedCalories: number,
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
    label: MEAL_SLOT_LABELS[slot as keyof typeof MEAL_SLOT_LABELS] ?? slot,
    loggedCalories,
    mealId: option?.meal_id ?? daySlot.meal_id ?? null,
    options: daySlot.options,
    plannedCalories,
    revision: daySlot.revision ?? 1,
    rows,
    slot,
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
    const loggedCalories = daySlot.logged_calories ?? 0;

    if (!logged) {
      const checklist = history ? [] : (option?.items ?? []).map(checklistRow);
      const plannedCalories =
        daySlot.planned_calories ?? (option?.items ?? []).reduce((s, it) => s + (plannedItemCalories(it) ?? 0), 0);
      return slotShell(daySlot.meal_slot, daySlot, option, checklist, loggedCalories, plannedCalories, false, false);
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
    (s.rows ?? []).map((r) => r.entry).filter((e): e is NutritionDayEntry => e != null),
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
