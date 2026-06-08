import {api} from '@/api/base';
import {clientFromApi, clientListFromApi} from '@/api/mappers/clients';
import {ApiResponse} from '@/api/shared';

const PAGE_SIZE = 50;

export type ClientStatus = 'active' | 'archived' | 'inactive' | 'pending';

export type Client = {
  id: string;
  email: null | string;
  /**
   * User-authoritative when the Client is linked to a User (any status except
   * `pending`). For pending clients, this is the coach-set invite value.
   */
  first_name: null | string;
  /** See first_name — same User-wins-then-fallback rule applies. */
  last_name: null | string;
  phone: null | string;
  notes: null | string;
  status: ClientStatus;
  /** Present only for pending clients. */
  invite_url: null | string;
  /**
   * Timestamp of when the invitation was created or last resent.
   * Present only for pending clients.
   */
  invitation_sent_at: null | string;
  /**
   * invitation_sent_at + 30 days. Present only for pending clients.
   */
  invitation_expires_at: null | string;
  inserted_at: string;
  updated_at: string;
};

export type ClientInviteRequest = {
  email?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  phone?: string;
};

/**
 * Status values the coach can set via PATCH. `pending` is intentionally absent:
 *   - The only transition into `pending` is creating an invitation.
 *   - The only transition out of `pending` is the client accepting (server-driven).
 *   - All other transitions happen among active/inactive/archived.
 */
export type AllowedUpdateStatus = 'active' | 'archived' | 'inactive';

export type ClientUpdateRequest = {
  email?: null | string;
  first_name?: string;
  last_name?: string;
  notes?: null | string;
  phone?: null | string;
  status?: AllowedUpdateStatus;
};

/**
 * Valid status transitions per the spec's invariants table. Returns the set of
 * statuses the coach can transition to from the given current status.
 *
 *   pending  → (none) — only exits via accept-invite or revoke
 *   active   → inactive | archived
 *   inactive → active | archived
 *   archived → active | inactive
 *
 * Nothing can return to `pending` — once a Client has been linked to a User,
 * that link is permanent.
 */
export function allowedStatusesFor(current: ClientStatus): AllowedUpdateStatus[] {
  switch (current) {
    case 'pending':
      return [];
    case 'active':
      return ['active', 'inactive', 'archived'];
    case 'inactive':
      return ['active', 'inactive', 'archived'];
    case 'archived':
      return ['active', 'inactive', 'archived'];
  }
}

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

export type ApiClient = Client;

function mapClientResponse(response: ApiResponse<ApiClient>): ApiResponse<Client> {
  return {
    ...response,
    data: clientFromApi(response.data),
  };
}

export const clientsApi = api.injectEndpoints({
  endpoints: (build) => ({
    inviteClient: build.mutation<ApiResponse<Client>, ClientInviteRequest>({
      query: (body) => ({
        url: '/v1/coach/clients/invite',
        method: 'POST',
        body,
      }),
      transformResponse: mapClientResponse,
      invalidatesTags: [{type: 'Client', id: 'LIST'}],
    }),
    getClient: build.query<ApiResponse<Client>, string>({
      query: (id) => `/v1/coach/clients/${id}`,
      transformResponse: mapClientResponse,
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
      transformResponse: clientListFromApi,
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
      transformResponse: clientListFromApi,
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
      transformResponse: mapClientResponse,
      invalidatesTags: (_, __, id) => [
        {type: 'Client', id},
        {type: 'Client', id: 'LIST'},
      ],
    }),
    /**
     * Revoke a pending invitation. Hard-deletes the Client row on 204. The
     * client's invite URL becomes invalid immediately.
     *
     * Returns 422 if the client is not pending — use updateClient with
     * status: 'archived' instead for non-pending clients.
     */
    revokeInvitation: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/clients/${id}`,
        method: 'DELETE',
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
      transformResponse: mapClientResponse,
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
  useRevokeInvitationMutation,
  useUpdateClientMutation,
} = clientsApi;
