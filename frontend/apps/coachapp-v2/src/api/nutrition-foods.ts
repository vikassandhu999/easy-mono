/**
 * Foods and recipes: the coach's food/recipe library.
 *
 * Infinite browse queries (codegen can't emit `build.infiniteQuery`, so these
 * stay hand-written like `clients.ts`) plus every CRUD hook `src/foods` and
 * `src/recipes` need. In the old RTK app these detail/list CRUD endpoints were
 * codegen'd `tag: false` and wired to detail<->list invalidation via
 * `coachApi.enhanceEndpoints` (see `git show HEAD:.../nutrition-foods.ts`) —
 * ported 1:1 below as `invalidateQueries` calls in each mutation's `onSuccess`.
 */
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {foodKeys, recipeKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';
import {omitUndefined} from '@/api/shared';

const PAGE_SIZE = 20;

export type Food = components['schemas']['Food'];
export type FoodRequest = components['schemas']['FoodRequest'];
export type FoodUpdateRequest = components['schemas']['FoodUpdateRequest'];
export type FoodServingSize = components['schemas']['FoodServingSize'];
export type NutrientTotals = components['schemas']['NutrientTotals'];

export type Recipe = components['schemas']['Recipe'];
export type RecipeRequest = components['schemas']['RecipeRequest'];
export type RecipeUpdateRequest = components['schemas']['RecipeUpdateRequest'];
export type RecipeIngredient = components['schemas']['RecipeIngredient'];
export type RecipeIngredientRequest = components['schemas']['RecipeIngredientRequest'];

type ListFoodsQuery = NonNullable<paths['/v1/coach/nutrition-foods']['get']['parameters']['query']>;
type ListRecipesQuery = NonNullable<paths['/v1/coach/nutrition-recipes']['get']['parameters']['query']>;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachFoodsFilters = Pick<ListFoodsQuery, 'categories' | 'search'>;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachRecipesFilters = Pick<ListRecipesQuery, 'search'>;

export function useCoachFoodsInfiniteQuery(filters?: CoachFoodsFilters) {
  return useInfiniteQuery({
    queryKey: foodKeys.infinite(filters),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/nutrition-foods', {
          params: {
            query: {
              ...(filters?.search && {search: filters.search}),
              ...(filters?.categories?.length && {categories: filters.categories}),
              offset: pageParam,
              limit: PAGE_SIZE,
            },
          },
        }),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export function useCoachRecipesInfiniteQuery(filters?: CoachRecipesFilters) {
  return useInfiniteQuery({
    queryKey: recipeKeys.infinite(filters),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/nutrition-recipes', {
          params: {
            query: {
              ...(filters?.search && {search: filters.search}),
              offset: pageParam,
              limit: PAGE_SIZE,
            },
          },
        }),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

/** Create a custom coach food. Invalidates the foods list (flat + infinite) so the picker's "no match" create flow and the library list both refresh. */
export function useCreateCoachFoodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FoodRequest) => call(client.POST('/v1/coach/nutrition-foods', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: foodKeys.lists()});
    },
  });
}

export function useGetFoodQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: foodKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/nutrition-foods/{id}', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

export function useGetFoodImpactQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: foodKeys.impact(id),
    queryFn: () => call(client.GET('/v1/coach/nutrition-foods/{id}/impact', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateFoodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: FoodUpdateRequest}) =>
      call(client.PATCH('/v1/coach/nutrition-foods/{id}', {params: {path: {id}}, body})),
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: foodKeys.detail(id)});
      qc.invalidateQueries({queryKey: foodKeys.impact(id)});
      qc.invalidateQueries({queryKey: foodKeys.lists()});
    },
  });
}

export function useDeleteFoodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, expectedRevision}: {id: string; expectedRevision: number}) =>
      call(
        client.DELETE('/v1/coach/nutrition-foods/{id}', {
          params: {path: {id}, query: {expected_revision: expectedRevision}},
        }),
      ),
    onSuccess: (_data, {id}) => {
      qc.removeQueries({queryKey: foodKeys.detail(id)});
      qc.invalidateQueries({queryKey: foodKeys.lists()});
    },
  });
}

/** Copy a system or business food into the coach's own library. Invalidates the list so the duplicate shows up on return. */
export function useCopyNutritionFoodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.POST('/v1/coach/nutrition-foods/{id}/copy', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: foodKeys.lists()});
    },
  });
}

export type ListFoodsParams = Pick<ListFoodsQuery, 'categories' | 'limit' | 'offset' | 'search'>;

export function useListFoodsQuery(params?: ListFoodsParams, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: foodKeys.list(params),
    queryFn: () =>
      call(client.GET('/v1/coach/nutrition-foods', params ? {params: {query: omitUndefined(params)}} : {})),
    enabled: options?.enabled ?? true,
  });
}

/** Distinct category values across system + business foods — not a closed enum. */
export function useListFoodCategoriesQuery() {
  return useQuery({
    queryKey: foodKeys.categories(),
    queryFn: () => call(client.GET('/v1/coach/nutrition-foods/categories')),
  });
}

export function useGetRecipeQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/nutrition-recipes/{id}', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

export function useGetRecipeImpactQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: recipeKeys.impact(id),
    queryFn: () => call(client.GET('/v1/coach/nutrition-recipes/{id}/impact', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateRecipeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecipeRequest) => call(client.POST('/v1/coach/nutrition-recipes', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: recipeKeys.lists()});
    },
  });
}

export function useUpdateRecipeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: RecipeUpdateRequest}) =>
      call(client.PATCH('/v1/coach/nutrition-recipes/{id}', {params: {path: {id}}, body})),
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: recipeKeys.detail(id)});
      qc.invalidateQueries({queryKey: recipeKeys.impact(id)});
      qc.invalidateQueries({queryKey: recipeKeys.lists()});
    },
  });
}

export function useDeleteRecipeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, expectedRevision}: {id: string; expectedRevision: number}) =>
      call(
        client.DELETE('/v1/coach/nutrition-recipes/{id}', {
          params: {path: {id}, query: {expected_revision: expectedRevision}},
        }),
      ),
    onSuccess: (_data, {id}) => {
      qc.removeQueries({queryKey: recipeKeys.detail(id)});
      qc.invalidateQueries({queryKey: recipeKeys.lists()});
    },
  });
}

/** Copy a recipe into the coach's own library. Invalidates the list so the duplicate shows up on return. */
export function useCopyNutritionRecipeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.POST('/v1/coach/nutrition-recipes/{id}/copy', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: recipeKeys.lists()});
    },
  });
}
