import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

// ── Snapshot types ──────────────────────────────────────────

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

// ── Entity types ────────────────────────────────────────────

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

export type MealLog = {
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

// ── Request types ───────────────────────────────────────────

export type CreateFoodLogEntryRequest = {
  amount: number;
  date: string;
  food_id?: null | string;
  food_name?: null | string;
  meal_slot: string;
  notes?: null | string;
  planned_item_index?: null | number;
  recipe_id?: null | string;
  source: 'planned' | 'replacement' | 'unplanned';
  unit: string;
  weight_g: number;
};

export type UpdateFoodLogEntryRequest = {
  amount?: null | number;
  notes?: null | string;
  unit?: null | string;
  weight_g?: null | number;
};

export type LogMealRequest = {
  date: string;
  meal_id: string;
  meal_slot: string;
};

export type LogDayRequest = {
  date: string;
  plan_id: string;
};

export type ListMealLogsParams = {
  date?: string;
  from?: string;
  to?: string;
};

// ── Response types ──────────────────────────────────────────

type MealLogListResponse = {data: MealLog[]};
type MealLogBulkResponse = {data: FoodLogEntry[]};

// ── Endpoints ───────────────────────────────────────────────

export const clientMealLogsApi = api.injectEndpoints({
  endpoints: (build) => ({
    createFoodLogEntry: build.mutation<ApiResponse<FoodLogEntry>, CreateFoodLogEntryRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/client/food_log_entries',
      }),
      invalidatesTags: [
        {type: 'MealLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
    deleteFoodLogEntry: build.mutation<void, string>({
      query: (id) => ({
        method: 'DELETE',
        url: `/v1/client/food_log_entries/${id}`,
      }),
      invalidatesTags: [
        {type: 'MealLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
    listMyMealLogs: build.query<MealLogListResponse, ListMealLogsParams | void>({
      query: (params) => {
        const queryParams: Record<string, string> = {};
        if (params?.date) queryParams.date = params.date;
        if (params?.from) queryParams.from = params.from;
        if (params?.to) queryParams.to = params.to;
        return Object.keys(queryParams).length > 0
          ? {params: queryParams, url: '/v1/client/meal_logs'}
          : '/v1/client/meal_logs';
      },
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
    logDay: build.mutation<MealLogBulkResponse, LogDayRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/client/food_log_entries/log_day',
      }),
      invalidatesTags: [
        {type: 'MealLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
    logMeal: build.mutation<MealLogBulkResponse, LogMealRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/client/food_log_entries/log_meal',
      }),
      invalidatesTags: [
        {type: 'MealLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
    updateFoodLogEntry: build.mutation<ApiResponse<FoodLogEntry>, {body: UpdateFoodLogEntryRequest; id: string}>({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/client/food_log_entries/${id}`,
      }),
      invalidatesTags: [
        {type: 'MealLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
  }),
});

export const {
  useCreateFoodLogEntryMutation,
  useDeleteFoodLogEntryMutation,
  useListMyMealLogsQuery,
  useLogDayMutation,
  useLogMealMutation,
  useUpdateFoodLogEntryMutation,
} = clientMealLogsApi;
