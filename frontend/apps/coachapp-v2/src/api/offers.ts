import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';

const PAGE_SIZE = 20;

// ── Types ────────────────────────────────────────────────────

export type OfferType = 'combo' | 'consultation' | 'nutrition_plan' | 'other' | 'training_plan';

export type OfferStatus = 'active' | 'archived';

export type Offer = {
  id: string;
  name: string;
  slug: string;
  description: null | string;
  type: null | OfferType;
  duration_text: null | string;
  price: null | number;
  currency: null | string;
  price_display: null | string;
  features: string[];
  is_featured: boolean;
  status: OfferStatus;
  position: number;
  cta_text: null | string;
  inserted_at: string;
  updated_at: string;
};

export type OfferCreateRequest = {
  name: string;
  description?: null | string;
  type?: null | OfferType;
  duration_text?: null | string;
  price?: null | number;
  currency?: null | string;
  price_display?: null | string;
  features?: string[];
  is_featured?: boolean;
  cta_text?: null | string;
  position?: number;
};

export type OfferUpdateRequest = {
  name?: string;
  description?: null | string;
  type?: null | OfferType;
  duration_text?: null | string;
  price?: null | number;
  currency?: null | string;
  price_display?: null | string;
  features?: string[];
  is_featured?: boolean;
  status?: OfferStatus;
  cta_text?: null | string;
  position?: number;
};

export type ListOffersParams = {
  offset?: number;
  limit?: number;
};

/** Filter params for infinite query — no offset/limit (pagination handled by infiniteQuery) */
export type ListOffersFilters = Record<string, never>;

// ── Endpoints ────────────────────────────────────────────────

export const offersApi = api.injectEndpoints({
  endpoints: (build) => ({
    createOffer: build.mutation<ApiResponse<Offer>, OfferCreateRequest>({
      query: (body) => ({
        url: '/v1/coach/offers',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{type: 'Offer', id: 'LIST'}],
    }),
    getOffer: build.query<ApiResponse<Offer>, string>({
      query: (id) => `/v1/coach/offers/${id}`,
      providesTags: (_, __, id) => [{type: 'Offer', id}],
    }),
    listOffers: build.query<ApiListResponse<Offer>, ListOffersParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/offers',
              params,
            }
          : '/v1/coach/offers',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((offer) => ({
                type: 'Offer' as const,
                id: offer.id,
              })),
              {type: 'Offer' as const, id: 'LIST'},
            ]
          : [{type: 'Offer' as const, id: 'LIST'}],
    }),
    /**
     * Infinite-scroll variant of listOffers.
     * Uses RTK Query 2.9's native build.infiniteQuery with offset-based pagination.
     * Hook: useOffersInfiniteQuery
     */
    offers: build.infiniteQuery<ApiListResponse<Offer>, ListOffersFilters | void, number>({
      query: ({pageParam}) => ({
        url: '/v1/coach/offers',
        params: {
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
                page.data.map((offer) => ({
                  type: 'Offer' as const,
                  id: offer.id,
                })),
              ),
              {type: 'Offer' as const, id: 'LIST'},
            ]
          : [{type: 'Offer' as const, id: 'LIST'}],
    }),
    updateOffer: build.mutation<ApiResponse<Offer>, {body: OfferUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/offers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'Offer', id},
        {type: 'Offer', id: 'LIST'},
      ],
    }),
    deleteOffer: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/offers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Offer', id},
        {type: 'Offer', id: 'LIST'},
      ],
    }),
  }),
});

export const {
  useCreateOfferMutation,
  useDeleteOfferMutation,
  useGetOfferQuery,
  useListOffersQuery,
  useOffersInfiniteQuery,
  useUpdateOfferMutation,
} = offersApi;
