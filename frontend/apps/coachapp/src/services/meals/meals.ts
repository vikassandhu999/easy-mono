import {baseAPISlice} from '../baseAPISlice';
import {buildListParams, getNextPage} from '../paginationUtils';
import {CreateMeal, Meal, MealsList, MealsListOpts, UpdateMeal} from './meals_definition';

export const mealsApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    createMeal: build.mutation<Meal, CreateMeal>({
      query: (body) => ({
        url: `/api/coach/meals`,
        method: 'post',
        data: {
          daytime: body.daytime,
          day_number: body.day_number,
          label: body.label,
          time: body.time,
          position: body.position,
          nutrition_plan_id: body.nutrition_plan_id,
        },
      }),
      transformResponse: (response: {data: Meal}) => response.data,
      invalidatesTags: (result) => [
        result ? {type: 'NutritionPlans', id: result.nutrition_plan_id} : {type: 'NutritionPlans', id: 'LIST'},
      ],
    }),

    getMeal: build.query<Meal, string>({
      query: (mealId) => ({
        url: `/api/coach/meals/${mealId}`,
        method: 'get',
      }),
      transformResponse: (response: {data: Meal}) => response.data,
      providesTags: (_result, _error, mealId) => [{type: 'Meals', id: mealId}],
    }),

    updateMeal: build.mutation<Meal, UpdateMeal>({
      query: (body) => ({
        url: `/api/coach/meals/${body.id}`,
        method: 'patch',
        data: {
          label: body.label,
          time: body.time,
          notes: body.notes,
          position: body.position,
        },
      }),
      transformResponse: (response: {data: Meal}) => response.data,
      invalidatesTags: (result) => [
        {type: 'Meals', id: result?.id},
        result ? {type: 'NutritionPlans', id: result.nutrition_plan_id} : {type: 'NutritionPlans', id: 'LIST'},
      ],
    }),

    deleteMeal: build.mutation<void, {id: string; nutrition_plan_id: string}>({
      query: ({id}) => ({
        url: `/api/coach/meals/${id}`,
        method: 'delete',
      }),
      invalidatesTags: (_result, _error, {id, nutrition_plan_id}) => [
        {type: 'Meals', id},
        {type: 'NutritionPlans', id: nutrition_plan_id},
      ],
    }),

    listMeals: build.infiniteQuery<MealsList, MealsListOpts, number>({
      query: ({queryArg, pageParam = 0}) => ({
        url: '/api/coach/meals',
        method: 'get',
        params: buildListParams(queryArg, pageParam),
      }),
      transformResponse: (response: {data: Meal[]; meta: MealsList['meta']}) => ({
        records: response.data,
        meta: response.meta,
      }),
      providesTags: (result) => {
        const baseTag = [{type: 'Meals' as const, id: 'LIST'}];

        if (!result) {
          return baseTag;
        }

        const records = result.pages.flatMap((page) => page.records);

        if (records.length === 0) {
          return baseTag;
        }

        return [
          ...records.map((meal) => ({
            type: 'Meals' as const,
            id: meal.id,
          })),
          ...baseTag,
        ];
      },
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPage(lastPage),
      },
    }),

    copyMealToDay: build.mutation<Meal, {id: string; target_day: number}>({
      query: ({id, target_day}) => ({
        url: `/api/coach/meals/${id}/copy_to_day`,
        method: 'post',
        data: {target_day},
      }),
      transformResponse: (response: {data: Meal}) => response.data,
      invalidatesTags: (result) => [
        result ? {type: 'NutritionPlans', id: result.nutrition_plan_id} : {type: 'NutritionPlans', id: 'LIST'},
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateMealMutation: useCreateMeal,
  useGetMealQuery: useGetMeal,
  useUpdateMealMutation: useUpdateMeal,
  useDeleteMealMutation: useDeleteMeal,
  useListMealsInfiniteQuery: useListMeals,
  useCopyMealToDayMutation: useCopyMealToDay,
} = mealsApi;
