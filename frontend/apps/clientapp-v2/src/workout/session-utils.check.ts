import type {TrainingSession} from '../api/training.ts';
import {activeExerciseCards} from './session-utils.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const timestamp = '2026-08-02T10:00:00Z';
const plannedSet = {
  distance_unit: null,
  distance_value: null,
  duration_seconds: null,
  load_unit: null,
  load_value: null,
  notes: null,
  reps: '10',
  rest_seconds: null,
  rpe: null,
  set_type: 'working' as const,
};
const session = {
  closed_at: null,
  date: '2026-08-02',
  id: 'session',
  inserted_at: timestamp,
  kind: 'planned',
  performed_sets: [
    {
      exercise_id: 'goblet-squat',
      exercise_name: 'Goblet squat',
      id: 'swapped-set',
      inserted_at: timestamp,
      load_unit: 'kg',
      load_value: 20,
      position: 0,
      reps: '10',
      set_type: 'working',
      snapshot_exercise_ref: 'prescribed-exercise',
      training_session_id: 'session',
      updated_at: timestamp,
    },
    {
      exercise_id: 'bench-press',
      exercise_name: 'Bench press',
      id: 'planned-set',
      inserted_at: timestamp,
      load_unit: 'kg',
      load_value: 60,
      position: 1,
      reps: '8',
      set_type: 'working',
      snapshot_exercise_ref: 'prescribed-bench',
      training_session_id: 'session',
      updated_at: timestamp,
    },
    {
      duration_seconds: 30,
      exercise_id: 'plank',
      exercise_name: 'Plank',
      id: 'added-set',
      inserted_at: timestamp,
      load_unit: 'none',
      load_value: null,
      position: 2,
      reps: null,
      set_type: 'working',
      snapshot_exercise_ref: null,
      training_session_id: 'session',
      updated_at: timestamp,
    },
    {
      duration_seconds: 20,
      exercise_id: null,
      exercise_name: 'Hill sprint',
      id: 'named-set',
      inserted_at: timestamp,
      load_unit: null,
      load_value: null,
      position: 3,
      reps: null,
      set_type: 'working',
      snapshot_exercise_ref: null,
      training_session_id: 'session',
      updated_at: timestamp,
    },
  ],
  prescription_snapshot: {
    plan: {id: 'plan', name: 'Strength', revision: 1},
    version: 1,
    workout: {
      exercises: [
        {
          exercise_id: 'back-squat',
          exercise_name: 'Back squat',
          position: 0,
          ref: 'prescribed-exercise',
          sets: [plannedSet, plannedSet],
          tracking_type: 'weight_reps',
        },
        {
          exercise_id: 'bench-press',
          exercise_name: 'Bench press',
          position: 1,
          ref: 'prescribed-bench',
          sets: [plannedSet],
          tracking_type: 'weight_reps',
        },
      ],
      id: 'workout',
      name: 'Leg day',
    },
  },
  snapshot_version: 1,
  source_plan_id: 'plan',
  source_workout_id: 'workout',
  started_at: timestamp,
  state: 'active',
  updated_at: timestamp,
} satisfies TrainingSession;

const cards = activeExerciseCards(session, {added: [], swaps: new Map()});
const plannedCard = cards[0];
const ordinaryPlannedCard = cards[1];
const addedCard = cards[2];
const namedCard = cards[3];

assert(plannedCard?.exercise.exercise_id === 'goblet-squat', 'reload must retain the swapped exercise');
assert(plannedCard.name === 'Goblet squat', 'reload must retain the swapped exercise name');
assert(
  plannedCard.logSnapshotRef === 'prescribed-exercise',
  'future sets must retain the stable snapshot exercise identity',
);
assert(plannedCard.done[0]?.id === 'swapped-set', 'swapped performed sets must remain assigned to their slot');
assert(ordinaryPlannedCard?.done[0]?.id === 'planned-set', 'planned work must map by its stable snapshot ref');
assert(addedCard?.added && addedCard.exercise.exercise_id === 'plank', 'reload must retain an added exercise');
assert(addedCard.done[0]?.id === 'added-set', 'added performed sets must remain attached to their exercise');
assert(namedCard?.added && namedCard.exercise.exercise_id == null, 'reload must retain explicitly named work');
assert(namedCard.name === 'Hill sprint', 'explicit work must retain its frozen exercise name');
