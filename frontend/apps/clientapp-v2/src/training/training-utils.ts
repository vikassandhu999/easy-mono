import {getTrainingWeekdayFromDate, TRAINING_WEEKDAYS, type TrainingWeekday} from '@easy/utils';

import type {ClientTrainingPlan, TrainingPlanWorkout} from '@/api/training';

export function workoutForDay(plan: ClientTrainingPlan, day: TrainingWeekday): null | TrainingPlanWorkout {
  const item = plan.plan_items.find((candidate) => candidate.day_of_week === day);
  return item ? (plan.workouts.find((workout) => workout.id === item.training_workout_id) ?? null) : null;
}

export function estimatedMinutes(workout: TrainingPlanWorkout): null | number {
  const seconds = workout.workout_elements
    .flatMap((element) => element.planned_sets)
    .reduce((total, set) => total + (set.duration_seconds ?? 45) + (set.rest_seconds ?? 75), 0);
  return seconds > 0 ? Math.max(15, Math.round(seconds / 300) * 5) : null;
}

export function totalSets(workout: TrainingPlanWorkout): number {
  return workout.workout_elements.reduce((total, element) => total + element.planned_sets.length, 0);
}

export function currentPlanWeek(plan: ClientTrainingPlan): {current: number; total: number} {
  const now = new Date();
  const start = plan.start_date ? new Date(`${plan.start_date}T00:00:00`) : now;
  const end = plan.end_date ? new Date(`${plan.end_date}T00:00:00`) : null;
  const current = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 604_800_000) + 1);
  const total = end
    ? Math.max(current, Math.ceil((end.getTime() - start.getTime() + 86_400_000) / 604_800_000))
    : current;
  return {current, total};
}

export function currentWeekDates(): Array<{date: Date; day: TrainingWeekday}> {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - mondayOffset);
  return TRAINING_WEEKDAYS.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {date, day};
  });
}

export function todayWorkout(plan?: ClientTrainingPlan): null | TrainingPlanWorkout {
  return plan ? workoutForDay(plan, getTrainingWeekdayFromDate(new Date())) : null;
}

export function workoutPreviewPath(workoutId: string): string {
  return `/training/workout/${workoutId}`;
}
