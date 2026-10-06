import type {DiaryMeal, EntryInput, MealInput, NutritionMeal, NutritionPortion, NutritionSlot} from '../api/nutrition';

export function portionText(portion: NutritionPortion | null) {
  return !portion ? 'Quick add' : portion.type === 'grams' ? `${portion.grams} g` : `${portion.amount} serving(s)`;
}
export function portionAmount(portion: NutritionPortion | null) {
  return !portion ? '' : String(portion.type === 'grams' ? portion.grams : portion.amount);
}
export type MealEntry = {name: string; input: EntryInput; amount: string; included: boolean};
export type MealDraft = {
  version: 2;
  date: string;
  slot: string;
  id: string;
  requestId: string;
  name: string;
  planRevisionId: string | null;
  slotId: string | null;
  revision: number;
  mealId: string | null;
  noteToCoach: string;
  entries: MealEntry[];
  attempt: MealInput | null;
};

export function initialMealDraft(
  date: string,
  slot: string,
  saved?: DiaryMeal | null,
  planned?: NutritionSlot,
): MealDraft {
  const draft: MealDraft = {
    version: 2,
    date,
    slot,
    id: saved?.id ?? crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    name: saved?.name ?? planned?.name ?? 'Meal',
    planRevisionId: saved?.plan_revision_id ?? planned?.plan_revision_id ?? null,
    slotId: saved?.slot_id ?? planned?.id ?? null,
    revision: saved?.revision ?? 0,
    mealId: saved?.chosen_meal_id ?? null,
    noteToCoach: saved?.note_to_coach ?? '',
    attempt: null,
    entries:
      saved?.entries.map((entry) => ({
        name: entry.name,
        amount: portionAmount(entry.portion),
        included: true,
        input: {
          id: entry.id,
          request_id: crypto.randomUUID(),
          planned_item_id: entry.planned_item_id,
          source: entry.source,
          portion: entry.portion,
          name: entry.name,
          nutrients: entry.nutrients,
          notes: entry.notes,
        },
      })) ?? [],
  };
  return !saved && planned?.options[0] ? chooseAlternative(draft, planned.options[0]) : draft;
}

export function chooseAlternative(draft: MealDraft, option: NutritionMeal): MealDraft {
  return {
    ...draft,
    mealId: option.id,
    entries: [
      ...option.items.map((item) => ({
        name: item.name ?? 'Planned food',
        amount: portionAmount(item.portion),
        included: false,
        input: {
          id: crypto.randomUUID(),
          request_id: crypto.randomUUID(),
          planned_item_id: item.id,
          source: item.source,
          portion: item.portion,
          name: item.name ?? 'Planned food',
          notes: null,
        },
      })),
      ...draft.entries.filter((entry) => entry.input.planned_item_id === null),
    ],
  };
}

export function reviewMealDraft(draft: MealDraft, saved: DiaryMeal): MealDraft {
  const samePrescription = draft.planRevisionId === saved.plan_revision_id && draft.mealId === saved.chosen_meal_id;
  return {
    ...draft,
    id: saved.id,
    name: saved.name,
    revision: saved.revision,
    planRevisionId: saved.plan_revision_id,
    slotId: saved.slot_id,
    mealId: saved.chosen_meal_id,
    requestId: crypto.randomUUID(),
    attempt: null,
    entries: draft.entries.map((entry) => ({
      ...entry,
      input: {
        ...entry.input,
        request_id: crypto.randomUUID(),
        planned_item_id: samePrescription ? entry.input.planned_item_id : null,
      },
    })),
  };
}

export function mealInput(draft: MealDraft): MealInput {
  if (!draft.name.trim()) {
    throw new Error('Enter a meal name.');
  }
  return {
    id: draft.id,
    request_id: draft.requestId,
    expected_revision: draft.revision,
    plan_revision_id: draft.planRevisionId,
    slot_id: draft.slotId,
    name: draft.name.trim(),
    chosen_meal_id: draft.mealId,
    share: true,
    note_to_coach: draft.noteToCoach.trim() || null,
    entries: draft.entries
      .filter((entry) => entry.included)
      .map((entry) => {
        if (!entry.input.portion) {
          return entry.input;
        }
        const amount = Number(entry.amount);
        if (!entry.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
          throw new Error(`Enter a portion greater than zero for ${entry.name}.`);
        }
        return {
          ...entry.input,
          portion:
            entry.input.portion.type === 'grams'
              ? {type: 'grams' as const, grams: amount}
              : {...entry.input.portion, amount},
        };
      }),
  };
}

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';
function validEntry(value: unknown): value is EntryInput {
  if (
    !object(value) ||
    typeof value.id !== 'string' ||
    typeof value.request_id !== 'string' ||
    !nullableString(value.planned_item_id) ||
    !nullableString(value.notes)
  ) {
    return false;
  }
  if (value.source === null) {
    return (
      value.portion === null &&
      object(value.nutrients) &&
      Object.values(value.nutrients).every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)
    );
  }
  if (
    !object(value.source) ||
    !['food', 'recipe'].includes(String(value.source.type)) ||
    typeof value.source.id !== 'string' ||
    !object(value.portion)
  ) {
    return false;
  }
  const portion = value.portion;
  return portion.type === 'grams'
    ? typeof portion.grams === 'number' && Number.isFinite(portion.grams) && portion.grams > 0
    : portion.type === 'serving' &&
        typeof portion.serving_id === 'string' &&
        typeof portion.amount === 'number' &&
        Number.isFinite(portion.amount) &&
        portion.amount > 0;
}
export function parseMealDraft(value: unknown, date: string, slot: string): MealDraft | null {
  if (
    !object(value) ||
    value.version !== 2 ||
    value.date !== date ||
    value.slot !== slot ||
    typeof value.id !== 'string' ||
    typeof value.requestId !== 'string' ||
    typeof value.name !== 'string' ||
    !nullableString(value.planRevisionId) ||
    !nullableString(value.slotId) ||
    !nullableString(value.mealId) ||
    typeof value.noteToCoach !== 'string' ||
    typeof value.revision !== 'number' ||
    !Number.isInteger(value.revision) ||
    value.revision < 0 ||
    !Array.isArray(value.entries) ||
    !('attempt' in value)
  ) {
    return null;
  }
  const entries: MealEntry[] = [];
  for (const entry of value.entries) {
    if (
      !object(entry) ||
      typeof entry.name !== 'string' ||
      typeof entry.amount !== 'string' ||
      typeof entry.included !== 'boolean' ||
      !validEntry(entry.input)
    ) {
      return null;
    }
    entries.push({name: entry.name, amount: entry.amount, included: entry.included, input: entry.input});
  }
  if (new Set(entries.map((entry) => entry.input.id)).size !== entries.length) {
    return null;
  }
  const draft: MealDraft = {
    version: 2,
    date,
    slot,
    id: value.id,
    requestId: value.requestId,
    name: value.name,
    planRevisionId: value.planRevisionId as string | null,
    slotId: value.slotId as string | null,
    mealId: value.mealId as string | null,
    revision: value.revision,
    noteToCoach: value.noteToCoach,
    entries,
    attempt: null,
  };
  if (value.attempt !== null) {
    try {
      const expected = mealInput(draft);
      if (JSON.stringify(expected) !== JSON.stringify(value.attempt)) {
        return null;
      }
      draft.attempt = expected;
    } catch {
      return null;
    }
  }
  return draft;
}
