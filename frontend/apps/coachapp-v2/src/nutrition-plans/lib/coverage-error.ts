export function coverageErrorMessage(error: unknown, fallback: string): string {
  const fields = objectProperty(objectProperty(objectProperty(error, 'data'), 'error_detail'), 'fields');
  if (fieldMessage(fields, 'archived_at')) {
    return 'This Client Plan is archived and cannot be edited.';
  }

  return (
    fieldMessage(fields, 'start_date') ??
    fieldMessage(fields, 'end_date') ??
    fieldMessage(fields, 'client_id') ??
    fallback
  );
}

function fieldMessage(fields: unknown, field: string): string | undefined {
  const messages = objectProperty(fields, field);
  return Array.isArray(messages) && typeof messages[0] === 'string' ? messages[0] : undefined;
}

function objectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return Object.entries(value).find(([name]) => name === key)?.[1];
}
