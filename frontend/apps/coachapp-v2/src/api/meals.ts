import {api} from '@/api/base';
import type {Food} from '@/api/foods';
import {mealFromApi, mealItemFromApi} from '@/api/mappers/meals';
import type {Recipe} from '@/api/recipes';
import {ApiResponse, Macros} from '@/api/shared';

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

export type MealCreateRequest = {
  name: string;
  macros?: Macros;
  position?: number;
};

export type MealUpdateRequest = {
  name?: string;
  macros?: Macros;
};

const getMealScopedId = (mealId: string) => `MEAL_${mealId}`;
const getPlanScopedId = (planId: string) => `PLAN_${planId}`;

function mapMealResponse(response: ApiResponse<Meal>): ApiResponse<Meal> {
  return {
    ...response,
    data: mealFromApi(response.data),
  };
}

function mapMealItemResponse(response: ApiResponse<MealItem>): ApiResponse<MealItem> {
  return {
    ...response,
    data: mealItemFromApi(response.data),
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
  useUpdateMealItemMutation,
  useUpdateMealMutation,
} = mealsApi;
