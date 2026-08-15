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
  ended_at: null,
  id: 'session',
  inserted_at: timestamp,
  kind: 'planned',
  performed_sets: [
    {
      completed: true,
      exercise_id: 'goblet-squat',
      exercise_name: 'Goblet squat',
      id: 'swapped-set',
      inserted_at: timestamp,
      load_unit: 'kg',
      load_value: 20,
      planned_exercise_index: 0,
      position: 0,
      reps: '10',
      swapped_from_exercise_id: 'back-squat',
      updated_at: timestamp,
    },
    {
      completed: true,
      duration_seconds: 30,
      exercise_id: 'plank',
      exercise_name: 'Plank',
      id: 'added-set',
      inserted_at: timestamp,
      load_unit: 'none',
      load_value: null,
      planned_exercise_index: null,
      position: 1,
      reps: null,
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
const addedCard = cards[1];

assert(plannedCard?.exercise.exercise_id === 'goblet-squat', 'reload must retain the swapped exercise');
assert(plannedCard.name === 'Goblet squat', 'reload must retain the swapped exercise name');
assert(plannedCard.logSwappedFrom === 'back-squat', 'future sets must retain the planned exercise identity');
assert(plannedCard.done[0]?.id === 'swapped-set', 'swapped performed sets must remain assigned to their slot');
assert(addedCard?.added && addedCard.exercise.exercise_id === 'plank', 'reload must retain an added exercise');
assert(addedCard.done[0]?.id === 'added-set', 'added performed sets must remain attached to their exercise');
