import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mismatch, type RecordingLog, type RecordingWorkout, rowsFor, slotOutcome, slotsFor} from '../src/recording.ts';

type Activity = RecordingLog['exercise_logs'][number];
type SetOutcome = Activity['sets'][number];

function activity(id: string, overrides: Partial<Activity> = {}): Activity {
  return {
    id,
    exercise_id: 'squat',
    workout_exercise_id: 'entry',
    state: 'active',
    position: 0,
    side_mode: 'per_side',
    rounds: 3,
    reps: null,
    distance_m: null,
    duration_s: null,
    sets: [],
    ...overrides,
  };
}

function set(id: string, overrides: Partial<SetOutcome> = {}): SetOutcome {
  return {id, state: 'completed', round: 1, side: null, reps: null, distance_m: null, duration_s: null, ...overrides};
}

const entry = {id: 'entry', exercise_id: 'squat', side_mode: 'per_side' as const};
const workout: RecordingWorkout = {groups: [{rounds: 3, exercises: [entry]}]};

test('per-side three-round activities have six slots without doubling the round count', () => {
  assert.deepEqual(slotsFor({side_mode: 'per_side', rounds: 3}), [
    {round: 1, side: 'left'},
    {round: 1, side: 'right'},
    {round: 2, side: 'left'},
    {round: 2, side: 'right'},
    {round: 3, side: 'left'},
    {round: 3, side: 'right'},
  ]);
  assert.deepEqual(slotsFor({side_mode: 'combined', rounds: 2}), [
    {round: 1, side: null},
    {round: 2, side: null},
  ]);
});

test('a replacement shares the prescribed round and side slot with the original activity', () => {
  const original = activity('original', {sets: [set('left', {side: 'left', reps: 10})]});
  const replacement = activity('replacement', {
    exercise_id: 'goblet-squat',
    position: 1,
    sets: [set('right', {side: 'right', reps: 8})],
  });
  const log = {exercise_logs: [original, replacement]};
  assert.deepEqual(slotOutcome(log, original, {round: 1, side: 'right'}), {
    kind: 'completed',
    activityId: 'replacement',
    setId: 'right',
  });
  assert.deepEqual(slotOutcome(log, replacement, {round: 1, side: 'left'}), {
    kind: 'completed',
    activityId: 'original',
    setId: 'left',
  });
});

test('the same added exercise twice has independent slots', () => {
  const first = activity('first', {workout_exercise_id: null, side_mode: 'combined', sets: [set('first-set')]});
  const second = activity('second', {workout_exercise_id: null, side_mode: 'combined', position: 1});
  const log = {exercise_logs: [first, second]};
  assert.deepEqual(slotOutcome(log, first, {round: 1, side: null}), {
    kind: 'completed',
    activityId: 'first',
    setId: 'first-set',
  });
  assert.deepEqual(slotOutcome(log, second, {round: 1, side: null}), {kind: 'unrecorded'});
});

test('done-only, skipped, and absent sets remain three distinct outcomes', () => {
  const current = activity('current', {
    side_mode: 'combined',
    sets: [set('done'), set('skipped', {round: 2, state: 'skipped'})],
  });
  const log = {exercise_logs: [current]};
  assert.deepEqual(slotOutcome(log, current, {round: 1, side: null}), {
    kind: 'completed',
    activityId: 'current',
    setId: 'done',
  });
  assert.deepEqual(slotOutcome(log, current, {round: 2, side: null}), {
    kind: 'skipped',
    activityId: 'current',
    setId: 'skipped',
  });
  assert.deepEqual(slotOutcome(log, current, {round: 3, side: null}), {kind: 'unrecorded'});
});

test('rows follow the prescription before added activities and choose the last active replacement', () => {
  const original = activity('original', {position: 0});
  const replacement = activity('replacement', {position: 2});
  const later = activity('later', {workout_exercise_id: null, position: 4});
  const earlier = activity('earlier', {workout_exercise_id: null, position: 3});
  const log = {exercise_logs: [later, replacement, earlier, original]};
  const before = structuredClone(log);
  const rows = rowsFor(workout, log);
  assert.deepEqual(
    rows.map((row) => row.entry?.id ?? row.current?.id),
    ['entry', 'earlier', 'later'],
  );
  assert.deepEqual(
    rows[0]?.activities.map((row) => row.id),
    ['original', 'replacement'],
  );
  assert.equal(rows[0]?.current?.id, 'replacement');
  assert.deepEqual(rows[0]?.slots, slotsFor({side_mode: 'per_side', rounds: 3}));
  assert.deepEqual(log, before);
});

test('unvisited prescribed rows remain visible and closed activities are not active selections', () => {
  const empty = rowsFor(workout, {exercise_logs: []});
  assert.equal(empty[0]?.entry?.id, 'entry');
  assert.deepEqual(empty[0]?.activities, []);
  assert.equal(empty[0]?.current, null);
  assert.equal(empty[0]?.slots.length, 6);
  const completed = activity('completed', {state: 'completed'});
  const rows = rowsFor(workout, {exercise_logs: [completed]});
  assert.equal(rows[0]?.current, null);
  assert.equal(rows[0]?.activities[0]?.state, 'completed');
});

test('saved extra rounds remain visible across replacements and added activities', () => {
  const original = activity('original', {sets: [set('extra', {round: 4, side: 'left'})]});
  const replacement = activity('replacement', {position: 1});
  const added = activity('added', {
    workout_exercise_id: null,
    position: 2,
    side_mode: 'combined',
    rounds: 1,
    sets: [set('added-extra', {round: 3})],
  });
  const log = {exercise_logs: [original, replacement, added]};
  const rows = rowsFor(workout, log);
  assert.equal(rows[0]?.slots.length, 8);
  assert.deepEqual(slotOutcome(log, replacement, {round: 4, side: 'left'}), {
    kind: 'completed',
    activityId: 'original',
    setId: 'extra',
  });
  assert.deepEqual(rows[1]?.slots.at(-1), {round: 3, side: null});
  assert.deepEqual([original.rounds, replacement.rounds, added.rounds], [3, 3, 1]);
});

test('excess distance detail warns without rewriting the reported overall result', () => {
  const run = activity('run', {
    distance_m: 5000,
    sets: [set('one', {distance_m: 3000}), set('two', {distance_m: 3000})],
  });
  assert.equal(mismatch(run), 'Sets total 6 km; the overall result is 5 km.');
  assert.equal(run.distance_m, 5000);
  assert.deepEqual(
    run.sets.map((row) => row.distance_m),
    [3000, 3000],
  );
  assert.equal(mismatch({...run, distance_m: null}), null);
});

test('partial or equal interval detail does not warn or become an overall total', () => {
  const partial = activity('run', {distance_m: 5000, sets: [set('one', {distance_m: 1000})]});
  assert.equal(mismatch(partial), null);
  assert.equal(mismatch({...partial, distance_m: 1000}), null);
  assert.equal(mismatch({...partial, distance_m: null}), null);
  assert.equal(partial.distance_m, 5000);
  assert.equal(
    mismatch(
      activity('fractional', {
        distance_m: 0.3,
        sets: [set('one', {distance_m: 0.1}), set('two', {distance_m: 0.2})],
      }),
    ),
    null,
  );
});

test('mismatch compares completed reps and distance only, including known zero', () => {
  assert.equal(
    mismatch(activity('reps', {reps: 30, sets: [set('one', {reps: 20}), set('two', {reps: 15})]})),
    'Sets total 35 reps; the overall result is 30 reps.',
  );
  assert.equal(
    mismatch(activity('zero', {distance_m: 0, sets: [set('one', {distance_m: 1})]})),
    'Sets total 1 m; the overall result is 0 m.',
  );
  assert.equal(
    mismatch(activity('skipped', {distance_m: 5000, sets: [set('skip', {state: 'skipped', distance_m: 6000})]})),
    null,
  );
  assert.equal(mismatch(activity('time', {duration_s: 600, sets: [set('interval', {duration_s: 900})]})), null);
});
