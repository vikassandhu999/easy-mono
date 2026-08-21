import {parseNutritionPortion, portionWireFromInput, toPortionInput} from '@easy/utils/nutrition-portion';
import type {components} from '@/api/schema';

export type NutritionMenuReplaceRequest = components['schemas']['NutritionMenuReplaceRequest'];
export type NutritionMealItemInput = components['schemas']['NutritionMealItemInput'];
export type NutritionPortionInput = components['schemas']['NutritionPortionInput'];

type NutritionPlan = components['schemas']['NutritionPlan'];
type NutritionMeal = components['schemas']['NutritionMeal'];
type NutritionMealItem = components['schemas']['NutritionMealItem'];
type NutritionWeekSchedule = components['schemas']['NutritionWeekSchedule'];

type DayPattern = NutritionPlan['day_patterns'][number];
type PatternSlot = DayPattern['slots'][number];
type PatternOption = PatternSlot['options'][number];
type Meal = NutritionPlan['meals'][number];
type Item = Meal['meal_items'][number];

/** The plan subtree `planToMenuRequest` reads — not the whole `NutritionPlan` surface. */
export type PlanMenuSource = {
  revision: NutritionPlan['revision'];
  schedule: NutritionWeekSchedule;
  day_patterns: Array<
    Pick<DayPattern, 'id' | 'name' | 'position'> & {
      slots: Array<
        Pick<PatternSlot, 'meal_slot'> & {
          options: Array<Pick<PatternOption, 'id' | 'position' | 'nutrition_meal_id'>>;
        }
      >;
    }
  >;
  meals: Array<
    Pick<Meal, 'id' | 'name' | 'notes' | 'position'> & {
      meal_items: Array<Pick<Item, 'id' | 'kind' | 'food_id' | 'recipe_id' | 'position' | 'portion'>>;
    }
  >;
};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const LOCAL_ID_PREFIX = 'local:';

export function createLocalNodeId(kind: 'meal' | 'item' | 'pattern' | 'option'): string {
  return `${LOCAL_ID_PREFIX}${kind}-${crypto.randomUUID()}`;
}

export function isLocalNodeId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

export const emptyNutrients: NutritionMeal['nutrients'] = {
  calories: null,
  protein: null,
  carbohydrates: null,
  fat: null,
  fiber: null,
  complete: false,
};

export function planToMenuRequest(plan: PlanMenuSource): NutritionMenuReplaceRequest {
  return {
    expected_revision: plan.revision,
    meals: plan.meals.map((meal) => ({
      ...identity(meal.id),
      name: meal.name,
      notes: meal.notes,
      position: meal.position,
      meal_items: meal.meal_items.map((item) => ({
        ...identity(item.id),
        kind: item.kind,
        food_id: item.food_id,
        recipe_id: item.recipe_id,
        position: item.position,
        portion: portionInput(item.portion),
      })),
    })),
    day_patterns: plan.day_patterns.map((pattern) => ({
      ...identity(pattern.id),
      name: pattern.name,
      position: pattern.position,
      slots: pattern.slots.map((slot) => ({
        meal_slot: slot.meal_slot,
        options: slot.options.map((option) => ({
          ...identity(option.id),
          position: option.position,
          ...mealIdentity(option.nutrition_meal_id),
        })),
      })),
    })),
    schedule: scheduleInput(plan.schedule),
  };
}

export function nextPosition(nodes: {position: number}[]): number {
  return Math.max(-1, ...nodes.map((node) => node.position)) + 1;
}

/** Moves one id to another slot. An out-of-range move is a no-op. */
export function moveId(ids: string[], from: number, to: number): string[] {
  const moved = ids[from];
  if (moved === undefined || to < 0 || to >= ids.length) {
    return ids;
  }
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function reorderNodes<Node extends {id: string; position: number}>(
  nodes: Node[],
  from: number,
  to: number,
): Node[] {
  const order = moveId(
    nodes.map((node) => node.id),
    from,
    to,
  );
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return order.flatMap((id, position) => {
    const node = byId.get(id);
    return node ? [{...node, position}] : [];
  });
}

export function mealItemFromDraft(
  mealId: string,
  draft: Pick<NutritionMealItemInput, 'kind' | 'food_id' | 'recipe_id' | 'portion'>,
  name: string | null,
  position: number,
): NutritionMealItem {
  const timestamp = new Date().toISOString();
  return {
    id: createLocalNodeId('item'),
    kind: draft.kind,
    name,
    food_id: draft.food_id ?? null,
    recipe_id: draft.recipe_id ?? null,
    position,
    portion: portionWireFromInput(draft.portion),
    nutrients: emptyNutrients,
    nutrition_meal_id: mealId,
    inserted_at: timestamp,
    updated_at: timestamp,
  };
}

function identity(id: string): {id: string} | {local_ref: string} {
  return isLocalNodeId(id) ? {local_ref: id.slice(LOCAL_ID_PREFIX.length)} : {id};
}

function mealIdentity(mealId: string): {nutrition_meal_id: string} | {meal_local_ref: string} {
  return isLocalNodeId(mealId) ? {meal_local_ref: mealId.slice(LOCAL_ID_PREFIX.length)} : {nutrition_meal_id: mealId};
}

function scheduleInput(schedule: NutritionWeekSchedule): NutritionMenuReplaceRequest['schedule'] {
  return Object.fromEntries(
    WEEKDAYS.map((weekday) => [weekday, scheduleDayRef(schedule[weekday])]),
  ) as NutritionMenuReplaceRequest['schedule'];
}

function scheduleDayRef(patternId: string | null): string {
  if (patternId === null) {
    throw new Error('Day Pattern schedule is incomplete');
  }
  return isLocalNodeId(patternId) ? patternId.slice(LOCAL_ID_PREFIX.length) : patternId;
}

function portionInput(portion: NutritionMealItem['portion']): NutritionPortionInput {
  const parsed = parseNutritionPortion(portion);
  if (parsed) {
    return toPortionInput(parsed);
  }
  return {
    amount: portion.amount,
    grams: portion.grams,
    kind: portion.kind,
    label: portion.label,
    unit: portion.unit,
  };
}
