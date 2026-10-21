import assert from 'node:assert/strict';
import {emptyWorkoutDraft, parseWorkoutDraft, type SessionOperation} from '@easy/workouts/session';
import {recordingStorageKey} from '../../src/workout-session/model.ts';
import {occursOn} from '../../src/workout-week/model.ts';

const command: SessionOperation = {action: 'reopen', id: 'log'};
const draft = {...emptyWorkoutDraft(), pending: {commands: [command], clearInputs: []}};
assert.deepEqual(parseWorkoutDraft(JSON.parse(JSON.stringify(draft)), 'log'), draft);
assert.equal(parseWorkoutDraft(draft, 'other-log'), null);
assert.notEqual(recordingStorageKey('coach-a', 'client', 'log'), recordingStorageKey('coach-b', 'client', 'log'));
assert.notEqual(recordingStorageKey('coach', 'client-a', 'log'), recordingStorageKey('coach', 'client-b', 'log'));
const schedule = {
  id: 'schedule',
  client_id: 'client',
  workout_id: 'workout',
  from_date: '2026-10-19',
  until_date: '2026-10-25',
  weekdays_mask: 1,
  time: null,
  place: null,
  meeting_url: null,
  coach_id: null,
};
assert.equal(occursOn(schedule, '2026-10-19'), true);
assert.equal(occursOn(schedule, '2026-10-20'), false);
assert.equal(occursOn(schedule, '2026-10-26'), false);
assert.equal(occursOn({...schedule, from_date: '2026-10-20'}, '2026-10-19'), false);
