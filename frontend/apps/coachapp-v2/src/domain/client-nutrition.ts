import {isFutureDate, MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';

import type {FoodLogEntry as GeneratedFoodLogEntry, MealLog} from '@/api/generated';
import type {Macros} from '@/api/shared';

// Re-export generated types under legacy names used throughout this domain
export type CoachMealLog = MealLog;
export type FoodLogEntry = GeneratedFoodLogEntry;

// PlannedSnapshotItem — the backend returns planned_snapshot as a free object;
// define the shape we actually read from it in this module.
export type PlannedSnapshotItem = {
  amount: number;
  calories: number;
  carbs_g: number;
  fat_g: number;
  food_name: string;
  protein_g: number;
  unit: string;
  weight_g: number;
};

// DailyNutritionSummary is FE-computed (no backend summary route exists).
export type DailyNutritionSummary = {
  date: string;
  logged_calories: number;
  meals_logged: number;
  planned_calories: number;
  replacements: number;
  total_entries: number;
  unplanned_count: number;
};

export type AdherenceLevel = 'future' | 'high' | 'low' | 'medium' | 'none';

export type ComparisonType = 'followed' | 'partial' | 'replaced' | 'skipped';

export type ComparisonItem = {
  entry: FoodLogEntry | null;
  planned: PlannedSnapshotItem;
  type: ComparisonType;
};

export const ADHERENCE_STYLES: Record<AdherenceLevel, {bg: string; icon: string}> = {
  future: {bg: 'bg-default', icon: '—'},
  high: {bg: 'bg-success/20', icon: '✓'},
  low: {bg: 'bg-danger/20', icon: '○'},
  medium: {bg: 'bg-warning/20', icon: '◐'},
  none: {bg: 'bg-default', icon: '○'},
};

export function getPlannedDailyCalories(macrosGoal: Macros | null | undefined): number {
  return macrosGoal?.calories ?? 0;
}

export function resolveNutritionMacrosGoal({
  fallback,
  plans,
}: {
  fallback?: Macros | null;
  plans?: Array<{macros_goal?: Macros; status: string}>;
}): Macros | null {
  if (fallback) {
    return fallback;
  }
  return plans?.find((plan) => plan.status === 'active')?.macros_goal ?? null;
}

export function getAdherenceLevel(
  summary: DailyNutritionSummary | undefined,
  dateStr: string,
  plannedCalories: number,
): AdherenceLevel {
  if (isFutureDate(dateStr)) {
    return 'future';
  }
  if (!summary || summary.total_entries === 0) {
    return 'none';
  }
  if (plannedCalories <= 0) {
    return 'high';
  }

  const percent = (summary.logged_calories / plannedCalories) * 100;
  if (percent >= 80) {
    return 'high';
  }
  if (percent >= 50) {
    return 'medium';
  }
  return 'low';
}

export function getDayPercent(summary: DailyNutritionSummary | undefined, plannedCalories: number): null | number {
  return summary && plannedCalories > 0 ? Math.round((summary.logged_calories / plannedCalories) * 100) : null;
}

export function buildRecentNutritionDaySubtitle(summary: DailyNutritionSummary): string {
  const parts: string[] = [];
  if (summary.meals_logged > 0) {
    parts.push(`${summary.meals_logged} meals`);
  }
  parts.push(`${summary.total_entries} items`);
  if (summary.replacements > 0) {
    parts.push(`${summary.replacements} replaced`);
  }
  if (summary.unplanned_count > 0) {
    parts.push(`${summary.unplanned_count} added`);
  }
  return parts.join(' · ');
}

export function buildMealLogComparison(mealLog: CoachMealLog): {
  comparison: ComparisonItem[];
  unplanned: FoodLogEntry[];
} {
  const entries = mealLog.food_log_entries;
  // planned_snapshot is typed as a free object in generated types; cast to known shape.
  const planned = (mealLog.planned_snapshot?.items ?? []) as PlannedSnapshotItem[];

  const comparison: ComparisonItem[] = planned.map((item, index) => {
    const entry = entries.find((foodLogEntry) => foodLogEntry.planned_item_index === index);

    if (!entry) {
      return {entry: null, planned: item, type: 'skipped'};
    }
    if (entry.source === 'replacement') {
      return {entry, planned: item, type: 'replaced'};
    }
    if (entry.amount !== item.amount) {
      return {entry, planned: item, type: 'partial'};
    }
    return {entry, planned: item, type: 'followed'};
  });

  const unplanned = entries.filter((entry) => entry.source === 'unplanned' || entry.planned_item_index == null);

  return {comparison, unplanned};
}

export function sortMealLogsBySlot(mealLogs: CoachMealLog[]): CoachMealLog[] {
  return [...mealLogs].sort(
    (a, b) =>
      MEAL_SLOTS.indexOf(a.meal_slot as (typeof MEAL_SLOTS)[number]) -
      MEAL_SLOTS.indexOf(b.meal_slot as (typeof MEAL_SLOTS)[number]),
  );
}

export function getNutritionDayTotals(mealLogs: CoachMealLog[]): {
  adherencePercent: null | number;
  loggedSlots: Set<string>;
  totalEntries: number;
  totalLoggedCal: number;
  totalPlannedCal: number;
} {
  const totalLoggedCal = mealLogs.reduce((sum, mealLog) => sum + (mealLog.logged_calories ?? 0), 0);
  const totalPlannedCal = mealLogs.reduce((sum, mealLog) => sum + (mealLog.planned_snapshot?.total_calories ?? 0), 0);
  const totalEntries = mealLogs.reduce((sum, mealLog) => sum + mealLog.food_log_entries.length, 0);
  const loggedSlots = new Set(mealLogs.map((mealLog) => mealLog.meal_slot));
  const adherencePercent = totalPlannedCal > 0 ? Math.round((totalLoggedCal / totalPlannedCal) * 100) : null;

  return {adherencePercent, loggedSlots, totalEntries, totalLoggedCal, totalPlannedCal};
}

export function getSkippedMealSlots(mealLogs: CoachMealLog[]): string[] {
  if (!mealLogs.some((mealLog) => mealLog.planned_snapshot != null)) {
    return [];
  }

  const loggedSlots = new Set(mealLogs.map((mealLog) => mealLog.meal_slot));
  return MEAL_SLOTS.filter((slot) => !loggedSlots.has(slot));
}

export function getMealSlotLabel(slot: string): string {
  return MEAL_SLOT_LABELS[slot] ?? slot;
}

/**
 * Aggregate a flat list of MealLog entries (from useListCoachMealLogsQuery) into
 * one DailyNutritionSummary per date. Replaces the defunct server-side summary route.
 */
export function computeDailyNutritionSummaries(mealLogs: MealLog[]): DailyNutritionSummary[] {
  const byDate = new Map<string, DailyNutritionSummary>();

  for (const log of mealLogs) {
    const existing = byDate.get(log.date);
    const totalEntries = log.food_log_entries.length;
    const replacements = log.food_log_entries.filter((e) => e.source === 'replacement').length;
    const unplanned = log.food_log_entries.filter(
      (e) => e.source === 'unplanned' || e.planned_item_index == null,
    ).length;

    if (!existing) {
      byDate.set(log.date, {
        date: log.date,
        logged_calories: log.logged_calories ?? 0,
        meals_logged: totalEntries > 0 ? 1 : 0,
        planned_calories: log.planned_calories ?? 0,
        replacements,
        total_entries: totalEntries,
        unplanned_count: unplanned,
      });
    } else {
      existing.logged_calories += log.logged_calories ?? 0;
      existing.meals_logged += totalEntries > 0 ? 1 : 0;
      existing.planned_calories += log.planned_calories ?? 0;
      existing.replacements += replacements;
      existing.total_entries += totalEntries;
      existing.unplanned_count += unplanned;
    }
  }

  return [...byDate.values()];
}

// Assert: a meal log with known values produces the correct aggregate.
(function assertComputeDailyNutritionSummaries() {
  const fakeLogs: MealLog[] = [
    {
      id: 'a',
      date: '2026-01-01',
      meal_slot: 'breakfast',
      logged_calories: 400,
      planned_calories: 500,
      inserted_at: '',
      updated_at: '',
      food_log_entries: [
        {
          id: 'e1',
          amount: 1,
          food_name: 'egg',
          meal_log_id: 'a',
          inserted_at: '',
          updated_at: '',
          unit: null,
          weight_g: null,
          source: 'planned',
          planned_item_index: 0,
        },
        {
          id: 'e2',
          amount: 1,
          food_name: 'toast',
          meal_log_id: 'a',
          inserted_at: '',
          updated_at: '',
          unit: null,
          weight_g: null,
          source: 'replacement',
          planned_item_index: 1,
        },
      ],
    },
    {
      id: 'b',
      date: '2026-01-01',
      meal_slot: 'lunch',
      logged_calories: 600,
      planned_calories: 700,
      inserted_at: '',
      updated_at: '',
      food_log_entries: [
        {
          id: 'e3',
          amount: 1,
          food_name: 'salad',
          meal_log_id: 'b',
          inserted_at: '',
          updated_at: '',
          unit: null,
          weight_g: null,
          source: 'unplanned',
          planned_item_index: null,
        },
      ],
    },
  ];
  const result = computeDailyNutritionSummaries(fakeLogs);
  if (result.length !== 1) {
    throw new Error('computeDailyNutritionSummaries: expected 1 day');
  }
  const day = result[0]!;
  if (day.logged_calories !== 1000) {
    throw new Error('computeDailyNutritionSummaries: wrong logged_calories');
  }
  if (day.planned_calories !== 1200) {
    throw new Error('computeDailyNutritionSummaries: wrong planned_calories');
  }
  if (day.total_entries !== 3) {
    throw new Error('computeDailyNutritionSummaries: wrong total_entries');
  }
  if (day.replacements !== 1) {
    throw new Error('computeDailyNutritionSummaries: wrong replacements');
  }
  if (day.unplanned_count !== 1) {
    throw new Error('computeDailyNutritionSummaries: wrong unplanned_count');
  }
  if (day.meals_logged !== 2) {
    throw new Error('computeDailyNutritionSummaries: wrong meals_logged');
  }
})();
