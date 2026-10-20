import type {ScheduleBody, ScheduleUpdate, WorkoutSchedule, WorkoutWeek} from '../api/workout-week';

export type SaveIntent = {before: WorkoutWeek; message: string} & (
  | {kind: 'add'; body: ScheduleBody; library?: WorkoutWeek['workouts'][number]}
  | {kind: 'schedule'; id: string; body: ScheduleUpdate}
  | {kind: 'remove'; id: string; weekday: number}
  | {kind: 'undo'; token: string; expected: WorkoutWeek}
);
const time = (value: string | null | undefined) => (!value ? null : value.length === 5 ? `${value}:00` : value);
export const occasionOf = (row: Pick<WorkoutSchedule, 'time' | 'place' | 'meeting_url' | 'coach_id'>) => ({
  time: time(row.time),
  place: row.place || null,
  meeting_url: row.meeting_url || null,
  coach_id: row.coach_id || null,
});
const sameOccasion = (a: WorkoutSchedule, b: WorkoutSchedule) =>
  JSON.stringify(occasionOf(a)) === JSON.stringify(occasionOf(b));
export const occasionLabel = (row: WorkoutSchedule, coaches: WorkoutWeek['coaches']) =>
  [
    row.time?.slice(0, 5),
    row.place || row.meeting_url,
    row.coach_id && `with ${coaches.find((coach) => coach.id === row.coach_id)?.name ?? 'coach'}`,
  ]
    .filter(Boolean)
    .join(' · ');
export const byTime = (a: WorkoutSchedule, b: WorkoutSchedule) =>
  (a.time ?? '99').localeCompare(b.time ?? '99') || a.id.localeCompare(b.id);

// IDs and timestamps change when the server copies a library workout or splits history.
function content(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(content);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            ![
              'id',
              'workout_id',
              'group_id',
              'client_id',
              'program_id',
              'creator_id',
              'inserted_at',
              'updated_at',
              'archived_at',
            ].includes(key),
        )
        .map(([key, item]) => [key, content(item)]),
    );
  }
  return value;
}
const rowValue = (row: WorkoutSchedule) =>
  JSON.stringify({workout_id: row.workout_id, weekdays_mask: row.weekdays_mask, ...occasionOf(row)});
const rowsEqual = (a: WorkoutSchedule[], b: WorkoutSchedule[]) =>
  JSON.stringify(a.map(rowValue).sort()) === JSON.stringify(b.map(rowValue).sort());
const unchanged = (a: WorkoutWeek, b: WorkoutWeek) =>
  JSON.stringify(a.workouts) === JSON.stringify(b.workouts) && rowsEqual(a.schedules, b.schedules);

export function matchSaveIntent(intent: SaveIntent, week: WorkoutWeek): 'saved' | 'absent' | 'conflict' {
  if (intent.kind === 'undo') {
    return unchanged(intent.expected, week) ? 'saved' : unchanged(intent.before, week) ? 'absent' : 'conflict';
  }
  const original = intent.kind === 'add' ? null : intent.before.schedules.find((row) => row.id === intent.id);
  let expected = intent.before.schedules.filter((row) => row.id !== original?.id);
  let added: WorkoutSchedule | null = null;
  if (intent.kind === 'add') {
    let workoutId = intent.body.workout_id;
    if (intent.body.library_workout_id && intent.library) {
      const copies = week.workouts.filter(
        (workout) =>
          !intent.before.workouts.some((old) => old.id === workout.id) &&
          JSON.stringify(content(workout)) === JSON.stringify(content(intent.library)),
      );
      if (copies.length !== 1) {
        return unchanged(intent.before, week) ? 'absent' : 'conflict';
      }
      workoutId = copies[0]?.id;
    }
    if (!workoutId) {
      return 'conflict';
    }
    added = {
      id: '',
      client_id: '',
      workout_id: workoutId,
      from_date: week.today,
      until_date: null,
      weekdays_mask: intent.body.weekdays_mask,
      time: intent.body.time ?? null,
      place: intent.body.place ?? null,
      meeting_url: intent.body.meeting_url ?? null,
      coach_id: intent.body.coach_id ?? null,
    };
  } else if (original) {
    added =
      intent.kind === 'schedule'
        ? {...original, ...intent.body}
        : {...original, weekdays_mask: original.weekdays_mask & ~(1 << (intent.weekday - 1))};
  } else {
    return 'conflict';
  }
  if (added && added.weekdays_mask) {
    const candidate = added;
    const merge = expected.find((row) => row.workout_id === candidate.workout_id && sameOccasion(row, candidate));
    if (merge) {
      expected = expected.map((row) =>
        row.id === merge.id ? {...row, weekdays_mask: row.weekdays_mask | candidate.weekdays_mask} : row,
      );
    } else {
      expected = [...expected, candidate];
    }
  }
  const originalWorkoutsIntact = intent.before.workouts.every(
    (workout) => JSON.stringify(workout) === JSON.stringify(week.workouts.find((row) => row.id === workout.id)),
  );
  return originalWorkoutsIntact && rowsEqual(expected, week.schedules)
    ? 'saved'
    : unchanged(intent.before, week)
      ? 'absent'
      : 'conflict';
}

function validWeek(value: WorkoutWeek | null | undefined) {
  return Boolean(
    value &&
      typeof value.today === 'string' &&
      Array.isArray(value.schedules) &&
      Array.isArray(value.workouts) &&
      value.schedules.every(
        (row) =>
          row &&
          typeof row.id === 'string' &&
          typeof row.workout_id === 'string' &&
          Number.isInteger(row.weekdays_mask) &&
          row.weekdays_mask > 0 &&
          row.weekdays_mask <= 127 &&
          (row.time == null || typeof row.time === 'string'),
      ) &&
      value.workouts.every((row) => row && typeof row.id === 'string' && typeof row.name === 'string'),
  );
}
export function readIntent(raw: string | null): SaveIntent | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as SaveIntent;
    if (!value || typeof value.message !== 'string' || !validWeek(value.before)) {
      return null;
    }
    if (
      value.kind === 'add' &&
      Number.isInteger(value.body?.weekdays_mask) &&
      value.body.weekdays_mask > 0 &&
      value.body.weekdays_mask <= 127 &&
      (typeof value.body.workout_id === 'string' || typeof value.body.library_workout_id === 'string')
    ) {
      return value;
    }
    if (value.kind === 'schedule' && typeof value.id === 'string' && value.body && typeof value.body === 'object') {
      return value;
    }
    if (
      value.kind === 'remove' &&
      typeof value.id === 'string' &&
      Number.isInteger(value.weekday) &&
      value.weekday >= 1 &&
      value.weekday <= 7
    ) {
      return value;
    }
    if (value.kind === 'undo' && typeof value.token === 'string' && validWeek(value.expected)) {
      return value;
    }
  } catch {
    return null;
  }
  return null;
}

export function occursOn(schedule: WorkoutSchedule, date: string) {
  const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  const bit = 1 << weekday;
  return (
    schedule.from_date <= date &&
    (schedule.until_date === null || schedule.until_date >= date) &&
    Boolean(schedule.weekdays_mask & bit)
  );
}
