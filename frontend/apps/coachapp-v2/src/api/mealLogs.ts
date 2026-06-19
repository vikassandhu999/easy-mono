import {api} from '@/api/base';

export type PlannedSnapshotItem = {
  amount: number;
  calories: number;
  carbs_g: number;
  fat_g: number;
  food_name: string;
  protein_g: number;
  unit: string;
  weight_g: number;
};

export type PlannedSnapshot = {
  items: PlannedSnapshotItem[];
  meal_name: string;
  total_calories: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_protein_g: number;
};

export type FoodLogEntry = {
  amount: null | number;
  calories: null | number;
  carbs_g: null | number;
  fat_g: null | number;
  food_id: null | string;
  food_name: string;
  id: string;
  inserted_at: string;
  meal_log_id: string;
  notes: null | string;
  planned_item_index: null | number;
  protein_g: null | number;
  recipe_id: null | string;
  source: 'planned' | 'replacement' | 'unplanned';
  unit: null | string;
  updated_at: string;
  weight_g: null | number;
};

export type CoachMealLog = {
  client_id: string;
  date: string;
  food_log_entries: FoodLogEntry[];
  id: string;
  inserted_at: string;
  logged_calories: null | number;
  meal_slot: string;
  planned_calories: null | number;
  planned_snapshot: null | PlannedSnapshot;
  updated_at: string;
};

export type DailyNutritionSummary = {
  date: string;
  logged_calories: number;
  meals_logged: number;
  planned_calories: number;
  replacements: number;
  total_entries: number;
  unplanned_count: number;
};

export type ListCoachMealLogsParams = {
  client_id: string;
  date?: string;
  from?: string;
  to?: string;
};

export type MealLogSummaryParams = {
  client_id: string;
  from: string;
  to: string;
};

type CoachMealLogListResponse = {data: CoachMealLog[]};
type CoachMealLogSummaryResponse = {data: DailyNutritionSummary[]};

export const coachMealLogsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCoachMealLogSummary: build.query<CoachMealLogSummaryResponse, MealLogSummaryParams>({
      query: (params) => ({
        params,
        url: '/v1/coach/meal_logs/summary',
      }),
      providesTags: [{type: 'MealLog', id: 'SUMMARY'}],
    }),
    listCoachMealLogs: build.query<CoachMealLogListResponse, ListCoachMealLogsParams>({
      query: (params) => ({
        params,
        url: '/v1/coach/meal_logs',
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((log) => ({
                type: 'MealLog' as const,
                id: log.id,
              })),
              {type: 'MealLog' as const, id: 'LIST'},
            ]
          : [{type: 'MealLog' as const, id: 'LIST'}],
    }),
  }),
});

export const {useGetCoachMealLogSummaryQuery, useListCoachMealLogsQuery} = coachMealLogsApi;
