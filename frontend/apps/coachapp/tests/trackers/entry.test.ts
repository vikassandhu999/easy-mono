import assert from 'node:assert/strict';
import {test} from 'node:test';
import {defaultTrackerUnit, entryBody, trackerDisplayValue} from '../../src/client-trackers/entry.ts';

const weight = {
  id: 'weight',
  name: 'Body weight',
  kind: 'number' as const,
  built_in: true,
  base_unit: 'kg',
  scale_max: null,
  archived_at: null,
  entry_count: 0,
  units: [
    {unit: 'kg', to_base_factor: 1},
    {unit: 'lb', to_base_factor: 0.45359237},
  ],
};
const fields = {local_date: '2026-10-06', value: '180', unit: 'lb', text: '', answer: '', captured_on: ''};

test('coach weight entry keeps the entered unit and value for the server to convert', () => {
  assert.deepEqual(entryBody(weight, fields, [], 'stable-request'), {
    tracker_id: 'weight',
    local_date: '2026-10-06',
    request_id: 'stable-request',
    number_value: 180,
    entered_unit: 'lb',
  });
  assert.equal(defaultTrackerUnit(weight, 'imperial'), 'lb');
  assert.equal(trackerDisplayValue(81.6466266, weight, 'lb'), '180');
  assert.equal(trackerDisplayValue(81.6466266, weight, 'kg'), '81.65');
});

test('coach entries preserve known zero and an explicit No answer', () => {
  assert.equal(entryBody(weight, {...fields, value: '0', unit: 'kg'}, [], 'zero').number_value, 0);
  assert.deepEqual(entryBody({...weight, kind: 'yes_no'}, {...fields, answer: 'no'}, [], 'no-request'), {
    tracker_id: 'weight',
    local_date: '2026-10-06',
    request_id: 'no-request',
    yes_no_value: false,
  });
});

test('report recording sends attachment order and request identity unchanged', () => {
  assert.deepEqual(
    entryBody(
      {...weight, kind: 'document'},
      {...fields, text: 'Lab report'},
      ['second-page', 'first-page'],
      'report-request',
    ),
    {
      tracker_id: 'weight',
      local_date: '2026-10-06',
      request_id: 'report-request',
      attachment_ids: ['second-page', 'first-page'],
    },
  );
});

test('photo entries contain attachments without scalar values from the form', () => {
  assert.deepEqual(
    entryBody({...weight, kind: 'photo'}, {...fields, text: 'Hidden text'}, ['photo'], 'photo-request'),
    {
      tracker_id: 'weight',
      local_date: '2026-10-06',
      request_id: 'photo-request',
      attachment_ids: ['photo'],
    },
  );
});

test('custom units are literal and missing numeric metrics remain missing', () => {
  const custom = {...weight, built_in: false, base_unit: 'cups', units: [{unit: 'cups', to_base_factor: 1}]};
  assert.equal(defaultTrackerUnit(custom, 'imperial'), 'cups');
  assert.equal(trackerDisplayValue(2.5, custom, 'cups'), '2.5');
  assert.equal(trackerDisplayValue(null, custom, 'cups'), 'Not recorded');
});
