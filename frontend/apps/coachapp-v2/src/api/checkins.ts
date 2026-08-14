/**
 * Check-ins (form templates + assignments + submissions + schedules + review
 * queue). One domain file for the whole feature since the mappers below
 * (builder draft <-> API request) are shared across every screen.
 */

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {checkInKeys, clientKeys, formAssignmentKeys, formTemplateKeys, workbenchKeys} from '@/api/keys';
import type {components, operations} from '@/api/schema';

export type ClientProfileCheckInSchedule = components['schemas']['ClientProfileCheckInSchedule'];
export type ClientProfileCheckInScheduleRequest = components['schemas']['ClientProfileCheckInScheduleRequest'];
export type ClientProfileCheckInScheduleUpdateRequest =
  components['schemas']['ClientProfileCheckInScheduleUpdateRequest'];
export type ClientProfileCheckInScheduleResponse = components['schemas']['ClientProfileCheckInScheduleResponse'];
export type ClientProfileCheckInScheduleListResponse =
  components['schemas']['ClientProfileCheckInScheduleListResponse'];
export type ClientProfileFormAssignment = components['schemas']['ClientProfileFormAssignment'];
export type ClientProfileFormAssignmentRequest = components['schemas']['ClientProfileFormAssignmentRequest'];
export type ClientProfileFormAssignmentUpdateRequest =
  components['schemas']['ClientProfileFormAssignmentUpdateRequest'];
export type ClientProfileFormAssignmentResponse = components['schemas']['ClientProfileFormAssignmentResponse'];
export type ClientProfileFormAssignmentListResponse = components['schemas']['ClientProfileFormAssignmentListResponse'];
export type ClientProfileFormSubmission = components['schemas']['ClientProfileFormSubmission'];
export type ClientProfileFormSubmissionResponse = components['schemas']['ClientProfileFormSubmissionResponse'];
export type ClientProfileFormSubmissionListResponse = components['schemas']['ClientProfileFormSubmissionListResponse'];
export type ClientProfileFormTemplate = components['schemas']['ClientProfileFormTemplate'];
export type ClientProfileFormTemplateRequest = components['schemas']['ClientProfileFormTemplateRequest'];
export type ClientProfileFormTemplateUpdateRequest = components['schemas']['ClientProfileFormTemplateUpdateRequest'];
export type ClientProfileFormTemplateResponse = components['schemas']['ClientProfileFormTemplateResponse'];
export type ClientProfileFormTemplateListResponse = components['schemas']['ClientProfileFormTemplateListResponse'];
export type ClientProfileReviewQueueItem = components['schemas']['ClientProfileReviewQueueItem'];
export type ClientProfileReviewQueueListResponse = components['schemas']['ClientProfileReviewQueueListResponse'];
export type ListCheckInReviewQueueParams = NonNullable<operations['listCheckInReviewQueue']['parameters']['query']>;

export type FormPurpose = 'check_in' | 'intake';

export type CheckInFrequency = NonNullable<ClientProfileCheckInSchedule['frequency']>;

export const CHECK_IN_FREQUENCIES: {id: CheckInFrequency; label: string}[] = [
  {id: 'once', label: 'Once'},
  {id: 'weekly', label: 'Weekly'},
  {id: 'biweekly', label: 'Every 2 weeks'},
  {id: 'monthly', label: 'Monthly'},
];

export const PURPOSE_LABELS: Record<FormPurpose, string> = {
  check_in: 'Check-in',
  intake: 'Intake',
};

export const PURPOSES = Object.keys(PURPOSE_LABELS) as FormPurpose[];

type SectionRequest = ClientProfileFormTemplateRequest['sections'][number];
type QuestionRequest = SectionRequest['questions'][number];

export type FormQuestionType = QuestionRequest['type'];

export const FORM_QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
  boolean: 'Yes / No',
  date: 'Date',
  multi_select: 'Multi-select',
  number: 'Number',
  photo: 'Photo',
  rating: 'Rating (1–5)',
  select: 'Select',
  service_type: 'Service type',
  text: 'Text',
  weight: 'Weight',
};

// ---------------------------------------------------------------------------
// Builder draft <-> API mappers
// ---------------------------------------------------------------------------

/** A question in the builder. `id` is the persisted question key (answers are
 *  keyed by it); `key` is an ephemeral React key only. */
export type QuestionDraft = {
  id: string;
  key: string;
  label: string;
  options: string[];
  required: boolean;
  type: FormQuestionType;
};

export type SectionDraft = {
  key: string;
  questions: QuestionDraft[];
  title: string;
};

function uid(): string {
  return crypto.randomUUID();
}

export function newQuestion(): QuestionDraft {
  return {id: '', key: uid(), label: '', options: [], required: false, type: 'text'};
}

export function newSection(title = ''): SectionDraft {
  return {key: uid(), questions: [], title};
}

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'question'
  );
}

function uniqueId(label: string, taken: Set<string>): string {
  const base = slugify(label);
  if (!taken.has(base)) {
    return base;
  }
  let i = 2;
  while (taken.has(`${base}_${i}`)) {
    i += 1;
  }
  return `${base}_${i}`;
}

/** Parse a stored template's sections (loose JSON) into editable drafts. */
export function templateToSections(sections: {[key: string]: unknown}[], purpose: FormPurpose): SectionDraft[] {
  return (sections ?? []).map((section) => ({
    key: uid(),
    title: typeof section.title === 'string' ? section.title : '',
    questions: (Array.isArray(section.questions) ? section.questions : [])
      .filter((q: Record<string, unknown>) => purpose === 'intake' || q.type !== 'service_type')
      .map((q: Record<string, unknown>) => ({
        id: typeof q.id === 'string' ? q.id : '',
        key: uid(),
        label: typeof q.label === 'string' ? q.label : '',
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        required: q.required === true,
        type: (q.type as FormQuestionType) ?? 'text',
      })),
  }));
}

/** Build the request `sections` from section drafts, assigning stable ids. */
export function sectionsToRequest(drafts: SectionDraft[], purpose: FormPurpose): SectionRequest[] {
  const taken = new Set<string>();
  // Reserve already-assigned ids so new questions don't collide with them.
  for (const section of drafts) {
    for (const q of section.questions) {
      if (q.id) {
        taken.add(q.id);
      }
    }
  }

  return drafts.map((section) => ({
    title: section.title,
    questions: section.questions
      .filter((q) => purpose === 'intake' || q.type !== 'service_type')
      .map((q) => {
        const id = q.id || uniqueId(q.label, taken);
        taken.add(id);
        if (q.type === 'service_type') {
          return {id, label: q.label, type: 'service_type', required: true} satisfies QuestionRequest;
        }
        const question = {id, label: q.label, type: q.type, required: q.required};
        if (q.type === 'select' || q.type === 'multi_select') {
          return {...question, options: q.options} satisfies QuestionRequest;
        }
        return question;
      }),
  }));
}

// ---------------------------------------------------------------------------
// Form templates
// ---------------------------------------------------------------------------

export function useListFormTemplatesQuery(options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: formTemplateKeys.list(),
    queryFn: () => call(client.GET('/v1/coach/form-templates')) as Promise<ClientProfileFormTemplateListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useGetFormTemplateQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: formTemplateKeys.detail(id),
    queryFn: () =>
      call(
        client.GET('/v1/coach/form-templates/{id}', {params: {path: {id}}}),
      ) as Promise<ClientProfileFormTemplateResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateFormTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClientProfileFormTemplateRequest) =>
      call(client.POST('/v1/coach/form-templates', {body})) as Promise<ClientProfileFormTemplateResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: formTemplateKeys.lists()});
    },
  });
}

export function useUpdateFormTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: ClientProfileFormTemplateUpdateRequest; id: string}) =>
      call(
        client.PATCH('/v1/coach/form-templates/{id}', {params: {path: {id}}, body}),
      ) as Promise<ClientProfileFormTemplateResponse>,
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: formTemplateKeys.detail(id)});
      qc.invalidateQueries({queryKey: formTemplateKeys.lists()});
    },
  });
}

export function useDeleteFormTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/form-templates/{id}', {params: {path: {id}}})),
    onSuccess: (_data, id) => {
      qc.removeQueries({queryKey: formTemplateKeys.detail(id)});
      qc.invalidateQueries({queryKey: formTemplateKeys.lists()});
    },
  });
}

/** The default-intake flag moves between templates, so refresh every template
 *  query — on failure too, since a 422/404 means the list the user picked from
 *  was stale. */
export function useSetDefaultIntakeTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(
        client.PUT('/v1/coach/form-templates/{id}/default-intake', {params: {path: {id}}}),
      ) as Promise<ClientProfileFormTemplateResponse>,
    onSettled: () => {
      qc.invalidateQueries({queryKey: formTemplateKeys.all});
    },
  });
}

export function useClearDefaultIntakeTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(
        client.DELETE('/v1/coach/form-templates/{id}/default-intake', {params: {path: {id}}}),
      ) as Promise<ClientProfileFormTemplateResponse>,
    onSettled: () => {
      qc.invalidateQueries({queryKey: formTemplateKeys.all});
    },
  });
}

// ---------------------------------------------------------------------------
// Check-in schedules
// ---------------------------------------------------------------------------

export function useListCheckInSchedulesForClientQuery(clientId: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: checkInKeys.schedules(clientId),
    queryFn: () =>
      call(
        client.GET('/v1/coach/clients/{client_id}/check-in-schedules', {params: {path: {client_id: clientId}}}),
      ) as Promise<ClientProfileCheckInScheduleListResponse>,
    enabled: options?.enabled ?? true,
  });
}

/** A schedule due today generates its first assignment immediately. */
export function useCreateCheckInScheduleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, clientId}: {body: ClientProfileCheckInScheduleRequest; clientId: string}) =>
      call(
        client.POST('/v1/coach/clients/{client_id}/check-in-schedules', {
          body,
          params: {path: {client_id: clientId}},
        }),
      ) as Promise<ClientProfileCheckInScheduleResponse>,
    onSuccess: (_data, {clientId}) => {
      qc.invalidateQueries({queryKey: checkInKeys.schedules(clientId)});
      qc.invalidateQueries({queryKey: formAssignmentKeys.forClient(clientId)});
      qc.invalidateQueries({queryKey: workbenchKeys.all});
    },
  });
}

/**
 * Update only knows the schedule id, not its client, so refresh every cached
 * check-in query plus every form-assignment list (mirrors the old
 * `{type:'CheckInSchedule', id:'LIST'}` / `{type:'FormAssignment', id:'LIST'}`
 * tags, which weren't client-scoped either).
 */
export function useUpdateCheckInScheduleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, id}: {body: ClientProfileCheckInScheduleUpdateRequest; id: string}) =>
      call(
        client.PATCH('/v1/coach/check-in-schedules/{id}', {params: {path: {id}}, body}),
      ) as Promise<ClientProfileCheckInScheduleResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: checkInKeys.all});
      qc.invalidateQueries({queryKey: formAssignmentKeys.all});
    },
  });
}

/** Delete only knows the schedule id — refresh every cached schedules list.
 *  Only unused schedules can be deleted, so assignments are unaffected. */
export function useDeleteCheckInScheduleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/check-in-schedules/{id}', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: checkInKeys.all});
    },
  });
}

// ---------------------------------------------------------------------------
// Form assignments
// ---------------------------------------------------------------------------

export function useListClientFormAssignmentsForCoachQuery(clientId: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: formAssignmentKeys.forClient(clientId),
    queryFn: () =>
      call(
        client.GET('/v1/coach/clients/{client_id}/form-assignments', {params: {path: {client_id: clientId}}}),
      ) as Promise<ClientProfileFormAssignmentListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateClientFormAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({body, clientId}: {body: ClientProfileFormAssignmentRequest; clientId: string}) =>
      call(
        client.POST('/v1/coach/clients/{client_id}/form-assignments', {
          body,
          params: {path: {client_id: clientId}},
        }),
      ) as Promise<ClientProfileFormAssignmentResponse>,
    onSuccess: (_data, {clientId}) => {
      qc.invalidateQueries({queryKey: formAssignmentKeys.forClient(clientId)});
      qc.invalidateQueries({queryKey: clientKeys.detail(clientId)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
      qc.invalidateQueries({queryKey: workbenchKeys.all});
    },
  });
}

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

export function useListCheckInReviewQueueQuery(
  params: ListCheckInReviewQueueParams = {},
  options?: {enabled?: boolean},
) {
  return useQuery({
    queryKey: checkInKeys.reviewQueue(params),
    queryFn: () =>
      call(
        client.GET('/v1/coach/check-ins/review-queue', {params: {query: params}}),
      ) as Promise<ClientProfileReviewQueueListResponse>,
    enabled: options?.enabled ?? true,
  });
}

export function useReviewFormSubmissionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      call(
        client.POST('/v1/coach/form-submissions/{id}/review', {params: {path: {id}}}),
      ) as Promise<ClientProfileFormSubmissionResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: checkInKeys.reviewQueue()});
      qc.invalidateQueries({queryKey: formAssignmentKeys.all});
      qc.invalidateQueries({queryKey: workbenchKeys.all});
    },
  });
}

/** Intake reminder — feedback only; membership is unchanged until the intake completes. */
export function useRemindFormAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.POST('/v1/coach/form-assignments/{id}/remind', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: formAssignmentKeys.all});
      qc.invalidateQueries({queryKey: workbenchKeys.all});
    },
  });
}
