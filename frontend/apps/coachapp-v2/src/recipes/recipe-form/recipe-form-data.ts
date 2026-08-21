import {z} from 'zod';

import {numberFieldSchema} from '../../@components/form-fields/number-field-value.ts';
import type {
  RecipeIngredient,
  RecipeIngredientRequest,
  RecipeRequest,
  RecipeUpdateRequest,
} from '../../api/nutrition-foods';
import {omitUndefined, toNullableText, toOptionalNumber, toOptionalText} from '../../api/shared.ts';
import type {IngredientItem} from '../lib/recipe-math.ts';

const optionalPositiveNumber = numberFieldSchema(z.number().gt(0, 'Use a positive amount').optional());

export const recipeFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter recipe name').max(255, 'Use 255 characters or fewer'),
  instructions: z.string().optional(),
  servings_count: numberFieldSchema(z.number().int().min(1, 'Enter at least 1 serving')),
  cooked_weight_g: optionalPositiveNumber,
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export const RECIPE_FORM_DEFAULTS: RecipeFormValues = {
  name: '',
  instructions: '',
  servings_count: 1,
  cooked_weight_g: undefined,
};

export function recipeIngredientsToDrafts(ingredients: RecipeIngredient[]): IngredientItem[] {
  return ingredients
    .filter(
      (ingredient): ingredient is RecipeIngredient & {food: NonNullable<RecipeIngredient['food']>} =>
        ingredient.food != null,
    )
    .map((ingredient) => ({
      food: ingredient.food,
      food_id: ingredient.food_id,
      amount: ingredient.amount ?? '',
      unit: ingredient.unit ?? '',
      weight_g: ingredient.weight_g ?? '',
    }));
}

function recipeIngredientDraftToApi(item: IngredientItem): RecipeIngredientRequest {
  return omitUndefined({
    food_id: item.food_id,
    unit: toOptionalText(item.unit),
    amount: toOptionalNumber(item.amount),
    weight_g: toOptionalNumber(item.weight_g),
  }) as RecipeIngredientRequest;
}

export function recipeToFormValues(recipe: {
  name: string;
  instructions: string | null;
  servings_count: number;
  cooked_weight_g: number | null;
}): RecipeFormValues {
  return {
    name: recipe.name,
    instructions: recipe.instructions ?? '',
    servings_count: recipe.servings_count,
    cooked_weight_g: recipe.cooked_weight_g ?? undefined,
  };
}

type RecipeRequestArgs = {
  ingredients: IngredientItem[];
  values: RecipeFormValues;
};

export function recipeToCreateRequest({ingredients, values}: RecipeRequestArgs): RecipeRequest {
  return omitUndefined({
    name: values.name,
    instructions: toOptionalText(values.instructions),
    servings_count: values.servings_count,
    cooked_weight_g: values.cooked_weight_g,
    recipe_ingredients: ingredients.map(recipeIngredientDraftToApi),
  }) as RecipeRequest;
}

export function recipeToUpdateRequest({
  expectedRevision,
  ingredients,
  values,
}: RecipeRequestArgs & {expectedRevision: number}): RecipeUpdateRequest {
  return {
    expected_revision: expectedRevision,
    name: values.name,
    instructions: toNullableText(values.instructions),
    servings_count: values.servings_count,
    cooked_weight_g: values.cooked_weight_g ?? null,
    recipe_ingredients: ingredients.map(recipeIngredientDraftToApi),
  };
}
