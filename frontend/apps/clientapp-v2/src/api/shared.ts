import {ApiError} from '@easy/utils/api-error';
import {
  type ApiErrorBody,
  apiErrorCodeFromBody,
  apiErrorMessageFromBody,
  applyParsedFormErrors,
  type FormSetError,
  parseApiErrorBody,
  validationErrorsFromBody,
} from '@easy/utils/parse-api-error';
import type {FieldValues, Path, UseFormSetError} from 'react-hook-form';

export type {ApiErrorBody, FormSetError};

export function parseApiError(error: unknown): ApiErrorBody | null {
  if (!(error instanceof ApiError)) {
    return null;
  }
  return parseApiErrorBody(error.data);
}

export const getValidationErrors = (error: unknown): null | Record<string, string[]> =>
  validationErrorsFromBody(parseApiError(error));

export const getApiErrorMessage = (error: unknown, fallback: string): string =>
  apiErrorMessageFromBody(parseApiError(error), fallback);

export const getApiErrorCode = (error: unknown): null | string => apiErrorCodeFromBody(parseApiError(error));

export const applyFormErrors = <TFieldValues extends FieldValues>(
  error: unknown,
  fallbackMessage: string,
  setError: UseFormSetError<TFieldValues>,
  knownFields?: readonly Path<TFieldValues>[],
) =>
  applyParsedFormErrors(
    parseApiError(error),
    fallbackMessage,
    (name, fieldError) => {
      setError(name as Path<TFieldValues>, fieldError);
    },
    knownFields,
  );
