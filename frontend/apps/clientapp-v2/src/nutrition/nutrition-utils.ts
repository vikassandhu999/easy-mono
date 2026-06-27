/**
 * Shared nutrition reconciliation — combine the day's planned meals (today payload)
 * with the logged entries (meal-logs) so the Today screen and History detail agree.
 * Consumed macros sum FE-side from logged entries (each carries frozen macros);
 * targets come from the active plan's target_* columns.
 */
import {type MacroTotals, MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';

import {
  type FoodLogEntry,
  type MealLog,
  type NutritionPlan,
  plannedItemCalories,
  type TodayPlan,
  type TodayPlanItem,
} from '@/api/nutrition';

// Sum the frozen macros off logged entries (generated FoodLogEntry macro fields are
// optional/nullable, so the shared sumMacrosFromEntries signature doesn't accept them).
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

export type PlannedRow = {
  item: TodayPlanItem;
  // the entry that fulfils this planned item, if logged (planned or replacement)
  logged: FoodLogEntry | null;
  // the planned item's position = the entry's planned_item_index
  position: number;
  replaced: boolean;
};

export type SlotView = {
  allPlannedLogged: boolean;
  // off-plan entries (source unplanned / no planned index)
  extras: FoodLogEntry[];
  hasLog: boolean;
  label: string;
  loggedCalories: number;
  mealId: null | string;
  planned: PlannedRow[];
  plannedCalories: number;
  slot: string;
};

export function buildSlots(today: null | TodayPlan, mealLogs: MealLog[]): SlotView[] {
  const logBySlot = new Map(mealLogs.map((ml) => [ml.meal_slot, ml]));
  const plannedBySlot = new Map((today?.meals ?? []).map((m) => [m.meal_slot, m]));
  const slots = MEAL_SLOTS.filter((s) => plannedBySlot.has(s) || logBySlot.has(s));

  return slots.map((slot) => {
    const meal = plannedBySlot.get(slot) ?? null;
    const ml = logBySlot.get(slot) ?? null;
    const entries = ml?.food_log_entries ?? [];

    const byIndex = new Map<number, FoodLogEntry>();
    const extras: FoodLogEntry[] = [];
    for (const e of entries) {
      if (e.planned_item_index != null) {
        byIndex.set(e.planned_item_index, e);
      } else {
        extras.push(e);
      }
    }

    const planned: PlannedRow[] = (meal?.items ?? []).map((item) => {
      const logged = byIndex.get(item.position) ?? null;
      return {item, logged, position: item.position, replaced: logged?.source === 'replacement'};
    });

    return {
      allPlannedLogged: planned.length > 0 && planned.every((p) => p.logged),
      extras,
      hasLog: entries.length > 0,
      label: MEAL_SLOT_LABELS[slot] ?? slot,
      loggedCalories: ml?.logged_calories ?? macroSum(entries).calories,
      mealId: meal?.meal_id ?? null,
      planned,
      plannedCalories: (meal?.items ?? []).reduce((s, it) => s + (plannedItemCalories(it) ?? 0), 0),
      slot,
    };
  });
}

export function dayTotals(mealLogs: MealLog[]): MacroTotals {
  return macroSum(mealLogs.flatMap((ml) => ml.food_log_entries ?? []));
}

export type Targets = {calories: null | number; carbs: null | number; fat: null | number; protein: null | number};

export function planTargets(plan: NutritionPlan | undefined): Targets {
  return {
    calories: plan?.target_calories ?? null,
    carbs: plan?.target_carbs_g ?? null,
    fat: plan?.target_fat_g ?? null,
    protein: plan?.target_protein_g ?? null,
  };
}

export type Adherence = 'none' | 'on' | 'over' | 'under';

// consumed-vs-target calorie bucket (mockup thresholds: <90% under, >110% over).
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
