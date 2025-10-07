import {
    type CreatePlanSessionInput,
    type PlanSession,
    type PlanSessionList,
    type PlanSessionQueryParams,
    type UpdatePlanSessionInput,
} from '@/api/plan_sessions';

import {apiSlice} from './apiSlice';

type ListPlanSessionsArg = {
    params?: PlanSessionQueryParams;
    planId: string;
};

type GetPlanSessionArg = {
    planId: string;
    planSessionId: string;
    params?: Pick<PlanSessionQueryParams, 'include_session'>;
};

type CreatePlanSessionArg = {
    data: CreatePlanSessionInput;
    planId: string;
};

type UpdatePlanSessionArg = {
    data: UpdatePlanSessionInput;
    planId: string;
    planSessionId: string;
};

type DeletePlanSessionArg = {
    planId: string;
    planSessionId: string;
};

export const planSessionsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        listPlanSessions: builder.query<PlanSessionList, ListPlanSessionsArg>({
            query: ({planId, params}) => ({
                url: `/v1/coach/plans/${planId}/sessions`,
                method: 'get',
                params,
            }),
            providesTags: (result, _error, {planId}) => {
                const baseTags = [
                    {type: 'PlanSessions' as const, id: `PLAN-${planId}`},
                    {type: 'PlanSessions' as const, id: 'LIST'},
                ];

                if (!result) {
                    return baseTags;
                }

                return [
                    ...result.records.map((session) => ({type: 'PlanSessions' as const, id: session.id})),
                    ...baseTags,
                ];
            },
        }),
        getPlanSession: builder.query<PlanSession, GetPlanSessionArg>({
            query: ({planId, planSessionId, params}) => ({
                url: `/v1/coach/plans/${planId}/sessions/${planSessionId}`,
                method: 'get',
                params,
            }),
            providesTags: (_result, _error, {planSessionId}) => [{type: 'PlanSessions', id: planSessionId}],
        }),
        createPlanSession: builder.mutation<PlanSession, CreatePlanSessionArg>({
            query: ({planId, data}) => ({
                url: `/v1/coach/plans/${planId}/sessions`,
                method: 'post',
                data,
            }),
            invalidatesTags: (_result, _error, {planId}) => [
                {type: 'PlanSessions', id: 'LIST'},
                {type: 'PlanSessions', id: `PLAN-${planId}`},
                {type: 'Plans', id: planId},
            ],
        }),
        updatePlanSession: builder.mutation<PlanSession, UpdatePlanSessionArg>({
            query: ({planId, planSessionId, data}) => ({
                url: `/v1/coach/plans/${planId}/sessions/${planSessionId}`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_result, _error, {planId, planSessionId}) => [
                {type: 'PlanSessions', id: planSessionId},
                {type: 'PlanSessions', id: `PLAN-${planId}`},
                {type: 'PlanSessions', id: 'LIST'},
            ],
        }),
        deletePlanSession: builder.mutation<{message?: string}, DeletePlanSessionArg>({
            query: ({planId, planSessionId}) => ({
                url: `/v1/coach/plans/${planId}/sessions/${planSessionId}`,
                method: 'delete',
            }),
            invalidatesTags: (_result, _error, {planId, planSessionId}) => [
                {type: 'PlanSessions', id: planSessionId},
                {type: 'PlanSessions', id: `PLAN-${planId}`},
                {type: 'PlanSessions', id: 'LIST'},
            ],
        }),
    }),
});

export const {
    useListPlanSessionsQuery,
    useGetPlanSessionQuery,
    useCreatePlanSessionMutation,
    useUpdatePlanSessionMutation,
    useDeletePlanSessionMutation,
} = planSessionsApi;
