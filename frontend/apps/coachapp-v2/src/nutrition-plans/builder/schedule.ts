/**
 * The weekday assignments, as values.
 *
 * A weekday belongs to exactly one day and the endpoint takes the FULL
 * Mon..Sun map, so every write builds the whole next map — the optimistic
 * patch and the PUT body are literally the same value, and assigning a
 * weekday implicitly takes it off whichever day held it (INTERACTIONS.md § NB).
 */
import {WEEKDAYS} from '@easy/utils';

import type {NutritionPlanDay, NutritionScheduleRequest} from '@/api/nutrition-plan-builder';

import type {WeekdayAssignments} from './plan-tree';

export function assignedWeekdays(assignments: WeekdayAssignments, dayId: string): string[] {
  return WEEKDAYS.filter((weekday) => assignments[weekday] === dayId);
}

/** The full map with `weekday` pointing at `dayId`; unassigned days fall back to the first day. */
export function assignWeekday(
  assignments: WeekdayAssignments,
  days: NutritionPlanDay[],
  weekday: string,
  dayId: string,
): NutritionScheduleRequest {
  return Object.fromEntries(
    WEEKDAYS.map((w) => [w, w === weekday ? dayId : (assignments[w] ?? days[0]?.id ?? dayId)]),
  ) as NutritionScheduleRequest;
}

/** Deleting a day hands its weekdays to the fallback day (the server does the same). */
export function reassignWeekdays<T extends WeekdayAssignments>(assignments: T, fromDayId: string, toDayId: string): T {
  const next: WeekdayAssignments = {...assignments};
  for (const weekday of WEEKDAYS) {
    if (next[weekday] === fromDayId) {
      next[weekday] = toDayId;
    }
  }
  return next as T;
}
