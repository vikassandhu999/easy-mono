import assert from 'node:assert/strict';
import type {Food} from '../../src/api/foods.ts';
import {
  daysLabel,
  discardMealDraft,
  itemNutrients,
  mealBody,
  mealProblems,
  newItem,
  newMeal,
  newOption,
  nutrientLine,
  removeMealItem,
  removeMealOption,
  toBounds,
  toDraft,
  totalLine,
  uncertainSave,
  undoMealRemoval,
  unitsOf,
} from '../../src/nutrition-week/model.ts';

const oats: Food = {
  id: 'oats',
  name: 'Rolled oats',
  kind: 'food',
  basis: '100g',
  unit_label: null,
  nutrients: {energy_kcal: 400, protein_g: 10, carbs_g: 60, fat_g: 8},
  servings: [{label: 'cup', amount: 80}],
  inserted_at: '2026-10-12T00:00:00Z',
  updated_at: '2026-10-12T00:00:00Z',
};
const capsule: Food = {
  ...oats,
  id: 'capsule',
  name: 'Vitamin D',
  kind: 'supplement',
  basis: '1unit',
  unit_label: 'capsule',
  nutrients: {},
  servings: [],
};
const item = {...newItem(oats), amount: '0.5'};
assert.deepEqual(itemNutrients(item), {energy_kcal: 160, protein_g: 4, carbs_g: 24, fat_g: 3.2});
assert.equal(item.unit, 'cup');
assert.deepEqual(unitsOf(oats), [
  {value: 'g', label: 'g'},
  {value: 'cup', label: 'cup (80 g)'},
]);
assert.equal(newItem(capsule).unit, 'unit');
assert.equal(newItem(capsule).amount, '1');
assert.equal(nutrientLine(itemNutrients(newItem(capsule))), 'Nutrients not listed');
assert.equal(totalLine([item, newItem(capsule)]), '160 kcal · P 4 · C 24 · F 3 · incomplete');
assert.equal(totalLine([newItem(capsule)]), 'Nutrients not listed');
assert.deepEqual(itemNutrients({...item, amount: 'Infinity'}), {});
assert.deepEqual(itemNutrients({...item, unit: 'removed serving'}), {});
assert.equal(nutrientLine({energy_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0}), 'No calories');

const meal = newMeal();
assert.deepEqual(
  mealProblems(meal).map((problem) => problem.message),
  ['Add a name.', 'Add a food to option 1.'],
);
meal.name = ' Breakfast ';
meal.instructions = 'Cook slowly.';
meal.options[0].items.push(item);
assert.deepEqual(mealProblems(meal), []);
assert.deepEqual(mealBody(meal), {
  type: 'meal',
  name: 'Breakfast',
  instructions: 'Cook slowly.',
  options: [{name: null, items: [{food_id: 'oats', amount: 0.5, unit: 'cup'}]}],
});
const alternative = newOption();
meal.options.push(alternative);
assert.deepEqual(mealProblems(meal), [{key: alternative.id, message: 'Add a food to option 2.'}]);
alternative.items.push(newItem(capsule));
assert.deepEqual(mealProblems(meal), []);
assert.deepEqual(mealBody(meal).options?.[1]?.items, [{food_id: 'capsule', amount: 1, unit: 'unit'}]);
assert.notEqual(meal.options[0].id, alternative.id);

for (const bounds of [{min: 0}, {max: 160}, {min: 160, max: 160}, {min: 60, max: 80}]) {
  assert.deepEqual(toBounds(toDraft(bounds)), bounds);
}
assert.equal(toBounds({mode: 'range', min: '80', max: '60'}), 'From must not be above to');
assert.equal(toBounds({mode: 'range', min: '60', max: ''}), 'Enter both numbers');
assert.equal(toBounds({mode: 'min', min: '-1', max: ''}), 'Enter a number');
assert.equal(toBounds({mode: 'exact', min: 'Infinity', max: ''}), 'Enter a number');
assert.equal(toBounds({mode: 'exact', min: '', max: ''}), null);
assert.equal(toBounds({mode: 'range', min: '', max: ''}), null);
assert.equal(daysLabel(127), 'Every day');
assert.equal(daysLabel(31), 'Mon–Fri');
assert.equal(daysLabel(96), 'Sat–Sun');
assert.equal(daysLabel(67), 'Mon · Tue · Sun');

const first = {...newItem(oats), id: 'first', amount: '1'};
const second = {...newItem(oats), id: 'second', amount: '2'};
const editing = {
  id: 'meal',
  name: 'Breakfast',
  instructions: '',
  options: [{id: 'choice', name: '', items: [first, second]}],
};
const removed = removeMealItem(editing, 'choice', 'first');
const intervening = {
  ...removed.meal,
  name: 'Morning fuel',
  options: [{...removed.meal.options[0], name: 'Oats bowl', items: [{...second, amount: '3'}]}],
};
const restored = undoMealRemoval({...removed, meal: intervening});
assert.equal(restored.meal.name, 'Morning fuel');
assert.equal(restored.meal.options[0].name, 'Oats bowl');
assert.deepEqual(
  restored.meal.options[0].items.map(({id, amount}) => ({id, amount})),
  [
    {id: 'first', amount: '1'},
    {id: 'second', amount: '3'},
  ],
);
assert.equal(restored.removal, null);
const choices = {...editing, options: [...editing.options, {id: 'other', name: 'Toast', items: [second]}]};
const choiceRemoved = removeMealOption(choices, 'choice');
const choiceEdited = {
  ...choiceRemoved,
  meal: {
    ...choiceRemoved.meal,
    instructions: 'Prepare ahead.',
    options: [{...choiceRemoved.meal.options[0], name: 'Toast and milk'}],
  },
};
const choiceRestored = undoMealRemoval(choiceEdited);
assert.equal(choiceRestored.meal.instructions, 'Prepare ahead.');
assert.deepEqual(
  choiceRestored.meal.options.map((option) => option.name),
  ['', 'Toast and milk'],
);
const discarded = discardMealDraft(editing);
assert.deepEqual(undoMealRemoval(discarded).meal, editing);
assert.equal(undoMealRemoval(discarded).removal, null);
assert.equal(uncertainSave(undefined), true);
assert.equal(uncertainSave(0), true);
assert.equal(uncertainSave(500), true);
assert.equal(uncertainSave(503), true);
assert.equal(uncertainSave(422), false);
assert.equal(uncertainSave(409), false);
console.log(
  'Meal saves preserve choices and servings; target bounds reject invalid values; unknown nutrients remain incomplete.',
);
