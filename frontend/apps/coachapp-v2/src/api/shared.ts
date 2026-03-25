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

export type Macros = Record<string, number>;

export type ServingSize = {
  unit: string;
  weight_g: null | number;
  amount: null | number;
};

/**
 * Mapping from system-imported (short) macro keys to canonical (long) form keys.
 * System foods use: calories, protein, carbs, fat, fiber, sugar
 * Coach-created foods use: calories_per_100g, protein_g, carbs_g, fats_g, fiber_g, sugar_g
 */
const MACRO_KEY_ALIASES: Record<string, string> = {
  calories: 'calories_per_100g',
  protein: 'protein_g',
  carbs: 'carbs_g',
  fat: 'fats_g',
  fiber: 'fiber_g',
  sugar: 'sugar_g',
};

/**
 * Normalise a macros map so that every key uses the canonical (coach-format) key.
 * System-imported short keys are remapped; already-canonical keys pass through unchanged.
 * Unknown keys (not in the alias table and not already canonical) are kept as-is.
 */
export function normalizeMacros(macros: Macros): Macros {
  const result: Macros = {};
  for (const [key, value] of Object.entries(macros)) {
    const canonical = MACRO_KEY_ALIASES[key] ?? key;
    // If both the alias and the canonical key exist, prefer the canonical key's value
    if (canonical in result) continue;
    result[canonical] = value;
  }
  return result;
}
