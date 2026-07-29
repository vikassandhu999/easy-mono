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
  type TodayPlanOption,
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
  // the planned item this row stands for = the entry's nutrition_meal_item_id
  mealItemId: string;
  replaced: boolean;
};

export type SlotView = {
  activeMealId: null | string;
  allPlannedLogged: boolean;
  // off-plan entries (source unplanned / not tied to a planned item)
  extras: FoodLogEntry[];
  hasLog: boolean;
  // true only if a planned/replacement entry is logged for this slot — switching options
  // only destroys these (off-plan extras survive a switch), so this gates the confirm dialog
  hasPlannedLog: boolean;
  label: string;
  loggedCalories: number;
  mealId: null | string;
  options: TodayPlanOption[];
  planned: PlannedRow[];
  plannedCalories: number;
  slot: string;
};

// Active option per slot: local selection (unsaved switch) > server chosen_meal_id >
// the default option (position 0, first in the ordered list).
function activeOption(
  slot: {chosen_meal_id: null | string; options: TodayPlanOption[]},
  selection: string | undefined,
): TodayPlanOption | null {
  if (selection) {
    const picked = slot.options.find((o) => o.meal_id === selection);
    if (picked) {
      return picked;
    }
  }
  if (slot.chosen_meal_id) {
    const chosen = slot.options.find((o) => o.meal_id === slot.chosen_meal_id);
    if (chosen) {
      return chosen;
    }
  }
  return slot.options[0] ?? null;
}

export function buildSlots(
  today: null | TodayPlan,
  mealLogs: MealLog[],
  selections: Record<string, string> = {},
): SlotView[] {
  const logBySlot = new Map(mealLogs.map((ml) => [ml.meal_slot, ml]));
  const plannedBySlot = new Map((today?.slots ?? []).map((s) => [s.meal_slot, s]));
  const slots = MEAL_SLOTS.filter((s) => plannedBySlot.has(s) || logBySlot.has(s));

  return slots.map((slot) => {
    const planSlot = plannedBySlot.get(slot) ?? null;
    const option = planSlot ? activeOption(planSlot, selections[slot]) : null;
    const ml = logBySlot.get(slot) ?? null;
    const entries = ml?.food_log_entries ?? [];

    // Keyed on the meal item's id, not its position: positions are not unique, so
    // two items sharing one would collapse into a single row here.
    const byItemId = new Map<string, FoodLogEntry>();
    const extras: FoodLogEntry[] = [];
    for (const e of entries) {
      if (e.nutrition_meal_item_id != null) {
        byItemId.set(e.nutrition_meal_item_id, e);
      } else {
        extras.push(e);
      }
    }

    const planned: PlannedRow[] = (option?.items ?? []).map((item) => {
      const logged = byItemId.get(item.meal_item_id) ?? null;
      return {item, logged, mealItemId: item.meal_item_id, replaced: logged?.source === 'replacement'};
    });

    return {
      activeMealId: option?.meal_id ?? null,
      allPlannedLogged: planned.length > 0 && planned.every((p) => p.logged),
      extras,
      hasLog: entries.length > 0,
      hasPlannedLog: planned.some((p) => p.logged != null),
      label: MEAL_SLOT_LABELS[slot] ?? slot,
      loggedCalories: ml?.logged_calories ?? macroSum(entries).calories,
      mealId: option?.meal_id ?? null,
      options: planSlot?.options ?? [],
      planned,
      plannedCalories: (option?.items ?? []).reduce((s, it) => s + (plannedItemCalories(it) ?? 0), 0),
      slot,
    };
  });
}

export function optionCalories(option: TodayPlanOption): number {
  return option.items.reduce((s, it) => s + (plannedItemCalories(it) ?? 0), 0);
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

/**
 * The adherence palette, keyed by the bucket that decides it. Lived twice —
 * History owned a ring + text pair, Today owned a near-copy of the text one —
 * so the two screens could drift on what "under target" looks like.
 * `under` and `none` have no theme token; every other entry does.
 */
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
