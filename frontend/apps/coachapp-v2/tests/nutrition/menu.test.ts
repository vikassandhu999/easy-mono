import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {NutritionPlan} from '../../src/api/schema.ts';
import {editMenu} from '../../src/library/nutrition-plans/builder/menu.ts';

const plan: NutritionPlan = {
  id: 'plan',
  kind: 'template',
  name: 'Test menu',
  description: null,
  revision: 4,
  archived_at: null,
  status: 'active',
  lifecycle: null,
  assigned_client_count: 0,
  target_calories: null,
  target_protein_g: null,
  target_carbs_g: null,
  target_fat_g: null,
  target_fiber_g: null,
  start_date: null,
  end_date: null,
  client_id: null,
  client: null,
  creator_id: null,
  source_template_id: null,
  menu: {
    meals: [],
    day_patterns: [
      {
        id: 'day',
        name: 'Every day',
        slots: [],
      },
    ],
    schedule: {
      monday: 'day',
      tuesday: 'day',
      wednesday: 'day',
      thursday: 'day',
      friday: 'day',
      saturday: 'day',
      sunday: 'day',
    },
  },
  inserted_at: '',
  updated_at: '',
};

function breakfast() {
  return editMenu(plan.menu, {type: 'addMeal', id: 'breakfast', dayId: 'day', optionId: 'option'});
}

test('a coach can build a complete menu locally and save one consistent request', () => {
  const before = structuredClone(plan);
  let draft = breakfast();
  draft = editMenu(draft, {type: 'renameMeal', mealId: 'breakfast', name: 'Oats and milk'});
  draft = editMenu(draft, {
    type: 'addItems',
    mealId: 'breakfast',
    items: [
      {id: 'oats', name: 'Oats', body: {kind: 'food', food_id: 'food', portion: {kind: 'gram', grams: 50}}},
      {
        id: 'milk',
        name: 'Milk',
        body: {kind: 'food', food_id: 'milk-food', portion: {kind: 'serving', amount: 1, unit: 'cup', label: 'Cup'}},
      },
    ],
  });
  draft = editMenu(draft, {type: 'amount', mealId: 'breakfast', itemId: 'oats', portion: {kind: 'gram', grams: 75}});
  draft = editMenu(draft, {type: 'moveItem', mealId: 'breakfast', from: 1, to: 0});
  draft = editMenu(draft, {type: 'addDay', id: 'training'});
  draft = editMenu(draft, {type: 'schedule', dayId: 'training', weekday: 'monday'});
  draft = editMenu(draft, {type: 'addOption', dayId: 'training', slot: 'breakfast', mealId: 'breakfast', id: 'shared'});
  const request = {expected_revision: plan.revision, menu: draft};
  assert.deepEqual(plan, before, 'draft edits never mutate the query result');
  assert.equal(request.expected_revision, 4);
  assert.equal(request.menu.meals.length, 1, 'the shared meal is submitted once');
  assert.equal(request.menu.meals[0]?.name, 'Oats and milk');
  assert.deepEqual(
    request.menu.meals[0]?.meal_items.map((item) => item.id),
    ['milk', 'oats'],
  );
  assert.equal(request.menu.meals[0]?.meal_items[1]?.portion.grams, 75);
  assert.equal(request.menu.day_patterns[0]?.id, 'day');
  assert.equal(request.menu.day_patterns[1]?.id, 'training');
  assert.equal(request.menu.day_patterns[1]?.slots[0]?.options[0]?.nutrition_meal_id, 'breakfast');
  assert.equal(request.menu.schedule.monday, 'training');
  assert.equal(request.menu.schedule.tuesday, 'day');
});

test('removing a shared meal clears its assignments while removing a day keeps meals', () => {
  let draft = editMenu(breakfast(), {type: 'addDay', id: 'training'});
  draft = editMenu(draft, {type: 'addOption', dayId: 'training', slot: 'lunch', mealId: 'breakfast', id: 'shared'});
  draft = editMenu(draft, {type: 'removeDay', dayId: 'day'});
  assert.equal(draft.meals.length, 1);
  assert.ok(Object.values(draft.schedule).every((id) => id === 'training'));
  draft = editMenu(draft, {type: 'removeDay', dayId: 'training'});
  assert.equal(draft.day_patterns.length, 1, 'the last day stays');
  draft = editMenu(draft, {type: 'removeMeal', mealId: 'breakfast'});
  assert.equal(draft.meals.length, 0);
  assert.deepEqual(draft.day_patterns[0]?.slots, []);
});

test('moving a meal option to its current slot is harmless; moving into a duplicate collapses it', () => {
  let draft = breakfast();
  const before = structuredClone(draft);
  draft = editMenu(draft, {type: 'changeSlot', dayId: 'day', optionId: 'option', slot: 'early_morning'});
  assert.deepEqual(draft, before);
  draft = editMenu(draft, {type: 'addOption', dayId: 'day', slot: 'lunch', mealId: 'breakfast', id: 'lunch-option'});
  draft = editMenu(draft, {type: 'changeSlot', dayId: 'day', optionId: 'option', slot: 'lunch'});
  assert.deepEqual(draft.day_patterns[0]?.slots, [
    {meal_slot: 'lunch', options: [{id: 'lunch-option', nutrition_meal_id: 'breakfast'}]},
  ]);
});

test('removing the first choice promotes its alternative without changing identity', () => {
  let draft = breakfast();
  draft = editMenu(draft, {type: 'addMeal', dayId: 'day', id: 'second', optionId: 'second-option'});
  draft = editMenu(draft, {type: 'changeSlot', dayId: 'day', optionId: 'second-option', slot: 'early_morning'});
  draft = editMenu(draft, {type: 'removeOption', dayId: 'day', optionId: 'option'});
  const slots = draft.day_patterns[0]?.slots;
  assert.equal(slots?.length, 1);
  assert.deepEqual(slots?.[0]?.options, [{id: 'second-option', nutrition_meal_id: 'second'}]);
});
