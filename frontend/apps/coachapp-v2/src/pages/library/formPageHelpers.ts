import type {FieldPath, FieldValues, UseFormSetError} from 'react-hook-form';

import {useBeforeUnload} from 'react-router';

export const getPageTitle = (isEditing: boolean, entityLabel: string, dataName?: string): string => {
  if (!isEditing) {
    return `Create ${entityLabel}`;
  }
  return dataName ? `Edit ${dataName}` : `Edit ${entityLabel}`;
};

export const applyServerErrors = <T extends FieldValues>(
  fieldErrors: Record<string, string[]>,
  setError: UseFormSetError<T>,
  fieldMap: Record<string, FieldPath<T>>,
): void => {
  Object.entries(fieldErrors).forEach(([key, messages]) => {
    const path = fieldMap[key];
    if (!path || messages.length === 0) {
      return;
    }
    setError(path, {type: 'server', message: messages[0]});
  });
};

export const useUnsavedChangesWarning = (hasPendingChanges: boolean): void => {
  useBeforeUnload((event) => {
    if (!hasPendingChanges) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  });
};
