import {api} from '@/api/base';
import type {Food} from '@/api/foods';
import type {Meal} from '@/api/meals';
import type {Recipe} from '@/api/recipes';
import {ApiListResponse, ApiResponse, Macros} from '@/api/shared';
import type {PlanClient} from '@/api/trainingPlans';

export type NutritionPlanStatus = 'active' | 'archived';

/**
 * Nutrition plan shape. Note that `meals` and `plan_items` are only preloaded
 * on the `show` endpoint (`GET /v1/coach/nutrition_plans/:id`). List endpoints
 * (`/v1/coach/nutrition_plans` and `/v1/coach/clients/:id/nutrition_plans`)
 * do not include them, so they are optional here and must be accessed defensively.
 */
export type NutritionPlan = {
  business_id: string;
  client: null | PlanClient;
  client_id: null | string;
  creator_id: string;
  description: null | string;
  id: string;
  inserted_at: string;
  macros_goal?: Macros;
  meals?: Meal[];
  name: string;
  plan_items?: PlanItem[];
  source_template_id: null | string;
  status: NutritionPlanStatus;
  tags: string[];
  updated_at: string;
};

export type NutritionPlanCreateRequest = {
  description?: string;
  macros_goal?: Macros;
  name: string;
  status?: NutritionPlanStatus;
  tags?: string[];
};

export type NutritionPlanUpdateRequest = {
  description?: string;
  macros_goal?: Macros;
  name?: string;
  status?: NutritionPlanStatus;
  tags?: string[];
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
  clear_existing?: boolean;
};

export type AssignNutritionPlanRequest = {
  client_id: string;
};

export type ListNutritionPlansParams = {
  limit?: number;
  offset?: number;
  search?: string;
  status?: NutritionPlanStatus;
};

/** Filter params for the templates infinite query — pagination is handled by infiniteQuery */
export type ListNutritionPlansFilters = {
  search?: string;
  status?: NutritionPlanStatus;
};

export type ListClientNutritionPlansParams = {
  clientId: string;
  limit?: number;
  offset?: number;
  status?: NutritionPlanStatus;
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
      async queryFn(id, _queryApi, _extraOptions, baseQuery) {
        // 1. Fetch the nutrition plan
        const planResult = await baseQuery(`/v1/coach/nutrition_plans/${id}`);
        if (planResult.error) {
          return {error: planResult.error};
        }

        const plan = (planResult.data as ApiResponse<NutritionPlan>).data;

        // 2. Collect unique food_ids and recipe_ids from all meal items.
        // `plan.meals` is always preloaded on the show endpoint, but typed as optional
        // because list endpoints don't preload it — fall back to [] for safety.
        const meals = plan.meals ?? [];
        const foodIds = new Set<string>();
        const recipeIds = new Set<string>();
        for (const meal of meals) {
          for (const item of meal.meal_items) {
            if (item.food_id && !item.food) {
              foodIds.add(item.food_id);
            }
            if (item.recipe_id && !item.recipe) {
              recipeIds.add(item.recipe_id);
            }
          }
        }

        // 3. Batch-fetch foods and recipes in parallel
        const [foodResults, recipeResults] = await Promise.all([
          Promise.all([...foodIds].map((fid) => baseQuery(`/v1/coach/foods/${fid}`))),
          Promise.all([...recipeIds].map((rid) => baseQuery(`/v1/coach/recipes/${rid}`))),
        ]);

        // Build lookup maps
        const foodMap = new Map<string, Food>();
        for (const r of foodResults) {
          if (!r.error && r.data) {
            const food = (r.data as ApiResponse<Food>).data;
            foodMap.set(food.id, food);
          }
        }
        const recipeMap = new Map<string, Recipe>();
        for (const r of recipeResults) {
          if (!r.error && r.data) {
            const recipe = (r.data as ApiResponse<Recipe>).data;
            recipeMap.set(recipe.id, recipe);
          }
        }

        // 4. Merge food/recipe into each meal_item
        const hydratedMeals: Meal[] = meals.map((meal) => ({
          ...meal,
          meal_items: meal.meal_items.map((item) => ({
            ...item,
            food: item.food ?? (item.food_id ? (foodMap.get(item.food_id) ?? null) : null),
            recipe: item.recipe ?? (item.recipe_id ? (recipeMap.get(item.recipe_id) ?? null) : null),
          })),
        }));

        return {data: {data: {...plan, meals: hydratedMeals}} as ApiResponse<NutritionPlan>};
      },
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
    nutritionPlans: build.infiniteQuery<ApiListResponse<NutritionPlan>, ListNutritionPlansFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/nutrition_plans',
        params: {
          ...(queryArg?.search && {search: queryArg.search}),
          ...(queryArg?.status && {status: queryArg.status}),
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
    /**
     * List nutrition plans assigned to a single client.
     * Separate from the template list — cached under CLIENT_LIST.
     */
    listClientNutritionPlans: build.query<ApiListResponse<NutritionPlan>, ListClientNutritionPlansParams>({
      query: ({clientId, ...params}) => ({
        params,
        url: `/v1/coach/clients/${clientId}/nutrition_plans`,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((plan) => ({
                type: 'NutritionPlan' as const,
                id: plan.id,
              })),
              {type: 'NutritionPlan' as const, id: 'CLIENT_LIST'},
            ]
          : [{type: 'NutritionPlan' as const, id: 'CLIENT_LIST'}],
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
        {type: 'NutritionPlan', id: 'CLIENT_LIST'},
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
        {type: 'NutritionPlan', id: 'CLIENT_LIST'},
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
        {type: 'NutritionPlan', id: 'CLIENT_LIST'},
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
  useListClientNutritionPlansQuery,
  useListNutritionPlansQuery,
  useListPlanItemsQuery,
  useNutritionPlansInfiniteQuery,
  useUpdateNutritionPlanMutation,
  useUpdatePlanItemMutation,
} = nutritionPlansApi;
