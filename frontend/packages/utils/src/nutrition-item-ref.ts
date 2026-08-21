export type NutritionItemRef = {food_id: string; kind: 'food'} | {kind: 'recipe'; recipe_id: string};

export function toItemInput(ref: NutritionItemRef): {
  food_id?: string;
  kind: 'food' | 'recipe';
  recipe_id?: string;
} {
  switch (ref.kind) {
    case 'food':
      return {food_id: ref.food_id, kind: 'food', recipe_id: undefined};
    case 'recipe':
      return {food_id: undefined, kind: 'recipe', recipe_id: ref.recipe_id};
    default: {
      const _exhaustive: never = ref;
      return _exhaustive;
    }
  }
}

export function pickedToItemRef(picked: {id: string; kind: 'food' | 'recipe'}): NutritionItemRef {
  return picked.kind === 'food' ? {food_id: picked.id, kind: 'food'} : {kind: 'recipe', recipe_id: picked.id};
}
