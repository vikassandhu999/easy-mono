import {normalizeMacros} from '@easy/utils';
import {foodFromApi} from '@/api/mappers/foods';
import {omitUndefined, toOptionalText} from '@/api/mappers/shared';
import type {
  Recipe,
  RecipeCreateRequest,
  RecipeIngredient,
  RecipeIngredientInput,
  RecipeUpdateRequest,
} from '@/api/recipes';
import type {Macros} from '@/api/shared';
import type {IngredientItem} from '@/foods/components/ingredient-list';
import type {RecipeFormValues} from '@/recipes/recipe-form/recipe-form';

const RECIPE_MACRO_KEYS = ['calories_per_100g', 'protein_g', 'carbs_g', 'fats_g', 'fiber_g', 'sugar_g'] as const;

function toOptionalNumber(value: number | string): number | undefined {
  if (value === '' || value == null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalMacros(values: RecipeFormValues): Macros | undefined {
  const macros = RECIPE_MACRO_KEYS.reduce<Macros>((result, key) => {
    const value = values[key];
    if (value !== undefined) {
      result[key] = value;
    }
    return result;
  }, {});

  return Object.keys(macros).length > 0 ? macros : undefined;
}

export function recipeIngredientToDraft(ingredient: RecipeIngredient): IngredientItem {
  return {
    food: ingredient.food,
    food_id: ingredient.food_id,
    amount: ingredient.amount ?? '',
    unit: ingredient.unit ?? '',
    weight_g: ingredient.weight_g ?? '',
  };
}

export function recipeIngredientsToDrafts(ingredients: RecipeIngredient[]): IngredientItem[] {
  return ingredients.map(recipeIngredientToDraft);
}

export function recipeIngredientDraftToApi(item: IngredientItem): RecipeIngredientInput {
  return omitUndefined({
    food_id: item.food_id,
    unit: toOptionalText(item.unit),
    amount: toOptionalNumber(item.amount),
    weight_g: toOptionalNumber(item.weight_g),
  });
}

function toOptionalRecipeIngredients(items: IngredientItem[]): RecipeIngredientInput[] | undefined {
  return items.length > 0 ? items.map(recipeIngredientDraftToApi) : undefined;
}

export function recipeFromApi(recipe: Recipe): Recipe {
  return {
    ...recipe,
    macros: normalizeMacros(recipe.macros),
    foods: recipe.foods.map(foodFromApi),
    recipe_ingredients: recipe.recipe_ingredients.map((ingredient) => ({
      ...ingredient,
      food: foodFromApi(ingredient.food),
    })),
  };
}

export function recipeToFormValues(recipe: Recipe): RecipeFormValues {
  return {
    name: recipe.name,
    category: recipe.category ?? '',
    source: recipe.source ?? '',
    instructions: recipe.instructions ?? '',
    cooked_weight_g: recipe.cooked_weight_g ?? undefined,
    calories_per_100g: recipe.macros.calories_per_100g,
    protein_g: recipe.macros.protein_g,
    carbs_g: recipe.macros.carbs_g,
    fats_g: recipe.macros.fats_g,
    fiber_g: recipe.macros.fiber_g,
    sugar_g: recipe.macros.sugar_g,
  };
}

export function recipeToCreateRequest({
  ingredients,
  values,
}: {
  ingredients: IngredientItem[];
  values: RecipeFormValues;
}): RecipeCreateRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source),
    instructions: toOptionalText(values.instructions),
    cooked_weight_g: values.cooked_weight_g,
    macros: toOptionalMacros(values),
    recipe_ingredients: toOptionalRecipeIngredients(ingredients),
  });
}

export function recipeToUpdateRequest({
  ingredients,
  values,
}: {
  ingredients: IngredientItem[];
  values: RecipeFormValues;
}): RecipeUpdateRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source),
    instructions: toOptionalText(values.instructions),
    cooked_weight_g: values.cooked_weight_g,
    macros: toOptionalMacros(values),
    recipe_ingredients: ingredients.map(recipeIngredientDraftToApi),
  });
}
