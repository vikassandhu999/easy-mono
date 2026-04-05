import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';

// ── Shared types ─────────────────────────────────────────────

export type Macros = Record<string, number>;

export type ServingSize = {
  amount: null | number;
  unit: string;
  weight_g: null | number;
};

export type NutritionPlanStatus = 'active' | 'archived' | 'draft';

// ── Plan summary (list view) ────────────────────────────────

export type ClientNutritionPlanSummary = {
  description: null | string;
  end_date: null | string;
  id: string;
  inserted_at: string;
  macros_goal: Macros | null;
  name: string;
  start_date: null | string;
  status: NutritionPlanStatus;
  tags: string[];
  updated_at: string;
};

// ── Food/Recipe summaries (nested in meal items) ────────────

export type FoodSummary = {
  id: string;
  macros: Macros | null;
  name: string;
  serving_sizes: ServingSize[];
};

export type RecipeSummary = {
  id: string;
  macros: Macros | null;
  name: string;
  serving_sizes: ServingSize[];
};

// ── Meal item ───────────────────────────────────────────────

export type ClientNutritionMealItem = {
  amount: null | number;
  food: FoodSummary | null;
  food_id: null | string;
  id: string;
  inserted_at: string;
  position: number;
  recipe: null | RecipeSummary;
  recipe_id: null | string;
  unit: null | string;
  updated_at: string;
  weight_g: null | number;
};

// ── Meal ────────────────────────────────────────────────────

export type ClientNutritionMeal = {
  id: string;
  inserted_at: string;
  macros: Macros | null;
  meal_items: ClientNutritionMealItem[];
  name: string;
  updated_at: string;
};

// ── Plan item (weekly schedule slot) ────────────────────────

export type ClientNutritionPlanItem = {
  day: string;
  id: string;
  inserted_at: string;
  meal_id: string;
  meal_type: string;
  updated_at: string;
};

// ── Full plan (detail view) ─────────────────────────────────

export type ClientNutritionPlan = ClientNutritionPlanSummary & {
  meals: ClientNutritionMeal[];
  plan_items: ClientNutritionPlanItem[];
};

// ── Today's plan ────────────────────────────────────────────

export type TodayPlanMealItem = {
  amount: null | number;
  food_id: null | string;
  food_name: null | string;
  macros: Macros | null;
  meal_item_id: string;
  recipe_id: null | string;
  unit: null | string;
  weight_g: null | number;
};

export type TodayPlanMeal = {
  items: TodayPlanMealItem[];
  meal_id: string;
  meal_name: null | string;
  meal_slot: string;
};

export type TodayPlan = {
  date: string;
  day: string;
  meals: TodayPlanMeal[];
  plan_id: string;
};

// ── List params ─────────────────────────────────────────────

export type ListClientNutritionPlansParams = {
  limit?: number;
  offset?: number;
  status?: NutritionPlanStatus;
};

export type TodayPlanParams = {
  date?: string;
};

// ── Endpoints ───────────────────────────────────────────────

export const clientNutritionPlansApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyNutritionPlan: build.query<ApiResponse<ClientNutritionPlan>, string>({
      query: (id) => `/v1/client/nutrition_plans/${id}`,
      providesTags: (_, __, id) => [{type: 'NutritionPlan', id}],
    }),
    getTodayPlan: build.query<ApiResponse<TodayPlan>, TodayPlanParams | void>({
      query: (params) =>
        params?.date
          ? {
              params: {date: params.date},
              url: '/v1/client/nutrition_plans/today',
            }
          : '/v1/client/nutrition_plans/today',
      providesTags: (result) =>
        result
          ? [
              {type: 'NutritionPlan', id: result.data.plan_id},
              {type: 'NutritionPlan', id: 'TODAY'},
            ]
          : [{type: 'NutritionPlan', id: 'TODAY'}],
    }),
    listMyNutritionPlans: build.query<
      ApiListResponse<ClientNutritionPlanSummary>,
      ListClientNutritionPlansParams | void
    >({
      query: (params) =>
        params
          ? {
              params,
              url: '/v1/client/nutrition_plans',
            }
          : '/v1/client/nutrition_plans',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((plan) => ({
                type: 'NutritionPlan' as const,
                id: plan.id,
              })),
              {type: 'NutritionPlan' as const, id: 'LIST'},
            ]
          : [{type: 'NutritionPlan' as const, id: 'LIST'}],
    }),
  }),
});

export const {useGetMyNutritionPlanQuery, useGetTodayPlanQuery, useListMyNutritionPlansQuery} = clientNutritionPlansApi;
