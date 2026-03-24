import type {Meal} from '@/api/meals';

import {api} from '@/api/base';
import {ApiListResponse, ApiResponse, Macros} from '@/api/shared';

export type NutritionPlan = {
  id: string;
  name: string;
  description: null | string;
  tags: string[];
  macros_goal?: Macros;
  type: string;
  status: string;
  client_id: null | string;
  source_template_id: null | string;
  meals: Meal[];
  plan_items: PlanItem[];
  creator_id: string;
  business_id: string;
  inserted_at: string;
  updated_at: string;
};

export type NutritionPlanCreateRequest = {
  name: string;
  description?: string;
  tags?: string[];
  macros_goal?: Macros;
  type?: string;
  status?: string;
};

export type NutritionPlanUpdateRequest = {
  name?: string;
  description?: string;
  tags?: string[];
  macros_goal?: Macros;
  status?: string;
};

export type PlanItem = {
  id: string;
  day: string;
  meal_type: string;
  meal_id: string;
  plan_id: string;
  creator_id: string;
  business_id: string;
  inserted_at: string;
  updated_at: string;
};

export type PlanItemCreateRequest = {
  day: string;
  meal_type: string;
  meal_id: string;
};

export type PlanItemUpdateRequest = {
  day?: string;
  meal_type?: string;
  meal_id?: string;
};

export type CopyDayRequest = {
  source_day: string;
  target_day: string;
};

export type ReorderMealsRequest = {
  meal_ids: string[];
};

export type AssignNutritionPlanRequest = {
  client_id: string;
};

export type ListNutritionPlansParams = {
  client_id?: string;
  offset?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
};

/** Filter params for infinite query — no offset/limit (pagination handled by infiniteQuery) */
export type ListNutritionPlansFilters = {
  search?: string;
  status?: string;
  type?: string;
};

export type ShoppingListItem = {
  type: string;
  name: null | string;
  food_id: null | string;
  recipe_id: null | string;
  unit: null | string;
  amount: number;
  weight_g: number;
};

const PAGE_SIZE = 20;

const getPlanScopedId = (planId: string) => `PLAN_${planId}`;

export const nutritionPlansApi = api.injectEndpoints({
  endpoints: (build) => ({
    createNutritionPlan: build.mutation<ApiResponse<NutritionPlan>, NutritionPlanCreateRequest>({
      query: (body) => ({
        url: '/v1/coach/nutrition_plans',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{type: 'NutritionPlan', id: 'LIST'}],
    }),
    getNutritionPlan: build.query<ApiResponse<NutritionPlan>, string>({
      query: (id) => `/v1/coach/nutrition_plans/${id}`,
      providesTags: (_, __, id) => [
        {type: 'NutritionPlan', id},
        {type: 'Meal', id: getPlanScopedId(id)},
        {type: 'PlanItem', id: getPlanScopedId(id)},
      ],
    }),
    listNutritionPlans: build.query<ApiListResponse<NutritionPlan>, ListNutritionPlansParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/nutrition_plans',
              params,
            }
          : '/v1/coach/nutrition_plans',
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
    /**
     * Infinite-scroll variant of listNutritionPlans.
     * Uses RTK Query 2.9's native build.infiniteQuery with offset-based pagination.
     * Hook: useNutritionPlansInfiniteQuery
     */
    nutritionPlans: build.infiniteQuery<ApiListResponse<NutritionPlan>, ListNutritionPlansFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/nutrition_plans',
        params: {
          ...(queryArg?.search && {search: queryArg.search}),
          ...(queryArg?.status && {status: queryArg.status}),
          ...(queryArg?.type && {type: queryArg.type}),
          offset: pageParam,
          limit: PAGE_SIZE,
        },
      }),
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          const nextOffset = lastPageParam + PAGE_SIZE;
          return nextOffset < lastPage.count ? nextOffset : undefined;
        },
      },
      providesTags: (result) =>
        result
          ? [
              ...result.pages.flatMap((page) =>
                page.data.map((plan) => ({
                  type: 'NutritionPlan' as const,
                  id: plan.id,
                })),
              ),
              {type: 'NutritionPlan' as const, id: 'LIST'},
            ]
          : [{type: 'NutritionPlan' as const, id: 'LIST'}],
    }),
    updateNutritionPlan: build.mutation<ApiResponse<NutritionPlan>, {body: NutritionPlanUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/nutrition_plans/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'NutritionPlan', id},
        {type: 'NutritionPlan', id: 'LIST'},
      ],
    }),
    deleteNutritionPlan: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/nutrition_plans/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'NutritionPlan', id},
        {type: 'NutritionPlan', id: 'LIST'},
        {type: 'Meal', id: getPlanScopedId(id)},
        {type: 'PlanItem', id: getPlanScopedId(id)},
      ],
    }),
    assignNutritionPlan: build.mutation<ApiResponse<NutritionPlan>, {body: AssignNutritionPlanRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/nutrition_plans/${id}/assign`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, {body, id}) => [
        {type: 'NutritionPlan', id},
        {type: 'NutritionPlan', id: 'LIST'},
        {type: 'Client', id: 'LIST'},
        {type: 'Client', id: body.client_id},
      ],
    }),
    duplicateNutritionPlan: build.mutation<ApiResponse<NutritionPlan>, string>({
      query: (id) => ({
        url: `/v1/coach/nutrition_plans/${id}/duplicate`,
        method: 'POST',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'NutritionPlan', id},
        {type: 'NutritionPlan', id: 'LIST'},
      ],
    }),
    copyNutritionPlanDay: build.mutation<ApiResponse<PlanItem[]>, {body: CopyDayRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/nutrition_plans/${id}/copy-day`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'NutritionPlan', id},
        {type: 'PlanItem', id: getPlanScopedId(id)},
      ],
    }),
    reorderNutritionPlanMeals: build.mutation<ApiListResponse<Meal>, {body: ReorderMealsRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/nutrition_plans/${id}/reorder-meals`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'NutritionPlan', id},
        {type: 'Meal', id: getPlanScopedId(id)},
      ],
    }),
    getNutritionPlanShoppingList: build.query<ApiResponse<ShoppingListItem[]>, string>({
      query: (id) => `/v1/coach/nutrition_plans/${id}/shopping-list`,
      providesTags: (_, __, id) => [{type: 'NutritionPlan', id}],
    }),
    getNutritionPlanMacros: build.query<ApiResponse<Macros>, string>({
      query: (id) => `/v1/coach/nutrition_plans/${id}/macros`,
      providesTags: (_, __, id) => [{type: 'NutritionPlan', id}],
    }),
    createPlanItem: build.mutation<ApiResponse<PlanItem>, {body: PlanItemCreateRequest; planId: string}>({
      query: ({body, planId}) => ({
        url: `/v1/coach/nutrition_plans/${planId}/plan_items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, {planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'PlanItem', id: getPlanScopedId(planId)},
      ],
    }),
    listPlanItems: build.query<ApiResponse<PlanItem[]>, string>({
      query: (planId) => `/v1/coach/nutrition_plans/${planId}/plan_items`,
      providesTags: (result, __, planId) =>
        result
          ? [
              ...result.data.map((planItem) => ({
                type: 'PlanItem' as const,
                id: planItem.id,
              })),
              {type: 'PlanItem' as const, id: getPlanScopedId(planId)},
            ]
          : [{type: 'PlanItem' as const, id: getPlanScopedId(planId)}],
    }),
    updatePlanItem: build.mutation<ApiResponse<PlanItem>, {body: PlanItemUpdateRequest; id: string; planId: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/plan_items/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'PlanItem', id},
        {type: 'PlanItem', id: getPlanScopedId(planId)},
      ],
    }),
    deletePlanItem: build.mutation<void, {id: string; planId: string}>({
      query: ({id}) => ({
        url: `/v1/coach/plan_items/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'PlanItem', id},
        {type: 'PlanItem', id: getPlanScopedId(planId)},
      ],
    }),
  }),
});

export const {
  useAssignNutritionPlanMutation,
  useCopyNutritionPlanDayMutation,
  useCreateNutritionPlanMutation,
  useCreatePlanItemMutation,
  useDeleteNutritionPlanMutation,
  useDeletePlanItemMutation,
  useDuplicateNutritionPlanMutation,
  useGetNutritionPlanMacrosQuery,
  useGetNutritionPlanQuery,
  useGetNutritionPlanShoppingListQuery,
  useListNutritionPlansQuery,
  useListPlanItemsQuery,
  useNutritionPlansInfiniteQuery,
  useReorderNutritionPlanMealsMutation,
  useUpdateNutritionPlanMutation,
  useUpdatePlanItemMutation,
} = nutritionPlansApi;
