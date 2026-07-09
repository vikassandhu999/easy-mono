import {api} from '@/api/base';
import type {Client as GeneratedClient} from '@/api/generated';
import {ApiResponse, listTags, pageTags} from '@/api/shared';

const PAGE_SIZE = 50;

export type ClientStatus = GeneratedClient['status'];

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
  /** 'onboarding' until the client's first plan assignment auto-advances it to 'coaching'. */
  stage: GeneratedClient['stage'];
  /** Populated only when status is 'inactive'. */
  inactive_reason: GeneratedClient['inactive_reason'];
  subscription_started_on: null | string;
  subscription_ends_on: null | string;
  intake_incomplete: boolean;
  needs_plan: boolean;
  expiring_soon: boolean;
  /** The trainer this client is currently assigned to. */
  assigned_coach_id: null | string;
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
 *   - All other transitions happen between active/inactive.
 */
export type AllowedUpdateStatus = Exclude<ClientStatus, 'pending'>;

export type ClientUpdateRequest = {
  email?: null | string;
  first_name?: string;
  last_name?: string;
  notes?: null | string;
  phone?: null | string;
  status?: AllowedUpdateStatus;
};

/**
 * Valid status transitions. Returns the set of statuses the coach can
 * transition to from the given current status.
 *
 *   pending  → (none) — only exits via accept-invite or revoke
 *   active   → inactive
 *   inactive → active
 *
 * Nothing can return to `pending` — once a Client has been linked to a User,
 * that link is permanent.
 */
export function allowedStatusesFor(status: ClientStatus): AllowedUpdateStatus[] {
  if (status === 'pending') {
    return [];
  }
  return ['active', 'inactive'];
}

export type ClientSummary = {
  active: number;
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

const clientsApi = api.injectEndpoints({
  // These hand-managed endpoints (cache tags, infinite query, precise types)
  // share names with the generated client. Without override, which definition
  // wins depends on import order — override makes the richer handwritten ones
  // authoritative and deterministic.
  overrideExisting: true,
  endpoints: (build) => ({
    inviteClient: build.mutation<ApiResponse<Client>, ClientInviteRequest>({
      query: (body) => ({
        url: '/v1/coach/clients/invite',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        {type: 'Client', id: 'LIST'},
        {type: 'Billing', id: 'SUMMARY'},
      ],
    }),
    getClient: build.query<ApiResponse<Client>, string>({
      query: (id) => `/v1/coach/clients/${id}`,
      providesTags: (_, __, id) => [{type: 'Client', id}],
    }),
    listClients: build.query<ClientListResponse, ListClientsParams | void>({
      query: (params) => ({url: '/v1/coach/clients', params: params ?? undefined}),
      providesTags: (result) => listTags('Client', result),
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
      providesTags: (result) => pageTags('Client', result),
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
    /**
     * Revoke a pending invitation. Hard-deletes the Client row on 204. The
     * client's invite URL becomes invalid immediately.
     *
     * Returns 422 if the client is not pending — use updateClient with
     * status: 'inactive' instead for non-pending clients.
     */
    revokeInvitation: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/clients/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Client', id},
        {type: 'Client', id: 'LIST'},
        {type: 'Billing', id: 'SUMMARY'},
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
        {type: 'Billing', id: 'SUMMARY'},
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
