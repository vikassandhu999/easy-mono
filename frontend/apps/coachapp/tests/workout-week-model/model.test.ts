import assert from 'node:assert/strict';
import type {WorkoutSchedule, WorkoutWeek} from '../../src/api/workout-week.ts';
import {matchSaveIntent, occasionLabel, readIntent, type SaveIntent} from '../../src/workout-week/model.ts';

const workout = {
  id: 'lower',
  client_id: 'client',
  name: 'Lower A',
  description: null,
  video: null,
  type: 'prescribed' as const,
  groups: [],
};
const row: WorkoutSchedule = {
  id: 'row',
  client_id: 'client',
  workout_id: 'lower',
  weekdays_mask: 9,
  from_date: '2026-10-01',
  until_date: null,
  time: null,
  place: null,
  meeting_url: null,
  coach_id: null,
};
const before: WorkoutWeek = {
  today: '2026-10-12',
  workouts: [workout],
  schedules: [row],
  coaches: [{id: 'coach', name: 'Sam'}],
};
const add: SaveIntent = {kind: 'add', before, body: {workout_id: 'lower', weekdays_mask: 2}, message: 'Added.'};
assert.equal(
  matchSaveIntent(add, {...before, schedules: [{...row, id: 'new-row', from_date: before.today, weekdays_mask: 11}]}),
  'saved',
);
assert.equal(matchSaveIntent(add, before), 'absent');
assert.equal(matchSaveIntent(add, {...before, schedules: [{...row, weekdays_mask: 15}]}), 'conflict');
assert.equal(
  matchSaveIntent(add, {
    ...before,
    schedules: [
      {...row, weekdays_mask: 11},
      {...row, id: 'duplicate', weekdays_mask: 2},
    ],
  }),
  'conflict',
);

const occasion: SaveIntent = {
  kind: 'schedule',
  before,
  id: row.id,
  body: {weekdays_mask: 9, time: '18:00', coach_id: 'coach', place: 'Gym'},
  message: 'Saved.',
};
const changed = {
  ...before,
  schedules: [{...row, id: 'replacement', from_date: before.today, time: '18:00:00', coach_id: 'coach', place: 'Gym'}],
};
assert.equal(matchSaveIntent(occasion, changed), 'saved');
assert.equal(
  matchSaveIntent(occasion, {...changed, schedules: [{...changed.schedules[0], time: '18:00:30'}]}),
  'conflict',
);
assert.equal(
  matchSaveIntent(occasion, {...changed, schedules: [{...changed.schedules[0], place: 'Another gym'}]}),
  'conflict',
);
assert.equal(occasionLabel(changed.schedules[0], before.coaches), '18:00 · Gym · with Sam');
const remove: SaveIntent = {kind: 'remove', before, id: row.id, weekday: 1, message: 'Removed.'};
assert.equal(matchSaveIntent(remove, {...before, schedules: [{...row, id: 'replacement', weekdays_mask: 8}]}), 'saved');
assert.equal(matchSaveIntent(remove, before), 'absent');

const library = {...workout, id: 'source', client_id: null};
const copy: SaveIntent = {
  kind: 'add',
  before,
  body: {library_workout_id: library.id, weekdays_mask: 16},
  library,
  message: 'Copied.',
};
const copied = {...workout, id: 'client-copy'};
assert.equal(
  matchSaveIntent(copy, {
    ...before,
    workouts: [...before.workouts, copied],
    schedules: [...before.schedules, {...row, id: 'copy-row', workout_id: copied.id, weekdays_mask: 16}],
  }),
  'saved',
);
assert.equal(
  matchSaveIntent(copy, {
    ...before,
    workouts: [...before.workouts, {...copied, name: 'Different workout'}],
    schedules: [...before.schedules, {...row, id: 'copy-row', workout_id: copied.id, weekdays_mask: 16}],
  }),
  'conflict',
);
assert.equal(matchSaveIntent(copy, before), 'absent');
assert.deepEqual(readIntent(JSON.stringify(add)), add);
assert.equal(readIntent('{bad'), null);
assert.equal(readIntent(JSON.stringify({kind: 'remove', before, id: 'row', weekday: 9, message: 'Bad'})), null);
assert.equal(
  readIntent(
    JSON.stringify({kind: 'add', before: {workouts: [], schedules: [null]}, body: {weekdays_mask: 1}, message: 'Bad'}),
  ),
  null,
);
assert.equal(
  readIntent(
    JSON.stringify({
      kind: 'undo',
      before,
      expected: {today: before.today, workouts: [], schedules: [null]},
      token: 'token',
      message: 'Bad',
    }),
  ),
  null,
);
console.log(
  'Workout week recovery checks merged masks, occasions, removal, library copies, absence, conflicts and persisted intent.',
);
