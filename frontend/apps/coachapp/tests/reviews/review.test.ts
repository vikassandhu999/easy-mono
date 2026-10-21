import assert from 'node:assert/strict';
import {test} from 'node:test';
import {changedValues, dueLabel, groupAction} from '../../src/reviews/review.ts';

test('a correction shows old and new facts without database identity or unchanged values', () => {
  assert.deepEqual(
    changedValues(
      {
        id: 'session-1',
        revision: 1,
        name: 'Workout',
        notes: 'Before correction',
        sets: [{id: 'set-1', exercise_name: 'Squat', reps: 8}],
      },
      {
        id: 'session-1',
        revision: 2,
        name: 'Workout',
        notes: 'After correction',
        sets: [{id: 'set-1', exercise_name: 'Squat', reps: 10}],
      },
    ),
    [
      {field: 'notes', before: 'Before correction', after: 'After correction'},
      {field: 'sets 1 · reps', before: '8', after: '10'},
    ],
  );
});
test('removed records retain known zero, No, and the old value', () => {
  assert.deepEqual(changedValues({id: 'entry', number_value: 0, yes_no_value: false, local_date: '2026-10-05'}, null), [
    {field: 'number value', before: '0', after: 'Removed'},
    {field: 'yes no value', before: 'No', after: 'Removed'},
    {field: 'local date', before: '2026-10-05', after: 'Removed'},
  ]);
});
test('roster labels use server due facts and retain overdue days', () => {
  assert.equal(dueLabel({current_term: {}, due: true, overdue_days: 14, due_on: '2026-09-22'}), 'Overdue 14 days');
  assert.equal(
    dueLabel({current_term: {}, due: false, overdue_days: 0, due_on: '2026-10-13'}),
    'Not due · Next 2026-10-13',
  );
  assert.equal(dueLabel({current_term: null, due: false, overdue_days: 0, due_on: null}), 'No current term');
});

test('removing a Tracker attachment does not mark the parent record removed', () => {
  assert.equal(
    groupAction({
      record_type: 'tracker_entry',
      changes: [
        {row_type: 'tracker_entry', action: 'changed', new_value: {number_value: 80}},
        {row_type: 'attachment', action: 'removed', new_value: null},
      ],
    }),
    'changed',
  );
});
test('removing a Tracker parent marks the whole record removed', () => {
  assert.equal(
    groupAction({
      record_type: 'tracker_entry',
      changes: [{row_type: 'tracker_entry', action: 'removed', new_value: null}],
    }),
    'removed',
  );
});
test('a Tracker added and corrected stays added until its parent is removed', () => {
  assert.equal(
    groupAction({
      record_type: 'tracker_entry',
      changes: [
        {row_type: 'tracker_entry', action: 'added', new_value: {number_value: 80}},
        {row_type: 'tracker_entry', action: 'changed', new_value: {number_value: 81}},
      ],
    }),
    'added',
  );
  assert.equal(
    groupAction({
      record_type: 'tracker_entry',
      changes: [
        {row_type: 'tracker_entry', action: 'added', new_value: {number_value: 80}},
        {row_type: 'tracker_entry', action: 'removed', new_value: null},
      ],
    }),
    'removed',
  );
});
