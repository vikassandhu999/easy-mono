import type {PerformedSet, WorkoutSession} from '@/api/workoutSessions';

export function performedSetFromApi(set: PerformedSet): PerformedSet {
  return set;
}

export function workoutSessionFromApi(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    performed_sets: session.performed_sets.map(performedSetFromApi),
  };
}
