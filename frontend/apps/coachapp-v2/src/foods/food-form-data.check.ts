import {
  editorServingSizesFromFood,
  FOOD_FORM_DEFAULTS,
  type FoodFormValues,
  foodFormSchema,
  foodToCreateRequest,
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
  expectedRevision: 1,
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
if (cleared.expected_revision !== 1) {
  throw new Error('update must send the observed revision');
}
if (!Array.isArray(cleared.serving_sizes) || cleared.serving_sizes.length !== 0) {
  throw new Error('clearing every serving size must send an empty array');
}

const withServings = foodToCreateRequest({
  servingSizes: [
    {amount: 1, unit: 'cup', weight_g: 100},
    {amount: 2, unit: 'tbsp', weight_g: 30},
  ],
  values: {...FOOD_FORM_DEFAULTS, name: 'Test Food'},
});
if (withServings.serving_sizes?.[0]?.is_default !== true || withServings.serving_sizes?.[1]?.is_default !== false) {
  throw new Error('a nonempty serving-size collection must mark exactly the first size as default');
}

const defaultSecond = editorServingSizesFromFood([
  {amount: 1, is_default: false, label: 'cup', unit: 'cup', weight_g: 100},
  {amount: 1, is_default: true, label: 'scoop', unit: 'scoop', weight_g: 30},
]);
if (defaultSecond[0]?.unit !== 'scoop') {
  throw new Error('the editor must keep the default serving first');
}
const rewritten = foodToUpdateRequest({
  expectedRevision: 1,
  servingSizes: defaultSecond,
  values: {...FOOD_FORM_DEFAULTS, name: 'Test Food'},
});
if (rewritten.serving_sizes?.[0]?.unit !== 'scoop' || rewritten.serving_sizes?.[0]?.is_default !== true) {
  throw new Error('saving must keep the observed default serving');
}

if (!isFoodEditable('custom') || isFoodEditable('system') || isFoodEditable('imported')) {
  throw new Error('only custom foods may expose edit and delete actions');
}

console.log('food-form-data: all checks passed');
