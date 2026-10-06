import type {PerformedSet, Session} from '../api/training-sessions';
export const sessionStateLabels = {
  active: 'In progress',
  completed: 'Completed',
  discarded: 'Discarded',
} satisfies Record<Session['state'], string>;
export const setTypeLabels = {working: 'Working', warmup: 'Warm-up', drop: 'Drop set'} satisfies Record<
  PerformedSet['kind'],
  string
>;
export function sessionTitle(session: Session) {
  return session.prescription?.name ?? 'Freestyle workout';
}
export function setValues(set: PerformedSet) {
  return [
    set.reps !== null ? `${set.reps} reps` : '',
    set.load_kg !== null
      ? `${Math.round((Number(set.load_kg) / (set.entered_load_unit === 'lb' ? 0.45359237 : 1)) * 100) / 100} ${set.entered_load_unit ?? 'kg'}`
      : '',
    set.duration_s !== null ? `${set.duration_s} sec` : '',
    set.distance_m !== null
      ? `${Math.round((Number(set.distance_m) / (set.entered_distance_unit === 'km' ? 1000 : set.entered_distance_unit === 'mi' ? 1609.344 : 1)) * 100) / 100} ${set.entered_distance_unit ?? 'm'}`
      : '',
    set.rpe !== null ? `RPE ${set.rpe}` : '',
    set.rir !== null ? `RIR ${set.rir}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
