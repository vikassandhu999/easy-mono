import {z} from 'zod';

import {numberFieldSchema} from '../../@components/form-fields/number-field-value.ts';
import type {Food, FoodRequest, FoodServingSize, FoodUpdateRequest} from '../../api/nutrition-foods';
import {omitUndefined, type ServingSize, toNullableText, toOptionalText} from '../../api/shared.ts';

const optionalNumber = numberFieldSchema(z.number().min(0, 'Use 0 or higher').optional());

export const foodFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter food name').max(255, 'Use 255 characters or fewer'),
  category: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  image_url: z.string().optional(),
  media_id: z.string().nullable().optional(),
  calories_per_100g: optionalNumber,
  protein_g: optionalNumber,
  carbs_g: optionalNumber,
  fats_g: optionalNumber,
  fiber_g: optionalNumber,
  sugar_g: optionalNumber,
});

export type FoodFormValues = z.infer<typeof foodFormSchema>;

export const FOOD_FORM_DEFAULTS: FoodFormValues = {
  name: '',
  category: '',
  source: 'Custom',
  notes: '',
  image_url: '',
  media_id: null,
  calories_per_100g: undefined,
  protein_g: undefined,
  carbs_g: undefined,
  fats_g: undefined,
  fiber_g: undefined,
  sugar_g: undefined,
};

export function isFoodEditable(source: Food['source']): boolean {
  return source === 'custom';
}

function toFoodServingSizes(sizes: ServingSize[]): FoodServingSize[] {
  return sizes.map((s) => ({
    unit: s.unit,
    amount: s.amount ?? 1,
    weight_g: s.weight_g ?? 0,
    is_default: false,
    label: s.unit,
  }));
}

export function foodToCreateRequest({
  servingSizes,
  values,
}: {
  servingSizes: ServingSize[];
  values: FoodFormValues;
}): FoodRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    notes: toOptionalText(values.notes),
    image_url: toOptionalText(values.image_url),
    media_id: values.media_id ?? undefined,
    calories_per_100g: values.calories_per_100g,
    protein_g_per_100g: values.protein_g,
    carbs_g_per_100g: values.carbs_g,
    fat_g_per_100g: values.fats_g,
    fiber_g_per_100g: values.fiber_g,
    sugar_g_per_100g: values.sugar_g,
    serving_sizes: servingSizes.length > 0 ? toFoodServingSizes(servingSizes) : undefined,
  });
}

export function foodToUpdateRequest({
  servingSizes,
  values,
}: {
  servingSizes: ServingSize[];
  values: FoodFormValues;
}): FoodUpdateRequest {
  return {
    name: values.name,
    category: toNullableText(values.category),
    notes: toNullableText(values.notes),
    image_url: toNullableText(values.image_url),
    media_id: values.media_id ?? null,
    calories_per_100g: values.calories_per_100g ?? null,
    protein_g_per_100g: values.protein_g ?? null,
    carbs_g_per_100g: values.carbs_g ?? null,
    fat_g_per_100g: values.fats_g ?? null,
    fiber_g_per_100g: values.fiber_g ?? null,
    sugar_g_per_100g: values.sugar_g ?? null,
    serving_sizes: toFoodServingSizes(servingSizes),
  };
}
