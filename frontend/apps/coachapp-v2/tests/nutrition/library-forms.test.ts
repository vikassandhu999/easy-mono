import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FOOD_FORM_DEFAULTS, foodFormSchema, foodToUpdateRequest} from '../../src/library/foods/food-form-data.ts';
import {
  RECIPE_FORM_DEFAULTS,
  recipeFormSchema,
  recipeToUpdateRequest,
} from '../../src/library/recipes/recipe-form-data.ts';

test('editing a food preserves serving labels, order and a default that is not the first row', () => {
  const sizes = [
    {label: 'Small scoop', unit: 'scoop', amount: 1, weight_g: 15, is_default: false},
    {label: 'Heaped scoop', unit: 'scoop', amount: 1, weight_g: 30, is_default: true},
  ];
  const values = foodFormSchema.parse({...FOOD_FORM_DEFAULTS, name: 'Renamed food', serving_sizes: sizes});
  const body = foodToUpdateRequest(values, 7);
  assert.equal(body.expected_revision, 7);
  assert.deepEqual(body.serving_sizes, sizes);
  assert.equal(body.notes, null);
  assert.equal(foodFormSchema.safeParse({...values, serving_sizes: [{...sizes[0], weight_g: 0}]}).success, false);
});

test('one recipe validation covers details and every ingredient before a complete save', () => {
  const ingredients = [
    {food_id: 'oats', food: null, portion: {kind: 'gram', grams: 75}},
    {food_id: 'milk', food: null, portion: {kind: 'serving', amount: 1, unit: 'cup', label: 'Cup'}},
  ];
  const draft = {...RECIPE_FORM_DEFAULTS, name: '  Breakfast  ', recipe_ingredients: ingredients};
  assert.equal(recipeFormSchema.safeParse({...draft, recipe_ingredients: []}).success, false);
  assert.equal(
    recipeFormSchema.safeParse({
      ...draft,
      recipe_ingredients: [{...ingredients[0], portion: {kind: 'gram', grams: ''}}],
    }).success,
    false,
  );
  assert.equal(
    recipeFormSchema.safeParse({
      ...draft,
      recipe_ingredients: [{...ingredients[1], portion: {kind: 'serving', amount: 1, unit: '', label: 'Cup'}}],
    }).success,
    false,
  );
  const body = recipeToUpdateRequest(recipeFormSchema.parse(draft), 4);
  assert.equal(body.name, 'Breakfast');
  assert.equal(body.expected_revision, 4);
  assert.equal(body.cooked_weight_g, null);
  assert.deepEqual(body.recipe_ingredients, [
    {food_id: 'oats', portion: {kind: 'gram', grams: 75}},
    {food_id: 'milk', portion: {kind: 'serving', amount: 1, unit: 'cup', label: 'Cup'}},
  ]);
});
