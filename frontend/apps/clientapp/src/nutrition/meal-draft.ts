import type {
  DayEntryInput,
  DaySlotInput,
  NutritionDayOption,
  NutritionDaySlot,
  NutritionPortion,
} from '../api/nutrition';

export const mealSlots = [
  'early_morning',
  'breakfast',
  'mid_morning',
  'lunch',
  'afternoon',
  'evening',
  'dinner',
  'pre_sleep',
  'pre_workout',
  'during_workout',
  'post_workout',
] as const satisfies readonly DaySlotInput['meal_slot'][];
export type MealSlot = DaySlotInput['meal_slot'];
export function isMealSlot(value: unknown): value is MealSlot {
  return typeof value === 'string' && mealSlots.some((slot) => slot === value);
}
export function slotLabel(slot: MealSlot) {
  return slot.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
export function portionText(portion: NutritionPortion) {
  return portion.kind === 'gram' ? `${portion.grams} g` : `${portion.amount} ${portion.label || portion.unit}`;
}
export function portionAmount(portion: NutritionPortion) {
  return String(portion.kind === 'gram' ? portion.grams : portion.amount);
}

export type MealEntry = {name: string; input: DayEntryInput; amount: string; included: boolean};
export type MealDraft = {
  version: 1;
  date: string;
  slot: MealSlot;
  revision: number;
  mealId: string | null;
  entries: MealEntry[];
  attempt: DaySlotInput | null;
};

export function initialMealDraft(date: string, slot: MealSlot, saved?: NutritionDaySlot): MealDraft {
  return {
    version: 1,
    date,
    slot,
    revision: saved?.revision ?? 0,
    mealId: saved?.meal_id ?? null,
    attempt: null,
    entries:
      saved?.rows.map((row) => ({
        name: row.name,
        amount: portionAmount(row.portion),
        included: row.entry_id !== null,
        input: {
          id: row.entry_id ?? crypto.randomUUID(),
          planned_item_ref: row.planned_item_ref,
          food_id: row.food_id,
          recipe_id: row.recipe_id,
          portion: row.portion,
          notes: row.notes,
        },
      })) ?? [],
  };
}

export function chooseAlternative(draft: MealDraft, option: NutritionDayOption): MealDraft {
  return {
    ...draft,
    mealId: option.meal_id,
    entries: [
      ...option.items.map((item) => ({
        name: item.name ?? 'Unavailable item',
        amount: portionAmount(item.portion),
        included: false,
        input: {
          id: crypto.randomUUID(),
          planned_item_ref: item.planned_item_ref,
          food_id: item.food_id,
          recipe_id: item.recipe_id,
          portion: item.portion,
          notes: null,
        },
      })),
      ...draft.entries.filter((entry) => entry.input.planned_item_ref === null),
    ],
  };
}

export function mealInput(draft: MealDraft): DaySlotInput {
  return {
    meal_slot: draft.slot,
    meal_id: draft.mealId,
    expected_revision: draft.revision,
    entries: draft.entries
      .filter((entry) => entry.included)
      .map((entry) => {
        const amount = Number(entry.amount);
        if (!entry.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
          throw new Error(`Enter a portion greater than zero for ${entry.name}.`);
        }
        return {
          ...entry.input,
          portion:
            entry.input.portion.kind === 'gram' ? {kind: 'gram', grams: amount} : {...entry.input.portion, amount},
        };
      }),
  };
}

const nullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
function parsePortion(value: unknown): NutritionPortion | null {
  if (!value || typeof value !== 'object' || !('kind' in value)) {
    return null;
  }
  if (
    value.kind === 'gram' &&
    'grams' in value &&
    typeof value.grams === 'number' &&
    Number.isFinite(value.grams) &&
    value.grams > 0
  ) {
    return {kind: 'gram', grams: value.grams};
  }
  if (
    value.kind === 'serving' &&
    'amount' in value &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    'unit' in value &&
    typeof value.unit === 'string' &&
    'label' in value &&
    nullableString(value.label)
  ) {
    return {kind: 'serving', amount: value.amount, unit: value.unit, label: value.label};
  }
  return null;
}
function parseEntry(value: unknown): DayEntryInput | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('planned_item_ref' in value) ||
    !nullableString(value.planned_item_ref) ||
    !('food_id' in value) ||
    !nullableString(value.food_id) ||
    !('recipe_id' in value) ||
    !nullableString(value.recipe_id) ||
    (value.food_id !== null && value.recipe_id !== null) ||
    !('notes' in value) ||
    !nullableString(value.notes) ||
    !('portion' in value)
  ) {
    return null;
  }
  const portion = parsePortion(value.portion);
  return portion
    ? {
        id: value.id,
        planned_item_ref: value.planned_item_ref,
        food_id: value.food_id,
        recipe_id: value.recipe_id,
        portion,
        notes: value.notes,
      }
    : null;
}
function parseAttempt(value: unknown): DaySlotInput | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('meal_slot' in value) ||
    !isMealSlot(value.meal_slot) ||
    !('meal_id' in value) ||
    !nullableString(value.meal_id) ||
    !('expected_revision' in value) ||
    typeof value.expected_revision !== 'number' ||
    !Number.isInteger(value.expected_revision) ||
    value.expected_revision < 0 ||
    !('entries' in value) ||
    !Array.isArray(value.entries)
  ) {
    return null;
  }
  const entries: DayEntryInput[] = [];
  for (const raw of value.entries) {
    const entry = parseEntry(raw);
    if (!entry) {
      return null;
    }
    entries.push(entry);
  }
  return {meal_slot: value.meal_slot, meal_id: value.meal_id, expected_revision: value.expected_revision, entries};
}
export function parseMealDraft(value: unknown, date: string, slot: MealSlot): MealDraft | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('date' in value) ||
    value.date !== date ||
    !('slot' in value) ||
    value.slot !== slot ||
    !('revision' in value) ||
    typeof value.revision !== 'number' ||
    !Number.isInteger(value.revision) ||
    value.revision < 0 ||
    !('mealId' in value) ||
    !nullableString(value.mealId) ||
    !('entries' in value) ||
    !Array.isArray(value.entries) ||
    !('attempt' in value)
  ) {
    return null;
  }
  const entries: MealEntry[] = [];
  for (const raw of value.entries) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      !('input' in raw) ||
      !('amount' in raw) ||
      typeof raw.amount !== 'string' ||
      !('name' in raw) ||
      typeof raw.name !== 'string' ||
      !('included' in raw) ||
      typeof raw.included !== 'boolean'
    ) {
      return null;
    }
    const input = parseEntry(raw.input);
    if (!input) {
      return null;
    }
    entries.push({name: raw.name, amount: raw.amount, included: raw.included, input});
  }
  const attempt = value.attempt === null ? null : parseAttempt(value.attempt);
  if (
    value.attempt !== null &&
    (!attempt || attempt.meal_slot !== slot || attempt.expected_revision !== value.revision)
  ) {
    return null;
  }
  if (new Set(entries.map((entry) => entry.input.id)).size !== entries.length) {
    return null;
  }
  const draft: MealDraft = {version: 1, date, slot, revision: value.revision, mealId: value.mealId, entries, attempt};
  if (attempt) {
    try {
      if (JSON.stringify(mealInput(draft)) !== JSON.stringify(attempt)) {
        return null;
      }
    } catch {
      return null;
    }
  }
  return draft;
}
