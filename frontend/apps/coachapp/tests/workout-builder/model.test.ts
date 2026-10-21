import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Exercise} from '../../src/api/exercises.ts';
import type {Workout as SavedWorkout} from '../../src/api/workouts.ts';
import {
  actions,
  bodyOf,
  draftOf,
  groupSummary,
  labelFor,
  problemsOf,
  restoreRemoval,
  restoreRounds,
  restoreTargetMode,
  targetProblem,
  type Workout,
} from '../../src/workout-builder/model.ts';
import {readDraft, readDraftKeys, remapAfterSave, WorkoutSaveQueue} from '../../src/workout-builder/save-queue.ts';

const bench: Exercise = {
  id: 'bench',
  name: 'Bench press',
  kind: 'movement',
  goals: ['strength'],
  places: ['gym'],
  instructions: null,
  metrics: [
    {key: 'reps', label: null},
    {key: 'weight', label: null},
  ],
  equipment: null,
  muscles: [],
  media: [],
  archived_at: null,
  is_builtin: true,
};
const pull: Exercise = {...bench, id: 'pull', name: 'Pull-up'};
let workout: Workout = {id: 'workout', name: 'Upper A', description: '', type: 'prescribed', video: '', groups: []};
workout = actions.addExercise(workout, 'new', bench);
assert.equal(workout.groups[0]?.rounds, 3);
workout = actions.putTarget(workout, {group: 0, exercise: 0, key: 'rest', round: null}, {mode: 'exact', v: '1:30'});
workout = actions.togglePerRound(workout, 0, 0);
workout = actions.putTarget(
  workout,
  {group: 0, exercise: 0, key: 'rest', round: 1},
  {mode: 'range', min: '60', max: '90'},
);
workout = actions.putTarget(workout, {group: 0, exercise: 0, key: 'rest', round: 2}, {mode: 'none'});
workout = actions.addExercise(workout, 0, pull);
const body = bodyOf(workout);
assert.deepEqual(
  body.groups?.[0]?.exercises[0]?.targets?.map((round) => round.rest),
  [{mode: 'none'}, {mode: 'none'}, {mode: 'none'}],
);
assert.deepEqual(body.groups?.[0]?.exercises[1]?.targets, [
  {rest: {mode: 'exact', value_s: 90}},
  {rest: {mode: 'range', min_s: 60, max_s: 90}},
  {rest: {mode: 'none'}},
]);
assert.equal(body.groups?.[0]?.exercises[1]?.targets_mode, 'per_round');
workout = actions.setRounds(workout, 0, 4);
assert.equal(workout.groups[0]?.exercises[1]?.roundTargets.length, 4);
assert.deepEqual(workout.groups[0]?.exercises[1]?.roundTargets[3], {rest: {mode: 'none'}});
const removed = actions.removeExercise(workout, 0, 0);
const edited = {
  ...removed,
  description: 'Keep the new instructions.',
  groups: removed.groups.map((group) => ({...group, name: 'Renamed'})),
};
const restored = restoreRemoval(edited, workout);
assert.equal(restored.description, 'Keep the new instructions.');
assert.equal(restored.groups[0]?.name, 'Renamed');
assert.deepEqual(
  restored.groups[0]?.exercises.map((exercise) => exercise.source.name),
  ['Bench press', 'Pull-up'],
);
const empty = actions.removeExercise(actions.removeExercise(workout, 0, 0), 0, 0);
assert.equal(empty.groups.length, 0);
assert.deepEqual(readDraft(JSON.stringify(workout)), workout);
assert.equal(readDraft('{}'), null);
assert.equal(readDraft(JSON.stringify({...workout, groups: [{...workout.groups[0], rounds: 0}]})), null);
assert.equal(
  readDraft(JSON.stringify({...workout, groups: [{...workout.groups[0], exercises: [{source: {id: 'x'}}]}]})),
  null,
);
assert.equal(problemsOf({...workout, name: ''}), 'Enter a workout name.');
const invalid = actions.putTarget(
  workout,
  {group: 0, exercise: 1, key: 'reps', round: 0},
  {mode: 'exact', v: 'Infinity'},
);
assert.match(problemsOf(invalid) ?? '', /valid Reps value/);

const saved = {
  id: 'original',
  client_id: 'client',
  name: 'Upper A',
  description: null,
  type: 'prescribed' as const,
  video: null,
  archived_at: null,
  groups: [],
};
const calls: {id: string; name: string}[] = [];
let release: (() => void) | undefined;
let active = 0;
let peak = 0;
const persisted: (Workout | null)[] = [];
const queue = new WorkoutSaveQueue(
  draftOf(saved),
  async (id, request) => {
    active++;
    peak = Math.max(peak, active);
    calls.push({id, name: request.name});
    if (calls.length === 1) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    active--;
    return {...saved, id: 'replacement', name: request.name};
  },
  () => undefined,
  (draft) => persisted.push(draft),
);
queue.change({...queue.draft, name: 'First edit'});
const flushing = queue.flush();
queue.change({...queue.draft, name: 'Latest edit'});
release?.();
await flushing;
assert.deepEqual(calls, [
  {id: 'original', name: 'First edit'},
  {id: 'replacement', name: 'Latest edit'},
]);
assert.equal(peak, 1);
assert.equal(queue.state, 'saved');
assert.equal(queue.draft.name, 'Latest edit');
assert.equal(persisted.at(-1), null);
queue.dispose();
let failed = true;
const retry = new WorkoutSaveQueue(
  draftOf(saved),
  async (_id, request) => {
    if (failed) {
      throw new Error('No connection');
    }
    return {...saved, name: request.name};
  },
  () => undefined,
  (draft) => persisted.push(draft),
);
retry.change({...retry.draft, name: 'Keep this edit'});
await retry.flush();
assert.equal(retry.state, 'failed');
assert.equal(persisted.at(-1)?.name, 'Keep this edit');
failed = false;
await retry.flush();
assert.equal(retry.state, 'saved');
assert.equal(persisted.at(-1), null);
retry.dispose();
console.log(
  'Workout cards preserve per-round rest, removal Undo preserves later edits, and serialized autosave follows W37 ids and retries retained drafts.',
);

const originalRows = actions.addExercise(
  {id: 'prior', name: 'Preserved', description: '', type: 'prescribed', video: '', groups: []},
  'new',
  bench,
);
const returned = {
  id: 'new-workout',
  client_id: 'client',
  name: 'Preserved',
  description: null,
  type: 'prescribed' as const,
  video: null,
  groups: [
    {
      id: 'server-card',
      name: null,
      rounds: 3,
      exercises: [
        {
          id: 'server-exercise',
          exercise_id: 'bench',
          exercise: {...bench, name: 'Prescribed bench'},
          side_mode: 'combined' as const,
          targets_mode: 'same_for_all' as const,
          targets: [{rest: {mode: 'client_chooses' as const}}],
        },
      ],
    },
  ],
};
const latestRows = actions.addExercise({...originalRows, description: 'Concurrent instruction'}, 'new', pull);
const mapped = remapAfterSave(latestRows, originalRows, returned);
assert.equal(mapped.id, 'new-workout');
assert.equal(mapped.description, 'Concurrent instruction');
assert.equal(mapped.groups[0]?.id, 'server-card');
assert.equal(mapped.groups[0]?.exercises[0]?.id, 'server-exercise');
assert.equal(mapped.groups[0]?.exercises[0]?.source.name, 'Prescribed bench');
assert.equal(mapped.groups[1]?.id, latestRows.groups[1]?.id);
assert.equal(mapped.groups[1]?.exercises[0]?.id, latestRows.groups[1]?.exercises[0]?.id);
const remappedCalls: {id: string; childId: string | undefined; instructions: string | null | undefined}[] = [];
let releaseRows: (() => void) | undefined;
const childQueue = new WorkoutSaveQueue(
  originalRows,
  async (id, request) => {
    remappedCalls.push({id, childId: request.groups?.[0]?.exercises[0]?.id, instructions: request.description});
    if (remappedCalls.length === 1) {
      await new Promise<void>((resolve) => {
        releaseRows = resolve;
      });
    }
    return returned;
  },
  () => undefined,
  () => undefined,
);
childQueue.change({...originalRows, description: 'First'});
const rowsFlushing = childQueue.flush();
childQueue.change({...childQueue.draft, description: 'Concurrent latest'});
releaseRows?.();
await rowsFlushing;
assert.deepEqual(remappedCalls, [
  {id: 'prior', childId: originalRows.groups[0]?.exercises[0]?.id, instructions: 'First'},
  {id: 'new-workout', childId: 'server-exercise', instructions: 'Concurrent latest'},
]);
childQueue.dispose();

// Local Undo keeps stable UI identity while a removal save copies/remaps surviving database rows.
const paired = actions.addExercise(originalRows, 0, pull);
const withoutBench = actions.removeExercise(paired, 0, 0);
const savedAfterRemoval = {
  ...returned,
  groups: [
    {
      ...returned.groups[0],
      exercises: [
        {
          ...returned.groups[0].exercises[0],
          id: 'server-pull',
          exercise_id: pull.id,
          exercise: {...pull, name: 'Prescribed pull-up'},
        },
      ],
    },
  ],
};
const changedAfterRemoval = {...withoutBench, description: 'Later edit'};
const remappedRemoval = remapAfterSave(changedAfterRemoval, withoutBench, savedAfterRemoval);
const undoMapped = restoreRemoval(remappedRemoval, paired);
assert.equal(undoMapped.groups.length, 1);
assert.equal(undoMapped.groups[0]?.id, 'server-card');
assert.equal(undoMapped.description, 'Later edit');
assert.deepEqual(
  undoMapped.groups[0]?.exercises.map((row) => row.source.name),
  ['Bench press', 'Prescribed pull-up'],
);
assert.equal(undoMapped.groups[0]?.exercises[1]?.id, 'server-pull');
const beforeCardRemoval = actions.addExercise(originalRows, 'new', pull);
const removedFirstCard = actions.removeGroup(beforeCardRemoval, 0);
const savedAfterCardRemoval = {
  ...savedAfterRemoval,
  groups: [{...savedAfterRemoval.groups[0], id: 'remaining-server-card'}],
};
const remappedCards = remapAfterSave(removedFirstCard, removedFirstCard, savedAfterCardRemoval);
const undoneCard = restoreRemoval(remappedCards, beforeCardRemoval);
assert.equal(undoneCard.groups.length, 2);
assert.equal(undoneCard.groups[1]?.id, 'remaining-server-card');
assert.deepEqual(
  undoneCard.groups.map((row) => row.exercises[0]?.source.name),
  ['Bench press', 'Prescribed pull-up'],
);

assert.deepEqual(
  readDraftKeys(
    JSON.stringify({storageKeys: ['draft:coach:original', 'draft:coach:copy', 'draft:other-client:private', 7]}),
    'draft:coach:',
  ),
  ['draft:coach:original', 'draft:coach:copy'],
);
assert.deepEqual(readDraftKeys('{', 'draft:coach:'), []);

const labelled: Exercise = {
  ...bench,
  metrics: [
    {key: 'reps', label: 'Waves'},
    {key: 'successes', label: 'Good waves'},
    {key: 'attempts', label: null},
  ],
};
assert.equal(labelFor('reps', labelled), 'Waves');
assert.equal(labelFor('successes', labelled), 'Good waves');
assert.equal(labelFor('attempts', labelled), 'Attempts');

function savedTargets(
  targets: SavedWorkout['groups'][number]['exercises'][number]['targets'],
  sideMode: 'combined' | 'per_side' = 'combined',
): SavedWorkout {
  return {
    ...returned,
    groups: [
      {
        ...returned.groups[0],
        exercises: [
          {
            ...returned.groups[0].exercises[0],
            targets,
            side_mode: sideMode,
          },
        ],
      },
    ],
  };
}

test('rest none round-trips', () => {
  const draft = draftOf(savedTargets([{rest: {mode: 'none'}}]));
  assert.deepEqual(draft.groups[0]?.exercises[0]?.targets.rest, {mode: 'none'});
  assert.deepEqual(bodyOf(draft).groups?.[0]?.exercises[0]?.targets, [{rest: {mode: 'none'}}]);
});

test('moving an exercise to a new card preserves its targets and side mode', () => {
  const paired = actions.addExercise(
    actions.addExercise(
      draftOf(savedTargets([{reps: {mode: 'exact', value: 8}, rest: {mode: 'none'}}], 'per_side')),
      0,
      pull,
    ),
    'new',
    bench,
  );
  const result = actions.moveExerciseToGroup(paired, 0, 0, 'new');
  assert.equal(result.groups.length, 3);
  assert.deepEqual(bodyOf(result).groups?.[2]?.exercises[0]?.targets, [
    {reps: {mode: 'exact', value: 8}, rest: {mode: 'none'}},
  ]);
  assert.equal(result.groups[2]?.exercises[0]?.sideMode, 'per_side');
  assert.equal(result.groups[2]?.exercises[0]?.uiId, paired.groups[0]?.exercises[0]?.uiId);
});

test('disposing a queue sends its pending valid edit without waiting for the debounce', async () => {
  let written = '';
  const queue = new WorkoutSaveQueue(
    draftOf(saved),
    async (_id, body) => {
      written = body.name;
      return {...saved, name: body.name};
    },
    () => undefined,
    () => undefined,
  );
  queue.change({...queue.draft, name: 'Saved on leaving'});
  queue.dispose();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(written, 'Saved on leaving');
  assert.equal(queue.state, 'saved');
});

test('invalid input remains distinct from a failed save and is never sent on leaving', async () => {
  let writes = 0;
  const queue = new WorkoutSaveQueue(
    draftOf(saved),
    async () => {
      writes++;
      return saved;
    },
    () => undefined,
    () => undefined,
  );
  queue.change({...queue.draft, name: ''});
  queue.dispose();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(queue.state, 'invalid');
  assert.equal(queue.error, 'Enter a workout name.');
  assert.equal(writes, 0);
});

test('round Undo restores removed targets while preserving later edits to remaining rounds', () => {
  let before = actions.togglePerRound(
    draftOf(savedTargets([{reps: {mode: 'exact', value: 6}, rest: {mode: 'none'}}])),
    0,
    0,
  );
  before = actions.putTarget(before, {group: 0, exercise: 0, key: 'reps', round: 1}, {mode: 'exact', v: '7'});
  before = actions.putTarget(before, {group: 0, exercise: 0, key: 'reps', round: 2}, {mode: 'exact', v: '9'});
  let current = actions.setRounds(before, 0, 2);
  current = actions.putTarget(
    {...current, description: 'Later instructions'},
    {group: 0, exercise: 0, key: 'reps', round: 0},
    {mode: 'exact', v: '10'},
  );
  const restored = restoreRounds(current, before.groups[0], 2);
  assert.equal(restored.description, 'Later instructions');
  assert.deepEqual(
    bodyOf(restored).groups?.[0]?.exercises[0]?.targets?.map((row) => row.reps?.value),
    [10, 7, 9],
  );
});

test('target-mode Undo follows an exercise moved to another card and retains its later side choice', () => {
  const before = actions.togglePerRound(
    draftOf(savedTargets([{reps: {mode: 'exact', value: 8}, rest: {mode: 'none'}}])),
    0,
    0,
  );
  let current = actions.togglePerRound(before, 0, 0);
  current = actions.addExercise(current, 0, pull);
  current = actions.moveExerciseToGroup(current, 0, 0, 'new');
  current = actions.setSideMode(current, 1, 0, 'per_side');
  const restored = restoreTargetMode(current, before.groups[0].exercises[0]);
  assert.equal(restored.groups[1]?.exercises[0]?.sideMode, 'per_side');
  assert.equal(restored.groups[1]?.exercises[0]?.perRound, true);
  assert.equal(bodyOf(restored).groups?.[1]?.exercises[0]?.targets?.length, 3);
});

test('target problems identify the input that needs correction', () => {
  assert.deepEqual(targetProblem('reps', {mode: 'range', min: '10', max: '5'}, bench), {
    field: 'max',
    message: 'Enter a valid Reps range for Bench press.',
  });
  assert.deepEqual(targetProblem('rest', {mode: 'exact', v: ''}), {field: 'v', message: 'Enter a valid Rest value.'});
  assert.equal(targetProblem('weight', {mode: 'exact', v: '-5'}), null);
});

test('client chooses rest round-trips', () => {
  const draft = draftOf(savedTargets([{rest: {mode: 'client_chooses'}}]));
  assert.deepEqual(draft.groups[0]?.exercises[0]?.targets.rest, {mode: 'client_chooses'});
  assert.deepEqual(bodyOf(draft).groups?.[0]?.exercises[0]?.targets, [{rest: {mode: 'client_chooses'}}]);
});

test('side mode round-trips', () => {
  const draft = draftOf(savedTargets([{rest: {mode: 'none'}}], 'per_side'));
  assert.equal(draft.groups[0]?.exercises[0]?.sideMode, 'per_side');
  assert.equal(bodyOf(draft).groups?.[0]?.exercises[0]?.side_mode, 'per_side');
  const combined = actions.setSideMode(draft, 0, 0, 'combined');
  assert.equal(bodyOf(combined).groups?.[0]?.exercises[0]?.side_mode, 'combined');
});

test('per-round target count follows rounds', () => {
  let draft = draftOf(savedTargets([{rest: {mode: 'none'}}], 'per_side'));
  draft = actions.togglePerRound(draft, 0, 0);
  draft = actions.setRounds(draft, 0, 5);
  assert.equal(bodyOf(draft).groups?.[0]?.exercises[0]?.targets?.length, 5);
  draft = actions.setRounds(draft, 0, 2);
  assert.equal(bodyOf(draft).groups?.[0]?.exercises[0]?.targets?.length, 2);
});

test('Any metrics are omitted and video uses the external URL', () => {
  let draft = draftOf(savedTargets([{reps: {mode: 'client_chooses'}, rest: {mode: 'none'}}]));
  assert.deepEqual(bodyOf(draft).groups?.[0]?.exercises[0]?.targets, [{rest: {mode: 'none'}}]);
  draft = draftOf({...saved, type: 'video', video: {id: 'video', url: 'https://example.com/workout.mp4'}});
  assert.equal(draft.video, 'https://example.com/workout.mp4');
  assert.equal(bodyOf(draft).video_url, 'https://example.com/workout.mp4');
});

test('stored drafts validate side modes, labelled metrics, media and rest modes', () => {
  const draft = draftOf(savedTargets([{rest: {mode: 'client_chooses'}}], 'per_side'));
  assert.deepEqual(readDraft(JSON.stringify(draft)), draft);
  const entry = draft.groups[0]?.exercises[0];
  const withEntry = (change: object) =>
    JSON.stringify({...draft, groups: [{...draft.groups[0], exercises: [{...entry, ...change}]}]});
  assert.equal(readDraft(withEntry({sideMode: 'left'})), null);
  assert.equal(readDraft(withEntry({targets: {rest: {mode: 'max'}}})), null);
  assert.equal(readDraft(withEntry({targets: {reps: {mode: 'none'}}})), null);
  assert.equal(readDraft(withEntry({source: {...bench, metrics: ['reps']}})), null);
  assert.equal(readDraft(withEntry({source: {...bench, media: [{id: 'media', url: 7, caption: null}]}})), null);
});

test('group summaries read naturally for no rest and client-chosen rest', () => {
  const single = (rest: Parameters<typeof actions.putTarget>[2]) => {
    const empty: Workout = {id: 'w', name: 'Summary', description: '', type: 'prescribed', video: '', groups: []};
    const added = actions.addExercise(empty, 'new', bench);
    const group = actions.putTarget(added, {group: 0, exercise: 0, key: 'rest', round: null}, rest).groups[0];
    assert.ok(group);
    return groupSummary(group, 0);
  };
  assert.equal(single({mode: 'none'}), 'No rest between rounds');
  assert.equal(single({mode: 'choose'}), 'Client-chosen rest between rounds');
  assert.equal(single({mode: 'exact', v: '1:30'}), 'Rest 1:30 between rounds');
});
