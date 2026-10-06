import {useInfiniteQuery, useMutation} from '@tanstack/react-query';
import {ApiError, call, callEmpty, client} from './client';
import {foodKeys, nutritionKeys, recipeKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {LibraryUsageQuery} from './schema';
import {getSession} from './session';

export type {LibraryUsageReference} from './schema';
export type LibraryKind = 'food' | 'recipe';
export type UsageKind = NonNullable<LibraryUsageQuery['kind']>;
const keys = {food: foodKeys, recipe: recipeKeys};

export function useLibraryUsage(resource: LibraryKind, id: string, kind: UsageKind, search: string) {
  return useInfiniteQuery({
    queryKey: keys[resource].usage(id, kind, search),
    queryFn: ({pageParam, signal}) =>
      resource === 'food'
        ? call(
            client.GET('/v1/coach/nutrition-foods/{id}/usage', {
              params: {path: {id}, query: {kind, search, cursor: pageParam, limit: 20}},
              signal,
            }),
          )
        : call(
            client.GET('/v1/coach/nutrition-recipes/{id}/usage', {
              params: {path: {id}, query: {kind, search, cursor: pageParam, limit: 20}},
              signal,
            }),
          ),
    ...cursorPagination,
  });
}

export function useLibraryCopyCandidates(resource: LibraryKind, search: string) {
  return useInfiniteQuery({
    queryKey: keys[resource].copyCandidates(search),
    queryFn: async ({pageParam, signal}) => {
      const page =
        resource === 'food'
          ? await call(
              client.GET('/v1/coach/nutrition-foods', {
                params: {query: {search, cursor: pageParam, limit: 20}},
                signal,
              }),
            )
          : await call(
              client.GET('/v1/coach/nutrition-recipes', {
                params: {query: {search, cursor: pageParam, limit: 20}},
                signal,
              }),
            );
      return {
        ...page,
        next_cursor: page.next_cursor ?? null,
        data: page.data.map(({id, name, inserted_at}) => ({id, name, inserted_at})),
      };
    },
    ...cursorPagination,
  });
}

export function useCopyLibraryItem(resource: LibraryKind) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (id: string) => {
      const result =
        resource === 'food'
          ? await call(client.POST('/v1/coach/nutrition-foods/{id}/copy', {params: {path: {id}}}))
          : await call(client.POST('/v1/coach/nutrition-recipes/{id}/copy', {params: {path: {id}}}));
      return {data: {id: result.data.id}};
    },
    onSuccess: async (_result, _id, sessionId) => {
      requireSession(sessionId);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: keys[resource].lists()}),
        ...(resource === 'recipe' ? [queryClient.invalidateQueries({queryKey: foodKeys.lists()})] : []),
      ]);
      requireSession(sessionId);
    },
    onError: async (_error, _id, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: keys[resource].lists()}),
          ...(resource === 'recipe' ? [queryClient.invalidateQueries({queryKey: foodKeys.lists()})] : []),
        ]);
      }
    },
  });
}

export function useArchiveLibraryItem(resource: LibraryKind) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (id: string) => {
      const sessionId = getSession()?.id;
      try {
        await callEmpty(
          resource === 'food'
            ? client.DELETE('/v1/coach/nutrition-foods/{id}', {params: {path: {id}}})
            : client.DELETE('/v1/coach/nutrition-recipes/{id}', {params: {path: {id}}}),
        );
      } catch (error) {
        requireSession(sessionId);
        if (error instanceof ApiError && error.status < 500 && error.status !== 404) {
          throw error;
        }
        const result =
          resource === 'food'
            ? await client.GET('/v1/coach/nutrition-foods/{id}', {params: {path: {id}}})
            : await client.GET('/v1/coach/nutrition-recipes/{id}', {params: {path: {id}}});
        requireSession(sessionId);
        if (result.response.status !== 404 && !result.data?.data.archived_at) {
          throw error;
        }
      }
    },
    onSuccess: async (_result, id, sessionId) => {
      requireSession(sessionId);
      queryClient.removeQueries({queryKey: keys[resource].detail(id)});
      await invalidateLibrary();
      requireSession(sessionId);
    },
    onError: async (_error, _id, sessionId) => {
      if (sessionId && getSession()?.id === sessionId) {
        await invalidateLibrary();
      }
    },
  });
}

function invalidateLibrary() {
  return Promise.all([
    queryClient.invalidateQueries({queryKey: foodKeys.all}),
    queryClient.invalidateQueries({queryKey: recipeKeys.all}),
    queryClient.invalidateQueries({queryKey: nutritionKeys.all}),
  ]);
}
function requireSession(sessionId: string | undefined) {
  if (!sessionId || getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please try again.');
  }
}
