/**
 * Hand-declared API error body — not derived from generated `ErrorResponse`,
 * which omits `error_code`, `error_message`, and `error_detail` because the
 * backend declares the real shape per endpoint.
 */
export type ApiErrorBody = {
  error_code?: string;
  error_message?: string;
  error_detail?: null | Record<string, unknown>;
  errors?: Record<string, unknown>;
};

export type FormSetError = (name: 'root' | string, error: {message: string}) => void;

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

/** Parse the JSON body of a failed API response into a named domain type. */
export function parseApiErrorBody(data: unknown): ApiErrorBody | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const errors =
    record.errors && typeof record.errors === 'object' ? (record.errors as Record<string, unknown>) : undefined;
  const error_code = typeof record.error_code === 'string' ? record.error_code : undefined;
  const error_message = typeof record.error_message === 'string' ? record.error_message : undefined;
  const error_detail =
    record.error_detail && typeof record.error_detail === 'object'
      ? (record.error_detail as Record<string, unknown>)
      : record.error_detail === null
        ? null
        : undefined;

  if (!errors && !error_code && !error_message) {
    return null;
  }

  return {
    ...(error_code !== undefined && {error_code}),
    ...(error_message !== undefined && {error_message}),
    ...(error_detail !== undefined && {error_detail}),
    ...(errors !== undefined && {errors}),
  };
}

/**
 * Extract field-level validation errors from a parsed API error body.
 *
 * Backend returns three shapes we have to handle:
 *   1. Legacy `{errors: {field: ["msg", ...]}}`
 *   2. Ecto changeset via contract's `ErrorResponse`:
 *      `{error_code, error_message, error_detail: {fields: {field: ["msg"]}}}`
 *   3. Hand-built validation (self-invite, already-active, revoke-non-pending):
 *      `{error_code, error_message, error_detail: {field: ["msg"]}}`
 */
export function validationErrorsFromBody(body: ApiErrorBody | null): null | Record<string, string[]> {
  if (!body) {
    return null;
  }

  if (body.errors) {
    const normalized = normalizeFieldMap(body.errors);
    if (normalized) {
      return normalized;
    }
  }

  if (body.error_detail && typeof body.error_detail === 'object') {
    if ('fields' in body.error_detail) {
      const fields = body.error_detail.fields;
      if (fields && typeof fields === 'object') {
        const normalized = normalizeFieldMap(fields as Record<string, unknown>);
        if (normalized) {
          return normalized;
        }
      }
    }
    return normalizeFieldMap(body.error_detail);
  }

  return null;
}

export function apiErrorMessageFromBody(body: ApiErrorBody | null, fallback: string): string {
  return body?.error_message ?? fallback;
}

export function apiErrorCodeFromBody(body: ApiErrorBody | null): null | string {
  return body?.error_code ?? null;
}

type FormErrorResult = {
  formError: string;
  fieldErrors: null | Record<string, string[]>;
};

function handleFormError(body: ApiErrorBody | null, fallbackMessage: string): FormErrorResult {
  const fieldErrors = validationErrorsFromBody(body);
  const formError = fieldErrors ? 'Please review the highlighted fields.' : body?.error_message || fallbackMessage;
  return {formError, fieldErrors};
}

/**
 * Bridges server errors into react-hook-form's setError.
 * - Field errors whose name matches a form field → setError('fieldName', {message})
 * - Errors from the backend under a key the form doesn't have (e.g. `base`,
 *   unrelated validation keys) → hoisted into the root message so the user
 *   sees something actionable instead of a silent "Please review..." prompt
 *   pointing at no highlighted field.
 * - General error (no fieldErrors) → setError('root', {message})
 */
export function applyParsedFormErrors(
  body: ApiErrorBody | null,
  fallbackMessage: string,
  setError: FormSetError,
  knownFields?: readonly string[],
): void {
  const {fieldErrors, formError} = handleFormError(body, fallbackMessage);

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

  const rootMessage = anyMatched
    ? unmatchedMessages.length > 0
      ? `${formError} ${unmatchedMessages.join(' ')}`
      : formError
    : unmatchedMessages.length > 0
      ? unmatchedMessages.join(' ')
      : formError;

  setError('root', {message: rootMessage});
}
