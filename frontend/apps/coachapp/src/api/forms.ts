import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, callEmpty, client} from './client';
import {clientKeys, formKeys, workbenchKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {FormAssignment, FormAssignmentUpdate, FormTemplate, FormTemplateCreate, paths} from './schema';
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
  'search' | 'purpose' | 'status'
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
    mutationFn: ({id, body, expectedRevision}: {id?: string; body: FormTemplateCreate; expectedRevision?: number}) => {
      if (id) {
        return call(
          client.PATCH('/v1/coach/form-templates/{id}', {
            params: {path: {id}},
            body: {
              name: body.name,
              sections: body.sections,
              ...(expectedRevision ? {expected_revision: expectedRevision} : {}),
            },
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
    mutationFn: ({id, revision}: Pick<FormTemplate, 'id' | 'revision'>) =>
      call(
        client.PUT('/v1/coach/form-templates/{id}/default-intake', {
          params: {path: {id}, query: {expected_revision: revision}},
        }),
      ),
    onSuccess: refreshForms,
  });
}

export type {FormTemplateManagement} from './schema';
export type FormAction = 'archive' | 'restore' | 'set_default' | 'clear_default' | 'delete';

export function useFormManagement(id: string) {
  return useQuery({
    queryKey: formKeys.management(id),
    queryFn: ({signal}) => call(client.GET('/v1/coach/form-templates/{id}/management', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}

function requireFormSession(id: string | undefined) {
  if (!id || getSession()?.id !== id) {
    throw new Error('Your session changed. Please try again.');
  }
}
async function changeForm({template, action}: {template: FormTemplate; action: FormAction}) {
  const sessionId = getSession()?.id;
  const params = {path: {id: template.id}, query: {expected_revision: template.revision}};
  try {
    switch (action) {
      case 'archive':
      case 'restore':
        await call(
          client.PATCH('/v1/coach/form-templates/{id}', {
            params: {path: params.path},
            body: {status: action === 'archive' ? 'archived' : 'active', expected_revision: template.revision},
          }),
        );
        break;
      case 'set_default':
        await call(client.PUT('/v1/coach/form-templates/{id}/default-intake', {params}));
        break;
      case 'clear_default':
        await call(client.DELETE('/v1/coach/form-templates/{id}/default-intake', {params}));
        break;
      case 'delete':
        await callEmpty(client.DELETE('/v1/coach/form-templates/{id}', {params}));
        break;
    }
  } catch (error) {
    requireFormSession(sessionId);
    if (action === 'delete' && error instanceof ApiError && error.status === 404) {
      return;
    }
    if (error instanceof ApiError && error.status < 500) {
      throw error;
    }
    try {
      const result = await call(client.GET('/v1/coach/form-templates/{id}', {params: {path: params.path}}));
      requireFormSession(sessionId);
      const current = result.data;
      if (
        (action === 'archive' && current.status === 'archived') ||
        (action === 'restore' && current.status === 'active') ||
        (action === 'set_default' && current.is_default_intake) ||
        (action === 'clear_default' && !current.is_default_intake)
      ) {
        return;
      }
    } catch (readError) {
      requireFormSession(sessionId);
      if (action === 'delete' && readError instanceof ApiError && readError.status === 404) {
        return;
      }
    }
    throw error;
  }
}
export function useChangeForm() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: changeForm,
    onSuccess: async (_result, {template, action}, sessionId) => {
      requireFormSession(sessionId);
      if (action === 'delete') {
        queryClient.removeQueries({queryKey: formKeys.detail(template.id)});
      }
      await queryClient.invalidateQueries({
        queryKey: formKeys.all,
        ...(action === 'delete' ? {refetchType: 'none'} : {}),
      });
      requireFormSession(sessionId);
    },
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

export function useFormSubmission(clientId: string, id: string | null, enabled = true) {
  return useQuery({
    queryKey: formKeys.submission(clientId, id ?? ''),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/form-submissions/{id}', {
          params: {path: {client_id: clientId, id: id ?? ''}},
          signal,
        }),
      ),
    enabled: Boolean(id) && enabled,
    staleTime: 0,
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
        queryClient.invalidateQueries({queryKey: workbenchKeys.all}),
        queryClient.invalidateQueries({queryKey: clientKeys.all}),
      ]);
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
  });
}

export type {FormAssignmentUpdate} from './schema';

async function refreshIntake(clientId: string, sessionId: string | undefined) {
  requireFormSession(sessionId);
  await Promise.all([
    queryClient.invalidateQueries({queryKey: formKeys.intake(clientId)}),
    queryClient.invalidateQueries({queryKey: clientKeys.all}),
    queryClient.invalidateQueries({queryKey: workbenchKeys.all}),
  ]);
  requireFormSession(sessionId);
}

export function useUpdateIntake(clientId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async ({assignment, body}: {assignment: FormAssignment; body: FormAssignmentUpdate}) => {
      const sessionId = getSession()?.id;
      try {
        await call(
          client.PATCH('/v1/coach/form-assignments/{id}', {
            params: {path: {id: assignment.id}},
            body: {...body, expected_status: assignment.status},
          }),
        );
      } catch (error) {
        requireFormSession(sessionId);
        if (error instanceof ApiError && error.status < 500) {
          throw error;
        }
        try {
          const result = await call(
            client.GET('/v1/coach/clients/{client_id}/intake', {params: {path: {client_id: clientId}}}),
          );
          requireFormSession(sessionId);
          const current = result.data;
          if (
            current?.id === assignment.id &&
            (body.status === undefined || current.status === body.status) &&
            (body.priority === undefined || current.priority === body.priority) &&
            (body.due_date === undefined || current.due_date === body.due_date)
          ) {
            return;
          }
        } catch {
          requireFormSession(sessionId);
        }
        throw error;
      }
    },
    onSuccess: (_result, _input, sessionId) => refreshIntake(clientId, sessionId),
  });
}

export function useSendIntakeReminder() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (id: string) =>
      callEmpty(client.POST('/v1/coach/form-assignments/{id}/remind', {params: {path: {id}}})),
    onSuccess: (_result, _id, sessionId) => {
      requireFormSession(sessionId);
    },
  });
}
