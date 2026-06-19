import {api} from '@/api/base';
import {ApiListResponse, ApiResponse, listTags, pageTags} from '@/api/shared';

const PAGE_SIZE = 20;

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

export type OfferUpdateRequest = Partial<OfferCreateRequest> & {status?: OfferStatus};

export type ListOffersParams = {
  offset?: number;
  limit?: number;
};

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
      query: (params) => ({url: '/v1/coach/offers', params}),
      providesTags: (result) => listTags('Offer', result),
    }),
    offers: build.infiniteQuery<ApiListResponse<Offer>, void, number>({
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
      providesTags: (result) => pageTags('Offer', result),
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
