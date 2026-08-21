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

import {ApiError} from './api-error.ts';

export type {ApiErrorBody, FormSetError};

export function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
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

// Re-export shared nutrition utilities from @easy/utils

export type ServingSize = {
  unit: string;
  weight_g: null | number;
  amount: null | number;
};
