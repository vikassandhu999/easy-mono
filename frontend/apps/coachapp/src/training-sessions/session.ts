import type {PerformedSet, Session, SessionPlannedSet} from '../api/training-sessions';

export const sessionStateLabels = {
  active: 'In progress',
  completed: 'Completed',
  discarded: 'Discarded',
} satisfies Record<Session['state'], string>;
export const setTypeLabels = {working: 'Working', warmup: 'Warm-up', dropset: 'Drop set'} satisfies Record<
  PerformedSet['set_type'],
  string
>;

export function sessionTitle(session: Session) {
  return (
    session.prescription_snapshot?.workout.name ||
    (session.kind === 'freestyle' ? 'Freestyle session' : 'Planned session')
  );
}

type SetValues = Pick<
  PerformedSet | SessionPlannedSet,
  'reps' | 'load_value' | 'load_unit' | 'duration_seconds' | 'distance_value' | 'distance_unit' | 'rpe'
>;

export function setValues(set: SetValues) {
  const values: string[] = [];
  if (set.reps !== null && set.reps !== '') {
    values.push(`${set.reps} reps`);
  }
  if (set.load_unit === 'bodyweight') {
    values.push('Bodyweight');
  } else if (set.load_value !== null) {
    values.push(
      `${set.load_value} ${set.load_unit && set.load_unit !== 'none' ? set.load_unit : '(load unit not recorded)'}`,
    );
  }
  if (set.duration_seconds !== null) {
    values.push(`${set.duration_seconds} sec`);
  }
  if (set.distance_value !== null) {
    values.push(
      `${set.distance_value} ${set.distance_unit && set.distance_unit !== 'none' ? set.distance_unit : '(distance unit not recorded)'}`,
    );
  }
  if (set.rpe !== null) {
    values.push(`RPE ${set.rpe}`);
  }
  return values.join(' · ');
}
