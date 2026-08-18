/**
 * Display mapping for Nutrition Day summary fields. Totals and adherence stay
 * backend-derived; this module only formats them.
 */

export type NutritionSummaryAdherence = 'none' | 'on' | 'over' | 'under';

export type Adherence = NutritionSummaryAdherence | 'unknown';

type SummaryDay = {
  summary: {
    adherence?: NutritionSummaryAdherence | null;
    has_intake: boolean;
  };
};

export const ADHERENCE_RING: Record<Adherence, string> = {
  none: '#d6d8dc',
  on: 'var(--success)',
  over: 'var(--danger)',
  under: '#e2a33c',
  unknown: '#d6d8dc',
};

export const ADHERENCE_TEXT: Record<Adherence, string> = {
  none: 'var(--field-placeholder)',
  on: 'var(--success-secondary)',
  over: 'var(--danger)',
  under: 'var(--warning)',
  unknown: 'var(--field-placeholder)',
};

export function adherenceDisplay(day: null | SummaryDay | undefined): Adherence {
  if (!day?.summary.has_intake) {
    return 'none';
  }
  return day.summary.adherence ?? 'unknown';
}

/** Elixir decimals can arrive as JSON strings (RM-130). */
export function nutrientNumber(value: null | number | string | undefined): null | number {
  if (value == null || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function calorieShare(
  logged: null | number | string | undefined,
  target: null | number | string | undefined,
): null | number {
  const value = nutrientNumber(logged);
  const goal = nutrientNumber(target);
  if (value == null || goal == null || goal <= 0) {
    return null;
  }
  return Math.round((value / goal) * 100);
}

export function kcalText(value: null | number | string | undefined): string {
  const n = nutrientNumber(value);
  return n == null ? '—' : `${Math.round(n)}`;
}
