/**
 * The weekly schedule, as values.
 *
 * A weekday holds at most one workout, and an unscheduled day has NO entry at
 * all: the backend's `set_day_schedule` deletes the row and inserts a
 * replacement only when a workout is given. These helpers mirror that exactly,
 * so the optimistic patch and the server agree without a round-trip.
 */
import {
  TRAINING_DAY_SHORT_LABELS as DAY_SHORT_LABELS,
  TRAINING_WEEKDAYS as ORDERED_DAYS,
  type TrainingWeekday,
} from '@easy/utils';

import type {TrainingPlanItem} from '@/api/training-plan-builder';

export type Day = TrainingWeekday;
export {ORDERED_DAYS};

export function daysForWorkout(items: TrainingPlanItem[], workoutId: string): Day[] {
  return ORDERED_DAYS.filter((day) =>
    items.some((item) => item.day_of_week === day && item.training_workout_id === workoutId),
  );
}

export function setScheduleDay(
  items: TrainingPlanItem[],
  day: Day,
  workoutId: string | null,
  planId: string,
): TrainingPlanItem[] {
  const others = items.filter((item) => item.day_of_week !== day);
  if (!workoutId) {
    return others;
  }
  // The server's own row replaces this on the next read, and nothing in the
  // builder reads an entry's id or timestamps — only its day and its workout.
  return [
    ...others,
    {
      id: `optimistic:${day}`,
      day_of_week: day,
      training_plan_id: planId,
      training_workout_id: workoutId,
      inserted_at: '',
      updated_at: '',
    },
  ];
}

/** Deleting a workout takes it off the schedule — the backend cascades. */
export function clearWorkoutFromSchedule(items: TrainingPlanItem[], workoutId: string): TrainingPlanItem[] {
  return items.filter((item) => item.training_workout_id !== workoutId);
}

/** COPY.md § TB. */
export function scheduleLabel(days: Day[]): string {
  if (days.length === 0) {
    return 'Not scheduled yet';
  }
  return `Scheduled: ${days.map((day) => DAY_SHORT_LABELS[day]).join(', ')}`;
}
