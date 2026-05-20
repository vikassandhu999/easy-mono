import type {CoachMealLog, DailyNutritionSummary, FoodLogEntry} from '@/api/mealLogs';

export function foodLogEntryFromApi(entry: FoodLogEntry): FoodLogEntry {
  return entry;
}

export function coachMealLogFromApi(log: CoachMealLog): CoachMealLog {
  return {
    ...log,
    food_log_entries: log.food_log_entries.map(foodLogEntryFromApi),
  };
}

export function dailyNutritionSummaryFromApi(summary: DailyNutritionSummary): DailyNutritionSummary {
  return summary;
}
