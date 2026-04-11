import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

const PAGE_SIZE = 20;

// ── Enums ────────────────────────────────────────────────────

export type ClientStatus = 'active' | 'archived' | 'inactive' | 'pending';

// ── Client ───────────────────────────────────────────────────

export type Client = {
  id: string;
  email: null | string;
  first_name: null | string;
  last_name: null | string;
  phone: null | string;
  notes: null | string;
  status: ClientStatus;
  invite_url: null | string;
  inserted_at: string;
  updated_at: string;
};

// ── Request types ────────────────────────────────────────────

export type ClientInviteRequest = {
  email?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  phone?: string;
};

export type ClientUpdateRequest = {
  email?: null | string;
  first_name?: string;
  last_name?: string;
  notes?: null | string;
  phone?: null | string;
  status?: ClientStatus;
};

// ── List response with summary ───────────────────────────────

export type ClientSummary = {
  active: number;
  archived: number;
  inactive: number;
  pending: number;
};

export type ClientListResponse = {
  count: number;
  data: Client[];
  summary: ClientSummary;
};

export type ListClientsParams = {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
};

export type ListClientsFilters = {
  search?: string;
  status?: string;
};

// ── Endpoints ────────────────────────────────────────────────

export const clientsApi = api.injectEndpoints({
  endpoints: (build) => ({
    inviteClient: build.mutation<ApiResponse<Client>, ClientInviteRequest>({
      query: (body) => ({
        url: '/v1/coach/clients/invite',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{type: 'Client', id: 'LIST'}],
    }),
    getClient: build.query<ApiResponse<Client>, string>({
      query: (id) => `/v1/coach/clients/${id}`,
      providesTags: (_, __, id) => [{type: 'Client', id}],
    }),
    listClients: build.query<ClientListResponse, ListClientsParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/clients',
              params,
            }
          : '/v1/coach/clients',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((client) => ({
                type: 'Client' as const,
                id: client.id,
              })),
              {type: 'Client' as const, id: 'LIST'},
            ]
          : [{type: 'Client' as const, id: 'LIST'}],
    }),
    clients: build.infiniteQuery<ClientListResponse, ListClientsFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/clients',
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
                page.data.map((client) => ({
                  type: 'Client' as const,
                  id: client.id,
                })),
              ),
              {type: 'Client' as const, id: 'LIST'},
            ]
          : [{type: 'Client' as const, id: 'LIST'}],
    }),
    resendClientInvite: build.mutation<ApiResponse<Client>, string>({
      query: (id) => ({
        url: `/v1/coach/clients/${id}/resend-invite`,
        method: 'POST',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Client', id},
        {type: 'Client', id: 'LIST'},
      ],
    }),
    updateClient: build.mutation<ApiResponse<Client>, {body: ClientUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/clients/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'Client', id},
        {type: 'Client', id: 'LIST'},
      ],
    }),
  }),
});

export const {
  useClientsInfiniteQuery,
  useGetClientQuery,
  useInviteClientMutation,
  useListClientsQuery,
  useResendClientInviteMutation,
  useUpdateClientMutation,
} = clientsApi;
