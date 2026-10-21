import type {ReviewScreen} from '../api/reviews';
export const assessmentLabels = {on_track: 'On track', needs_attention: 'Needs attention', at_risk: 'At risk'} as const;
export function dueLabel(row: {due: boolean; overdue_days: number; due_on: string | null; current_term: unknown}) {
  if (!row.current_term) {
    return 'No current term';
  }
  if (row.overdue_days > 0) {
    return `Overdue ${row.overdue_days} days`;
  }
  if (row.due) {
    return 'Due';
  }
  return row.due_on ? `Not due · Next ${row.due_on}` : 'Not due';
}

const hiddenFields = new Set([
  'id',
  'business_id',
  'client_id',
  'recorded_by_id',
  'inserted_at',
  'updated_at',
  'request_id',
  'revision',
  'change_seq',
]);
export function readableValues(value: unknown, prefix = ''): Array<{field: string; value: string}> {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => readableValues(item, `${prefix} ${index + 1}`));
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      hiddenFields.has(key) || key.endsWith('_id')
        ? []
        : readableValues(item, `${prefix ? `${prefix} · ` : ''}${key.replaceAll('_', ' ')}`),
    );
  }
  return [{field: prefix, value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}];
}
export function changedValues(oldValue: unknown, newValue: unknown) {
  const before = new Map(readableValues(oldValue).map((item) => [item.field, item.value]));
  const after = new Map(readableValues(newValue).map((item) => [item.field, item.value]));
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((field) =>
    before.get(field) === after.get(field)
      ? []
      : [{field, before: before.get(field) ?? 'Not recorded', after: after.get(field) ?? 'Removed'}],
  );
}

type ChangeGroup = ReviewScreen['changes'][number];
export function groupAction(group: {
  record_type: ChangeGroup['record_type'];
  changes: Pick<ChangeGroup['changes'][number], 'row_type' | 'action' | 'new_value'>[];
}) {
  const parentType = group.record_type;
  const parent = group.changes.findLast((change) => change.row_type === parentType);
  if (!parent) {
    return 'changed';
  }
  if (parent.action === 'removed') {
    return 'removed';
  }
  return group.changes.some((change) => change.row_type === parentType && change.action === 'added')
    ? 'added'
    : 'changed';
}
