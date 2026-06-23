import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';

// ── Types ───────────────────────────────────────────────────

export type ServingSize = {
  amount: null | number;
  unit: string;
  weight_g: null | number;
};

export type ClientRecipe = {
  category: null | string;
  cooked_weight_g: null | number;
  id: string;
  inserted_at: string;
  macros: null | Record<string, number>;
  name: string;
  serving_sizes: ServingSize[];
  updated_at: string;
};

export type ListClientRecipesParams = {
  limit?: number;
  offset?: number;
  search?: string;
};

// ── Endpoints ───────────────────────────────────────────────

export const clientRecipesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClientRecipe: build.query<ApiResponse<ClientRecipe>, string>({
      query: (id) => `/v1/client/recipes/${id}`,
      providesTags: (_, __, id) => [{type: 'Recipe', id}],
    }),
    listClientRecipes: build.query<ApiListResponse<ClientRecipe>, ListClientRecipesParams | void>({
      query: (params) => ({url: '/v1/client/recipes', params}),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((recipe) => ({
                type: 'Recipe' as const,
                id: recipe.id,
              })),
              {type: 'Recipe' as const, id: 'LIST'},
            ]
          : [{type: 'Recipe' as const, id: 'LIST'}],
    }),
  }),
});

export const {useGetClientRecipeQuery, useListClientRecipesQuery} = clientRecipesApi;
