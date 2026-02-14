import { api } from "@/api";
import {
  ApiListResponse,
  ApiResponse,
  Macros,
  ServingSize,
} from "@/api/shared";

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
        url: "/v1/coach/foods",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Food", id: "LIST" }],
    }),
    getFood: build.query<ApiResponse<Food>, string>({
      query: (id) => `/v1/coach/foods/${id}`,
      providesTags: (_, __, id) => [{ type: "Food", id }],
    }),
    listFoods: build.query<ApiListResponse<Food>, ListFoodsParams | void>({
      query: (params) =>
        params
          ? {
              url: "/v1/coach/foods",
              params,
            }
          : "/v1/coach/foods",
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((food) => ({
                type: "Food" as const,
                id: food.id,
              })),
              { type: "Food" as const, id: "LIST" },
            ]
          : [{ type: "Food" as const, id: "LIST" }],
    }),
    deleteFood: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/foods/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, id) => [
        { type: "Food", id },
        { type: "Food", id: "LIST" },
      ],
    }),
    updateFood: build.mutation<
      ApiResponse<Food>,
      { body: FoodUpdateRequest; id: string }
    >({
      query: ({ id, body }) => ({
        url: `/v1/coach/foods/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "Food", id },
        { type: "Food", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useCreateFoodMutation,
  useDeleteFoodMutation,
  useGetFoodQuery,
  useListFoodsQuery,
  useUpdateFoodMutation,
} = foodsApi;
