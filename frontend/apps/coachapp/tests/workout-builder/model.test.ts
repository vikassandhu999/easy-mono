import assert from 'node:assert/strict';
import type {Exercise} from '../../src/api/exercises.ts';
import {labelOf} from '../../src/exercises/exercise.ts';
import {actions, bodyOf, draftOf, problemsOf, restoreRemoval, type Workout} from '../../src/workout-builder/model.ts';
import {readDraft, readDraftKeys, remapAfterSave, WorkoutSaveQueue} from '../../src/workout-builder/save-queue.ts';

const bench: Exercise = {
  id: 'bench',
  name: 'Bench press',
  kind: 'movement',
  goals: ['strength'],
  places: ['gym'],
  metrics: ['reps', 'weight'],
  count_label: null,
  grade_scale: [],
  unilateral: false,
  equipment: [],
  muscles: [],
  media: null,
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
assert.deepEqual(body.groups?.[0]?.exercises[0]?.rest, [null, null, null]);
assert.deepEqual(body.groups?.[0]?.exercises[1]?.rest, [
  {mode: 'exact', value: 90},
  {mode: 'range', min: 60, max: 90},
  null,
]);
assert.deepEqual(body.groups?.[0]?.exercises[1]?.targets, [{}, {}, {}]);
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
          targets_mode: 'same_for_all' as const,
          targets: [{}],
          rest: [],
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

assert.equal(labelOf('reps', {count_label: 'Waves'}), 'Waves');
assert.equal(labelOf('successes', {count_label: 'Waves'}), 'Waves · Successes');
assert.equal(labelOf('attempts', {count_label: 'Waves'}), 'Waves · Attempts');
