import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';

// ── Types ───────────────────────────────────────────────────

export type ServingSize = {
  amount: null | number;
  unit: string;
  weight_g: null | number;
};

export type ClientFood = {
  category: null | string;
  id: string;
  inserted_at: string;
  macros: null | Record<string, number>;
  name: string;
  notes: null | string;
  serving_sizes: ServingSize[];
  source: null | string;
  updated_at: string;
};

export type ListClientFoodsParams = {
  limit?: number;
  offset?: number;
  search?: string;
};

// ── Endpoints ───────────────────────────────────────────────

export const clientFoodsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClientFood: build.query<ApiResponse<ClientFood>, string>({
      query: (id) => `/v1/client/foods/${id}`,
      providesTags: (_, __, id) => [{type: 'Food', id}],
    }),
    listClientFoods: build.query<ApiListResponse<ClientFood>, ListClientFoodsParams | void>({
      query: (params) => ({url: '/v1/client/foods', params}),
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
  }),
});

export const {useGetClientFoodQuery, useListClientFoodsQuery} = clientFoodsApi;
