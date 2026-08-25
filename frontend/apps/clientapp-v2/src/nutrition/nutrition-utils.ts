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
} from '../api/nutrition.ts';

import {nutrientNumber} from './nutrition-summary.ts';

export {
  ADHERENCE_RING,
  ADHERENCE_TEXT,
  type Adherence,
  adherenceDisplay,
  calorieShare,
  kcalText,
  nutrientNumber,
} from './nutrition-summary.ts';

/** One row on Today: either a live checklist item or a server diary row. */
type SlotRowBase = {
  calories: null | number;
  name: string;
};

export type ChecklistSlotRow = SlotRowBase & {
  entry: null;
  plannedItemRef: string;
  plannedItem: NutritionDayOptionItem;
  status: 'checklist';
};

export type PlannedSlotRow = SlotRowBase & {
  entry: NutritionDayEntry | null;
  plannedItemRef: string;
  plannedItem: NutritionDayOptionItem;
  status: 'as_planned' | 'pending' | 'swapped';
};

export type ExtraSlotRow = SlotRowBase & {
  entry: NutritionDayEntry;
  plannedItemRef: null;
  plannedItem: null;
  status: 'added' | 'recorded';
};

export type SkippedSlotRow = SlotRowBase & {
  entry: null;
  plannedItemRef: string;
  plannedItem: NutritionDayOptionItem;
  status: 'skipped';
};

export type SlotRow = ChecklistSlotRow | ExtraSlotRow | PlannedSlotRow | SkippedSlotRow;

export type SheetTarget =
  | {
      date: string;
      mealId: null | string;
      plannedItemRef: string;
      mode: 'planned';
      name: string;
      plannedItem: NutritionDayOptionItem;
      slot: NutritionDaySlot['meal_slot'];
      slotLabel: string;
    }
  | {
      date: string;
      loggedEntry: NutritionDayEntry;
      mealId: null | string;
      plannedItemRef: null | string;
      mode: 'logged';
      name: string;
      plannedItem: null | NutritionDayOptionItem;
      slot: NutritionDaySlot['meal_slot'];
      slotLabel: string;
    };

export function sheetTargetFromRow(date: string, slot: SlotView, row: SlotRow): SheetTarget {
  switch (row.status) {
    case 'checklist':
      return {
        date,
        mealId: slot.mealId,
        plannedItemRef: row.plannedItemRef,
        mode: 'planned',
        name: row.name,
        plannedItem: row.plannedItem,
        slot: slot.slot,
        slotLabel: slot.label,
      };
    case 'added':
    case 'recorded':
      return {
        date,
        loggedEntry: row.entry,
        mealId: slot.mealId,
        plannedItemRef: null,
        mode: 'logged',
        name: row.name,
        plannedItem: null,
        slot: slot.slot,
        slotLabel: slot.label,
      };
    case 'skipped':
    case 'as_planned':
    case 'swapped':
    case 'pending':
      if (row.entry) {
        return {
          date,
          loggedEntry: row.entry,
          mealId: slot.mealId,
          plannedItemRef: row.plannedItemRef,
          mode: 'logged',
          name: row.name,
          plannedItem: row.plannedItem,
          slot: slot.slot,
          slotLabel: slot.label,
        };
      }
      return {
        date,
        mealId: slot.mealId,
        plannedItemRef: row.plannedItemRef,
        mode: 'planned',
        name: row.name,
        plannedItem: row.plannedItem,
        slot: slot.slot,
        slotLabel: slot.label,
      };
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

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
    plannedItemRef: item.planned_item_ref,
    name: item.name ?? 'Food',
    plannedItem: item,
    status: 'checklist',
  };
}

function diaryRow(row: NutritionDayRow): SlotRow {
  const planned = row.planned;
  const entry = row.entry ?? null;

  switch (row.status) {
    case 'added':
    case 'recorded': {
      if (!entry) {
        throw new Error(`Diary row ${row.status} is missing an entry`);
      }
      return {
        calories: entry.nutrients.calories ?? null,
        entry,
        plannedItemRef: null,
        name: entry.name ?? 'Food',
        plannedItem: null,
        status: row.status,
      };
    }
    case 'skipped': {
      if (!planned) {
        throw new Error('Skipped diary row is missing planned item metadata');
      }
      return {
        calories: plannedItemCalories(planned),
        entry: null,
        plannedItemRef: planned.planned_item_ref,
        name: planned.name ?? 'Planned item',
        plannedItem: planned,
        status: 'skipped',
      };
    }
    case 'as_planned':
    case 'swapped':
    case 'pending': {
      if (!planned) {
        throw new Error(`Diary row ${row.status} is missing planned item metadata`);
      }
      return {
        calories: entry?.nutrients.calories ?? plannedItemCalories(planned),
        entry,
        plannedItemRef: planned.planned_item_ref,
        name: entry?.name ?? planned.name ?? 'Food',
        plannedItem: planned,
        status: row.status,
      };
    }
    default: {
      const _exhaustive: never = row.status;
      return _exhaustive;
    }
  }
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

/**
 * The day strip's label for one date: today names itself, every other day is
 * weekday plus day-and-month. Written against `en-US` so the two shapes stay
 * stable regardless of the device locale.
 */
export function dateLabel(date: string, today: string): string {
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.toLocaleDateString('en-US', {weekday: 'short'});
  return date === today
    ? `Today \u00b7 ${weekday}`
    : `${weekday} \u00b7 ${d.toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}`;
}
