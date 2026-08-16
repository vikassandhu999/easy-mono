import {
  RECIPE_FORM_DEFAULTS,
  type RecipeFormValues,
  recipeFormSchema,
  recipeToUpdateRequest,
} from './recipe-form-data.ts';

function parses(patch: Partial<RecipeFormValues>) {
  return recipeFormSchema.safeParse({...RECIPE_FORM_DEFAULTS, ...patch});
}

if (parses({name: '   '}).success) {
  throw new Error('recipe name must reject whitespace-only input');
}
if (!parses({name: 'x'.repeat(255)}).success) {
  throw new Error('recipe name must accept the API limit');
}
if (parses({name: 'x'.repeat(256)}).success) {
  throw new Error('recipe name must reject input beyond the API limit');
}

const trimmed = parses({name: '  Test Recipe  '});
if (!trimmed.success || trimmed.data.name !== 'Test Recipe') {
  throw new Error('recipe name must be normalized before submission');
}

if (parses({cooked_weight_g: 0}).success) {
  throw new Error('cooked weight must be positive when present');
}

const cleared = recipeToUpdateRequest({
  expectedRevision: 1,
  ingredients: [],
  values: {...RECIPE_FORM_DEFAULTS, name: 'Test Recipe'},
});
if (cleared.instructions !== null || cleared.cooked_weight_g !== null) {
  throw new Error('cleared recipe scalars must send null on update');
}
if (cleared.expected_revision !== 1) {
  throw new Error('update must send the observed revision');
}

console.log('recipe-form-data: all checks passed');
