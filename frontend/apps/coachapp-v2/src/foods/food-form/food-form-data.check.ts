import {
  FOOD_FORM_DEFAULTS,
  type FoodFormValues,
  foodFormSchema,
  foodToUpdateRequest,
  isFoodEditable,
} from './food-form-data.ts';

function parses(patch: Partial<FoodFormValues>) {
  return foodFormSchema.safeParse({...FOOD_FORM_DEFAULTS, ...patch});
}

if (parses({name: '   '}).success) {
  throw new Error('food name must reject whitespace-only input');
}
if (!parses({name: 'x'.repeat(255)}).success) {
  throw new Error('food name must accept the API limit');
}
if (parses({name: 'x'.repeat(256)}).success) {
  throw new Error('food name must reject input beyond the API limit');
}

const trimmed = parses({name: '  Test Food  '});
if (!trimmed.success || trimmed.data.name !== 'Test Food') {
  throw new Error('food name must be normalized before submission');
}

const cleared = foodToUpdateRequest({
  servingSizes: [],
  values: {
    ...FOOD_FORM_DEFAULTS,
    name: 'Test Food',
  },
});

for (const field of [
  'calories_per_100g',
  'carbs_g_per_100g',
  'category',
  'fat_g_per_100g',
  'fiber_g_per_100g',
  'image_url',
  'notes',
  'protein_g_per_100g',
  'sugar_g_per_100g',
] as const) {
  if (cleared[field] !== null) {
    throw new Error(`clearing ${field} must send null`);
  }
}
if (!Array.isArray(cleared.serving_sizes) || cleared.serving_sizes.length !== 0) {
  throw new Error('clearing every serving size must send an empty array');
}
if (!isFoodEditable('custom') || isFoodEditable('system') || isFoodEditable('imported')) {
  throw new Error('only custom foods may expose edit and delete actions');
}

console.log('food-form-data: all checks passed');
