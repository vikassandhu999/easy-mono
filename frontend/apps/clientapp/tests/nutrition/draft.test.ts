import assert from 'node:assert/strict';
import {initialMealDraft, mealInput, parseMealDraft} from '../../src/nutrition/meal-draft.ts';

const draft = initialMealDraft('2026-09-19', 'lunch');
draft.entries.push({
  name: 'Half serving',
  included: true,
  amount: '0.5',
  input: {
    id: crypto.randomUUID(),
    planned_item_ref: null,
    food_id: null,
    recipe_id: crypto.randomUUID(),
    portion: {kind: 'serving', amount: 1, unit: 'serving', label: null},
    notes: 'Kept through interruption',
  },
});
draft.noteToCoach = 'Is this portion enough?';
const input = mealInput(draft);
assert.equal(input.share, true);
assert.equal(input.note_to_coach, 'Is this portion enough?');
draft.attempt = input;
const restored = parseMealDraft(JSON.parse(JSON.stringify(draft)), draft.date, draft.slot);
assert.deepEqual(restored?.attempt, input);
assert.equal(restored?.noteToCoach, 'Is this portion enough?');
assert.equal(restored?.attempt?.entries[0]?.id, draft.entries[0]?.input.id);
assert.deepEqual(restored?.attempt?.entries[0]?.portion, {kind: 'serving', amount: 0.5, unit: 'serving', label: null});
assert.equal(
  parseMealDraft({...draft, entries: draft.entries.map((entry) => ({...entry, amount: '2'}))}, draft.date, draft.slot),
  null,
  'An attempted body cannot silently disagree with the visible draft',
);
assert.equal(parseMealDraft(draft, '2026-09-18', draft.slot), null);
assert.equal(parseMealDraft(draft, draft.date, 'dinner'), null);
const unfinished = {...draft, attempt: null, entries: draft.entries.map((entry) => ({...entry, amount: '0.'}))};
assert.deepEqual(
  parseMealDraft(unfinished, draft.date, draft.slot),
  unfinished,
  'Incomplete typing survives restart without becoming a server write',
);
assert.throws(() => mealInput(unfinished), /portion greater than zero/);
