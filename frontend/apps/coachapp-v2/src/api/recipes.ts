import {api} from '@/api';
import {Food} from '@/api/foods';
import {ApiListResponse, ApiResponse, Macros, ServingSize} from '@/api/shared';

export type RecipeIngredient = {
  food_id: string;
  food: Food;
  unit: null | string;
  amount: null | number;
  weight_g: null | number;
};

export type RecipeIngredientInput = {
  food_id: string;
  unit?: string;
  amount?: number;
  weight_g?: number;
};

export type Recipe = {
  id: string;
  name: string;
  macros: Macros;
  source: null | string;
  category: null | string;
  tags: string[];
  instructions: null | string;
  image_url: null | string;
  cooked_weight_g: null | number;
  service_size_type: string;
  serving_sizes: ServingSize[];
  foods: Food[];
  recipe_ingredients: RecipeIngredient[];
  creator_id: string;
  inserted_at: string;
  updated_at: string;
};

export type ListRecipesParams = {
  offset?: number;
  limit?: number;
  search?: string;
};

export type RecipeCreateRequest = {
  name: string;
  macros?: Macros;
  source?: string;
  category?: string;
  tags?: string[];
  instructions?: string;
  image_url?: string;
  cooked_weight_g?: number;
  service_size_type?: string;
  serving_sizes?: ServingSize[];
  recipe_ingredients?: RecipeIngredientInput[];
};

export type RecipeUpdateRequest = {
  name?: string;
  macros?: Macros;
  source?: string;
  category?: string;
  tags?: string[];
  instructions?: string;
  image_url?: string;
  cooked_weight_g?: number;
  service_size_type?: string;
  serving_sizes?: ServingSize[];
  recipe_ingredients?: RecipeIngredientInput[];
};

export const recipesApi = api.injectEndpoints({
  endpoints: (build) => ({
    createRecipe: build.mutation<ApiResponse<Recipe>, RecipeCreateRequest>({
      query: (body) => ({
        url: '/v1/coach/recipes',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{type: 'Recipe', id: 'LIST'}],
    }),
    getRecipe: build.query<ApiResponse<Recipe>, string>({
      query: (id) => `/v1/coach/recipes/${id}`,
      providesTags: (_, __, id) => [{type: 'Recipe', id}],
    }),
    listRecipes: build.query<ApiListResponse<Recipe>, ListRecipesParams | void>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/recipes',
              params,
            }
          : '/v1/coach/recipes',
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
    deleteRecipe: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/recipes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Recipe', id},
        {type: 'Recipe', id: 'LIST'},
      ],
    }),
    updateRecipe: build.mutation<ApiResponse<Recipe>, {body: RecipeUpdateRequest; id: string}>({
      query: ({id, body}) => ({
        url: `/v1/coach/recipes/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'Recipe', id},
        {type: 'Recipe', id: 'LIST'},
      ],
    }),
  }),
});

export const {
  useCreateRecipeMutation,
  useDeleteRecipeMutation,
  useGetRecipeQuery,
  useListRecipesQuery,
  useUpdateRecipeMutation,
} = recipesApi;
