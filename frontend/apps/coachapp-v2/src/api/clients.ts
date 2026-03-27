import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

const PAGE_SIZE = 20;

// ── Enums ────────────────────────────────────────────────────

export type ClientStatus = 'active' | 'archived' | 'expired' | 'expiring' | 'inactive' | 'pending';
export type PaymentStatus = 'free' | 'paid' | 'partial' | 'pending';

// ── Client ───────────────────────────────────────────────────

export type ClientOffer = {
  id: string;
  name: string;
  price_display: null | string;
};

export type Client = {
  id: string;

  // Contact
  email: null | string;
  first_name: null | string;
  last_name: null | string;
  phone: null | string;
  instagram_handle: null | string;

  // Program tracking
  program_name: null | string;
  program_start: null | string;
  program_end: null | string;

  // Payment tracking
  payment_status: null | PaymentStatus;
  payment_amount: null | number;
  payment_currency: null | string;
  payment_notes: null | string;

  // Intake (from storefront application)
  intake_answers: null | Record<string, unknown>;
  offer_id: null | string;
  source: null | string;

  // Status
  status: ClientStatus;
  status_override: null | string;

  // Meta
  notes: null | string;
  invite_url: null | string;
  inserted_at: string;
  updated_at: string;

  // Preloads
  offer: ClientOffer | null;
};

// ── Request types ────────────────────────────────────────────

export type ClientInviteRequest = {
  email?: string;
  first_name?: string;
  instagram_handle?: string;
  last_name?: string;
  notes?: string;
  phone?: string;
};

export type ClientUpdateRequest = {
  first_name?: string;
  instagram_handle?: null | string;
  last_name?: string;
  notes?: null | string;
  payment_amount?: null | number;
  payment_currency?: null | string;
  payment_notes?: null | string;
  payment_status?: null | PaymentStatus;
  phone?: null | string;
  program_end?: null | string;
  program_name?: null | string;
  program_start?: null | string;
  status_override?: null | string;
};

// ── List response with summary ───────────────────────────────

export type ClientSummary = {
  active: number;
  expired: number;
  expiring: number;
  payment_due: number;
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
  payment_status?: string;
  search?: string;
  status?: string;
};

export type ListClientsFilters = {
  payment_status?: string;
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
          ...(queryArg?.payment_status && {payment_status: queryArg.payment_status}),
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
