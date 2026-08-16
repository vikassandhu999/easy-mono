import type {components} from '@/api/schema';

export type NutritionMenuReplaceRequest = components['schemas']['NutritionMenuReplaceRequest'];
export type NutritionMealItemInput = components['schemas']['NutritionMealItemInput'];
export type NutritionPortionInput = components['schemas']['NutritionPortionInput'];

type NutritionPlan = components['schemas']['NutritionPlan'];
type NutritionMeal = components['schemas']['NutritionMeal'];
type NutritionMealItem = components['schemas']['NutritionMealItem'];

const LOCAL_ID_PREFIX = 'local:';

export function createLocalNodeId(kind: 'meal' | 'item'): string {
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

export function planToMenuRequest(plan: NutritionPlan): NutritionMenuReplaceRequest {
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
    portion: {
      kind: draft.portion.kind,
      grams: draft.portion.grams ?? null,
      amount: draft.portion.amount ?? null,
      unit: draft.portion.unit ?? null,
      label: draft.portion.label ?? null,
    },
    nutrients: emptyNutrients,
    nutrition_meal_id: mealId,
    inserted_at: timestamp,
    updated_at: timestamp,
  };
}

function identity(id: string): {id: string} | {local_ref: string} {
  return isLocalNodeId(id) ? {local_ref: id.slice(LOCAL_ID_PREFIX.length)} : {id};
}

function portionInput(portion: NutritionMealItem['portion']): NutritionPortionInput {
  return {
    kind: portion.kind,
    grams: portion.grams,
    amount: portion.amount,
    unit: portion.unit,
    label: portion.label,
  };
}
