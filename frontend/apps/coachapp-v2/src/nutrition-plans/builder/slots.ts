/**
 * Sentence-case slot names, per COPY.md § NB. `@easy/utils`' MEAL_SLOT_LABELS
 * is Title Case and shared with the client app, so this screen keeps its own
 * map rather than changing copy for both apps.
 */
export const SLOT_LABELS: Record<string, string> = {
  afternoon_snack: 'Afternoon snack',
  breakfast: 'Breakfast',
  dinner: 'Dinner',
  evening_snack: 'Evening snack',
  lunch: 'Lunch',
  morning_snack: 'Morning snack',
};

export function slotLabel(slot: string): string {
  return SLOT_LABELS[slot] ?? slot;
}
