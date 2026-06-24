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
 * NOTE: `useCreateFoodMutation` (generated) invalidates `{type: 'Food', id: 'LIST'}`
 * automatically via its generated `invalidatesTags`. Confirm at Task 3 when
 * the create-custom-food flow is wired in — no extra work needed here.
 */
import {api} from '@/api/base';
import type {FoodListResponse, ListFoodsApiArg, ListRecipesApiArg, RecipeListResponse} from '@/api/generated';
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
  }),
});

export const {useCoachFoodsInfiniteQuery, useCoachRecipesInfiniteQuery} = nutritionFoodsApi;
