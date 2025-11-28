import {baseAPISlice} from '../baseAPISlice';
import {buildListParams, getNextPage} from '../paginationUtils';
import {
    AssignNutritionPlan,
    CreateNutritionPlan,
    NutritionPlan,
    NutritionPlansList,
    NutritionPlansListOpts,
    UpdateNutritionPlan,
} from './nutrition_plans_definition';

export const nutritionPlansApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createNutritionPlan: build.mutation<NutritionPlan, CreateNutritionPlan>({
            query: (body) => ({
                url: '/api/nutrition_plans',
                method: 'post',
                data: body,
            }),
            transformResponse: (response: {data: NutritionPlan}) => response.data,
            invalidatesTags: (result) => [
                {type: 'NutritionPlans', id: result?.id},
                {type: 'NutritionPlans', id: 'LIST'},
            ],
        }),

        getNutritionPlan: build.query<NutritionPlan, string>({
            query: (id) => ({
                url: `/api/nutrition_plans/${id}`,
                method: 'get',
            }),
            transformResponse: (response: {data: NutritionPlan}) => response.data,
            providesTags: (_result, _error, id) => [{type: 'NutritionPlans', id}],
        }),

        updateNutritionPlan: build.mutation<NutritionPlan, UpdateNutritionPlan>({
            query: (body) => ({
                url: `/api/nutrition_plans/${body.id}`,
                method: 'patch',
                data: {
                    ...body,
                    id: undefined,
                    inserted_at: undefined,
                    updated_at: undefined,
                },
            }),
            transformResponse: (response: {data: NutritionPlan}) => response.data,
            invalidatesTags: (result) => [
                {type: 'NutritionPlans', id: result?.id},
                {type: 'NutritionPlans', id: 'LIST'},
            ],
        }),

        listNutritionPlans: build.infiniteQuery<NutritionPlansList, NutritionPlansListOpts, number>({
            query: ({queryArg, pageParam = 0}) => ({
                url: '/api/nutrition_plans',
                method: 'get',
                params: buildListParams(queryArg, pageParam),
            }),
            transformResponse: (response: {data: NutritionPlan[]; meta: NutritionPlansList['meta']}) => ({
                records: response.data,
                meta: response.meta,
            }),
            providesTags: (result) => {
                const baseTag = [{type: 'NutritionPlans' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [
                    ...records.map((plan) => ({
                        type: 'NutritionPlans' as const,
                        id: plan.id,
                    })),
                    ...baseTag,
                ];
            },
            infiniteQueryOptions: {
                initialPageParam: 0,
                getNextPageParam: (lastPage) => getNextPage(lastPage),
            },
        }),

        deleteNutritionPlan: build.mutation<void, string>({
            query: (id) => ({
                url: `/api/nutrition_plans/${id}`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: 'NutritionPlans', id},
                {type: 'NutritionPlans', id: 'LIST'},
            ],
        }),

        assignNutritionPlan: build.mutation<NutritionPlan, AssignNutritionPlan>({
            query: ({id, client_id}) => ({
                url: `/api/nutrition_plans/${id}/assign`,
                method: 'post',
                data: {client_id},
            }),
            transformResponse: (response: {data: NutritionPlan}) => response.data,
            invalidatesTags: (result) => [
                {type: 'NutritionPlans', id: result?.id},
                {type: 'NutritionPlans', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useCreateNutritionPlanMutation: useCreateNutritionPlan,
    useUpdateNutritionPlanMutation: useUpdateNutritionPlan,
    useGetNutritionPlanQuery: useGetNutritionPlan,
    useListNutritionPlansInfiniteQuery: useListNutritionPlans,
    useDeleteNutritionPlanMutation: useDeleteNutritionPlan,
    useAssignNutritionPlanMutation: useAssignNutritionPlan,
} = nutritionPlansApi;
