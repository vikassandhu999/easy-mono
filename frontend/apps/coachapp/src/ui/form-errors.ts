import type {FieldPath, FieldValues, UseFormSetError} from 'react-hook-form';
import {ApiError, errorMessage} from '../api/client';

export function setFormError<T extends FieldValues>(
  error: unknown,
  fallback: string,
  setError: UseFormSetError<T>,
  fields: FieldPath<T>[],
) {
  const data = error instanceof ApiError ? error.data : null;
  if (
    data &&
    typeof data === 'object' &&
    'error_detail' in data &&
    data.error_detail &&
    typeof data.error_detail === 'object'
  ) {
    const detail = data.error_detail;
    const errors = 'fields' in detail ? detail.fields : detail;
    if (errors && typeof errors === 'object') {
      let applied = false;
      for (const field of fields) {
        const messages: unknown = Reflect.get(errors, field);
        if (Array.isArray(messages) && typeof messages[0] === 'string') {
          setError(field, {message: messages[0]}, {shouldFocus: !applied});
          applied = true;
        }
      }
      if (applied) {
        return;
      }
    }
  }
  setError('root', {message: errorMessage(error, fallback)});
}
