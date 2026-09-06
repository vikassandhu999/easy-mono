import {
  NUTRITION_PLAN_FORM_DEFAULTS,
  type NutritionPlanFormValues,
  nutritionPlanFormSchema,
  nutritionPlanToUpdateRequest,
} from '../../src/library/nutrition-plans/nutrition-plan-form-data.ts';

function parses(patch: Partial<NutritionPlanFormValues>) {
  return nutritionPlanFormSchema.safeParse({...NUTRITION_PLAN_FORM_DEFAULTS, ...patch});
}

if (parses({name: '   '}).success) {
  throw new Error('nutrition plan name must reject whitespace-only input');
}
if (!parses({name: 'x'.repeat(255)}).success || parses({name: 'x'.repeat(256)}).success) {
  throw new Error('nutrition plan name must enforce the API limit');
}

const trimmed = parses({name: '  Test Plan  '});
if (!trimmed.success || trimmed.data.name !== 'Test Plan') {
  throw new Error('nutrition plan name must be normalized before submission');
}

const cleared = nutritionPlanToUpdateRequest({...NUTRITION_PLAN_FORM_DEFAULTS, name: 'Test Plan'}, 3);
for (const field of [
  'description',
  'target_calories',
  'target_protein_g',
  'target_carbs_g',
  'target_fat_g',
  'target_fiber_g',
] as const) {
  if (cleared[field] !== null) {
    throw new Error(`clearing ${field} must send null`);
  }
}
if (cleared.expected_revision !== 3) {
  throw new Error('Template metadata updates must send the observed revision');
}

console.log('nutrition-plan-form-data: all checks passed');

const dated = nutritionPlanToUpdateRequest(
  {...NUTRITION_PLAN_FORM_DEFAULTS, name: 'Client plan', coverage: {start_date: '2026-09-05', end_date: null}},
  4,
);
if (dated.start_date !== '2026-09-05' || dated.end_date !== null) {
  throw new Error('Client plan details must save and clear coverage dates');
}
if (parses({name: 'Client plan', coverage: {start_date: '2026-09-06', end_date: '2026-09-05'}}).success) {
  throw new Error('Coverage cannot end before it starts');
}
