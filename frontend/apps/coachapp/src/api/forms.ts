import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {formKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {FormTemplate, FormTemplateCreate, paths} from './schema';
import {getSession} from './session';

export type {
  FormAssignment,
  FormAssignmentAnswer,
  FormSnapshotQuestion,
  FormSubmission,
  FormTemplate,
  FormTemplateCreate,
  FormTemplateQuestion,
  FormTemplateSection,
} from './schema';

export type FormTemplateFilters = Pick<
  NonNullable<paths['/v1/coach/form-templates']['get']['parameters']['query']>,
  'search' | 'purpose'
>;

export function useFormTemplates(filters: FormTemplateFilters) {
  return useInfiniteQuery({
    queryKey: formKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/form-templates', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal}),
      ),
    ...cursorPagination,
  });
}

export function useFormTemplate(id: string | undefined) {
  return useQuery({
    queryKey: formKeys.detail(id ?? ''),
    queryFn: ({signal}) => call(client.GET('/v1/coach/form-templates/{id}', {params: {path: {id: id ?? ''}}, signal})),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

async function refreshForms(_result: {data: FormTemplate}, _input: unknown, sessionId: string | undefined) {
  if (!sessionId || getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please try again.');
  }
  await queryClient.invalidateQueries({queryKey: formKeys.all});
  if (getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please try again.');
  }
}

export function useSaveFormTemplate() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: ({id, body}: {id?: string; body: FormTemplateCreate}) => {
      if (id) {
        return call(
          client.PATCH('/v1/coach/form-templates/{id}', {
            params: {path: {id}},
            body: {name: body.name, sections: body.sections},
          }),
        );
      }
      return call(client.POST('/v1/coach/form-templates', {body}));
    },
    onSuccess: refreshForms,
  });
}

export function useSetDefaultIntake() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (id: string) =>
      call(client.PUT('/v1/coach/form-templates/{id}/default-intake', {params: {path: {id}}})),
    onSuccess: refreshForms,
  });
}

export function useDefaultIntake() {
  return useQuery({
    queryKey: formKeys.defaultIntake(),
    queryFn: ({signal}) => call(client.GET('/v1/coach/form-templates/default-intake', {signal})),
    staleTime: 0,
  });
}

export function useClientIntake(clientId: string) {
  return useQuery({
    queryKey: formKeys.intake(clientId),
    queryFn: ({signal}) =>
      call(client.GET('/v1/coach/clients/{client_id}/intake', {params: {path: {client_id: clientId}}, signal})),
    staleTime: 0,
  });
}

export function useFormSubmissions(assignmentId: string | undefined) {
  return useQuery({
    queryKey: formKeys.submissions(assignmentId ?? ''),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/form-assignments/{id}/submissions', {
          params: {path: {id: assignmentId ?? ''}},
          signal,
        }),
      ),
    staleTime: 0,
    enabled: Boolean(assignmentId),
  });
}

export function useReviewIntake(clientId: string, assignmentId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (id: string) => call(client.POST('/v1/coach/form-submissions/{id}/review', {params: {path: {id}}})),
    onSuccess: async (_result, _id, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: formKeys.intake(clientId)}),
        queryClient.invalidateQueries({queryKey: formKeys.submissions(assignmentId)}),
      ]);
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
  });
}
