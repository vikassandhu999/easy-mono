import {z} from 'zod';
import type {Food, Recipe, RecipeRequest, RecipeUpdateRequest} from '../../api/nutrition-foods.ts';
import {omitUndefined, toNullableText, toOptionalText} from '../../api/shared.ts';
import {numberFieldSchema} from '../../ui/number-field-value.ts';

const positiveNumber = numberFieldSchema(z.number().gt(0, 'Enter a positive amount'));
const optionalPositiveNumber = numberFieldSchema(z.number().gt(0, 'Enter a positive amount').optional());

export const recipeFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter recipe name').max(255, 'Use 255 characters or fewer'),
  instructions: z.string().optional(),
  servings_count: numberFieldSchema(z.number().int().min(1, 'Enter at least 1 serving')),
  cooked_weight_g: optionalPositiveNumber,
  recipe_ingredients: z
    .array(
      z.object({
        food_id: z.string(),
        food: z.custom<Food | null>(),
        portion: z.discriminatedUnion('kind', [
          z.object({kind: z.literal('gram'), grams: positiveNumber}),
          z.object({
            kind: z.literal('serving'),
            amount: positiveNumber,
            unit: z.string().min(1),
            label: z.string().nullable(),
          }),
        ]),
      }),
    )
    .min(1, 'Add at least one ingredient'),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export const RECIPE_FORM_DEFAULTS: RecipeFormValues = {
  name: '',
  instructions: '',
  servings_count: 1,
  cooked_weight_g: undefined,
  recipe_ingredients: [],
};

export function recipeToFormValues(recipe: Recipe): RecipeFormValues {
  return {
    name: recipe.name,
    instructions: recipe.instructions ?? '',
    servings_count: recipe.servings_count,
    cooked_weight_g: recipe.cooked_weight_g ?? undefined,
    recipe_ingredients: recipe.recipe_ingredients.map((item) => ({
      food_id: item.food_id,
      food: item.food,
      portion:
        item.portion.kind === 'gram'
          ? {kind: 'gram', grams: item.portion.grams ?? 0}
          : {
              kind: 'serving',
              amount: item.portion.amount ?? 0,
              unit: item.portion.unit ?? '',
              label: item.portion.label,
            },
    })),
  };
}

export function recipeToCreateRequest(values: RecipeFormValues): RecipeRequest {
  return omitUndefined({
    name: values.name,
    instructions: toOptionalText(values.instructions),
    servings_count: values.servings_count,
    cooked_weight_g: values.cooked_weight_g,
    recipe_ingredients: values.recipe_ingredients.map((item) =>
      omitUndefined({
        food_id: item.food_id,
        portion: item.portion,
      }),
    ),
  });
}

export function recipeToUpdateRequest(values: RecipeFormValues, expectedRevision: number): RecipeUpdateRequest {
  return {
    ...recipeToCreateRequest(values),
    expected_revision: expectedRevision,
    instructions: toNullableText(values.instructions),
    cooked_weight_g: values.cooked_weight_g ?? null,
  };
}
