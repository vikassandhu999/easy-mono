import assert from 'node:assert/strict';
import type {WorkoutSchedule, WorkoutWeek} from '../../src/api/workout-week.ts';
import {matchSaveIntent, occasionLabel, occursOn, readIntent, type SaveIntent} from '../../src/workout-week/model.ts';

const workout = {
  id: 'lower',
  client_id: 'client',
  name: 'Lower A',
  description: null,
  video: null,
  type: 'prescribed' as const,
  groups: [
    {
      id: 'group',
      name: null,
      rounds: 3,
      exercises: [
        {
          id: 'entry',
          exercise_id: 'squat',
          side_mode: 'per_side' as const,
          targets_mode: 'same_for_all' as const,
          targets: [{reps: {mode: 'exact' as const, value: 8}, rest: {mode: 'exact' as const, value_s: 60}}],
          exercise: {
            id: 'squat',
            name: 'Split squat',
            kind: 'movement' as const,
            instructions: null,
            goals: [],
            places: [],
            metrics: [{key: 'reps' as const, label: 'Repetitions'}],
            equipment: null,
            muscles: [],
            media: [],
            archived_at: null,
            is_builtin: true,
          },
        },
      ],
    },
  ],
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
const copied = {
  ...workout,
  id: 'client-copy',
  groups: workout.groups.map((group) => ({
    ...group,
    id: 'copied-group',
    exercises: group.exercises.map((entry) => ({...entry, id: 'copied-entry'})),
  })),
};
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
const wrongSide = {
  ...copied,
  groups: copied.groups.map((group) => ({
    ...group,
    exercises: group.exercises.map((entry) => ({...entry, side_mode: 'combined' as const})),
  })),
};
assert.equal(
  matchSaveIntent(copy, {
    ...before,
    workouts: [...before.workouts, wrongSide],
    schedules: [...before.schedules, {...row, id: 'copy-row', workout_id: copied.id, weekdays_mask: 16}],
  }),
  'conflict',
);

const videoLibrary = {
  ...library,
  type: 'video' as const,
  video: {id: 'asset', url: 'https://example.com/workout.mp4'},
  groups: [],
};
const videoCopy = {
  ...videoLibrary,
  id: 'video-copy',
  client_id: 'client',
  video: {...videoLibrary.video, id: 'copied-asset'},
};
assert.equal(
  matchSaveIntent(
    {...copy, body: {library_workout_id: videoLibrary.id, weekdays_mask: 16}, library: videoLibrary},
    {
      ...before,
      workouts: [...before.workouts, videoCopy],
      schedules: [...before.schedules, {...row, id: 'video-row', workout_id: videoCopy.id, weekdays_mask: 16}],
    },
  ),
  'saved',
);
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

assert.equal(occursOn(row, '2026-10-12'), true);
assert.equal(occursOn(row, '2026-10-15'), true);
assert.equal(occursOn(row, '2026-10-13'), false);
assert.equal(occursOn({...row, until_date: '2026-10-11'}, '2026-10-12'), false);
assert.equal(occursOn({...row, from_date: '2026-10-13'}, '2026-10-12'), false);
