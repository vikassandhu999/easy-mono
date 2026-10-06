import type {Food, FoodCreate} from '../api/foods';
import {nutrientFields} from '../api/nutrition-values.ts';

export function fields(food?: Food) {
  return {
    name: food?.name ?? '',
    brand: food?.brand ?? '',
    category: food?.category ?? '',
    nutrients: Object.fromEntries(nutrientFields.map(([code]) => [code, String(food?.nutrients[code] ?? '')])),
    allergens: food?.allergens ?? [],
    dietary_tags: food?.dietary_tags ?? [],
    notes: food?.notes ?? '',
    media: food?.media ?? null,
    default_serving_id: food?.default_serving_id ?? '',
    servings: food?.servings.map((serving) => ({...serving, grams: String(serving.grams)})) ?? [],
  };
}
export function body(values: ReturnType<typeof fields>, food?: Food): FoodCreate {
  const nutrients = {...food?.nutrients};
  for (const [code] of nutrientFields) {
    const value = values.nutrients[code] ?? '';
    if (value.trim()) {
      nutrients[code] = Number(value);
    } else {
      delete nutrients[code];
    }
  }
  return {
    name: values.name.trim(),
    brand: values.brand.trim() || null,
    category: values.category.trim() || null,
    nutrients,
    allergens: values.allergens,
    dietary_tags: values.dietary_tags,
    notes: values.notes.trim() || null,
    ...((values.media?.id ?? null) !== (food?.media?.id ?? null) ? {media_id: values.media?.id ?? null} : {}),
    default_serving_id: values.default_serving_id || null,
    servings: values.servings.map((serving) => ({
      ...serving,
      label: serving.label.trim(),
      grams: Number(serving.grams),
    })),
  };
}
export type FoodFields = ReturnType<typeof fields>;
