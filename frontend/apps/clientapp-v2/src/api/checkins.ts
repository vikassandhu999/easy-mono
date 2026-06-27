/**
 * Client-side check-ins: the assignments the client must fill + submission.
 * Generated endpoints are `tag: false`; enhance them with cache tags so
 * submitting refreshes the list. Importing hooks here guarantees the enhance ran.
 */
import {
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

export type FormPurpose = 'custom' | 'intake' | 'nutrition_update' | 'training_update' | 'weekly_check_in';

export const PURPOSE_LABELS: Record<string, string> = {
  custom: 'Form',
  intake: 'Intake',
  nutrition_update: 'Nutrition update',
  training_update: 'Training update',
  weekly_check_in: 'Weekly check-in',
};

export const STATUS_LABELS: Record<string, string> = {
  assigned: 'To do',
  completed: 'Completed',
  dismissed: 'Dismissed',
  in_progress: 'In progress',
};

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
