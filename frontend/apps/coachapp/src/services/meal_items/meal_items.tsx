import {baseAPISlice} from '../baseAPISlice';
import {buildListParams, getNextPage} from '../paginationUtils';
import {CreateMealItem, MealItem, MealItemsList, MealItemsListOpts, UpdateMealItem} from './meal_items_definition';

export const mealItemsApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createMealItem: build.mutation<MealItem, CreateMealItem>({
            query: (body) => ({
                url: `/api/meals/${body.meal_id}/items`,
                method: 'post',
                data: {
                    recipe_id: body.recipe_id,
                    servings: body.servings,
                    position: body.position ?? 0,
                },
            }),
            transformResponse: (response: {data: MealItem}) => response.data,
            invalidatesTags: (_result, _error, {meal_id, nutrition_plan_id}) => [
                {type: 'Meals', id: meal_id},
                {type: 'NutritionPlans', id: nutrition_plan_id},
            ],
        }),

        getMealItem: build.query<MealItem, string>({
            query: (mealItemId) => ({
                url: `/api/meal_items/${mealItemId}`,
                method: 'get',
            }),
            transformResponse: (response: {data: MealItem}) => response.data,
            providesTags: (_result, _error, mealItemId) => [{type: 'MealItems', id: mealItemId}],
        }),

        updateMealItem: build.mutation<MealItem, UpdateMealItem>({
            query: (body) => ({
                url: `/api/meal_items/${body.id}`,
                method: 'patch',
                data: {
                    servings: body.servings,
                    position: body.position,
                },
            }),
            transformResponse: (response: {data: MealItem}) => response.data,
            invalidatesTags: (result, _error, {nutrition_plan_id}) => [
                {type: 'MealItems', id: result?.id},
                result ? {type: 'Meals', id: result.meal_id} : {type: 'Meals', id: 'LIST'},
                ...(nutrition_plan_id ? [{type: 'NutritionPlans' as const, id: nutrition_plan_id}] : []),
            ],
        }),

        deleteMealItem: build.mutation<void, {id: string; meal_id: string; nutrition_plan_id: string}>({
            query: ({id}) => ({
                url: `/api/meal_items/${id}`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, {id, meal_id, nutrition_plan_id}) => [
                {type: 'MealItems', id},
                {type: 'Meals', id: meal_id},
                {type: 'NutritionPlans', id: nutrition_plan_id},
            ],
        }),

        listMealItems: build.infiniteQuery<MealItemsList, MealItemsListOpts, number>({
            query: ({queryArg, pageParam = 0}) => ({
                url: '/api/meal_items',
                method: 'get',
                params: buildListParams(queryArg, pageParam),
            }),
            transformResponse: (response: {data: MealItem[]; meta: MealItemsList['meta']}) => ({
                records: response.data,
                meta: response.meta,
            }),
            providesTags: (result) => {
                const baseTag = [{type: 'MealItems' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [
                    ...records.map((item) => ({
                        type: 'MealItems' as const,
                        id: item.id,
                    })),
                    ...baseTag,
                ];
            },
            infiniteQueryOptions: {
                initialPageParam: 0,
                getNextPageParam: (lastPage) => getNextPage(lastPage),
            },
        }),

        reorderMealItems: build.mutation<MealItemsList, {meal_id: string; item_ids: string[]}>({
            query: ({meal_id, item_ids}) => ({
                url: `/api/meals/${meal_id}/meal_items/reorder`,
                method: 'post',
                data: {item_ids},
            }),
            transformResponse: (response: {data: MealItem[]; meta: MealItemsList['meta']}) => ({
                records: response.data,
                meta: response.meta,
            }),
            invalidatesTags: (_result, _error, {meal_id}) => [{type: 'Meals', id: meal_id}],
        }),
    }),
    overrideExisting: false,
});

export const {
    useCreateMealItemMutation: useCreateMealItem,
    useGetMealItemQuery: useGetMealItem,
    useUpdateMealItemMutation: useUpdateMealItem,
    useDeleteMealItemMutation: useDeleteMealItem,
    useListMealItemsInfiniteQuery: useListMealItems,
    useReorderMealItemsMutation: useReorderMealItems,
} = mealItemsApi;
