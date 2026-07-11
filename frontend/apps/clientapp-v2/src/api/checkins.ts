/**
 * Client-side check-ins: the assignments the client must fill + submission.
 * Generated endpoints are `tag: false`; enhance them with cache tags so
 * submitting refreshes the list. Importing hooks here guarantees the enhance ran.
 */
import {
  type ClientProfileFormAssignment,
  clientApi,
  useGetClientFormAssignmentQuery,
  useListClientFormAssignmentsQuery,
  useSubmitClientFormAssignmentMutation,
} from '@/api/generated';

export type {
  ClientProfileFormAssignment,
  ClientProfileFormSubmissionRequest,
  ClientProfileFormTemplate,
} from '@/api/generated';

export {useGetClientFormAssignmentQuery, useListClientFormAssignmentsQuery, useSubmitClientFormAssignmentMutation};

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

export type AssignmentDisplayStatus = 'Completed' | 'Dismissed' | 'Due today' | 'Missed' | 'Overdue' | 'To do';

export function assignmentDisplayStatus(
  assignment: Pick<ClientProfileFormAssignment, 'due_date' | 'status'>,
  today: Date = new Date(),
): AssignmentDisplayStatus {
  if (assignment.status === 'completed') {
    return 'Completed';
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

clientApi.enhanceEndpoints({
  endpoints: {
    getClientFormAssignment: {providesTags: (_r, _e, {id}) => [{type: 'FormAssignment', id}]},
    listClientFormAssignments: {providesTags: [{type: 'FormAssignment', id: 'LIST'}]},
    submitClientFormAssignment: {
      invalidatesTags: (_r, _e, {id}) => [
        {type: 'FormAssignment', id},
        {type: 'FormAssignment', id: 'LIST'},
      ],
    },
  },
});
