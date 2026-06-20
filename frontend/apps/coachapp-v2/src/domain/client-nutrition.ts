import {isFutureDate, MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';

import type {CoachMealLog, DailyNutritionSummary, FoodLogEntry, PlannedSnapshotItem} from '@/api/mealLogs';
import type {Macros} from '@/api/shared';

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
  const planned = mealLog.planned_snapshot?.items ?? [];

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
