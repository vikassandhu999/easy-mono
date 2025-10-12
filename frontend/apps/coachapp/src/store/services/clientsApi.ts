import {
    type Client,
    type CreateClientProps,
    type ListClientsProps,
    type ListClientsResult,
    type MembershipStatusType,
    type UpdateClientProps,
} from '@/api/clients.ts';

import {apiSlice} from './apiSlice';

type BulkOperationResponse = {
    updated_count: number;
};

type ListClientsQueryParams = Omit<ListClientsProps, 'page'> | undefined;

const DEFAULT_PAGE_SIZE = 20;

const buildClientListParams = (queryArg: ListClientsQueryParams, pageParam: number) => {
    const params: Record<string, unknown> = {
        ...(queryArg ?? {}),
        page: pageParam,
    };

    if (!('page_size' in params) || typeof params.page_size !== 'number') {
        params.page_size = DEFAULT_PAGE_SIZE;
    }

    return params;
};

const getNextClientPage = (lastPage: ListClientsResult, lastPageParam: number, queryArg: ListClientsQueryParams) => {
    const currentPage = lastPage.page ?? lastPageParam;
    const pageSize = lastPage.page_size ?? queryArg?.page_size ?? DEFAULT_PAGE_SIZE;

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

export const clientsApi = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        listClients: build.infiniteQuery<ListClientsResult, ListClientsQueryParams, number>({
            query: ({queryArg, pageParam = 1}) => ({
                url: '/v1/coach/clients',
                method: 'get',
                params: buildClientListParams(queryArg, pageParam),
            }),
            serializeQueryArgs: ({queryArgs, endpointName}) => {
                return `${endpointName}-${JSON.stringify(queryArgs ?? {})}`;
            },
            providesTags: (result) => {
                const baseTag = [{type: 'Clients' as const, id: 'LIST'}];

                if (!result) {
                    return baseTag;
                }

                const records = result.pages.flatMap((page) => page.records);

                if (records.length === 0) {
                    return baseTag;
                }

                return [...records.map((client) => ({type: 'Clients' as const, id: client.id})), ...baseTag];
            },
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage, _allPages, lastPageParam, _allPageParams, queryArg) =>
                    getNextClientPage(lastPage, lastPageParam, queryArg),
            },
        }),
        getClient: build.query<Client, string>({
            query: (clientId) => ({
                url: `/v1/coach/clients/${clientId}`,
                method: 'get',
            }),
            providesTags: (_result, _error, clientId) => [{type: 'Clients', id: clientId}],
        }),
        getMembershipStats: build.query<Record<string, number>, void>({
            query: () => ({
                url: '/v1/coach/clients/membership-stats',
                method: 'get',
            }),
            providesTags: [{type: 'MembershipStats', id: 'LIST'}],
        }),
        createClient: build.mutation<Client, CreateClientProps>({
            query: (body) => ({
                url: '/v1/coach/clients',
                method: 'post',
                data: body,
            }),
            invalidatesTags: [
                {type: 'Clients', id: 'LIST'},
                {type: 'MembershipStats', id: 'LIST'},
            ],
        }),
        updateClient: build.mutation<Client, {clientId: string; data: UpdateClientProps}>({
            query: ({clientId, data}) => ({
                url: `/v1/coach/clients/${clientId}`,
                method: 'patch',
                data,
            }),
            invalidatesTags: (_result, _error, arg) => [
                {type: 'Clients', id: arg.clientId},
                {type: 'Clients', id: 'LIST'},
                {type: 'MembershipStats', id: 'LIST'},
            ],
        }),
        updateMembershipStatus: build.mutation<Client, {clientId: string; status: MembershipStatusType}>({
            query: ({clientId, status}) => ({
                url: `/v1/coach/clients/${clientId}/membership-status`,
                method: 'patch',
                data: {status},
            }),
            invalidatesTags: (_result, _error, arg) => [
                {type: 'Clients', id: arg.clientId},
                {type: 'Clients', id: 'LIST'},
                {type: 'MembershipStats', id: 'LIST'},
            ],
        }),
        assignCoach: build.mutation<Client, {clientId: string; coachId: string}>({
            query: ({clientId, coachId}) => ({
                url: `/v1/coach/clients/${clientId}/assign-coach`,
                method: 'patch',
                data: {coach_id: coachId},
            }),
            invalidatesTags: (_result, _error, arg) => [
                {type: 'Clients', id: arg.clientId},
                {type: 'Clients', id: 'LIST'},
            ],
        }),
        bulkAssignCoach: build.mutation<BulkOperationResponse, {clientIds: string[]; coachId: string}>({
            query: ({clientIds, coachId}) => ({
                url: '/v1/coach/clients/bulk-assign-coach',
                method: 'post',
                data: {
                    client_ids: clientIds,
                    coach_id: coachId,
                },
            }),
            invalidatesTags: [{type: 'Clients', id: 'LIST'}],
        }),
        bulkUpdateMembershipStatus: build.mutation<
            BulkOperationResponse,
            {clientIds: string[]; status: MembershipStatusType}
        >({
            query: ({clientIds, status}) => ({
                url: '/v1/coach/clients/bulk-update-status',
                method: 'post',
                data: {
                    client_ids: clientIds,
                    status,
                },
            }),
            invalidatesTags: [
                {type: 'Clients', id: 'LIST'},
                {type: 'MembershipStats', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useListClientsInfiniteQuery,
    useGetClientQuery,
    useGetMembershipStatsQuery,
    useCreateClientMutation,
    useUpdateClientMutation,
    useUpdateMembershipStatusMutation,
    useAssignCoachMutation,
    useBulkAssignCoachMutation,
    useBulkUpdateMembershipStatusMutation,
} = clientsApi;
