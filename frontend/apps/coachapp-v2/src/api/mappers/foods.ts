import {normalizeMacros} from '@easy/utils';
import type {Food, FoodCreateRequest, FoodUpdateRequest} from '@/api/foods';
import {omitUndefined, toOptionalText} from '@/api/mappers/shared';
import type {Macros, ServingSize} from '@/api/shared';
import type {FoodFormValues} from '@/foods/food-form';

const FOOD_MACRO_KEYS = ['calories_per_100g', 'protein_g', 'carbs_g', 'fats_g', 'fiber_g', 'sugar_g'] as const;

function toOptionalMacros(values: FoodFormValues): Macros | undefined {
  const macros = FOOD_MACRO_KEYS.reduce<Macros>((result, key) => {
    const value = values[key];
    if (value !== undefined) {
      result[key] = value;
    }
    return result;
  }, {});

  return Object.keys(macros).length > 0 ? macros : undefined;
}

function toOptionalServingSizes(servingSizes: ServingSize[]): ServingSize[] | undefined {
  return servingSizes.length > 0 ? servingSizes : undefined;
}

export function foodFromApi(food: Food): Food {
  return {
    ...food,
    macros: normalizeMacros(food.macros),
  };
}

export function foodToFormValues(food: Food): FoodFormValues {
  return {
    name: food.name,
    category: food.category ?? '',
    source: food.source ?? '',
    notes: food.notes ?? '',
    calories_per_100g: food.macros.calories_per_100g,
    protein_g: food.macros.protein_g,
    carbs_g: food.macros.carbs_g,
    fats_g: food.macros.fats_g,
    fiber_g: food.macros.fiber_g,
    sugar_g: food.macros.sugar_g,
  };
}

export function foodToDuplicateFormValues(food: Food): FoodFormValues {
  return {
    ...foodToFormValues(food),
    name: `${food.name} (copy)`,
    source: '',
  };
}

export function foodToCreateRequest({
  servingSizes,
  values,
}: {
  servingSizes: ServingSize[];
  values: FoodFormValues;
}): FoodCreateRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source),
    notes: toOptionalText(values.notes),
    macros: toOptionalMacros(values),
    serving_sizes: toOptionalServingSizes(servingSizes),
  });
}

export function foodToUpdateRequest({
  servingSizes,
  values,
}: {
  servingSizes: ServingSize[];
  values: FoodFormValues;
}): FoodUpdateRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source),
    notes: toOptionalText(values.notes),
    macros: toOptionalMacros(values),
    serving_sizes: servingSizes,
  });
}
