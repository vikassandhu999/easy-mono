import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {call, callEmpty, client} from './client';
import {clientKeys, reviewKeys, trackerKeys, trackerTemplateKeys} from './keys';
import {cursorPagination} from './pagination';
import {queryClient} from './query-client';
import type {paths, TrackerMetricsQuery, TrackerSettingsUpdate} from './schema';
import {getSession} from './session';

export type {Tracker, TrackerAssignment, TrackerEntry, TrackerMetrics, TrackerRequest, TrackerTemplate} from './schema';
export type TrackerFilters = Pick<
  NonNullable<paths['/v1/coach/trackers']['get']['parameters']['query']>,
  'search' | 'kind' | 'archived'
>;
export type TrackerCreate = NonNullable<
  paths['/v1/coach/trackers']['post']['requestBody']
>['content']['application/json'];
export type AssignmentWrite = NonNullable<
  paths['/v1/coach/clients/{client_id}/tracker-assignments']['post']['requestBody']
>['content']['application/json'];
export type EntryCreate = NonNullable<
  paths['/v1/coach/clients/{client_id}/tracker-entries']['post']['requestBody']
>['content']['application/json'];
export type TemplateCreate = NonNullable<
  paths['/v1/coach/tracker-templates']['post']['requestBody']
>['content']['application/json'];
export type TemplateUpdate = NonNullable<
  paths['/v1/coach/tracker-templates/{id}']['patch']['requestBody']
>['content']['application/json'];
export type EntryFilters = Pick<
  NonNullable<paths['/v1/coach/clients/{client_id}/tracker-entries']['get']['parameters']['query']>,
  'tracker_id' | 'from' | 'to'
>;

function assertSession(id: string | undefined) {
  if (!id || id !== getSession()?.id) {
    throw new Error('Your session changed. Please try again.');
  }
}

async function refreshTrackers() {
  await Promise.all([
    queryClient.invalidateQueries({queryKey: trackerKeys.all}),
    queryClient.invalidateQueries({queryKey: clientKeys.all}),
    queryClient.invalidateQueries({queryKey: reviewKeys.all}),
  ]);
}

export function useTrackers(filters: TrackerFilters = {}) {
  return useInfiniteQuery({
    queryKey: trackerKeys.infinite(filters),
    queryFn: ({pageParam, signal}) =>
      call(client.GET('/v1/coach/trackers', {params: {query: {...filters, cursor: pageParam, limit: 20}}, signal})),
    ...cursorPagination,
  });
}

export function useTracker(id: string) {
  return useQuery({
    queryKey: trackerKeys.detail(id),
    enabled: Boolean(id),
    queryFn: ({signal}) => call(client.GET('/v1/coach/trackers/{id}', {params: {path: {id}}, signal})),
  });
}

export function useSaveTracker() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (input: {id: string; name: string} | {body: TrackerCreate}) =>
      'body' in input
        ? call(client.POST('/v1/coach/trackers', {body: input.body}))
        : call(client.PATCH('/v1/coach/trackers/{id}', {params: {path: {id: input.id}}, body: {name: input.name}})),
    onSuccess: async (_data, _input, session) => {
      assertSession(session);
      await refreshTrackers();
      assertSession(session);
    },
  });
}

export function useMaintainTracker(id: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (action: 'archive' | 'restore' | 'delete') => {
      if (action === 'delete') {
        return callEmpty(client.DELETE('/v1/coach/trackers/{id}', {params: {path: {id}}}));
      }
      if (action === 'archive') {
        await call(client.POST('/v1/coach/trackers/{id}/archive', {params: {path: {id}}}));
      } else {
        await call(client.POST('/v1/coach/trackers/{id}/restore', {params: {path: {id}}}));
      }
    },
    onSuccess: async (_data, action, session) => {
      assertSession(session);
      if (action === 'delete') {
        queryClient.removeQueries({queryKey: trackerKeys.detail(id)});
      }
      await refreshTrackers();
      assertSession(session);
    },
  });
}

export function useTrackerAssignments(clientId: string) {
  return useQuery({
    queryKey: trackerKeys.assignments(clientId),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/tracker-assignments', {
          params: {path: {client_id: clientId}},
          signal,
        }),
      ),
  });
}

export function useChangeTrackerAssignment(clientId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (
      input:
        | {action: 'add'; body: AssignmentWrite}
        | {action: 'change'; id: string; body: Omit<AssignmentWrite, 'tracker_id'>}
        | {action: 'end'; id: string},
    ) => {
      if (input.action === 'add') {
        return call(
          client.POST('/v1/coach/clients/{client_id}/tracker-assignments', {
            params: {path: {client_id: clientId}},
            body: input.body,
          }),
        );
      }
      if (input.action === 'change') {
        return call(
          client.PATCH('/v1/coach/clients/{client_id}/tracker-assignments/{id}', {
            params: {path: {client_id: clientId, id: input.id}},
            body: input.body,
          }),
        );
      }
      return callEmpty(
        client.DELETE('/v1/coach/clients/{client_id}/tracker-assignments/{id}', {
          params: {path: {client_id: clientId, id: input.id}},
        }),
      );
    },
    onSuccess: async (_data, _input, session) => {
      assertSession(session);
      await refreshTrackers();
      assertSession(session);
    },
  });
}

export function useTrackerRequests(clientId: string) {
  return useQuery({
    queryKey: trackerKeys.requests(clientId),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/tracker-requests', {params: {path: {client_id: clientId}}, signal}),
      ),
  });
}

export function useChangeTrackerRequest(clientId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (input: {tracker_id: string} | {id: string}) => {
      if ('tracker_id' in input) {
        return call(
          client.POST('/v1/coach/clients/{client_id}/tracker-requests', {
            params: {path: {client_id: clientId}},
            body: input,
          }),
        );
      }
      return callEmpty(
        client.DELETE('/v1/coach/clients/{client_id}/tracker-requests/{id}', {
          params: {path: {client_id: clientId, id: input.id}},
        }),
      );
    },
    onSuccess: async (_data, _input, session) => {
      assertSession(session);
      await refreshTrackers();
      assertSession(session);
    },
  });
}

export function useTrackerEntries(clientId: string, filters: EntryFilters) {
  return useInfiniteQuery({
    queryKey: trackerKeys.entries(clientId, filters),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/tracker-entries', {
          params: {path: {client_id: clientId}, query: {...filters, cursor: pageParam, limit: 20}},
          signal,
        }),
      ),
    ...cursorPagination,
  });
}

export function useTrackerMetrics(clientId: string, id: string, filters: Pick<TrackerMetricsQuery, 'from' | 'to'>) {
  return useQuery({
    queryKey: trackerKeys.metrics(clientId, id, filters),
    enabled: Boolean(id),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/coach/clients/{client_id}/trackers/{id}/metrics', {
          params: {path: {client_id: clientId, id}, query: filters},
          signal,
        }),
      ),
  });
}

export function useRecordTracker(clientId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: EntryCreate) =>
      call(client.POST('/v1/coach/clients/{client_id}/tracker-entries', {params: {path: {client_id: clientId}}, body})),
    onSuccess: async (_data, _input, session) => {
      assertSession(session);
      await refreshTrackers();
      assertSession(session);
    },
  });
}

export function useTrackerTemplates(search = '') {
  return useInfiniteQuery({
    queryKey: trackerTemplateKeys.infinite(search),
    queryFn: ({pageParam, signal}) =>
      call(
        client.GET('/v1/coach/tracker-templates', {params: {query: {search, cursor: pageParam, limit: 20}}, signal}),
      ),
    ...cursorPagination,
  });
}

export function useTrackerTemplate(id: string) {
  return useQuery({
    queryKey: trackerTemplateKeys.detail(id),
    enabled: Boolean(id),
    queryFn: ({signal}) => call(client.GET('/v1/coach/tracker-templates/{id}', {params: {path: {id}}, signal})),
  });
}

export function useSaveTrackerTemplate() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (input: {body: TemplateCreate} | {id: string; body: TemplateUpdate}) =>
      'id' in input
        ? call(client.PATCH('/v1/coach/tracker-templates/{id}', {params: {path: {id: input.id}}, body: input.body}))
        : call(client.POST('/v1/coach/tracker-templates', {body: input.body})),
    onSuccess: async (_data, _input, session) => {
      assertSession(session);
      await queryClient.invalidateQueries({queryKey: trackerTemplateKeys.all});
      assertSession(session);
    },
  });
}

export function useApplyTrackerTemplate(clientId: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (input: {id: string; expected_revision: number}) =>
      call(
        client.POST('/v1/coach/clients/{client_id}/tracker-templates/{id}/apply', {
          params: {path: {client_id: clientId, id: input.id}},
          body: {expected_revision: input.expected_revision},
        }),
      ),
    onSuccess: async (_data, _input, session) => {
      assertSession(session);
      await refreshTrackers();
      assertSession(session);
    },
  });
}

export function useTrackerSettings() {
  return useQuery({
    queryKey: trackerKeys.settings(),
    queryFn: ({signal}) => call(client.GET('/v1/coach/tracker-settings', {signal})),
  });
}

export function useUpdateTrackerSettings() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: TrackerSettingsUpdate) => call(client.PATCH('/v1/coach/tracker-settings', {body})),
    onSuccess: async (_data, _input, session) => {
      assertSession(session);
      await refreshTrackers();
      assertSession(session);
    },
  });
}

export function useUploadTrackerAttachment(clientId: string) {
  return useMutation({
    mutationFn: async ({file, capturedOn}: {file: File; capturedOn: string}) => {
      const session = getSession()?.id;
      const contentType = file.type;
      if (
        contentType !== 'application/pdf' &&
        contentType !== 'image/jpeg' &&
        contentType !== 'image/png' &&
        contentType !== 'image/webp' &&
        contentType !== 'image/heic'
      ) {
        throw new Error('Choose a PDF or image file.');
      }
      const result = await call(
        client.POST('/v1/coach/clients/{client_id}/uploads', {
          params: {path: {client_id: clientId}},
          body: {content_type: contentType, byte_size: file.size, ...(capturedOn ? {captured_on: capturedOn} : {})},
        }),
      );
      assertSession(session);
      const uploaded = await fetch(result.data.upload_url, {
        method: 'PUT',
        headers: result.data.upload_headers,
        body: file,
      });
      if (!uploaded.ok) {
        throw new Error('Upload failed. Your files are still here. Try again.');
      }
      assertSession(session);
      return result.data;
    },
  });
}
