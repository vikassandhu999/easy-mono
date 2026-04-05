import {api} from '@/api/base';

// ── Types ───────────────────────────────────────────────────

export type CoachFoodLog = {
  amount: null | number;
  client_id: string;
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

export type DailyMacroSummary = {
  date: string;
  total_entries: number;
  totals: {
    calories: number;
    carbs_g: number;
    fat_g: number;
    protein_g: number;
  };
};

export type ListCoachFoodLogsParams = {
  client_id: string;
  date?: string;
  from?: string;
  to?: string;
};

export type FoodLogSummaryParams = {
  client_id: string;
  from: string;
  to: string;
};

// ── Response types ──────────────────────────────────────────

type CoachFoodLogListResponse = {data: CoachFoodLog[]};
type CoachFoodLogSummaryResponse = {data: DailyMacroSummary[]};

// ── Endpoints ───────────────────────────────────────────────

export const coachFoodLogsApi = api.injectEndpoints({
  endpoints: (build) => ({
    deleteCoachFoodLog: build.mutation<void, string>({
      query: (id) => ({
        method: 'DELETE',
        url: `/v1/coach/food_logs/${id}`,
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'FoodLog', id},
        {type: 'FoodLog', id: 'LIST'},
      ],
    }),
    getCoachFoodLogSummary: build.query<CoachFoodLogSummaryResponse, FoodLogSummaryParams>({
      query: (params) => ({
        params,
        url: '/v1/coach/food_logs/summary',
      }),
      providesTags: [{type: 'FoodLog', id: 'SUMMARY'}],
    }),
    listCoachFoodLogs: build.query<CoachFoodLogListResponse, ListCoachFoodLogsParams>({
      query: (params) => ({
        params,
        url: '/v1/coach/food_logs',
      }),
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
  }),
});

export const {useDeleteCoachFoodLogMutation, useGetCoachFoodLogSummaryQuery, useListCoachFoodLogsQuery} =
  coachFoodLogsApi;
