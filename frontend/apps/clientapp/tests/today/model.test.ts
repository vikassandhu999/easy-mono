import assert from 'node:assert/strict';
import type {NutritionLog as ApiNutritionLog} from '../../src/api/nutrition-logs.ts';
import {
  asNutritionLog,
  mealSeed,
  parseAmount,
  parseMealDraft,
  totalOf,
  valuesLine,
  weekOf,
} from '../../src/today/model.ts';

assert.equal(parseAmount('1,5'), 1.5);
assert.equal(parseAmount(' 1.5 '), 1.5);
for (const input of ['', '0', '-1', '1e2', '0x10', '1,2,3', 'Infinity', '1/2']) {
  assert.equal(parseAmount(input), null, `Reject ${input}`);
}
const recorded: ApiNutritionLog = {
  id: 'occasion',
  type: 'meal',
  logged_on: '2026-10-12',
  logged_at: '08:20',
  recorded_by: 'client',
  nutrition_schedule_id: 'breakfast',
  scheduled_date: '2026-10-12',
  nutrition_preset_id: 'preset',
  meal_option_id: 'option',
  food_logs: [
    {
      id: 'food-row',
      meal_item_id: 'planned',
      food_id: 'oats',
      name: 'Rolled oats at save',
      kind: 'food',
      basis: '100g',
      unit_label: null,
      servings: [{label: 'cup', amount: 80}],
      amount: 1,
      unit: 'cup',
      nutrients: {energy_kcal: 400, protein_g: 10, carbs_g: 60, fat_g: 5},
    },
  ],
};
const reopened = asNutritionLog(recorded);
const draft = mealSeed('2026-10-12', 'breakfast', null, null, reopened, '2026-10-13');
assert.equal(draft.items[0]?.input, '1');
assert.equal(draft.items[0]?.food.name, 'Rolled oats at save');
assert.equal(draft.optionId, 'option');
const original = draft.items[0];
assert.ok(original);
const correction = {...original, input: '1,5', amount: parseAmount('1,5') ?? 0};
assert.deepEqual(
  totalOf([correction]),
  {values: {energy_kcal: 480, protein_g: 12, carbs_g: 72, fat_g: 6}, incomplete: false, empty: false},
  'Corrections calculate from copied serving and nutrients',
);
const unknown = {...correction, food: {...correction.food, nutrients: {}}};
assert.equal(valuesLine(totalOf([unknown])), 'Nutrients not listed');
assert.equal(valuesLine(totalOf([correction, unknown])), '480 kcal · P 12 · C 72 · F 6 · incomplete');
assert.equal(totalOf([]).empty, true, 'No records remains distinct from known zero intake');
const savedDraft = parseMealDraft(JSON.parse(JSON.stringify({...draft, items: [correction], changed: true})));
assert.equal(savedDraft?.items[0]?.input, '1,5', 'Device recovery retains decimal text');
assert.equal(savedDraft?.changed, true);
assert.equal(
  parseMealDraft({...draft, items: [{...correction, input: 1.5}]}),
  null,
  'A corrupted input never opens as a valid draft',
);
assert.deepEqual(weekOf('2026-10-13'), [
  '2026-10-12',
  '2026-10-13',
  '2026-10-14',
  '2026-10-15',
  '2026-10-16',
  '2026-10-17',
  '2026-10-18',
]);
console.log('Nutrition behavior preserves copied foods, drafts and totals.');
