import {baseAPISlice} from '../baseAPISlice';
import {CreatePlanProps, Plan, PlansList, PlansListOpts, UpdatePlanProps} from './plans_definition';

export interface CopyPlanToClientProps {
    allow_client_edits?: boolean;
    client_id: string;
    name?: string;
    plan_id: string;
    start_date?: string;
}

const DEFAULT_PAGE_SIZE = 20;

const buildListParams = (opts: PlansListOpts, pageParam: number) => {
    const params: Record<string, unknown> = {
        ...(opts ?? {}),
        page: pageParam,
    };

    if (!('page_size' in params) || typeof params.page_size !== 'number') {
        params.page_size = DEFAULT_PAGE_SIZE;
    }

    return params;
};

const getNextPlanPage = (lastPage: PlansList, lastPageParam: number) => {
    const currentPage = lastPage.page ?? lastPageParam;
    const pageSize = lastPage.page_size ?? DEFAULT_PAGE_SIZE;

    if (!pageSize || pageSize <= 0) {
        return undefined;
    }

    if (typeof lastPage.total === 'number') {
        if (lastPage.total <= 0) {
            return undefined;
        }

        const totalPages = Math.ceil(lastPage.total / pageSize);

        if (currentPage >= totalPages) {
            return undefined;
        }

        return currentPage + 1;
    }

    if (lastPage.records.length < pageSize) {
        return undefined;
    }

    return currentPage + 1;
};

export const plansApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        createPlan: build.mutation<Plan, CreatePlanProps>({
            query: (body) => ({
                url: '/v1/coach/plans',
                method: 'post',
                data: body,
            }),
            invalidatesTags: ({id}) => [
                {type: 'Plans', id},
                {type: 'Plans', id: 'LIST'},
            ],
        }),

        getPlan: build.query<Plan, string>({
            query: (planId) => ({
                url: `/v1/coach/plans/${planId}`,
                method: 'get',
            }),
            providesTags: (_result, _error, planId) => [{type: 'Plans', id: planId}],
        }),

        updatePlan: build.mutation<Plan, UpdatePlanProps>({
            query: (body) => ({
                url: '/v1/coach/plans/' + body.id,
                method: 'patch',
                data: {
                    ...body,
                    id: undefined,
                    created_at: undefined,
                    updated_at: undefined,
                },
            }),
            invalidatesTags: ({id}) => [
                {type: 'Plans', id},
                {type: 'Plans', id: 'LIST'},
            ],
        }),

        listPlans: build.infiniteQuery<PlansList, PlansListOpts, number>({
            query: ({queryArg, pageParam = 1}) => ({
                url: '/v1/coach/plans',
                method: 'get',
                params: buildListParams(queryArg, pageParam),
            }),
            providesTags: (result) => {
                const baseTag = [{type: 'Plans' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [...records.map((plan) => ({type: 'Plans' as const, id: plan.id})), ...baseTag];
            },
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage, _allPages, lastPageParam) => getNextPlanPage(lastPage, lastPageParam),
            },
        }),

        copyPlanToClient: build.mutation<Plan, CopyPlanToClientProps>({
            query: ({plan_id, ...body}) => ({
                url: `/v1/coach/plans/${plan_id}/copy-to-client`,
                method: 'post',
                data: body,
            }),
            invalidatesTags: (_result, _error, {client_id}) => [
                {type: 'Plans', id: 'LIST'},
                {type: 'Clients', id: client_id},
                {type: 'Clients', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useCreatePlanMutation: useCreatePlan,
    useUpdatePlanMutation: useUpdatePlan,
    useGetPlanQuery: useGetPlan,
    useListPlansInfiniteQuery: useListPlans,
    useCopyPlanToClientMutation: useCopyPlanToClient,
} = plansApi;
