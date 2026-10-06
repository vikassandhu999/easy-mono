import assert from 'node:assert/strict';
import {initialMealDraft, mealInput, parseMealDraft} from '../../src/nutrition/meal-draft.ts';

const draft = initialMealDraft('2026-10-06', 'custom-slot');
assert.equal(typeof draft.id, 'string', 'A new meal has a durable identity');
draft.entries.push({
  name: 'Quick lunch',
  included: true,
  amount: '',
  input: {
    id: crypto.randomUUID(),
    request_id: crypto.randomUUID(),
    planned_item_id: null,
    source: null,
    portion: null,
    name: 'Quick lunch',
    nutrients: {energy_kcal: 400, protein_g: 0},
    notes: 'Lunch note',
  },
});
draft.noteToCoach = 'Please review';
const input = mealInput(draft);
assert.equal(input.request_id, draft.requestId);
assert.equal(input.entries[0]?.source, null);
assert.deepEqual(input.entries[0]?.nutrients, {energy_kcal: 400, protein_g: 0});
assert.equal(input.note_to_coach, 'Please review');
draft.attempt = input;
const restored = parseMealDraft(JSON.parse(JSON.stringify(draft)), draft.date, draft.slot);
assert.deepEqual(restored?.attempt, input, 'An interrupted save restores the exact request identity and body');
assert.equal(parseMealDraft({...draft, noteToCoach: 'Changed'}, draft.date, draft.slot), null);
assert.equal(parseMealDraft(draft, '2026-10-05', draft.slot), null);
assert.equal(parseMealDraft(draft, draft.date, 'other-slot'), null);
const portionDraft = initialMealDraft(draft.date, 'custom-slot');
portionDraft.entries.push({
  name: 'Food',
  included: true,
  amount: '0.',
  input: {
    id: crypto.randomUUID(),
    request_id: crypto.randomUUID(),
    planned_item_id: null,
    source: {type: 'food', id: crypto.randomUUID()},
    portion: {type: 'grams', grams: 100},
    name: 'Food',
    notes: null,
  },
});
assert.deepEqual(
  parseMealDraft(JSON.parse(JSON.stringify(portionDraft)), portionDraft.date, portionDraft.slot),
  portionDraft,
);
assert.throws(() => mealInput(portionDraft), /portion greater than zero/);
portionDraft.entries[0].amount = '125';
assert.deepEqual(mealInput(portionDraft).entries[0]?.portion, {type: 'grams', grams: 125});

const plannedDraft = initialMealDraft('2026-10-06', 'afternoon-slot', null, {
  id: 'afternoon-slot',
  name: 'After training',
  plan_revision_id: 'revision-1',
  status: 'not_recorded',
  meal: null,
  options: [
    {
      id: 'meal-option',
      name: 'Recovery meal',
      notes: null,
      items: [
        {
          id: 'planned-item',
          source: {type: 'food', id: 'food-1'},
          portion: {type: 'serving', serving_id: 'bowl-1', amount: 2},
          name: 'Rice',
          grams: 250,
          nutrients: {energy_kcal: 300},
        },
      ],
    },
  ],
});
assert.equal(plannedDraft.name, 'After training');
assert.equal(plannedDraft.planRevisionId, 'revision-1');
assert.equal(plannedDraft.mealId, 'meal-option');
assert.deepEqual(mealInput(plannedDraft).entries, [], 'A prescription is not a recorded meal');
plannedDraft.entries[0].included = true;
const plannedInput = mealInput(plannedDraft);
assert.equal(plannedInput.entries[0]?.planned_item_id, 'planned-item');
assert.deepEqual(plannedInput.entries[0]?.portion, {type: 'serving', serving_id: 'bowl-1', amount: 2});
assert.equal(plannedInput.plan_revision_id, 'revision-1');

plannedDraft.name = 'After training, second meal';
const renamedPlannedInput = mealInput(plannedDraft);
assert.equal(renamedPlannedInput.name, 'After training, second meal');
assert.equal(renamedPlannedInput.slot_id, 'afternoon-slot', 'A record name change keeps the planned slot');
assert.equal(
  renamedPlannedInput.plan_revision_id,
  'revision-1',
  'A record name change keeps the published prescription',
);
assert.equal(renamedPlannedInput.chosen_meal_id, 'meal-option');
assert.equal(renamedPlannedInput.entries[0]?.planned_item_id, 'planned-item');
