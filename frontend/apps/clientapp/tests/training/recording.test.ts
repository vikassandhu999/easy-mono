import assert from 'node:assert/strict';
import {
  creationBody,
  emptySet,
  measurementText,
  parseWorkoutDraft,
  setMeasurements,
  setValues,
  targetText,
} from '../../src/training/recording.ts';

const values = {
  ...emptySet(undefined, 'lb'),
  exercise_name: 'Squat',
  reps: '0',
  load_value: '100',
  outcome: 'skipped' as const,
};
assert.equal(setMeasurements(values).reps, 0);
assert.equal(setMeasurements(values).outcome, 'skipped');
assert.equal(setMeasurements(values).load_unit, 'lb');

const entry = {
  key: 'set-1',
  itemId: 'item-1',
  setId: 'set-1',
  exerciseId: 'exercise-1',
  values,
  operation: {kind: 'create' as const, requestId: 'ad1c7a83-610c-40eb-8750-bf04415590bc'},
  attempted: true,
};
const body = creationBody(entry);
assert.equal(body.set_id, 'set-1');
assert.equal(body.item_id, 'item-1');
assert.equal(body.exercise_id, 'exercise-1');
assert.equal(body.exercise_name, undefined);
assert.equal(body.request_id, 'ad1c7a83-610c-40eb-8750-bf04415590bc');
assert.equal(creationBody({...entry, key: 'extra', setId: undefined}).set_id, undefined);

const draft = {version: 2, revision: 3, date: '2026-10-05', selected: 'set-1', notes: '', entries: [entry]};
assert.deepEqual(parseWorkoutDraft(JSON.parse(JSON.stringify(draft))), draft);
assert.equal(parseWorkoutDraft({...draft, entries: [{...entry, values: {...values, outcome: 'missing'}}]}), null);
assert.equal(parseWorkoutDraft({...draft, version: 1}), null);

assert.equal(
  measurementText({
    reps: 0,
    load_kg: '45.359',
    entered_load_unit: 'lb',
    duration_s: null,
    distance_m: null,
    entered_distance_unit: null,
  }),
  '0 reps · 100 lb',
);
assert.equal(
  targetText({
    id: 's',
    kind: 'working',
    reps: {type: 'range', min: 8, max: 12},
    load: null,
    rpe: null,
    rir: 2,
    tempo: '3010',
    duration_s: null,
    distance: null,
    rest_s: 60,
    notes: null,
  }),
  '8–12 reps · RIR 2 · Tempo 3010 · Rest 60 sec',
);
console.log('Training drafts retain prescribed identities, retry ids, outcomes and entered units.');

const shortDistance = setValues(
  {
    exercise_name: 'Walk',
    reps: null,
    load_kg: null,
    entered_load_unit: null,
    duration_s: null,
    distance_m: '1.00',
    entered_distance_unit: 'km',
    kind: 'working',
    outcome: 'done',
    rpe: null,
    rir: null,
    notes: '',
  },
  undefined,
  'kg',
);
assert.equal(shortDistance.distance_value, '0.001');
assert.equal(setMeasurements({...shortDistance, notes: 'Corrected note'}).distance_value, 0.001);
