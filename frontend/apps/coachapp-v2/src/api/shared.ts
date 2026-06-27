export type ApiResponse<T> = {data: T};
export type ApiListResponse<T> = {data: T[]; count: number};

/**
 * RTK Query `providesTags` for a list query: one tag per row plus a list-level
 * tag (default `LIST`, override for client-scoped / plan-scoped lists).
 */
export const listTags = <T extends string>(
  type: T,
  result: {data: {id: string}[]} | undefined,
  listId: string = 'LIST',
) => (result ? [...result.data.map((entry) => ({type, id: entry.id})), {type, id: listId}] : [{type, id: listId}]);

/** As `listTags`, for an `infiniteQuery` result (rows live under `pages`). */
export const pageTags = <T extends string>(
  type: T,
  result: {pages: {data: {id: string}[]}[]} | undefined,
  listId: string = 'LIST',
) =>
  result
    ? [...result.pages.flatMap((page) => page.data.map((entry) => ({type, id: entry.id}))), {type, id: listId}]
    : [{type, id: listId}];

/** Cache-tag id namespacing a `Meal`/`PlanItem` to its nutrition plan. */
export const getPlanScopedId = (planId: string) => `PLAN_${planId}`;

export function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export function pickDefined<T extends Record<string, unknown>, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Partial<Pick<T, K>> {
  return Object.fromEntries(keys.flatMap((key) => (value[key] === undefined ? [] : [[key, value[key]]]))) as Partial<
    Pick<T, K>
  >;
}

export function toOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function toNullableText(value: string | undefined): null | string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Empty string / null → undefined; otherwise the finite Number (else undefined). */
export function toOptionalNumber(value: number | string): number | undefined {
  if (value === '' || value === null) {
    return undefined;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export type ErrorResponse = {
  error_code: string;
  error_message: string;
  error_detail?: null | Record<string, unknown>;
};

export type ValidationErrorResponse = {
  errors: Record<string, string[]>;
};

/**
 * Validate that a map is `{[field]: string[]}` before handing it to callers.
 * Any non-array / non-string-of-string entries are dropped rather than trusted.
 * This guards against the backend ever returning `{email: "bad email"}` (a
 * string instead of an array) which would otherwise iterate into garbage at
 * `messages[0]` = first character.
 */
function normalizeFieldMap(raw: Record<string, unknown>): null | Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let anyValid = false;
  for (const [key, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) {
      continue;
    }
    const strings = value.filter((v): v is string => typeof v === 'string');
    if (strings.length === 0) {
      continue;
    }
    out[key] = strings;
    anyValid = true;
  }
  return anyValid ? out : null;
}

/**
 * Extract field-level validation errors from a server error response.
 *
 * Backend returns three shapes we have to handle:
 *   1. Legacy `{errors: {field: ["msg", ...]}}`
 *   2. Ecto changeset via contract's `ErrorResponse`:
 *      `{error_code, error_message, error_detail: {fields: {field: ["msg"]}}}`
 *   3. Hand-built validation (self-invite, already-active, revoke-non-pending):
 *      `{error_code, error_message, error_detail: {field: ["msg"]}}`
 *
 * The third shape is new in onboarding-v2 and was missed by the previous parser.
 */
export const getValidationErrors = (error: unknown): null | Record<string, string[]> => {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null;
  }
  const data = (error as {data?: unknown}).data;
  if (!data || typeof data !== 'object') {
    return null;
  }
  if ('errors' in data) {
    const errors = (data as {errors?: unknown}).errors;
    if (errors && typeof errors === 'object') {
      return normalizeFieldMap(errors as Record<string, unknown>);
    }
  }
  if ('error_detail' in data) {
    const errorDetail = (data as {error_detail?: unknown}).error_detail;
    if (errorDetail && typeof errorDetail === 'object') {
      // Shape 2: nested under `fields`
      if ('fields' in errorDetail) {
        const fields = (errorDetail as {fields?: unknown}).fields;
        if (fields && typeof fields === 'object') {
          const normalized = normalizeFieldMap(fields as Record<string, unknown>);
          if (normalized) {
            return normalized;
          }
        }
      }
      // Shape 3: fields are the top-level keys of error_detail itself.
      return normalizeFieldMap(errorDetail as Record<string, unknown>);
    }
  }
  return null;
};

export type FormErrorResult = {
  formError: string;
  fieldErrors: null | Record<string, string[]>;
};

export const handleFormError = (error: unknown, fallbackMessage: string): FormErrorResult => {
  const fieldErrors = getValidationErrors(error);
  const errorMessage =
    error && typeof error === 'object' && 'data' in error
      ? (error as {data?: ErrorResponse}).data?.error_message
      : null;
  const formError = fieldErrors ? 'Please review the highlighted fields.' : errorMessage || fallbackMessage;
  return {formError, fieldErrors};
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'data' in error) {
    return (error as {data?: ErrorResponse}).data?.error_message ?? fallback;
  }
  return fallback;
};

/**
 * Bridges server errors into react-hook-form's setError.
 * - Field errors whose name matches a form field → setError('fieldName', {message})
 * - Errors from the backend under a key the form doesn't have (e.g. `base`,
 *   unrelated validation keys) → hoisted into the root message so the user
 *   sees something actionable instead of a silent "Please review..." prompt
 *   pointing at no highlighted field.
 * - General error (no fieldErrors) → setError('root', {message})
 *
 * Callers that want strict routing can pass `knownFields`; callers that pass
 * nothing accept all keys as field errors (backwards-compatible).
 */
export const applyFormErrors = (
  error: unknown,
  fallbackMessage: string,
  setError: (name: any, error: {message: string}) => void,
  knownFields?: readonly string[],
) => {
  const {fieldErrors, formError} = handleFormError(error, fallbackMessage);

  if (!fieldErrors) {
    setError('root', {message: formError});
    return;
  }

  const known = knownFields ? new Set<string>(knownFields) : null;
  const unmatchedMessages: string[] = [];
  let anyMatched = false;

  for (const [field, messages] of Object.entries(fieldErrors)) {
    const msg = messages[0];
    if (!msg) {
      continue;
    }

    if (known && !known.has(field)) {
      unmatchedMessages.push(msg);
      continue;
    }
    setError(field, {message: msg});
    anyMatched = true;
  }

  // Compose the root message: if all errors were unmatched (no fields got
  // highlighted), use the backend copy directly. If some matched and some
  // didn't, show the standard "review highlighted" prompt + any orphan
  // messages appended so the user sees them.
  const rootMessage = anyMatched
    ? unmatchedMessages.length > 0
      ? `${formError} ${unmatchedMessages.join(' ')}`
      : formError
    : unmatchedMessages.length > 0
      ? unmatchedMessages.join(' ')
      : formError;

  setError('root', {message: rootMessage});
};

// Re-export shared nutrition utilities from @easy/utils
export {type Macros, normalizeMacros} from '@easy/utils';

export type ServingSize = {
  unit: string;
  weight_g: null | number;
  amount: null | number;
};
