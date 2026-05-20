import type {Food} from '@/api/foods';
import {foodFromApi} from '@/api/mappers/foods';
import {recipeFromApi} from '@/api/mappers/recipes';
import type {
  Meal,
  MealCreateRequest,
  MealItem,
  MealItemCreateRequest,
  MealItemUpdateRequest,
  MealUpdateRequest,
} from '@/api/meals';
import type {Recipe} from '@/api/recipes';
import type {ServingSize} from '@/api/shared';

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function toOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export type MealItemDraftValues = {
  amount?: number;
  unit?: string;
  weight_g?: number;
};

export type SelectedMealItem = {kind: 'food'; food: Food} | {kind: 'recipe'; recipe: Recipe};

export function mealItemFromApi(item: MealItem): MealItem {
  return {
    ...item,
    food: item.food ? foodFromApi(item.food) : null,
    recipe: item.recipe ? recipeFromApi(item.recipe) : null,
  };
}

export function mealFromApi(meal: Meal): Meal {
  return {
    ...meal,
    meal_items: meal.meal_items.map(mealItemFromApi),
  };
}

export function mealItemToCreateRequest({
  selectedItem,
  values,
}: {
  selectedItem: SelectedMealItem;
  values: MealItemDraftValues;
}): MealItemCreateRequest {
  return omitUndefined({
    ...(selectedItem.kind === 'food' ? {food_id: selectedItem.food.id} : {recipe_id: selectedItem.recipe.id}),
    amount: values.amount,
    unit: toOptionalText(values.unit),
    weight_g: values.weight_g,
  });
}

export function mealItemToUpdateRequest(values: MealItemDraftValues): MealItemUpdateRequest {
  return omitUndefined({
    amount: values.amount,
    unit: toOptionalText(values.unit),
    weight_g: values.weight_g,
  });
}

export function getSelectedMealItemName(selectedItem: null | SelectedMealItem): string {
  if (!selectedItem) {
    return '';
  }
  return selectedItem.kind === 'food' ? selectedItem.food.name : selectedItem.recipe.name;
}

export function getSelectedMealItemServingSizes(selectedItem: null | SelectedMealItem): ServingSize[] {
  if (!selectedItem) {
    return [];
  }
  return selectedItem.kind === 'food'
    ? (selectedItem.food.serving_sizes ?? [])
    : (selectedItem.recipe.serving_sizes ?? []);
}

export function mealToCreateRequest(name: string, position?: number): MealCreateRequest {
  return omitUndefined({name: name.trim(), position});
}

export function mealToUpdateRequest(name: string): MealUpdateRequest {
  return {name: name.trim()};
}
