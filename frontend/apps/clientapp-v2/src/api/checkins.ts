/**
 * Client-side check-ins: the assignments the client must fill + submission.
 */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {formAssignmentKeys, weightEntryKeys} from '@/api/keys';
import type {FormAssignment, FormAssignmentSubmit, paths} from '@/api/schema';

export type {FormAssignment, FormAssignmentSubmit, FormSubmission} from '@/api/schema';

export type ClientProfileFormAssignment = FormAssignment;
export type ClientProfileFormSubmissionRequest = FormAssignmentSubmit;

type ListResponse = paths['/v1/client/form-assignments']['get']['responses'][200]['content']['application/json'];
type AssignmentResponse =
  paths['/v1/client/form-assignments/{id}']['get']['responses'][200]['content']['application/json'];
type SubmissionResponse =
  paths['/v1/client/form-assignments/{id}/submit']['post']['responses'][201]['content']['application/json'];

export function useListClientFormAssignmentsQuery() {
  return useQuery({
    queryKey: formAssignmentKeys.list(),
    queryFn: (): Promise<ListResponse> => call(client.GET('/v1/client/form-assignments')),
  });
}

export function useGetClientFormAssignmentQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: formAssignmentKeys.detail(id),
    queryFn: (): Promise<AssignmentResponse> =>
      call(client.GET('/v1/client/form-assignments/{id}', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

export function useSubmitClientFormAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, ...body}: ClientProfileFormSubmissionRequest & {id: string}): Promise<SubmissionResponse> =>
      call(client.POST('/v1/client/form-assignments/{id}/submit', {params: {path: {id}}, body})),
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: formAssignmentKeys.detail(id)});
      qc.invalidateQueries({queryKey: formAssignmentKeys.lists()});
      // Submitting appends real WeightEntry rows for every weight-type answer
      // (backend `Forms.submit_assignment!`) — the Progress screen must see them.
      qc.invalidateQueries({queryKey: weightEntryKeys.lists()});
    },
  });
}

export const PURPOSE_LABELS: Record<string, string> = {
  check_in: 'Check-in',
  intake: 'Intake',
};

export const STATUS_LABELS: Record<string, string> = {
  assigned: 'To do',
  completed: 'Completed',
  dismissed: 'Dismissed',
  in_progress: 'In progress',
  missed: 'Missed',
};

export type AssignmentDisplayStatus =
  | 'Completed'
  | 'Completed · Reviewed ✓'
  | 'Dismissed'
  | 'Due today'
  | 'Missed'
  | 'Overdue'
  | 'To do';

export function assignmentDisplayStatus(
  assignment: Pick<ClientProfileFormAssignment, 'due_date' | 'latest_submission_reviewed_at' | 'status'>,
  today: Date = new Date(),
): AssignmentDisplayStatus {
  if (assignment.status === 'completed') {
    return assignment.latest_submission_reviewed_at ? 'Completed · Reviewed ✓' : 'Completed';
  }
  if (assignment.status === 'dismissed') {
    return 'Dismissed';
  }
  if (assignment.status === 'missed') {
    return 'Missed';
  }
  if (!assignment.due_date) {
    return 'To do';
  }

  const todayIso = today.toISOString().slice(0, 10);
  if (assignment.due_date === todayIso) {
    return 'Due today';
  }
  if (assignment.due_date < todayIso) {
    return 'Overdue';
  }
  return 'To do';
}
