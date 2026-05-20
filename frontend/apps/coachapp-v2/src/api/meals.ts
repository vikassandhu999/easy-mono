import {api} from '@/api/base';
import type {Food} from '@/api/foods';
import {mealFromApi, mealItemFromApi} from '@/api/mappers/meals';
import type {Recipe} from '@/api/recipes';
import {ApiListResponse, ApiResponse, Macros} from '@/api/shared';

export type MealItem = {
  id: string;
  weight_g: null | number;
  amount: null | number;
  unit: null | string;
  position: number;
  recipe_id: null | string;
  food_id: null | string;
  food: Food | null;
  recipe: null | Recipe;
  meal_id: string;
  business_id: string;
  inserted_at: string;
  updated_at: string;
};

export type MealItemCreateRequest = {
  weight_g?: number;
  amount?: number;
  unit?: string;
  position?: number;
  recipe_id?: string;
  food_id?: string;
};

export type MealItemUpdateRequest = {
  weight_g?: number;
  amount?: number;
  unit?: string;
  position?: number;
  recipe_id?: string;
  food_id?: string;
};

export type Meal = {
  id: string;
  name: string;
  macros?: Macros;
  position: number;
  meal_items: MealItem[];
  creator_id: string;
  business_id: string;
  plan_id: string;
  inserted_at: string;
  updated_at: string;
};

export type ApiMeal = Meal;
export type ApiMealItem = MealItem;

export type MealCreateRequest = {
  name: string;
  macros?: Macros;
  position?: number;
};

export type MealUpdateRequest = {
  name?: string;
  macros?: Macros;
};

export type ListMealsParams = {
  planId: string;
  offset?: number;
  limit?: number;
};

const getMealScopedId = (mealId: string) => `MEAL_${mealId}`;
const getPlanScopedId = (planId: string) => `PLAN_${planId}`;

function mapMealResponse(response: ApiResponse<ApiMeal>): ApiResponse<Meal> {
  return {
    ...response,
    data: mealFromApi(response.data),
  };
}

function mapMealListResponse(response: ApiListResponse<ApiMeal>): ApiListResponse<Meal> {
  return {
    ...response,
    data: response.data.map(mealFromApi),
  };
}

function mapMealItemResponse(response: ApiResponse<ApiMealItem>): ApiResponse<MealItem> {
  return {
    ...response,
    data: mealItemFromApi(response.data),
  };
}

function mapMealItemListResponse(response: ApiResponse<ApiMealItem[]>): ApiResponse<MealItem[]> {
  return {
    ...response,
    data: response.data.map(mealItemFromApi),
  };
}

export const mealsApi = api.injectEndpoints({
  endpoints: (build) => ({
    createMeal: build.mutation<ApiResponse<Meal>, {body: MealCreateRequest; planId: string}>({
      query: ({body, planId}) => ({
        url: `/v1/coach/nutrition_plans/${planId}/meals`,
        method: 'POST',
        body,
      }),
      transformResponse: mapMealResponse,
      invalidatesTags: (_, __, {planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'Meal', id: getPlanScopedId(planId)},
      ],
    }),
    listMeals: build.query<ApiListResponse<Meal>, ListMealsParams>({
      query: ({limit, offset, planId}) => ({
        url: `/v1/coach/nutrition_plans/${planId}/meals`,
        params: {
          limit,
          offset,
        },
      }),
      transformResponse: mapMealListResponse,
      providesTags: (result, __, {planId}) =>
        result
          ? [
              ...result.data.map((meal) => ({
                type: 'Meal' as const,
                id: meal.id,
              })),
              {type: 'Meal' as const, id: getPlanScopedId(planId)},
            ]
          : [{type: 'Meal' as const, id: getPlanScopedId(planId)}],
    }),
    getMeal: build.query<ApiResponse<Meal>, string>({
      query: (id) => `/v1/coach/meals/${id}`,
      transformResponse: mapMealResponse,
      providesTags: (_, __, id) => [
        {type: 'Meal', id},
        {type: 'MealItem', id: getMealScopedId(id)},
      ],
    }),
    updateMeal: build.mutation<ApiResponse<Meal>, {body: MealUpdateRequest; id: string; planId: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/meals/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: mapMealResponse,
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'Meal', id},
        {type: 'Meal', id: getPlanScopedId(planId)},
      ],
    }),
    deleteMeal: build.mutation<void, {id: string; planId: string}>({
      query: ({id}) => ({
        url: `/v1/coach/meals/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'Meal', id},
        {type: 'Meal', id: getPlanScopedId(planId)},
        {type: 'MealItem', id: getMealScopedId(id)},
      ],
    }),
    createMealItem: build.mutation<
      ApiResponse<MealItem>,
      {body: MealItemCreateRequest; mealId: string; planId: string}
    >({
      query: ({body, mealId}) => ({
        url: `/v1/coach/meals/${mealId}/items`,
        method: 'POST',
        body,
      }),
      transformResponse: mapMealItemResponse,
      invalidatesTags: (_, __, {mealId, planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'Meal', id: mealId},
        {type: 'MealItem', id: getMealScopedId(mealId)},
      ],
    }),
    listMealItems: build.query<ApiResponse<MealItem[]>, string>({
      query: (mealId) => `/v1/coach/meals/${mealId}/items`,
      transformResponse: mapMealItemListResponse,
      providesTags: (result, __, mealId) =>
        result
          ? [
              ...result.data.map((item) => ({
                type: 'MealItem' as const,
                id: item.id,
              })),
              {type: 'MealItem' as const, id: getMealScopedId(mealId)},
            ]
          : [{type: 'MealItem' as const, id: getMealScopedId(mealId)}],
    }),
    updateMealItem: build.mutation<
      ApiResponse<MealItem>,
      {
        body: MealItemUpdateRequest;
        id: string;
        mealId: string;
        planId: string;
      }
    >({
      query: ({body, id}) => ({
        url: `/v1/coach/meal_items/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: mapMealItemResponse,
      invalidatesTags: (_, __, {id, mealId, planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'Meal', id: mealId},
        {type: 'MealItem', id},
        {type: 'MealItem', id: getMealScopedId(mealId)},
      ],
    }),
    deleteMealItem: build.mutation<void, {id: string; mealId: string; planId: string}>({
      query: ({id}) => ({
        url: `/v1/coach/meal_items/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, {id, mealId, planId}) => [
        {type: 'NutritionPlan', id: planId},
        {type: 'Meal', id: mealId},
        {type: 'MealItem', id},
        {type: 'MealItem', id: getMealScopedId(mealId)},
      ],
    }),
  }),
});

export const {
  useCreateMealItemMutation,
  useCreateMealMutation,
  useDeleteMealItemMutation,
  useDeleteMealMutation,
  useGetMealQuery,
  useListMealItemsQuery,
  useListMealsQuery,
  useUpdateMealItemMutation,
  useUpdateMealMutation,
} = mealsApi;
