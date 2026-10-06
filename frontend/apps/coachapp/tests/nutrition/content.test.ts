import assert from 'node:assert/strict';
import {test} from 'node:test';
import {targetLabel} from '../../src/api/nutrition-values.ts';
import {body, fields} from '../../src/foods/food.ts';
import {emptyContent, newMeal, removeMeal, removePattern} from '../../src/nutrition-plans/menu.ts';
import {body as recipeBody, fields as recipeFields} from '../../src/recipes/recipe.ts';

test('saving a food keeps unknown nutrients absent and known zero values explicit', () => {
  const draft = fields();
  draft.name = 'Oats';
  draft.nutrients.energy_kcal = '400';
  draft.nutrients.sugar_g = '0';
  draft.nutrients.fiber_g = '';
  draft.servings = [{id: 'bowl-identity', label: 'Large bowl', grams: '50'}];
  draft.default_serving_id = 'bowl-identity';
  const saved = body(draft);
  assert.deepEqual(saved.nutrients, {energy_kcal: 400, sugar_g: 0});
  assert.deepEqual(saved.servings, [{id: 'bowl-identity', label: 'Large bowl', grams: 50}]);
  assert.equal(saved.default_serving_id, 'bowl-identity');
});

test('recipe save preserves serving identity and entered quantity', () => {
  const draft = recipeFields();
  draft.name = 'Breakfast';
  draft.servings_count = '2';
  draft.ingredients = [
    {food: null, food_id: 'food', portion: {type: 'serving', serving_id: 'bowl-identity', amount: 1}, amount: '2.5'},
  ];
  assert.deepEqual(recipeBody(draft).ingredients, [
    {food_id: 'food', portion: {type: 'serving', serving_id: 'bowl-identity', amount: 2.5}},
  ]);
});

test('removing a meal removes all offered references and preserves other meals and slots', () => {
  const content = emptyContent();
  const first = newMeal('First');
  const second = newMeal('Second');
  content.meals = [first, second];
  content.day_patterns[0].slots = [{id: 'custom-slot', name: 'Morning fuel', meal_ids: [first.id, second.id]}];
  const result = removeMeal(content, first.id);
  assert.deepEqual(
    result.meals.map((meal) => meal.name),
    ['Second'],
  );
  assert.deepEqual(result.day_patterns[0].slots, [{id: 'custom-slot', name: 'Morning fuel', meal_ids: [second.id]}]);
  assert.equal(content.meals.length, 2);
});

test('replacing a pattern keeps schedule entry identity and leaves meal prescriptions intact', () => {
  const content = emptyContent();
  const original = content.day_patterns[0];
  content.day_patterns.push({id: 'rest', name: 'Rest day', targets: {energy_kcal: {min: 1800, max: 1800}}, slots: []});
  const scheduleIds = content.schedule.entries.map((entry) => entry.id);
  const result = removePattern(content, original.id, 'rest');
  assert.deepEqual(
    result.day_patterns.map((pattern) => pattern.name),
    ['Rest day'],
  );
  assert.deepEqual(
    result.schedule.entries.map((entry) => entry.id),
    scheduleIds,
  );
  assert.deepEqual(
    result.schedule.entries.map((entry) => entry.ref),
    ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'],
  );
  assert.deepEqual(result.day_patterns[0].targets, {energy_kcal: {min: 1800, max: 1800}});
});

test('target text distinguishes unset, zero, exact, range and minimum-only values', () => {
  assert.equal(targetLabel(undefined, 'g'), 'Not set');
  assert.equal(targetLabel({min: 0, max: 0}, 'g'), '0 g');
  assert.equal(targetLabel({min: 100, max: 120}, 'g'), '100–120 g');
  assert.equal(targetLabel({min: 100}, 'g'), 'At least 100 g');
});
