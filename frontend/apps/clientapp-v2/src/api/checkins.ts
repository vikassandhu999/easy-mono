/**
 * Client-side check-ins: the assignments the client must fill + submission.
 */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {formAssignmentKeys} from '@/api/keys';
import type {components} from '@/api/schema';

export type ClientProfileFormAssignment = components['schemas']['ClientProfileFormAssignment'];
export type ClientProfileFormSubmissionRequest = components['schemas']['ClientProfileFormSubmissionRequest'];
export type ClientProfileFormTemplate = components['schemas']['ClientProfileFormTemplate'];

type ListResponse = components['schemas']['ClientProfileFormAssignmentListResponse'];
type AssignmentResponse = components['schemas']['ClientProfileFormAssignmentResponse'];
type SubmissionResponse = components['schemas']['ClientProfileFormSubmissionResponse'];

export function useListClientFormAssignmentsQuery() {
  return useQuery({
    queryKey: formAssignmentKeys.list(),
    queryFn: () => call(client.GET('/v1/client/form-assignments')) as Promise<ListResponse>,
  });
}

export function useGetClientFormAssignmentQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: formAssignmentKeys.detail(id),
    queryFn: () =>
      call(client.GET('/v1/client/form-assignments/{id}', {params: {path: {id}}})) as Promise<AssignmentResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useSubmitClientFormAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, ...body}: ClientProfileFormSubmissionRequest & {id: string}) =>
      call(
        client.POST('/v1/client/form-assignments/{id}/submit', {params: {path: {id}}, body}),
      ) as Promise<SubmissionResponse>,
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: formAssignmentKeys.detail(id)});
      qc.invalidateQueries({queryKey: formAssignmentKeys.lists()});
    },
  });
}

export type FormPurpose = 'check_in' | 'intake';

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
