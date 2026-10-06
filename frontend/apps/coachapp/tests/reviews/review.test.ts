import assert from 'node:assert/strict';
import {test} from 'node:test';
import {changedValues, dueLabel, groupAction} from '../../src/reviews/review.ts';

test('a correction shows old and new facts without database identity or unchanged values', () => {
  assert.deepEqual(
    changedValues(
      {
        id: 'meal-1',
        revision: 1,
        name: 'Lunch',
        notes: 'Before correction',
        entries: [{id: 'food-1', name: 'Rice', nutrients: {energy_kcal: 100}}],
      },
      {
        id: 'meal-1',
        revision: 2,
        name: 'Lunch',
        notes: 'After correction',
        entries: [{id: 'food-1', name: 'Rice', nutrients: {energy_kcal: 150}}],
      },
    ),
    [
      {field: 'notes', before: 'Before correction', after: 'After correction'},
      {field: 'entries 1 · nutrients · energy kcal', before: '100', after: '150'},
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

test('removing a meal entry or workout set does not mark the parent record removed', () => {
  assert.equal(
    groupAction({record_type: 'meal', changes: [{row_type: 'entry', action: 'removed', new_value: null}]}),
    'changed',
  );
  assert.equal(
    groupAction({
      record_type: 'workout',
      changes: [
        {row_type: 'session', action: 'changed', new_value: {state: 'completed'}},
        {row_type: 'set', action: 'removed', new_value: null},
      ],
    }),
    'changed',
  );
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
test('removing a Tracker parent or discarding a workout marks the whole record removed', () => {
  assert.equal(
    groupAction({
      record_type: 'tracker_entry',
      changes: [{row_type: 'tracker_entry', action: 'removed', new_value: null}],
    }),
    'removed',
  );
  assert.equal(
    groupAction({
      record_type: 'workout',
      changes: [{row_type: 'session', action: 'changed', new_value: {state: 'discarded'}}],
    }),
    'removed',
  );
});

test('a record added and then corrected is still Added until the parent is removed', () => {
  assert.equal(
    groupAction({
      record_type: 'workout',
      changes: [
        {row_type: 'session', action: 'added', new_value: {state: 'active'}},
        {row_type: 'session', action: 'changed', new_value: {state: 'completed'}},
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
