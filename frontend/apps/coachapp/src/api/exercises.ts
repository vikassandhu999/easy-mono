import {useInfiniteQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {exerciseKeys} from './keys';
import {cursorPagination} from './pagination';
import type {paths} from './schema';
export type Exercise =
  paths['/v1/coach/training-exercises']['get']['responses'][200]['content']['application/json']['data'][number];
export function useExercises(search: string) {
  return useInfiniteQuery({
    queryKey: exerciseKeys.infinite(search),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/training-exercises', {
          params: {query: {search, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}
