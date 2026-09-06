import {z} from 'zod';
import type {Food, FoodRequest, FoodUpdateRequest} from '../../api/nutrition-foods.ts';
import {omitUndefined, toNullableText, toOptionalText} from '../../api/shared.ts';
import {numberFieldSchema} from '../../ui/number-field-value.ts';

const optionalNumber = numberFieldSchema(z.number().min(0, 'Use 0 or higher').optional());

export const foodFormSchema = z.object({
  serving_sizes: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Enter a serving label'),
        unit: z.string().trim().min(1, 'Enter a unit'),
        amount: numberFieldSchema(z.number().positive('Enter a positive amount')),
        weight_g: numberFieldSchema(z.number().positive('Enter a positive weight')),
        is_default: z.boolean(),
      }),
    )
    .refine(
      (sizes) => sizes.length === 0 || sizes.filter((size) => size.is_default).length === 1,
      'Choose one default serving',
    ),
  name: z.string().trim().min(1, 'Enter food name').max(255, 'Use 255 characters or fewer'),
  category: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
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
  serving_sizes: [],
  name: '',
  category: '',
  source: 'Custom',
  notes: '',
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

export function foodToCreateRequest(values: FoodFormValues): FoodRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    notes: toOptionalText(values.notes),
    media_id: values.media_id ?? undefined,
    calories_per_100g: values.calories_per_100g,
    protein_g_per_100g: values.protein_g,
    carbs_g_per_100g: values.carbs_g,
    fat_g_per_100g: values.fats_g,
    fiber_g_per_100g: values.fiber_g,
    sugar_g_per_100g: values.sugar_g,
    serving_sizes: values.serving_sizes,
  });
}

export function foodToUpdateRequest(values: FoodFormValues, expectedRevision: number): FoodUpdateRequest {
  return {
    expected_revision: expectedRevision,
    name: values.name,
    category: toNullableText(values.category),
    notes: toNullableText(values.notes),
    media_id: values.media_id ?? null,
    calories_per_100g: values.calories_per_100g ?? null,
    protein_g_per_100g: values.protein_g ?? null,
    carbs_g_per_100g: values.carbs_g ?? null,
    fat_g_per_100g: values.fats_g ?? null,
    fiber_g_per_100g: values.fiber_g ?? null,
    sugar_g_per_100g: values.sugar_g ?? null,
    serving_sizes: values.serving_sizes,
  };
}
