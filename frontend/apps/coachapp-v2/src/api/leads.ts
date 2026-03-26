import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';

const PAGE_SIZE = 20;

// ── Brief preload types (nested in Lead) ─────────────────────

export type OfferBrief = {
  id: string;
  name: string;
  price_display: null | string;
  duration_text: null | string;
};

export type ClientBrief = {
  id: string;
  email: string;
  first_name: null | string;
  last_name: null | string;
};

// ── Lead ─────────────────────────────────────────────────────

export type LeadStatus = 'contacted' | 'converted' | 'new' | 'rejected';

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram_handle: null | string;
  intake_answers: Record<string, unknown>;
  status: LeadStatus;
  notes: null | string;
  source: null | string;
  offer: null | OfferBrief;
  client: ClientBrief | null;
  inserted_at: string;
  updated_at: string;
};

export type LeadUpdateRequest = {
  status?: LeadStatus;
  notes?: null | string;
};

export type ListLeadsParams = {
  offset?: number;
  limit?: number;
  status?: LeadStatus;
};

/** Filter params for infinite query — no offset/limit (pagination handled by infiniteQuery) */
export type ListLeadsFilters = {
  status?: LeadStatus;
};

// ── Endpoints ────────────────────────────────────────────────

export const leadsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getLead: build.query<ApiResponse<Lead>, string>({
      query: (id) => `/v1/coach/leads/${id}`,
      providesTags: (_, __, id) => [{type: 'Lead', id}],
    }),
    listLeads: build.query<ApiListResponse<Lead>, ListLeadsParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/leads',
              params,
            }
          : '/v1/coach/leads',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((lead) => ({
                type: 'Lead' as const,
                id: lead.id,
              })),
              {type: 'Lead' as const, id: 'LIST'},
            ]
          : [{type: 'Lead' as const, id: 'LIST'}],
    }),
    /**
     * Infinite-scroll variant of listLeads.
     * Uses RTK Query 2.9's native build.infiniteQuery with offset-based pagination.
     * Hook: useLeadsInfiniteQuery
     */
    leads: build.infiniteQuery<ApiListResponse<Lead>, ListLeadsFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/leads',
        params: {
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
                page.data.map((lead) => ({
                  type: 'Lead' as const,
                  id: lead.id,
                })),
              ),
              {type: 'Lead' as const, id: 'LIST'},
            ]
          : [{type: 'Lead' as const, id: 'LIST'}],
    }),
    updateLead: build.mutation<ApiResponse<Lead>, {body: LeadUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/leads/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'Lead', id},
        {type: 'Lead', id: 'LIST'},
      ],
    }),
    deleteLead: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/leads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Lead', id},
        {type: 'Lead', id: 'LIST'},
      ],
    }),
    convertLead: build.mutation<ApiResponse<Lead>, string>({
      query: (id) => ({
        url: `/v1/coach/leads/${id}/convert`,
        method: 'POST',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Lead', id},
        {type: 'Lead', id: 'LIST'},
        {type: 'Client', id: 'LIST'},
      ],
    }),
  }),
});

export const {
  useConvertLeadMutation,
  useDeleteLeadMutation,
  useGetLeadQuery,
  useLeadsInfiniteQuery,
  useListLeadsQuery,
  useUpdateLeadMutation,
} = leadsApi;
