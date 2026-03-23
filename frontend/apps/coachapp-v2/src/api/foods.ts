import {api} from '@/api/base';
import {ApiListResponse, ApiResponse, Macros, ServingSize} from '@/api/shared';

const PAGE_SIZE = 20;

export type Food = {
  id: string;
  name: string;
  macros: Macros;
  source: null | string;
  category: null | string;
  tags: string[];
  notes: null | string;
  image_url: null | string;
  serving_sizes: ServingSize[];
  creator_id: string;
  inserted_at: string;
  updated_at: string;
};

export type ListFoodsParams = {
  offset?: number;
  limit?: number;
  search?: string;
};

/** Filter params for infinite query — no offset/limit (pagination handled by infiniteQuery) */
export type ListFoodsFilters = {
  search?: string;
};

export type FoodCreateRequest = {
  name: string;
  macros?: Macros;
  source?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  image_url?: string;
  serving_sizes?: ServingSize[];
};

export type FoodUpdateRequest = {
  name?: string;
  macros?: Macros;
  source?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  image_url?: string;
  serving_sizes?: ServingSize[];
};

export const foodsApi = api.injectEndpoints({
  endpoints: (build) => ({
    createFood: build.mutation<ApiResponse<Food>, FoodCreateRequest>({
      query: (body) => ({
        url: '/v1/coach/foods',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{type: 'Food', id: 'LIST'}],
    }),
    getFood: build.query<ApiResponse<Food>, string>({
      query: (id) => `/v1/coach/foods/${id}`,
      providesTags: (_, __, id) => [{type: 'Food', id}],
    }),
    listFoods: build.query<ApiListResponse<Food>, ListFoodsParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/foods',
              params,
            }
          : '/v1/coach/foods',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((food) => ({
                type: 'Food' as const,
                id: food.id,
              })),
              {type: 'Food' as const, id: 'LIST'},
            ]
          : [{type: 'Food' as const, id: 'LIST'}],
    }),
    deleteFood: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/foods/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Food', id},
        {type: 'Food', id: 'LIST'},
      ],
    }),
    /**
     * Infinite-scroll variant of listFoods.
     * Uses RTK Query 2.9's native build.infiniteQuery with offset-based pagination.
     * Hook: useFoodsInfiniteQuery
     */
    foods: build.infiniteQuery<ApiListResponse<Food>, ListFoodsFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/foods',
        params: {
          ...(queryArg?.search && {search: queryArg.search}),
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
                page.data.map((food) => ({
                  type: 'Food' as const,
                  id: food.id,
                })),
              ),
              {type: 'Food' as const, id: 'LIST'},
            ]
          : [{type: 'Food' as const, id: 'LIST'}],
    }),
    updateFood: build.mutation<ApiResponse<Food>, {body: FoodUpdateRequest; id: string}>({
      query: ({id, body}) => ({
        url: `/v1/coach/foods/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'Food', id},
        {type: 'Food', id: 'LIST'},
      ],
    }),
  }),
});

export const {
  useCreateFoodMutation,
  useDeleteFoodMutation,
  useFoodsInfiniteQuery,
  useGetFoodQuery,
  useListFoodsQuery,
  useUpdateFoodMutation,
} = foodsApi;
