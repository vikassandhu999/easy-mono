import {getValidationErrors} from '../../api/shared.ts';

export function coverageErrorMessage(error: unknown, fallback: string): string {
  const fields = getValidationErrors(error);
  if (!fields) {
    return fallback;
  }

  if (fields.archived_at) {
    return 'This Client Plan is archived and cannot be edited.';
  }

  return fields.start_date?.[0] ?? fields.end_date?.[0] ?? fields.client_id?.[0] ?? fallback;
}
