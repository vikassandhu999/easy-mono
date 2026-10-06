import type {Food} from '../api/foods';
import type {NutritionPortion} from '../api/nutrition-plans';
import type {Recipe, RecipeCreate} from '../api/recipes';

export function ingredientDraft(food: Food | null, foodId: string, portion: NutritionPortion) {
  return {food, food_id: foodId, portion, amount: String(portion.type === 'grams' ? portion.grams : portion.amount)};
}
export function fields(recipe?: Recipe) {
  return {
    name: recipe?.name ?? '',
    servings_count: String(recipe?.servings_count ?? 1),
    cooked_weight_g: String(recipe?.cooked_weight_g ?? ''),
    description: recipe?.description ?? '',
    instructions: recipe?.instructions ?? '',
    allergens: recipe?.allergens ?? [],
    dietary_tags: recipe?.dietary_tags ?? [],
    ingredients: recipe?.ingredients.map((item) => ingredientDraft(null, item.food_id, item.portion)) ?? [],
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
    allergens: values.allergens,
    dietary_tags: values.dietary_tags,
    ingredients: values.ingredients.map(({food_id, portion, amount}) => ({
      food_id,
      portion: portion.type === 'grams' ? {type: 'grams', grams: Number(amount)} : {...portion, amount: Number(amount)},
    })),
  };
}
export function positive(value: unknown) {
  return (
    (String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0) || 'Enter a positive quantity.'
  );
}
