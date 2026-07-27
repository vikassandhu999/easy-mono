/**
 * Check-ins (form templates + assignments + submissions + schedules + review
 * queue). One domain file for the whole feature since the mappers below
 * (builder draft <-> API request) are shared across every screen.
 */

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {checkInKeys, formAssignmentKeys, formTemplateKeys} from '@/api/keys';
import type {components} from '@/api/schema';

export type ClientProfileCheckInSchedule = components['schemas']['ClientProfileCheckInSchedule'];
export type ClientProfileCheckInScheduleRequest = components['schemas']['ClientProfileCheckInScheduleRequest'];
export type ClientProfileCheckInScheduleUpdateRequest =
  components['schemas']['ClientProfileCheckInScheduleUpdateRequest'];
export type ClientProfileCheckInScheduleResponse = components['schemas']['ClientProfileCheckInScheduleResponse'];
export type ClientProfileCheckInScheduleListResponse =
  components['schemas']['ClientProfileCheckInScheduleListResponse'];
export type ClientProfileFormAssignment = components['schemas']['ClientProfileFormAssignment'];
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

export type FormPurpose = 'check_in' | 'intake';

export const PURPOSE_LABELS: Record<FormPurpose, string> = {
  check_in: 'Check-in',
  intake: 'Intake',
};

export const PURPOSES = Object.keys(PURPOSE_LABELS) as FormPurpose[];

export type FormQuestionType =
  | 'boolean'
  | 'date'
  | 'multi_select'
  | 'number'
  | 'photo'
  | 'rating'
  | 'select'
  | 'text'
  | 'weight';

export const FORM_QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
  boolean: 'Yes / No',
  date: 'Date',
  multi_select: 'Multi-select',
  number: 'Number',
  photo: 'Photo',
  rating: 'Rating (1–5)',
  select: 'Select',
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

export type TemplateDraft = {
  name: string;
  purpose: FormPurpose;
  sections: SectionDraft[];
};

type QuestionRequest = ClientProfileFormTemplateRequest['sections'][number]['questions'][number];

function uid(): string {
  return crypto.randomUUID();
}

export function newQuestion(): QuestionDraft {
  return {id: '', key: uid(), label: '', options: [], required: false, type: 'text'};
}

export function newSection(title = ''): SectionDraft {
  return {key: uid(), questions: [], title};
}

export function emptyTemplateDraft(): TemplateDraft {
  return {name: '', purpose: 'check_in', sections: [newSection('Check-in')]};
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

const SELECT_TYPES: FormQuestionType[] = ['select', 'multi_select'];

/** Parse a stored template (sections are loose JSON) into an editable draft. */
export function templateToDraft(template: {
  name: string;
  purpose: string;
  sections: {[key: string]: unknown}[];
}): TemplateDraft {
  return {
    name: template.name,
    purpose: template.purpose as FormPurpose,
    sections: (template.sections ?? []).map((section) => ({
      key: uid(),
      title: typeof section.title === 'string' ? section.title : '',
      questions: (Array.isArray(section.questions) ? section.questions : []).map((q: Record<string, unknown>) => {
        return {
          id: typeof q.id === 'string' ? q.id : '',
          key: uid(),
          label: typeof q.label === 'string' ? q.label : '',
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          required: q.required === true,
          type: (q.type as FormQuestionType) ?? 'text',
        };
      }),
    })),
  };
}

/** Build the create/update request body from a draft, assigning stable ids. */
export function draftToRequest(draft: TemplateDraft): ClientProfileFormTemplateRequest {
  const taken = new Set<string>();
  // Reserve already-assigned ids so new questions don't collide with them.
  for (const section of draft.sections) {
    for (const q of section.questions) {
      if (q.id) {
        taken.add(q.id);
      }
    }
  }

  const sections = draft.sections.map((section) => ({
    title: section.title,
    questions: section.questions.map((q) => {
      const id = q.id || uniqueId(q.label, taken);
      taken.add(id);
      const question: QuestionRequest = {id, label: q.label, type: q.type, required: q.required};
      if (SELECT_TYPES.includes(q.type)) {
        question.options = q.options;
      }
      return question;
    }),
  }));

  return {name: draft.name, purpose: draft.purpose, sections, status: 'active'};
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
    onSuccess: () => {
      qc.invalidateQueries({queryKey: formTemplateKeys.lists()});
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

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

export function useListCheckInReviewQueueQuery(options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: checkInKeys.reviewQueue(),
    queryFn: () =>
      call(client.GET('/v1/coach/check-ins/review-queue')) as Promise<ClientProfileReviewQueueListResponse>,
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
    },
  });
}
