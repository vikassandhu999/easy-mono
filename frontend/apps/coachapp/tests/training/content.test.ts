import assert from 'node:assert/strict';
import {draftFromPlan, duplicateWorkout, newSet, prescriptionBody} from '../../src/training-plans/prescription.ts';

const set = {
  ...newSet(),
  reps: {type: 'range' as const, min: 8, max: 12},
  load: {kg: 45.359237, entered_unit: 'lb' as const},
};
const workout = {
  id: crypto.randomUUID(),
  name: 'Strength',
  notes: null,
  blocks: [
    {
      id: crypto.randomUUID(),
      format: 'superset' as const,
      items: [{id: crypto.randomUUID(), exercise_id: crypto.randomUUID(), exercise_name: 'Squat', sets: [set]}],
    },
  ],
};
const draft = draftFromPlan();
draft.workouts = [workout];
draft.schedule.entries = [
  {id: crypto.randomUUID(), day: 0, ref: workout.id},
  {id: crypto.randomUUID(), day: 0, ref: workout.id},
];
const saved = prescriptionBody(draft, 4);
assert.equal(saved.name, 'Untitled training plan');
assert.equal(saved.expected_revision, 4);
assert.deepEqual(saved.content.workouts[0].blocks[0].items[0].sets[0].reps, {type: 'range', min: 8, max: 12});
assert.equal(saved.content.workouts[0].blocks[0].items[0].sets[0].id, set.id);
assert.equal(saved.content.schedule.entries[1].id, draft.schedule.entries[1].id);
assert.equal(saved.content.workouts[0].blocks[0].items[0].sets[0].load?.kg, 45.359237);
const copy = duplicateWorkout(workout);
assert.notEqual(copy.id, workout.id);
assert.notEqual(copy.blocks[0].items[0].sets[0].id, set.id);
assert.equal(copy.blocks[0].items[0].exercise_id, workout.blocks[0].items[0].exercise_id);
console.log('Whole training document saves retain ids and typed targets; duplicates get independent ids.');
