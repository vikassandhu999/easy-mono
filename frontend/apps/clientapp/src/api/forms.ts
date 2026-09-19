import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {formKeys} from './keys';
import {cursorPagination} from './pagination';
import type {paths} from './schema';

export type {FormAssignment, FormAssignmentAnswer, FormSubmission, FormTemplateQuestion} from './schema';
export type FormAssignmentFilters = Pick<
  NonNullable<paths['/v1/client/form-assignments']['get']['parameters']['query']>,
  'state' | 'purpose'
>;

export function useFormAssignments(filters: FormAssignmentFilters) {
  return useInfiniteQuery({
    queryKey: formKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/client/form-assignments', {
          params: {query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useFormAssignment(id: string) {
  return useQuery({
    queryKey: formKeys.detail(id),
    queryFn: ({signal}) => call(client.GET('/v1/client/form-assignments/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}
