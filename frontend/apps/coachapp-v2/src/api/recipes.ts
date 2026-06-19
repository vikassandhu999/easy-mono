import {api} from '@/api/base';
import {type Food, foodFromApi} from '@/api/foods';
import {ApiListResponse, ApiResponse, listTags, Macros, normalizeMacros, pageTags, ServingSize} from '@/api/shared';

const PAGE_SIZE = 20;

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

/** Filter params for infinite query — no offset/limit (pagination handled by infiniteQuery) */
export type ListRecipesFilters = {
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

export type RecipeUpdateRequest = Partial<RecipeCreateRequest>;

export function recipeFromApi(recipe: Recipe): Recipe {
  return {
    ...recipe,
    macros: normalizeMacros(recipe.macros),
    foods: recipe.foods.map(foodFromApi),
    recipe_ingredients: recipe.recipe_ingredients.map((ingredient) => ({
      ...ingredient,
      food: foodFromApi(ingredient.food),
    })),
  };
}

function mapRecipeResponse(response: ApiResponse<Recipe>): ApiResponse<Recipe> {
  return {
    ...response,
    data: recipeFromApi(response.data),
  };
}

function mapRecipeListResponse(response: ApiListResponse<Recipe>): ApiListResponse<Recipe> {
  return {
    ...response,
    data: response.data.map(recipeFromApi),
  };
}

export const recipesApi = api.injectEndpoints({
  endpoints: (build) => ({
    createRecipe: build.mutation<ApiResponse<Recipe>, RecipeCreateRequest>({
      query: (body) => ({
        url: '/v1/coach/recipes',
        method: 'POST',
        body,
      }),
      transformResponse: mapRecipeResponse,
      invalidatesTags: [{type: 'Recipe', id: 'LIST'}],
    }),
    getRecipe: build.query<ApiResponse<Recipe>, string>({
      query: (id) => `/v1/coach/recipes/${id}`,
      transformResponse: mapRecipeResponse,
      providesTags: (_, __, id) => [{type: 'Recipe', id}],
    }),
    listRecipes: build.query<ApiListResponse<Recipe>, ListRecipesParams | void>({
      query: (params) => ({url: '/v1/coach/recipes', params}),
      transformResponse: mapRecipeListResponse,
      providesTags: (result) => listTags('Recipe', result),
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
    recipes: build.infiniteQuery<ApiListResponse<Recipe>, ListRecipesFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/recipes',
        params: {
          ...(queryArg?.search && {search: queryArg.search}),
          offset: pageParam,
          limit: PAGE_SIZE,
        },
      }),
      transformResponse: mapRecipeListResponse,
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          const nextOffset = lastPageParam + PAGE_SIZE;
          return nextOffset < lastPage.count ? nextOffset : undefined;
        },
      },
      providesTags: (result) => pageTags('Recipe', result),
    }),
    updateRecipe: build.mutation<ApiResponse<Recipe>, {body: RecipeUpdateRequest; id: string}>({
      query: ({id, body}) => ({
        url: `/v1/coach/recipes/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: mapRecipeResponse,
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
  useRecipesInfiniteQuery,
  useUpdateRecipeMutation,
} = recipesApi;
