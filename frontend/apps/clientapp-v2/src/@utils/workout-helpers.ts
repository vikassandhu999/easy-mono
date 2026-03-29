export const DAY_NAMES: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export const SESSION_STATE_CHIP: Record<string, {color: 'danger' | 'default' | 'success' | 'warning'; label: string}> =
  {
    active: {color: 'warning', label: 'In Progress'},
    completed: {color: 'success', label: 'Completed'},
    discarded: {color: 'default', label: 'Discarded'},
  };

export function formatDuration(startedAt: string, endedAt: null | string): null | string {
  if (!endedAt) return null;
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export function formatDurationFromNow(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export function formatSessionDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export function formatSessionDateLong(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getWorkoutTitle(snapshot: null | {workout_name: string}): string {
  return snapshot ? snapshot.workout_name : 'Freestyle workout';
}
