import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {RecordingSet} from '../src/recording.ts';
import {
  acknowledgeCommand,
  activityCommands,
  copyTargets,
  createRecordingController,
  effortLabel,
  emptyWorkoutDraft,
  feedbackBody,
  finishCommands,
  hasRecordedWork,
  inputLabel,
  type MeasurementBody,
  measurementBody,
  outcomeCommands,
  overallInputKey,
  parseWorkoutDraft,
  planDraft,
  planTargets,
  prepareActivity,
  queueCommands,
  restBody,
  restDraft,
  roundsFor,
  type SessionActivity,
  type SessionEntry,
  type SessionLog,
  type SessionOperation,
  type SessionRow,
  savedInput,
  selectedActivity,
  slotCommands,
  slotInputKey,
  slotModel,
  slotView,
  swapCommands,
  targetLine,
  type WorkoutDraft,
} from '../src/session.ts';

type Activity = SessionActivity &
  MeasurementBody & {exercise: SessionActivity['exercise'] & {name: string}; sets: SetOutcome[]};
type SetOutcome = RecordingSet & MeasurementBody;
type Log = SessionLog & {exercise_logs: Activity[]};
const squat = {
  id: 'squat',
  name: 'Bulgarian split squat',
  metrics: [
    {key: 'reps' as const, label: null},
    {key: 'weight' as const, label: null},
  ],
};
const entry: SessionEntry = {
  id: 'entry',
  exercise_id: squat.id,
  exercise: squat,
  side_mode: 'per_side',
  targets_mode: 'same_for_all',
  targets: [{reps: {mode: 'exact', value: 8}, weight: {mode: 'exact', value: 16}, rest: {mode: 'exact', value_s: 60}}],
};
function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity',
    exercise_id: squat.id,
    exercise: squat,
    workout_exercise_id: entry.id,
    state: 'active',
    position: 0,
    side_mode: 'per_side',
    rounds: 3,
    targets_mode: 'same_for_all',
    targets: [{rest: {mode: 'none'}}],
    sets: [],
    ...overrides,
  };
}
function set(overrides: Partial<SetOutcome> = {}): SetOutcome {
  return {id: 'set', state: 'completed', round: 1, side: 'left', reps: 10, ...overrides};
}
function row(activities: Activity[] = []): SessionRow {
  return {entry, activities, current: activities.at(-1) ?? null, slots: []};
}
const inputKey = slotInputKey(entry.id, squat.id, {round: 1, side: 'left'});

test('slot views keep original names and distinguish done, skipped and absent across replacements', () => {
  const log: Log = {
    id: 'log',
    exercise_logs: [
      activity({sets: [set()]}),
      activity({
        id: 'replacement',
        position: 1,
        exercise_id: 'front',
        exercise: {...squat, id: 'front', name: 'Front squat'},
        sets: [set({id: 'skip', round: 2, side: 'right', state: 'skipped', reps: null})],
      }),
    ],
  };
  const source = {id: entry.id, workout_exercise_id: entry.id};
  const left = slotView(log, source, {round: 1, side: 'left'});
  assert.equal(left.kind, 'completed');
  assert.equal(left.activity?.exercise.name, 'Bulgarian split squat');
  assert.equal(left.set?.reps, 10);
  assert.equal(slotView(log, source, {round: 2, side: 'right'}).kind, 'skipped');
  assert.deepEqual(slotView(log, source, {round: 3, side: 'right'}), {kind: 'unrecorded', activity: null, set: null});
  assert.notEqual(inputKey, slotInputKey(entry.id, squat.id, {round: 1, side: 'right'}));
  assert.notEqual(inputKey, slotInputKey(entry.id, 'front', {round: 1, side: 'left'}));
  assert.equal(overallInputKey(entry.id, squat.id), 'overall.entry.squat');
});

test('empty Done sends no prescribed numbers and explicit corrections can clear values', () => {
  assert.deepEqual(measurementBody(squat, {}, 'detail'), {ok: true, body: {}});
  assert.deepEqual(measurementBody(squat, {reps: '', weight: ''}, 'detail'), {ok: true, body: {}});
  assert.deepEqual(measurementBody(squat, {reps: '0', weight: '-12,5'}, 'detail'), {
    ok: true,
    body: {reps: 0, weight_kg: -12.5},
  });
  assert.deepEqual(measurementBody(squat, {reps: ''}, 'detail', true), {ok: true, body: {reps: null}});
  assert.equal(measurementBody(squat, {reps: '2.5'}, 'detail').ok, false);
  assert.equal(savedInput({weight_kg: 40}, 'weight'), '40');
  assert.equal(savedInput(null, 'weight'), '');
});

test('measurement fields produce typed overall values, enum outcomes and detail-only reserve', () => {
  const exercise = {
    metrics: [
      {key: 'distance' as const, label: null},
      {key: 'duration' as const, label: null},
      {key: 'result' as const, label: null},
      {key: 'reserve' as const, label: null},
    ],
  };
  assert.deepEqual(
    measurementBody(exercise, {distance: '5000', duration: '30:00', result: 'win', reserve: '2'}, 'overall'),
    {ok: true, body: {distance_m: 5000, duration_s: 1800, result: 'win'}},
  );
  assert.deepEqual(measurementBody(exercise, {reserve: '2'}, 'detail'), {ok: true, body: {reserve: 2}});
  assert.equal(measurementBody(exercise, {result: 'maybe'}, 'detail').ok, false);
});

test('queued commands survive reload and clear only acknowledged inputs', () => {
  const commands: SessionOperation[] = [
    {action: 'startActivity', id: 'log', body: {id: 'new-activity', exercise_id: squat.id}},
    {
      action: 'recordSet',
      id: 'log',
      activityId: 'new-activity',
      body: {id: 'new-set', state: 'completed', round: 1, side: 'left'},
    },
  ];
  const draft = {...emptyWorkoutDraft(), inputs: {[inputKey]: {reps: '10'}, other: {reps: '8'}}};
  const queued = queueCommands(draft, commands, [inputKey]);
  const restored = parseWorkoutDraft(JSON.parse(JSON.stringify(queued)), 'log');
  assert.ok(restored);
  assert.deepEqual(restored.pending?.commands, commands);
  assert.deepEqual(queueCommands(restored, [{action: 'reopen', id: 'log'}], []).pending, restored.pending);
  const afterFirst = acknowledgeCommand(restored);
  assert.deepEqual(afterFirst.pending?.commands, [commands[1]]);
  assert.deepEqual(acknowledgeCommand(afterFirst), {version: 1, inputs: {other: {reps: '8'}}, pending: null});
  assert.equal(parseWorkoutDraft(queued, 'other-log'), null);
  assert.equal(parseWorkoutDraft({version: 1, inputs: [], pending: null}), null);
  assert.equal(parseWorkoutDraft({...queued, pending: {commands: [{action: 'unknown'}], clearInputs: []}}), null);
  assert.equal(parseWorkoutDraft({...draft, inputs: {bad: {grade: 'V1'}}, pending: null}), null);
});

test('copying compatible targets keeps session rest without producing actual results', () => {
  const replacement = activity({
    exercise: {...squat, metrics: [{key: 'reps', label: null}]},
    targets: [{rest: {mode: 'exact', value_s: 90}}],
  });
  assert.deepEqual(copyTargets(entry, replacement), {
    targets_mode: 'same_for_all',
    targets: [{reps: {mode: 'exact', value: 8}, rest: {mode: 'exact', value_s: 90}}],
  });
  assert.equal(replacement.reps, undefined);
});

test('shared input and target labels keep canonical units and custom metric labels', () => {
  assert.equal(inputLabel({key: 'reps', label: null}), 'Reps');
  assert.equal(inputLabel({key: 'weight', label: null}), 'Weight (kg)');
  assert.equal(inputLabel({key: 'duration', label: null}), 'Time (s or m:ss)');
  assert.equal(inputLabel({key: 'speed', label: null}), 'Speed (m/s)');
  assert.equal(inputLabel({key: 'power', label: null}), 'Power (W)');
  assert.equal(inputLabel({key: 'power', label: 'Average output'}), 'Average output (W)');
  assert.equal(
    targetLine({metrics: [{key: 'reps', label: 'Laps'}]}, {reps: {mode: 'exact', value: 5}, rest: {mode: 'none'}}),
    'Laps 5 · Rest None',
  );
  assert.equal(effortLabel(4), 'Hard');
  assert.equal(effortLabel(null), '');
});

test('rest editors retain fractional seconds, client choice and explicit no rest', () => {
  for (const rest of [
    {mode: 'none' as const},
    {mode: 'client_chooses' as const},
    {mode: 'exact' as const, value_s: 1.5},
    {mode: 'range' as const, min_s: 30, max_s: 60},
  ]) {
    assert.deepEqual(restBody(restDraft(rest)), rest);
  }
  assert.equal(restBody({mode: 'range', value: '', min: '60', max: '30'}), null);
});

test('feedback and rest-plan edits preserve optional answers and metric targets', () => {
  const log = {effort: null, pain: null, text: null};
  assert.deepEqual(feedbackBody(log, {effort: '', pain: '', text: ''}), {});
  assert.deepEqual(feedbackBody(log, {effort: '4', pain: 'yes', text: '  Knee felt tired.  '}), {
    effort: 4,
    pain: true,
    text: 'Knee felt tired.',
  });
  assert.deepEqual(feedbackBody({...log, text: 'Old note'}, {effort: '', pain: '', text: ''}), {text: null});
  assert.deepEqual(planTargets(entry, [{mode: 'none'}]), [
    {reps: {mode: 'exact', value: 8}, weight: {mode: 'exact', value: 16}, rest: {mode: 'none'}},
  ]);
  assert.deepEqual(planTargets(null, [{mode: 'client_chooses'}]), [{rest: {mode: 'client_chooses'}}]);
});

test('selected activities and round headings keep prescription and recorded instruction ownership', () => {
  const first = activity();
  const last = activity({id: 'last', state: 'completed', rounds: 4});
  assert.equal(selectedActivity({...row([first, last]), current: null})?.id, 'last');
  assert.equal(selectedActivity(row([first]))?.id, first.id);
  const workout = {groups: [{rounds: 3, exercises: [entry]}]};
  assert.equal(roundsFor(workout, row()), 3);
  assert.equal(roundsFor(workout, row([last])), 4);
  assert.equal(roundsFor({groups: []}, row()), 1);
  assert.equal(hasRecordedWork(first), false);
  assert.equal(hasRecordedWork({...first, weight_kg: 0}), true);
  assert.equal(hasRecordedWork({...first, state: 'completed'}), true);
  assert.equal(hasRecordedWork({...first, sets: [set({reps: undefined})]}), true);
  assert.equal(hasRecordedWork({...first, sets: [set({state: 'skipped', reps: null})]}), false);
});

test('slot models retain the saved exercise and targets while unrecorded slots use the replacement', () => {
  const original = activity({sets: [set()], targets: [{reps: {mode: 'exact', value: 10}, rest: {mode: 'none'}}]});
  const replacement = activity({
    id: 'replacement',
    exercise: {...squat, id: 'front', name: 'Front squat'},
    exercise_id: 'front',
    position: 1,
  });
  const log = {id: 'log', exercise_logs: [original, replacement]};
  const current = row([original, replacement]);
  const saved = slotModel(log, current, {round: 1, side: 'left'}, emptyWorkoutDraft(), replacement.exercise);
  assert.ok(saved);
  assert.equal(saved.name, 'Bulgarian split squat set 1 left');
  assert.equal(saved.key, 'set.set');
  assert.equal(saved.target?.reps?.value, 10);
  assert.equal(saved.view.set?.reps, 10);
  const key = slotInputKey(entry.id, 'front', {round: 2, side: 'right'});
  const draft = {...emptyWorkoutDraft(), inputs: {[key]: {reps: '8'}}};
  const missing = slotModel(log, current, {round: 2, side: 'right'}, draft, replacement.exercise);
  assert.ok(missing);
  assert.equal(missing.name, 'Front squat set 2 right');
  assert.equal(missing.key, key);
  assert.deepEqual(missing.body, {ok: true, body: {reps: 8}});
});

test('plan drafts preserve saved rounds, reject blank counts, and pad only new target slots', () => {
  const recorded = activity({
    rounds: 3,
    targets_mode: 'per_round',
    targets: [
      {reps: {mode: 'exact', value: 8}, rest: {mode: 'none'}},
      {rest: {mode: 'exact', value_s: 20}},
      {rest: {mode: 'client_chooses'}},
    ],
    sets: [set({round: 4})],
  });
  const current = row([recorded]);
  const seed = planDraft(current, '', []);
  assert.equal(seed.initialRounds, 3);
  assert.equal(seed.minimum, 4);
  assert.equal(seed.valid, false);
  assert.equal(seed.body, null);
  assert.equal(planDraft(current, '3', seed.rests).valid, false);
  const expanded = planDraft(current, '4', seed.rests);
  assert.equal(expanded.valid, true);
  assert.deepEqual(expanded.body?.targets?.[0], {reps: {mode: 'exact', value: 8}, rest: {mode: 'none'}});
  assert.deepEqual(expanded.body?.targets?.[3], {rest: {mode: 'client_chooses'}});
  assert.equal(planDraft(current, '10001', seed.rests).valid, false);
  assert.equal(planDraft(current, '4.5', seed.rests).valid, false);
});

test('command builders create lazy activities and keep slot ownership through corrections and swaps', () => {
  const log: Log = {id: 'log', exercise_logs: []};
  let next = 0;
  const id = () => `id-${++next}`;
  assert.deepEqual(prepareActivity(log, row(), id), {
    id: 'id-1',
    commands: [
      {action: 'startActivity', id: 'log', body: {id: 'id-1', exercise_id: squat.id, workout_exercise_id: entry.id}},
    ],
  });
  const commands = slotCommands(log, row(), {round: 1, side: 'left'}, 'completed', {}, id);
  assert.deepEqual(commands, [
    {action: 'startActivity', id: 'log', body: {id: 'id-2', exercise_id: squat.id, workout_exercise_id: entry.id}},
    {
      action: 'recordSet',
      id: 'log',
      activityId: 'id-2',
      body: {id: 'id-3', state: 'completed', round: 1, side: 'left'},
    },
  ]);
  const original = activity({sets: [set()]});
  const replacement = activity({id: 'replacement', position: 1});
  const recorded: Log = {id: 'log', exercise_logs: [original, replacement]};
  assert.deepEqual(
    slotCommands(recorded, row([original, replacement]), {round: 1, side: 'left'}, 'completed', {reps: 9}, id),
    [{action: 'correctSet', id: 'log', activityId: original.id, setId: 'set', body: {state: 'completed', reps: 9}}],
  );
  assert.deepEqual(swapCommands(recorded, row([original]), 'front', id), [
    {action: 'replaceActivity', id: 'log', activityId: original.id, body: {id: 'id-4', exercise_id: 'front'}},
  ]);
  assert.deepEqual(activityCommands(recorded, row([original]), {rounds: 4}, id), [
    {action: 'updateActivity', id: 'log', activityId: original.id, body: {rounds: 4}},
  ]);
  assert.deepEqual(outcomeCommands(recorded, row([original]), 'completeActivity', id), [
    {action: 'completeActivity', id: 'log', activityId: original.id, body: {}},
  ]);
  assert.deepEqual(finishCommands(recorded, {effort: 4}), [
    {action: 'update', id: 'log', body: {effort: 4}},
    {action: 'finish', id: 'log', body: {}},
  ]);
});

function harness(
  execute: (operation: SessionOperation) => Promise<{data: Log}>,
  initial = activity(),
  restored?: WorkoutDraft,
) {
  let log: Log = {id: 'log', exercise_logs: [initial]};
  let draft: WorkoutDraft = restored ?? {...emptyWorkoutDraft(), inputs: {[inputKey]: {reps: '10'}}};
  let error = '';
  let writesAllowed = true;
  const controller = createRecordingController({
    getLog: () => log,
    getDraft: () => draft,
    isCurrent: () => true,
    writeDraft: async (next) => {
      if (!writesAllowed) {
        return false;
      }
      draft = structuredClone(next);
      return true;
    },
    execute,
    reload: async () => ({data: log}),
    setLog: (next) => {
      log = next;
    },
    setBusy: () => {
      /* Busy state belongs to the app adapter. */
    },
    setError: (next) => {
      error = next;
    },
    createId: () => 'new-id',
  });
  return {
    controller,
    log: () => log,
    draft: () => draft,
    error: () => error,
    failWrites: () => {
      writesAllowed = false;
    },
  };
}

test('a committed set with a lost response retries the same operation after draft reload', async () => {
  const seen = new Map<string, SessionOperation>();
  const calls: SessionOperation[] = [];
  let loseResponse = true;
  const state = harness(async (operation) => {
    calls.push(structuredClone(operation));
    if (operation.action !== 'recordSet') {
      throw new Error('Unexpected action');
    }
    seen.set(operation.body.id, operation);
    if (loseResponse) {
      loseResponse = false;
      throw new Error('Lost response');
    }
    return {data: state.log()};
  });
  const command: SessionOperation = {
    action: 'recordSet',
    id: 'log',
    activityId: 'activity',
    body: {id: 'stable-id', state: 'completed', round: 1, side: 'left', reps: 10},
  };
  await state.controller.commit([command], [inputKey]);
  assert.deepEqual(parseWorkoutDraft(JSON.parse(JSON.stringify(state.draft())))?.pending?.commands, [command]);
  assert.match(state.error(), /Retry saving/);
  const restored = parseWorkoutDraft(JSON.parse(JSON.stringify(state.draft())));
  assert.ok(restored);
  const resumed = harness(
    async (operation) => {
      calls.push(structuredClone(operation));
      if (operation.action !== 'recordSet') {
        throw new Error('Unexpected action');
      }
      seen.set(operation.body.id, operation);
      return {data: state.log()};
    },
    activity(),
    restored,
  );
  await resumed.controller.retry();
  assert.deepEqual(calls, [command, command]);
  assert.equal(seen.size, 1);
  assert.deepEqual(resumed.draft(), emptyWorkoutDraft());
});

test('rejected writes keep inputs but clear pending commands, while storage failure sends nothing', async () => {
  const rejected = harness(async () => {
    throw Object.assign(new Error('Rejected'), {status: 422});
  });
  await rejected.controller.commit([{action: 'reopen', id: 'log'}]);
  assert.equal(rejected.draft().pending, null);
  assert.deepEqual(rejected.draft().inputs, {[inputKey]: {reps: '10'}});
  assert.match(rejected.error(), /Review the values/);
  let calls = 0;
  const unavailable = harness(async () => {
    calls++;
    return {data: unavailable.log()};
  });
  unavailable.failWrites();
  await unavailable.controller.commit([{action: 'reopen', id: 'log'}]);
  assert.equal(calls, 0);
  assert.match(unavailable.error(), /could not be kept/);
});

test('removing an absent set delegates idempotence to the server', async () => {
  let calls = 0;
  const state = harness(async () => {
    calls++;
    return {data: state.log()};
  });
  await state.controller.removeSet('activity', 'absent-set');
  assert.equal(calls, 1);
  assert.equal(state.draft().pending, null);
  assert.deepEqual(state.log().exercise_logs[0]?.sets, []);
});
