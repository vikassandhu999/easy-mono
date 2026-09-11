import type {Food} from '../api/foods';
import type {Recipe, RecipeCreate} from '../api/recipes';
import type {NutritionPortion} from '../api/schema';

export function ingredientDraft(food: Food | null, foodId: string, portion: NutritionPortion) {
  return {food, food_id: foodId, portion, amount: String(portion.kind === 'gram' ? portion.grams : portion.amount)};
}
export function fields(recipe?: Recipe) {
  return {
    name: recipe?.name ?? '',
    servings_count: String(recipe?.servings_count ?? 1),
    cooked_weight_g: String(recipe?.cooked_weight_g ?? ''),
    description: recipe?.description ?? '',
    instructions: recipe?.instructions ?? '',
    ingredients: recipe?.recipe_ingredients.map((item) => ingredientDraft(item.food, item.food_id, item.portion)) ?? [],
  };
}
export type RecipeFields = ReturnType<typeof fields>;
export function body(values: RecipeFields): RecipeCreate {
  return {
    name: values.name.trim(),
    servings_count: Number(values.servings_count),
    cooked_weight_g: values.cooked_weight_g.trim() ? Number(values.cooked_weight_g) : null,
    description: values.description.trim() || null,
    instructions: values.instructions.trim() || null,
    recipe_ingredients: values.ingredients.map(({food_id, portion, amount}) => ({
      food_id,
      portion: portion.kind === 'gram' ? {kind: 'gram', grams: Number(amount)} : {...portion, amount: Number(amount)},
    })),
  };
}
export function positive(value: unknown) {
  return (
    (String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0) || 'Enter a positive quantity.'
  );
}
