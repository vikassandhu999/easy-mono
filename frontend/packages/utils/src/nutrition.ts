// ── Macro Types ──────────────────────────────────────────────

export type Macros = Record<string, number>;

export type MacroTotals = {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
};

// ── Meal slot constants ──────────────────────────────────────

export const MEAL_SLOTS = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'evening_snack',
] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<string, string> = {
  afternoon_snack: 'Afternoon Snack',
  breakfast: 'Breakfast',
  dinner: 'Dinner',
  evening_snack: 'Evening Snack',
  lunch: 'Lunch',
  morning_snack: 'Morning Snack',
};

// ── Weekday helpers ──────────────────────────────────────────

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const WEEKDAY_LABELS: Record<string, string> = {
  friday: 'Friday',
  monday: 'Monday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  thursday: 'Thursday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
};

export const WEEKDAY_SHORT_LABELS: Record<string, string> = {
  friday: 'Fri',
  monday: 'Mon',
  saturday: 'Sat',
  sunday: 'Sun',
  thursday: 'Thu',
  tuesday: 'Tue',
  wednesday: 'Wed',
};

// ── Macro normalization ──────────────────────────────────────

/**
 * Mapping from system-imported (short) macro keys to canonical (long) form keys.
 * System foods use: calories, protein, carbs, fat, fiber, sugar
 * Coach-created foods use: calories_per_100g, protein_g, carbs_g, fats_g, fiber_g, sugar_g
 */
const MACRO_KEY_ALIASES: Record<string, string> = {
  calories: 'calories_per_100g',
  carbs: 'carbs_g',
  fat: 'fats_g',
  fiber: 'fiber_g',
  protein: 'protein_g',
  sugar: 'sugar_g',
};

/**
 * Normalize a macros map so every key uses the canonical (coach-format) key.
 * System-imported short keys are remapped; already-canonical keys pass through unchanged.
 * Unknown keys (not in the alias table and not already canonical) are kept as-is.
 */
export function normalizeMacros(macros: Macros): Macros {
  const result: Macros = {};
  for (const [key, value] of Object.entries(macros)) {
    const canonical = MACRO_KEY_ALIASES[key] ?? key;
    // If both the alias and the canonical key exist, prefer the canonical key's value
    if (canonical in result) {
      continue;
    }
    result[canonical] = value;
  }
  return result;
}

// ── Macro computation ────────────────────────────────────────

const ZERO_MACROS: MacroTotals = {calories: 0, carbs: 0, fat: 0, protein: 0};

/**
 * Compute actual macros from per-100g macros snapshot and weight in grams.
 */
export function computeMacrosFromSnapshot(macrosSnapshot: Macros | null, weightG: null | number): MacroTotals {
  if (!macrosSnapshot || !weightG || weightG <= 0) {
    return {...ZERO_MACROS};
  }
  const normalized = normalizeMacros(macrosSnapshot);
  const factor = weightG / 100;
  return {
    calories: (normalized.calories_per_100g ?? 0) * factor,
    carbs: (normalized.carbs_g ?? 0) * factor,
    fat: (normalized.fats_g ?? 0) * factor,
    protein: (normalized.protein_g ?? 0) * factor,
  };
}

/**
 * Sum macros across an array of food log entries (old model — per-100g macros_snapshot + weight_g).
 * @deprecated Use sumMacrosFromEntries for the new FoodLogEntry model with server-computed macros.
 */
export function sumMacros(logs: Array<{macros_snapshot: Macros | null; weight_g: null | number}>): MacroTotals {
  const totals = {...ZERO_MACROS};
  for (const log of logs) {
    const itemMacros = computeMacrosFromSnapshot(log.macros_snapshot, log.weight_g);
    totals.calories += itemMacros.calories;
    totals.protein += itemMacros.protein;
    totals.carbs += itemMacros.carbs;
    totals.fat += itemMacros.fat;
  }
  return totals;
}

/**
 * Sum macros across FoodLogEntry items with server-computed macro fields.
 * Each entry already has final `calories`, `protein_g`, `carbs_g`, `fat_g` values.
 */
export function sumMacrosFromEntries(
  entries: Array<{calories: null | number; carbs_g: null | number; fat_g: null | number; protein_g: null | number}>,
): MacroTotals {
  const totals = {...ZERO_MACROS};
  for (const entry of entries) {
    totals.calories += entry.calories ?? 0;
    totals.protein += entry.protein_g ?? 0;
    totals.carbs += entry.carbs_g ?? 0;
    totals.fat += entry.fat_g ?? 0;
  }
  return totals;
}

/**
 * Compute planned macro totals from meal items.
 */
export function computePlannedMacros(
  meals: Array<{items: Array<{macros: Macros | null; weight_g: null | number}>}>,
): MacroTotals {
  const totals = {...ZERO_MACROS};
  for (const meal of meals) {
    for (const item of meal.items) {
      const itemMacros = computeMacrosFromSnapshot(item.macros, item.weight_g);
      totals.calories += itemMacros.calories;
      totals.protein += itemMacros.protein;
      totals.carbs += itemMacros.carbs;
      totals.fat += itemMacros.fat;
    }
  }
  return totals;
}

/**
 * Format a macro value for display.
 */
export function formatMacroValue(value: number, unit: string): string {
  const rounded = Math.round(value);
  return `${rounded}${unit}`;
}

// ── Date helpers ─────────────────────────────────────────────

/**
 * Convert a Date to a weekday string (e.g., "monday")
 */
export function getWeekdayFromDate(date: Date): string {
  const jsDay = date.getDay();
  // JS getDay(): 0=Sun, 1=Mon, ...6=Sat → map to our WEEKDAYS array (0=Mon...6=Sun)
  const index = jsDay === 0 ? 6 : jsDay - 1;
  return WEEKDAYS[index] ?? 'monday';
}

/**
 * Format a Date as ISO date string "YYYY-MM-DD"
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date for display: "Monday, Mar 25"
 */
export function formatDateDisplay(date: Date): string {
  const weekday = getWeekdayFromDate(date);
  const label = WEEKDAY_LABELS[weekday] ?? weekday;
  const month = date.toLocaleDateString(undefined, {month: 'short'});
  const day = date.getDate();
  return `${label}, ${month} ${day}`;
}
