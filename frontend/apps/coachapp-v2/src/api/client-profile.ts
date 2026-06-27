/**
 * Coaching client profile (intake) + business-scoped profile field definitions.
 *
 * The endpoints are codegen'd in `generated.ts` as `tag: false`, so we enhance
 * them here with cache tags (same approach as `nutrition-foods.ts`) and re-export
 * the hooks. Importing the hooks from this module guarantees the enhance ran
 * before the queries fire.
 *
 * Data model: each client profile holds four free-form JSON section maps
 * (general/nutrition/training/lifestyle). The questionnaire schema lives in
 * separate, business-scoped ProfileField definitions; a client's answers are
 * stored in the section maps keyed by `field.key`.
 */
import {
  type ClientProfileField,
  type CoachingClientProfile,
  type CoachingClientProfileRequest,
  coachApi,
} from '@/api/generated';

export type {
  ClientProfileField,
  ClientProfileFieldRequest,
  ClientProfileFieldUpdateRequest,
  CoachingClientProfile,
  CoachingClientProfileRequest,
} from '@/api/generated';

export const {
  useCreateProfileFieldMutation,
  useDeleteProfileFieldMutation,
  useGetCoachingClientProfileQuery,
  useListProfileFieldsQuery,
  useUpdateCoachingClientProfileMutation,
  useUpdateProfileFieldMutation,
} = coachApi;

export type ProfileSection = ClientProfileField['section'];
export type ProfileFieldType = ClientProfileField['field_type'];

/** A single stored answer. Shape depends on the field type. */
export type ProfileFieldValue = boolean | null | number | string | string[];

export const PROFILE_SECTIONS: {key: ProfileSection; label: string}[] = [
  {key: 'general', label: 'General'},
  {key: 'nutrition', label: 'Nutrition'},
  {key: 'training', label: 'Training'},
  {key: 'lifestyle', label: 'Lifestyle'},
];

export const FIELD_TYPE_LABELS: Record<ProfileFieldType, string> = {
  boolean: 'Yes / No',
  date: 'Date',
  multi_select: 'Multi-select',
  number: 'Number',
  select: 'Select',
  text: 'Text',
};

/** Field types the backend allows `filterable: true` on (everything except free text). */
export function isFilterableType(type: ProfileFieldType): boolean {
  return type !== 'text';
}

/** Empty = "no answer"; we drop the key rather than storing an empty value. */
export function isEmptyProfileValue(value: ProfileFieldValue | undefined): boolean {
  if (value == null || value === '') {
    return true;
  }
  return Array.isArray(value) && value.length === 0;
}

type Sections = Pick<CoachingClientProfile, 'general' | 'lifestyle' | 'nutrition' | 'training'>;

/** Read the current answer for a field out of the profile's section maps. */
export function readProfileFieldValue(profile: Sections, field: ClientProfileField): ProfileFieldValue {
  const raw = profile[field.section]?.[field.key];
  return (raw ?? null) as ProfileFieldValue;
}

/**
 * Build the PATCH body's section maps. Each section is rebuilt as
 * `{...existing, [key]: value}` because the backend replaces the whole section
 * map per PATCH (Ecto `cast` on a `:map` field) — spreading `existing` preserves
 * answers whose keys aren't in the editor (archived fields, form-mapped values).
 */
export function buildProfileSectionsPayload(
  fields: ClientProfileField[],
  existing: Sections,
  valuesByFieldId: Record<string, ProfileFieldValue>,
): Pick<CoachingClientProfileRequest, 'general' | 'lifestyle' | 'nutrition' | 'training'> {
  const sections: Record<ProfileSection, Record<string, unknown>> = {
    general: {...(existing.general ?? {})},
    lifestyle: {...(existing.lifestyle ?? {})},
    nutrition: {...(existing.nutrition ?? {})},
    training: {...(existing.training ?? {})},
  };

  for (const field of fields) {
    const section = sections[field.section];
    const value = valuesByFieldId[field.id];
    if (isEmptyProfileValue(value)) {
      delete section[field.key];
    } else {
      section[field.key] = value;
    }
  }

  return sections;
}

coachApi.enhanceEndpoints({
  endpoints: {
    createProfileField: {invalidatesTags: [{type: 'ProfileField', id: 'LIST'}]},
    deleteProfileField: {invalidatesTags: [{type: 'ProfileField', id: 'LIST'}]},
    getCoachingClientProfile: {
      providesTags: (_r, _e, {clientId}) => [{type: 'ClientProfile', id: clientId}],
    },
    listProfileFields: {providesTags: [{type: 'ProfileField', id: 'LIST'}]},
    updateCoachingClientProfile: {
      invalidatesTags: (_r, _e, {clientId}) => [{type: 'ClientProfile', id: clientId}],
    },
    updateProfileField: {invalidatesTags: [{type: 'ProfileField', id: 'LIST'}]},
  },
});
