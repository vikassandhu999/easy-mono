import {onlineManager, useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client} from './client';
import {removeDraft} from './drafts';
import {formKeys} from './keys';
import {cursorPagination} from './pagination';
import {clearFormPhotos} from './photo-store';
import {queryClient} from './query-client';
import type {ClientFormAssignmentDetail, FormAssignmentSubmit, FormSubmission, paths} from './schema';
import {getSession} from './session';

export type {FormAssignment, FormAssignmentAnswer, FormSubmission, FormTemplateQuestion} from './schema';
export type FormWeightUnit = ClientFormAssignmentDetail['weight_unit'];

export class FormAlreadySubmittedError extends Error {
  constructor() {
    super('A different response was already saved for this form. Your unsent answers are still on this device.');
  }
}

function matchesSubmission(body: FormAssignmentSubmit, saved: FormSubmission) {
  const entries = Object.entries(body.answers);
  const sameAnswers =
    entries.length === Object.keys(saved.answers).length &&
    entries.every(([id, answer]) => JSON.stringify(answer) === JSON.stringify(saved.answers[id]));
  const weights = saved.question_snapshot
    .flatMap((section) => section.questions)
    .filter((question) => question.type === 'weight');
  return sameAnswers && weights.every((question) => !body.weight_unit || question.unit === body.weight_unit);
}
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
    refetchOnMount: 'always',
    queryKey: formKeys.detail(id),
    queryFn: ({signal}) => call(client.GET('/v1/client/form-assignments/{id}', {params: {path: {id}}, signal})),
    staleTime: 0,
  });
}

export function useSubmitForm(id: string) {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: async (body: FormAssignmentSubmit) => {
      if (!onlineManager.isOnline()) {
        throw new Error('Reconnect and check this form before sending. Your answers are saved on this device.');
      }
      try {
        return await call(client.POST('/v1/client/form-assignments/{id}/submit', {params: {path: {id}}, body}));
      } catch (error) {
        // A lost response or a second submit may already have completed this assignment.
        if (!(error instanceof ApiError) || error.status >= 500 || error.status === 422) {
          const current = await call(client.GET('/v1/client/form-assignments/{id}', {params: {path: {id}}}));
          if (current.data.status === 'completed' && current.data.latest_submission) {
            if (matchesSubmission(body, current.data.latest_submission)) {
              return {data: current.data.latest_submission};
            }
            throw new FormAlreadySubmittedError();
          }
        }
        throw error;
      }
    },
    onSuccess: async (_result, _input, owner) => {
      if (!owner || getSession()?.id !== owner) {
        throw new Error('Your session changed. Please sign in again.');
      }
      const session = getSession();
      if (session?.accountId) {
        await Promise.all([removeDraft(owner, `form.${id}`), clearFormPhotos(session.accountId, `form.${id}.`)]);
      }
      if (getSession()?.id !== owner) {
        throw new Error('Your session changed. Please sign in again.');
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: formKeys.detail(id)}),
        queryClient.invalidateQueries({queryKey: formKeys.lists()}),
      ]);
      if (getSession()?.id !== owner) {
        throw new Error('Your session changed. Please sign in again.');
      }
    },
  });
}
