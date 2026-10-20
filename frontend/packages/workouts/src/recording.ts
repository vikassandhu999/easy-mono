export type SideMode = 'combined' | 'per_side';
export type Slot = {round: number; side: 'left' | 'right' | null};

export type RecordingSet = Slot & {
  id: string;
  state: 'completed' | 'skipped';
  reps?: number | null;
  distance_m?: number | null;
  duration_s?: number | null;
};

export type RecordingActivity = {
  id: string;
  exercise_id: string;
  workout_exercise_id: string | null;
  state: 'active' | 'completed' | 'skipped';
  position: number;
  side_mode: SideMode;
  rounds: number;
  reps?: number | null;
  distance_m?: number | null;
  duration_s?: number | null;
  sets: readonly RecordingSet[];
};

export type RecordingEntry = {id: string; exercise_id: string; side_mode: SideMode};
export type RecordingWorkout<E extends RecordingEntry = RecordingEntry> = {
  groups: readonly {rounds: number; exercises: readonly E[]}[];
};
export type RecordingLog<A extends RecordingActivity = RecordingActivity> = {exercise_logs: readonly A[]};
export type RecordingRow<E extends RecordingEntry = RecordingEntry, A extends RecordingActivity = RecordingActivity> = {
  entry: E | null;
  activities: A[];
  current: A | null;
  slots: Slot[];
};

export type SlotOutcome = {kind: 'unrecorded'} | {kind: 'completed' | 'skipped'; activityId: string; setId: string};

export function slotsFor(activity: {side_mode: SideMode; rounds: number}): Slot[] {
  return Array.from({length: activity.rounds}, (_, index) => index + 1).flatMap<Slot>((round) =>
    activity.side_mode === 'per_side'
      ? [
          {round, side: 'left' as const},
          {round, side: 'right' as const},
        ]
      : [{round, side: null}],
  );
}

export function slotOutcome(
  log: RecordingLog,
  activity: Pick<RecordingActivity, 'id' | 'workout_exercise_id'>,
  slot: Slot,
): SlotOutcome {
  for (const candidate of log.exercise_logs) {
    const sharesSlots =
      activity.workout_exercise_id === null
        ? candidate.id === activity.id
        : candidate.workout_exercise_id === activity.workout_exercise_id;
    if (!sharesSlots) {
      continue;
    }
    const set = candidate.sets.find((set) => set.round === slot.round && set.side === slot.side);
    if (set) {
      return {kind: set.state, activityId: candidate.id, setId: set.id};
    }
  }
  return {kind: 'unrecorded'};
}

export function rowsFor<E extends RecordingEntry, A extends RecordingActivity>(
  workout: RecordingWorkout<E> | null,
  log: RecordingLog<A>,
): RecordingRow<E, A>[] {
  const ordered = [...log.exercise_logs].sort((left, right) => left.position - right.position);
  const rows: RecordingRow<E, A>[] = [];
  for (const group of workout?.groups ?? []) {
    for (const entry of group.exercises) {
      const activities = ordered.filter((activity) => activity.workout_exercise_id === entry.id);
      const current = activities.filter((activity) => activity.state === 'active').at(-1) ?? null;
      const instructions = current ?? activities.at(-1);
      const rounds = visibleRounds(instructions?.rounds ?? group.rounds, activities);
      rows.push({entry, activities, current, slots: slotsFor({side_mode: entry.side_mode, rounds})});
    }
  }
  for (const activity of ordered) {
    if (activity.workout_exercise_id === null) {
      rows.push({
        entry: null,
        activities: [activity],
        current: activity.state === 'active' ? activity : null,
        slots: slotsFor({side_mode: activity.side_mode, rounds: visibleRounds(activity.rounds, [activity])}),
      });
    }
  }
  return rows;
}

function visibleRounds(planned: number, activities: readonly RecordingActivity[]): number {
  return activities.reduce(
    (rounds, activity) => activity.sets.reduce((highest, set) => Math.max(highest, set.round), rounds),
    planned,
  );
}

export function mismatch(activity: Pick<RecordingActivity, 'distance_m' | 'reps' | 'sets'>): string | null {
  for (const metric of ['distance_m', 'reps'] as const) {
    const overall = activity[metric];
    if (overall === null || overall === undefined) {
      continue;
    }
    const detail = activity.sets.reduce(
      (total, set) => total + (set.state === 'completed' ? (set[metric] ?? 0) : 0),
      0,
    );
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(overall), Math.abs(detail)) * 8;
    // Detail can be incomplete; only an excess conflicts with the reported whole.
    if (detail - overall > tolerance) {
      const format = metric === 'distance_m' ? distance : repetitions;
      return `Sets total ${format(detail)}; the overall result is ${format(overall)}.`;
    }
  }
  return null;
}

function distance(value: number): string {
  return value >= 1000 ? `${value / 1000} km` : `${value} m`;
}

function repetitions(value: number): string {
  return `${value} ${value === 1 ? 'rep' : 'reps'}`;
}
