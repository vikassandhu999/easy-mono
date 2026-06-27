/**
 * Check-ins (form templates + assignments + submissions). The endpoints are
 * codegen'd as `tag: false`; we enhance them with cache tags and re-export the
 * hooks. Importing hooks from this module guarantees the enhance ran.
 *
 * A check-in template's question types are the same six as profile fields, so we
 * reuse ProfileFieldType / FIELD_TYPE_LABELS from client-profile.ts.
 */

import {type ProfileFieldType} from '@/api/client-profile';
import {type ClientProfileFormTemplateRequest, coachApi} from '@/api/generated';

export type {
  ClientProfileFormAssignment,
  ClientProfileFormAssignmentAssignRequest,
  ClientProfileFormSubmission,
  ClientProfileFormTemplate,
  ClientProfileFormTemplateRequest,
} from '@/api/generated';

export const {
  useAssignFormTemplateMutation,
  useCreateFormTemplateMutation,
  useDeleteFormTemplateMutation,
  useGetFormTemplateQuery,
  useListClientFormAssignmentsForCoachQuery,
  useListFormSubmissionsQuery,
  useListFormTemplatesQuery,
  useUpdateFormAssignmentMutation,
  useUpdateFormTemplateMutation,
} = coachApi;

export type FormPurpose = 'custom' | 'intake' | 'nutrition_update' | 'training_update' | 'weekly_check_in';

export const PURPOSE_LABELS: Record<FormPurpose, string> = {
  custom: 'Custom',
  intake: 'Intake',
  nutrition_update: 'Nutrition update',
  training_update: 'Training update',
  weekly_check_in: 'Weekly check-in',
};

export const PURPOSES = Object.keys(PURPOSE_LABELS) as FormPurpose[];

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  completed: 'Completed',
  dismissed: 'Dismissed',
  in_progress: 'In progress',
};

// ---------------------------------------------------------------------------
// Builder draft <-> API mappers
// ---------------------------------------------------------------------------

/** A question in the builder. `id` is the persisted question key (answers are
 *  keyed by it); `key` is an ephemeral React key only. */
export type QuestionDraft = {
  fieldKey: null | string; // custom-field profile mapping (ProfileField.key) or null
  id: string;
  key: string;
  label: string;
  options: string[];
  required: boolean;
  type: ProfileFieldType;
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

function uid(): string {
  return crypto.randomUUID();
}

export function newQuestion(): QuestionDraft {
  return {fieldKey: null, id: '', key: uid(), label: '', options: [], required: false, type: 'text'};
}

export function newSection(title = ''): SectionDraft {
  return {key: uid(), questions: [], title};
}

export function emptyTemplateDraft(): TemplateDraft {
  return {name: '', purpose: 'weekly_check_in', sections: [newSection('Check-in')]};
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

const SELECT_TYPES: ProfileFieldType[] = ['select', 'multi_select'];

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
        const mapping = q.profile_mapping as {field_key?: string; kind?: string} | undefined;
        return {
          fieldKey: mapping?.kind === 'custom_field' ? (mapping.field_key ?? null) : null,
          id: typeof q.id === 'string' ? q.id : '',
          key: uid(),
          label: typeof q.label === 'string' ? q.label : '',
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          required: q.required === true,
          type: (q.type as ProfileFieldType) ?? 'text',
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
      const question: Record<string, unknown> = {id, label: q.label, type: q.type, required: q.required};
      if (SELECT_TYPES.includes(q.type)) {
        question.options = q.options;
      }
      if (q.fieldKey) {
        question.profile_mapping = {field_key: q.fieldKey, kind: 'custom_field'};
      }
      return question;
    }),
  }));

  return {name: draft.name, purpose: draft.purpose, sections, status: 'active'};
}

coachApi.enhanceEndpoints({
  endpoints: {
    assignFormTemplate: {
      invalidatesTags: (_r, _e, {clientProfileFormAssignmentAssignRequest}) => [
        {type: 'FormAssignment', id: clientProfileFormAssignmentAssignRequest.client_id},
      ],
    },
    createFormTemplate: {invalidatesTags: [{type: 'FormTemplate', id: 'LIST'}]},
    deleteFormTemplate: {invalidatesTags: [{type: 'FormTemplate', id: 'LIST'}]},
    getFormTemplate: {providesTags: (_r, _e, {id}) => [{type: 'FormTemplate', id}]},
    listClientFormAssignmentsForCoach: {
      providesTags: (_r, _e, {clientId}) => [
        {type: 'FormAssignment', id: clientId},
        {type: 'FormAssignment', id: 'LIST'},
      ],
    },
    listFormSubmissions: {providesTags: (_r, _e, {id}) => [{type: 'FormSubmission', id}]},
    listFormTemplates: {providesTags: [{type: 'FormTemplate', id: 'LIST'}]},
    // Update only knows the assignment id, not its client, so refresh all
    // assignment lists via the shared LIST tag.
    updateFormAssignment: {invalidatesTags: [{type: 'FormAssignment', id: 'LIST'}]},
    updateFormTemplate: {
      invalidatesTags: (_r, _e, {id}) => [
        {type: 'FormTemplate', id},
        {type: 'FormTemplate', id: 'LIST'},
      ],
    },
  },
});
