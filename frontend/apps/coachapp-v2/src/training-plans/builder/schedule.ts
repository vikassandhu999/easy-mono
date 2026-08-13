/**
 * The weekly schedule, as values.
 *
 * The server keeps the schedule ON the workouts (`TrainingWorkout.weekdays`)
 * and renders it back as one Mon..Sun map where a `null` weekday is a rest day.
 * A weekday therefore holds at most one workout by construction, and every
 * write is the whole map — these helpers build the next map so the optimistic
 * patch and the PUT body are literally the same value.
 */
import {TRAINING_WEEKDAYS as ORDERED_DAYS, type TrainingWeekday} from '@easy/utils';

import type {TrainingSchedule} from '@/api/training-plan-builder';

export type Day = TrainingWeekday;
export {ORDERED_DAYS};

export function daysForWorkout(schedule: TrainingSchedule, workoutId: string): Day[] {
  return ORDERED_DAYS.filter((day) => schedule[day] === workoutId);
}

export function setScheduleDay(schedule: TrainingSchedule, day: Day, workoutId: null | string): TrainingSchedule {
  return {...schedule, [day]: workoutId};
}

/** Deleting a workout takes it off every weekday it held. */
export function clearWorkoutFromSchedule(schedule: TrainingSchedule, workoutId: string): TrainingSchedule {
  const next = {...schedule};
  for (const day of ORDERED_DAYS) {
    if (next[day] === workoutId) {
      next[day] = null;
    }
  }
  return next;
}
