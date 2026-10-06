import assert from 'node:assert/strict';
import type {Tracker, TrackerEntry} from '../../src/api/trackers.ts';
import {
  defaultTrackerUnit,
  parseTrackerDraft,
  restoreTrackerFiles,
  reviewTrackerDraft,
  settledTrackerDraft,
  trackerDraft,
  trackerInput,
} from '../../src/ui/tracker-draft.ts';

const weight: Tracker = {
  id: 'weight',
  name: 'Body weight',
  kind: 'number',
  base_unit: 'kg',
  scale_max: null,
  archived_at: null,
  built_in: true,
  entry_count: 0,
  units: [
    {unit: 'kg', to_base_factor: 1},
    {unit: 'lb', to_base_factor: 0.45359237},
  ],
};
assert.equal(defaultTrackerUnit(weight, 'imperial'), 'lb');
assert.equal(defaultTrackerUnit({...weight, built_in: false}, 'imperial'), 'kg');
const draft = trackerDraft('tracker.weight.new', weight, '2026-10-06', 'imperial');
draft.value = '180.5';
const request = trackerInput(draft, weight, []);
assert.equal(request.number_value, 180.5);
assert.equal(request.entered_unit, 'lb');
assert.equal(request.request_id, draft.requestId);
draft.attempt = request;
const recovered = parseTrackerDraft(JSON.parse(JSON.stringify(draft)), draft.resource);
assert.deepEqual(recovered?.attempt, request, 'Recovery retains the exact intended write and request ID');
assert.ok(recovered);
assert.deepEqual(trackerInput(recovered, weight, []), request, 'An explicit retry reuses the frozen request');
assert.equal(parseTrackerDraft(draft, 'tracker.weight.other-session'), null);
assert.equal(
  parseTrackerDraft({...draft, value: '200'}, draft.resource),
  null,
  'A pending request cannot silently change',
);
const habit = {...weight, id: 'habit', kind: 'yes_no' as const, base_unit: null, units: []};
const habitDraft = trackerDraft('tracker.habit.new', habit, '2026-10-06', 'metric');
assert.throws(() => trackerInput(habitDraft, habit, []), /Choose Yes or No/);
habitDraft.value = 'false';
assert.equal(trackerInput(habitDraft, habit, []).yes_no_value, false, 'No is a recorded answer');
const report = {...habit, id: 'report', kind: 'document' as const};
const reportDraft = trackerDraft('tracker.report.new', report, '2026-10-06', 'metric');
reportDraft.files = ['file-pdf', 'file-image'];
const reportInput = trackerInput(reportDraft, report, ['uploaded-pdf', 'uploaded-image'], {
  about_meal_id: 'saved-meal',
});
assert.deepEqual(reportInput.attachment_ids, ['uploaded-pdf', 'uploaded-image']);
assert.equal(reportInput.about_meal_id, 'saved-meal');
reportDraft.attempt = reportInput;
assert.deepEqual(
  parseTrackerDraft(JSON.parse(JSON.stringify(reportDraft)), reportDraft.resource)?.attempt,
  reportInput,
  'A report retry preserves order and the saved event link',
);
const energy = {...habit, kind: 'rating' as const, scale_max: 5};
const energyDraft = trackerDraft('energy.session', energy, '2026-10-06', 'metric');
energyDraft.value = '4';
assert.equal(
  trackerInput(energyDraft, energy, [], {about_session_id: 'completed-session'}).about_session_id,
  'completed-session',
);
energyDraft.value = '6';
assert.throws(() => trackerInput(energyDraft, energy, []), /rating from 1 to 5/);

const recoveredFileDraft = restoreTrackerFiles({...reportDraft, attempt: null}, ['file-image', 'file-orphan']);
assert.deepEqual(
  recoveredFileDraft.files,
  ['file-pdf', 'file-image', 'file-orphan'],
  'A file saved before interruption is recovered after the known ordered files',
);
assert.deepEqual(
  restoreTrackerFiles(reportDraft, ['orphan']),
  reportDraft,
  'A pending report retry never changes its attachment order',
);
const reviewed = reviewTrackerDraft(recoveredFileDraft, 3);
assert.equal(reviewed.expectedRevision, 3);
assert.notEqual(reviewed.requestId, recoveredFileDraft.requestId);
assert.equal(reviewed.fileGroup, recoveredFileDraft.fileGroup, 'Conflict review retains the same stored files');
assert.deepEqual(reviewed.files, recoveredFileDraft.files);
assert.equal(parseTrackerDraft(JSON.parse(JSON.stringify(reviewed)), reviewed.resource)?.expectedRevision, 3);

const originalEntry: TrackerEntry = {
  id: 'weight-entry',
  tracker: weight,
  local_date: '2026-10-05',
  timezone: 'Asia/Kolkata',
  recorded_by_type: 'client',
  recorded_by_id: 'client-id',
  revision: 1,
  request_id: 'original-request',
  number_value: 82,
  entered_unit: 'kg',
  rating_value: null,
  yes_no_value: null,
  text_value: null,
  about_session_id: null,
  about_meal_id: null,
  attachments: [],
  inserted_at: '2026-10-05T09:00:00Z',
  updated_at: '2026-10-05T09:00:00Z',
};
const correction = trackerDraft('tracker.weight.weight-entry', weight, '2026-10-06', 'metric', originalEntry);
correction.value = '80';
correction.attempt = trackerInput(correction, weight, []);
assert.equal(correction.expectedRevision, 1);
const acceptedCorrection: TrackerEntry = {
  ...originalEntry,
  number_value: 80,
  revision: 2,
  request_id: correction.requestId,
};
const acknowledged = settledTrackerDraft(correction, acceptedCorrection, '2026-10-06', 'metric');
const reopened = parseTrackerDraft(JSON.parse(JSON.stringify(acknowledged)), correction.resource);
assert.ok(reopened);
assert.deepEqual(
  {value: reopened.value, date: reopened.date, revision: reopened.expectedRevision, attempt: reopened.attempt},
  {value: '80', date: '2026-10-05', revision: 2, attempt: null},
  'Reopening a confirmed correction shows the accepted value, original date and next revision',
);
reopened.value = '79';
const secondCorrection = {...trackerInput(reopened, weight, []), expected_revision: reopened.expectedRevision};
assert.deepEqual(
  {
    number_value: secondCorrection.number_value,
    entered_unit: secondCorrection.entered_unit,
    local_date: secondCorrection.local_date,
    expected_revision: secondCorrection.expected_revision,
  },
  {number_value: 79, entered_unit: 'kg', local_date: '2026-10-05', expected_revision: 2},
);
assert.notEqual(secondCorrection.request_id, correction.requestId, 'A second correction gets a new request identity');
const unconfirmed = parseTrackerDraft(JSON.parse(JSON.stringify(correction)), correction.resource);
assert.equal(
  unconfirmed?.attempt?.request_id,
  correction.requestId,
  'An unconfirmed correction retains its pending request',
);
assert.equal(unconfirmed?.expectedRevision, 1);
const newEntryDraft = trackerDraft('tracker.weight.new', weight, '2026-10-06', 'metric');
const readyForNextEntry = settledTrackerDraft(newEntryDraft, acceptedCorrection, '2026-10-06', 'metric');
assert.deepEqual(
  {value: readyForNextEntry.value, date: readyForNextEntry.date, revision: readyForNextEntry.expectedRevision},
  {value: '', date: '2026-10-06', revision: 0},
  'A successful creation prepares an empty new entry',
);

const imperialEntry = {...originalEntry, number_value: 81.19303423, entered_unit: 'lb'};
assert.equal(
  trackerDraft('tracker.weight.weight-entry', weight, '2026-10-06', 'imperial', imperialEntry).value,
  '179',
  'Reopening 179 lb removes binary conversion noise',
);
const preciseImperialEntry = {...imperialEntry, number_value: 81.70332564625};
const preciseImperialDraft = trackerDraft(
  'tracker.weight.weight-entry',
  weight,
  '2026-10-06',
  'imperial',
  preciseImperialEntry,
);
assert.equal(preciseImperialDraft.value, '180.125', 'Converted inputs retain more than two decimal places');
assert.equal(trackerInput(preciseImperialDraft, weight, []).number_value, 180.125);
assert.equal(
  trackerDraft('tracker.weight.weight-entry', weight, '2026-10-06', 'metric', {
    ...originalEntry,
    number_value: 81.12345678901234,
  }).value,
  '81.12345678901234',
  'Unconverted input retains the original numeric precision',
);
