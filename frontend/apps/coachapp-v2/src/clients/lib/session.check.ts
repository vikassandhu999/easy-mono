import type {TrainingSession} from '@/api/training-plans-list';
import {buildExerciseGroups, sessionWorkoutName} from './session.ts';

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
  load_unit: 'kg' as const,
  load_value: '100',
  notes: null,
  reps: '5',
  rest_seconds: null,
  rpe: null,
  set_type: 'working' as const,
};
const session = {
  closed_at: timestamp,
  date: '2026-08-02',
  id: 'session',
  inserted_at: timestamp,
  kind: 'planned',
  notes: null,
  performed_sets: [
    {
      exercise_id: 'squat',
      exercise_name: 'Back Squat',
      id: 'set-1',
      inserted_at: timestamp,
      load_unit: 'kg',
      load_value: 100,
      position: 0,
      reps: '5',
      set_type: 'working',
      snapshot_exercise_ref: 'prescribed-squat',
      training_session_id: 'session',
      updated_at: timestamp,
    },
    {
      exercise_id: 'plank',
      exercise_name: 'Plank',
      id: 'set-2',
      inserted_at: timestamp,
      load_unit: 'none',
      load_value: null,
      position: 1,
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
          exercise_id: 'squat',
          exercise_name: 'Back Squat',
          position: 0,
          ref: 'prescribed-squat',
          sets: [plannedSet],
          tracking_type: 'weight_reps',
        },
      ],
      id: 'workout',
      name: 'Lower',
    },
  },
  snapshot_version: 1,
  source_plan_id: 'plan',
  source_workout_id: 'workout',
  soreness_rating: null,
  started_at: timestamp,
  state: 'completed',
  updated_at: timestamp,
} satisfies TrainingSession;

assert(sessionWorkoutName(session) === 'Lower', 'history titles come from the frozen Prescription snapshot');
const groups = buildExerciseGroups(session);
assert(groups[0]?.exerciseName === 'Back Squat', 'planned work aligns to the snapshot exercise');
assert(groups[0]?.isAdded === false, 'snapshot exercises are not marked added');
assert(groups[1]?.exerciseName === 'Plank', 'work outside the snapshot remains visible');
assert(groups[1]?.isAdded === true, 'performed work without a snapshot ref is added');
assert(!('ended_at' in session), 'closing time is closed_at, not ended_at');
assert(!('planned_snapshot' in session), 'history does not read the replaced snapshot blob');
assert(!('training_workout_id' in session), 'history does not depend on a live workout link');
