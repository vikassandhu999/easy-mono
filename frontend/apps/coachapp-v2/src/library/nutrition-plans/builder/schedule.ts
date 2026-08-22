/**
 * The weekday assignments, as values.
 *
 * A weekday belongs to exactly one day and the endpoint takes the FULL
 * Mon..Sun map, so every write builds the whole next map — the optimistic
 * patch and the PUT body are literally the same value, and assigning a
 * weekday implicitly takes it off whichever day held it (INTERACTIONS.md § NB).
 */
import {type TrainingWeekday, WEEKDAYS} from '@easy/utils';

import type {NutritionScheduleRequest} from '@/api/nutrition-plan-builder';

import type {NutritionPlanDay, WeekdayAssignments} from '@/library/nutrition-plans/builder/plan-tree';

export function assignedWeekdays(assignments: WeekdayAssignments, dayId: string): string[] {
  return WEEKDAYS.filter((weekday) => assignments[weekday] === dayId);
}

/**
 * The full map with `weekday` pointing at `dayId`; unassigned days fall back to
 * the first day.
 *
 * Written out key by key rather than assembled with `Object.fromEntries`, which
 * erases the keys and needed a cast to claim the request shape back. A weekday
 * added to (or renamed in) the contract now fails the build here.
 */
export function assignWeekday(
  assignments: WeekdayAssignments,
  days: NutritionPlanDay[],
  weekday: string,
  dayId: string,
): NutritionScheduleRequest {
  const at = (day: TrainingWeekday) => (day === weekday ? dayId : (assignments[day] ?? days[0]?.id ?? dayId));
  return {
    monday: at('monday'),
    tuesday: at('tuesday'),
    wednesday: at('wednesday'),
    thursday: at('thursday'),
    friday: at('friday'),
    saturday: at('saturday'),
    sunday: at('sunday'),
  };
}

/** Deleting a day hands its weekdays to the fallback day (the server does the same). */
export function reassignWeekdays(
  assignments: WeekdayAssignments,
  fromDayId: string,
  toDayId: string,
): WeekdayAssignments {
  const next: WeekdayAssignments = {...assignments};
  for (const weekday of WEEKDAYS) {
    if (next[weekday] === fromDayId) {
      next[weekday] = toDayId;
    }
  }
  return next;
}
