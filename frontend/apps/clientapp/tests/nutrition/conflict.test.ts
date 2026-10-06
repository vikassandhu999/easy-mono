import assert from 'node:assert/strict';
import {assertMealNameAvailable, findSavedMeal, MealNameConflict} from '../../src/api/nutrition-meals.ts';
import {initialMealDraft, mealInput, reviewMealDraft} from '../../src/nutrition/meal-draft.ts';

const remote = {
  id: 'device-b-meal',
  revision: 1,
  request_id: 'device-b-request',
  name: 'After training',
  local_date: '2026-10-06',
  timezone: 'UTC',
  slot_id: 'planned-slot',
  plan_revision_id: 'revision-1',
  chosen_meal_id: 'option-1',
  note_to_coach: null,
  shared_at: null,
  entries: [],
};
const day = {slots: [{meal: remote}], extra_meals: []};
const draft = initialMealDraft('2026-10-06', 'planned-slot');
draft.name = 'After training';
draft.slotId = 'planned-slot';
draft.planRevisionId = 'revision-1';
draft.mealId = 'option-1';
draft.noteToCoach = 'My own note';
draft.entries = [
  {
    name: 'Rice',
    included: true,
    amount: '150',
    input: {
      id: 'my-entry',
      request_id: 'my-entry-request',
      planned_item_id: 'rice-item',
      name: 'Rice',
      source: {type: 'food', id: 'rice'},
      portion: {type: 'grams', grams: 100},
      notes: 'My detail',
    },
  },
];
const input = mealInput(draft);
assert.notEqual(input.id, remote.id);
assert.equal(
  findSavedMeal(day, input)?.id,
  'device-b-meal',
  'The fresh read finds another device’s first save by slot',
);
const reviewed = reviewMealDraft(draft, remote);
const replacement = mealInput(reviewed);
assert.equal(replacement.id, 'device-b-meal');
assert.equal(replacement.expected_revision, 1);
assert.equal(replacement.plan_revision_id, 'revision-1');
assert.equal(replacement.slot_id, 'planned-slot');
assert.equal(replacement.note_to_coach, 'My own note');
assert.deepEqual(replacement.entries[0]?.portion, {type: 'grams', grams: 150});
assert.equal(replacement.entries[0]?.planned_item_id, 'rice-item');
assert.equal(replacement.entries[0]?.notes, 'My detail');
assert.notEqual(replacement.request_id, input.request_id);
assert.notEqual(replacement.entries[0]?.request_id, input.entries[0]?.request_id);
assert.equal(
  findSavedMeal(day, replacement)?.revision,
  replacement.expected_revision,
  'The next save passes the revision check',
);
assert.equal(reviewed.attempt, null);

const changed = reviewMealDraft(draft, {
  ...remote,
  plan_revision_id: 'older-prescription',
  chosen_meal_id: 'other-option',
});
assert.equal(changed.planRevisionId, 'older-prescription');
assert.equal(changed.mealId, 'other-option');
assert.equal(
  changed.entries[0]?.input.planned_item_id,
  null,
  'A retained food is not falsely linked to another prescription',
);
assert.deepEqual(changed.entries[0]?.input.source, {type: 'food', id: 'rice'});
assert.equal(changed.entries[0]?.amount, '150');

const extra = {
  ...remote,
  id: 'extra-b',
  slot_id: null,
  plan_revision_id: null,
  chosen_meal_id: null,
  name: 'Evening snack',
};
assert.equal(
  findSavedMeal({slots: [], extra_meals: [extra]}, {...input, slot_id: null, name: 'Evening snack'})?.id,
  'extra-b',
);
assert.equal(findSavedMeal({slots: [], extra_meals: [extra]}, {...input, slot_id: null, name: 'Lunch'}), undefined);

const nameCollision = {slots: [], extra_meals: [{...extra, name: 'After training'}]};
assert.equal(findSavedMeal(nameCollision, input), undefined, 'An extra meal cannot become the planned slot record');
assert.throws(() => assertMealNameAvailable(nameCollision, input), MealNameConflict);
const renamed = mealInput({...draft, name: 'After training, planned', attempt: null});
assert.doesNotThrow(() => assertMealNameAvailable(nameCollision, renamed));
assert.equal(renamed.slot_id, 'planned-slot');
assert.equal(renamed.plan_revision_id, 'revision-1');
assert.equal(renamed.id, input.id);
assert.deepEqual(renamed.entries, input.entries, 'Name recovery retains the draft intake');
