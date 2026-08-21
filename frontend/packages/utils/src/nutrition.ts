// ── Macro Types ──────────────────────────────────────────────

export type Macros = Record<string, number>;

export type MacroTotals = {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
};

// ── Meal slot constants ──────────────────────────────────────

export {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS,
  type MealSlot,
  ORDINARY_MEAL_SLOTS,
  WORKOUT_MEAL_SLOTS,
} from './meal-slots.ts';

// ── Weekday helpers ──────────────────────────────────────────

// The days of the week are not a nutrition concept and not a training one, so
// there is one list. These three were a byte-identical second copy of the
// `TRAINING_*` set in `workout.ts` — same seven strings, same two label maps —
// which is how the two plan builders ended up with two `WeekdayChips`
// components that drifted apart on five axes (one of them clipping Sunday off
// a 375px screen). The names stay so no importer has to change; only the
// duplicated data is gone.
export {
  TRAINING_DAY_LABELS as WEEKDAY_LABELS,
  TRAINING_DAY_SHORT_LABELS as WEEKDAY_SHORT_LABELS,
  TRAINING_WEEKDAYS as WEEKDAYS,
} from './workout';

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
 * Format a macro value for display.
 */
export function formatMacroValue(value: number, unit: string): string {
  const rounded = Math.round(value);
  return `${rounded}${unit}`;
}
