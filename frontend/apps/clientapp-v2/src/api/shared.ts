export type ApiResponse<T> = {data: T};
export type ApiListResponse<T> = {data: T[]; count: number};

export type ErrorResponse = {
  error_code: string;
  error_message: string;
  error_detail?: null | Record<string, unknown>;
};

export type ValidationErrorResponse = {
  errors: Record<string, string[]>;
};

export const getValidationErrors = (error: unknown): null | Record<string, string[]> => {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null;
  }
  const data = (error as {data?: unknown}).data;
  if (!data || typeof data !== 'object') {
    return null;
  }
  if ('errors' in data) {
    const errors = (data as ValidationErrorResponse).errors;
    if (errors && typeof errors === 'object') {
      return errors;
    }
  }
  if ('error_detail' in data) {
    const errorDetail = (data as {error_detail?: unknown}).error_detail;
    if (errorDetail && typeof errorDetail === 'object' && 'fields' in errorDetail) {
      const fields = (errorDetail as {fields?: unknown}).fields;
      if (fields && typeof fields === 'object') {
        return fields as Record<string, string[]>;
      }
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

/** Extract the `error_code` string from an RTK Query error, or null if not present. */
export const getApiErrorCode = (error: unknown): null | string => {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as {data?: ErrorResponse}).data;
    return data?.error_code ?? null;
  }
  return null;
};

/**
 * Bridges server errors into react-hook-form's setError.
 * - Field errors → setError('fieldName', {message}) per field
 * - General error → setError('root', {message})
 */
export const applyFormErrors = (
  error: unknown,
  fallbackMessage: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setError: (name: any, error: {message: string}) => void,
) => {
  const {fieldErrors, formError} = handleFormError(error, fallbackMessage);

  if (fieldErrors) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const msg = messages[0];
      if (msg) {
        setError(field, {message: msg});
      }
    }
  }

  setError('root', {message: formError});
};
