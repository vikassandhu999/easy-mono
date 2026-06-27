/**
 * Hand-written infinite queries for /v1/coach/nutrition-foods and
 * /v1/coach/nutrition-recipes.
 *
 * Codegen cannot emit `build.infiniteQuery`, so these mirror the pattern from
 * `src/api/training-exercises.ts` but target the coach-scoped nutrition
 * endpoints with the generated `Food` / `FoodListResponse` / `ListFoodsApiArg`
 * and `Recipe` / `RecipeListResponse` / `ListRecipesApiArg` types from
 * `generated.ts` so the hand-written queries stay type-synced.
 *
 * Generated endpoints are `tag: false`, so the generated `useCreateFoodMutation`
 * does NOT invalidate the foods list. We re-declare `createCoachFood` here with
 * `invalidatesTags: [{type: 'Food', id: 'LIST'}]` (same approach as
 * `createCoachTrainingExercise` in `training-exercises.ts`) so create-custom-food
 * in the picker refreshes the list. Import that hook from this module.
 */
import {api} from '@/api/base';
import {
  type CreateFoodApiArg,
  type CreateFoodApiResponse,
  coachApi,
  type FoodListResponse,
  type ListFoodsApiArg,
  type ListRecipesApiArg,
  type RecipeListResponse,
} from '@/api/generated';
import {pageTags} from '@/api/shared';

const PAGE_SIZE = 20;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachFoodsFilters = Pick<ListFoodsApiArg, 'search'>;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachRecipesFilters = Pick<ListRecipesApiArg, 'search'>;

export const nutritionFoodsApi = api.injectEndpoints({
  endpoints: (build) => ({
    coachFoods: build.infiniteQuery<FoodListResponse, CoachFoodsFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/nutrition-foods',
        params: {
          ...(queryArg?.search ? {search: queryArg.search} : {}),
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
      // result is InfiniteData<FoodListResponse> | undefined.
      // pageTags expects {pages: {data: {id: string}[]}[]} which matches the
      // InfiniteData shape directly because FoodListResponse has a `data` field
      // of Food[].
      providesTags: (result) => pageTags('Food', result as {pages: {data: {id: string}[]}[]} | undefined),
    }),

    coachRecipes: build.infiniteQuery<RecipeListResponse, CoachRecipesFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/nutrition-recipes',
        params: {
          ...(queryArg?.search ? {search: queryArg.search} : {}),
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
      // result is InfiniteData<RecipeListResponse> | undefined.
      // pageTags expects {pages: {data: {id: string}[]}[]} which matches the
      // InfiniteData shape directly because RecipeListResponse has a `data`
      // field of Recipe[].
      providesTags: (result) => pageTags('Recipe', result as {pages: {data: {id: string}[]}[]} | undefined),
    }),

    /**
     * Create a custom coach food. The generated `useCreateFoodMutation` posts to
     * the same endpoint but is `tag: false`; we re-add it here with
     * `invalidatesTags` so creating a food from the picker's "no match" flow
     * refreshes the infinite foods list. Callers import everything from one module.
     */
    createCoachFood: build.mutation<CreateFoodApiResponse, CreateFoodApiArg>({
      query: ({foodRequest}) => ({
        url: '/v1/coach/nutrition-foods',
        method: 'POST',
        body: foodRequest,
      }),
      invalidatesTags: [{type: 'Food', id: 'LIST'}],
    }),
  }),
});

export const {useCoachFoodsInfiniteQuery, useCoachRecipesInfiniteQuery, useCreateCoachFoodMutation} = nutritionFoodsApi;

// Generated get/update for food & recipe are tag:false. Editing is a separate
// page that navigates back to the detail (and list) on save, so wire the
// detail<->list tags here to avoid stale reads after an edit.
coachApi.enhanceEndpoints({
  endpoints: {
    getFood: {providesTags: (_r, _e, {id}) => [{type: 'Food', id}]},
    updateFood: {
      invalidatesTags: (_r, _e, {id}) => [
        {type: 'Food', id},
        {type: 'Food', id: 'LIST'},
      ],
    },
    deleteFood: {invalidatesTags: [{type: 'Food', id: 'LIST'}]},
    getRecipe: {providesTags: (_r, _e, {id}) => [{type: 'Recipe', id}]},
    createRecipe: {invalidatesTags: [{type: 'Recipe', id: 'LIST'}]},
    updateRecipe: {
      invalidatesTags: (_r, _e, {id}) => [
        {type: 'Recipe', id},
        {type: 'Recipe', id: 'LIST'},
      ],
    },
    deleteRecipe: {invalidatesTags: [{type: 'Recipe', id: 'LIST'}]},
  },
});
