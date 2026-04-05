import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

// ── Types ───────────────────────────────────────────────────

export type FoodLog = {
  amount: null | number;
  date: string;
  food: null | {id: string; macros: Record<string, number>; name: string};
  food_id: null | string;
  food_name_snapshot: null | string;
  id: string;
  inserted_at: string;
  macros_snapshot: null | Record<string, number>;
  meal_item_id: null | string;
  meal_slot: string;
  notes: null | string;
  recipe: null | {id: string; macros: Record<string, number>; name: string};
  recipe_id: null | string;
  unit: null | string;
  updated_at: string;
  weight_g: null | number;
};

export type LogFoodRequest = {
  amount?: null | number;
  date: string;
  food_id?: null | string;
  meal_item_id?: null | string;
  meal_slot: string;
  notes?: null | string;
  recipe_id?: null | string;
  unit?: null | string;
  weight_g?: null | number;
};

export type UpdateFoodLogRequest = {
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

export type ListFoodLogsParams = {
  date?: string;
};

// ── Response types ──────────────────────────────────────────

type FoodLogListResponse = {data: FoodLog[]};
type FoodLogBulkResponse = {data: FoodLog[]};

// ── Endpoints ───────────────────────────────────────────────

export const clientFoodLogsApi = api.injectEndpoints({
  endpoints: (build) => ({
    deleteFoodLog: build.mutation<void, string>({
      query: (id) => ({
        method: 'DELETE',
        url: `/v1/client/food_logs/${id}`,
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'FoodLog', id},
        {type: 'FoodLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
    listMyFoodLogs: build.query<FoodLogListResponse, ListFoodLogsParams | void>({
      query: (params) =>
        params?.date
          ? {
              params: {date: params.date},
              url: '/v1/client/food_logs',
            }
          : '/v1/client/food_logs',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((log) => ({
                type: 'FoodLog' as const,
                id: log.id,
              })),
              {type: 'FoodLog' as const, id: 'LIST'},
            ]
          : [{type: 'FoodLog' as const, id: 'LIST'}],
    }),
    logDay: build.mutation<FoodLogBulkResponse, LogDayRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/client/food_logs/log_day',
      }),
      invalidatesTags: [
        {type: 'FoodLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
    logFood: build.mutation<ApiResponse<FoodLog>, LogFoodRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/client/food_logs',
      }),
      invalidatesTags: [
        {type: 'FoodLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
    logMeal: build.mutation<FoodLogBulkResponse, LogMealRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/client/food_logs/log_meal',
      }),
      invalidatesTags: [
        {type: 'FoodLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
    updateFoodLog: build.mutation<ApiResponse<FoodLog>, {body: UpdateFoodLogRequest; id: string}>({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/client/food_logs/${id}`,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'FoodLog', id},
        {type: 'FoodLog', id: 'LIST'},
        {type: 'NutritionPlan', id: 'TODAY'},
      ],
    }),
  }),
});

export const {
  useDeleteFoodLogMutation,
  useListMyFoodLogsQuery,
  useLogDayMutation,
  useLogFoodMutation,
  useLogMealMutation,
  useUpdateFoodLogMutation,
} = clientFoodLogsApi;
