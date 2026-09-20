import {addDays, formatDateLong} from '@easy/utils';
import type {WeightEntry, WeightSave} from '../api/weight';

export type WeightDraft = {
  version: 1;
  date: string;
  value: string;
  unit: WeightEntry['unit'];
  note: string;
  expected: WeightSave['expected_entry'];
  attempt: WeightSave | null;
};

export function initialWeightDraft(date: string, saved: WeightEntry | null, unit: WeightEntry['unit']): WeightDraft {
  return {
    version: 1,
    date,
    value: saved?.value ?? '',
    unit: saved?.unit ?? unit,
    note: saved?.note ?? '',
    expected: saved ? {id: saved.id, revision: saved.revision} : null,
    attempt: null,
  };
}

export function weightInput(draft: WeightDraft): WeightSave {
  const value = draft.value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) >= 1000) {
    throw new Error('Enter a weight greater than 0 and below 1,000, with up to two decimal places.');
  }
  return {
    date: draft.date,
    value: Number(value),
    unit: draft.unit,
    note: draft.note || null,
    expected_entry: draft.expected,
  };
}

export function parseWeightDraft(raw: unknown, date: string): WeightDraft | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('version' in raw) ||
    raw.version !== 1 ||
    !('date' in raw) ||
    raw.date !== date ||
    !('value' in raw) ||
    typeof raw.value !== 'string' ||
    raw.value.length > 30 ||
    !('unit' in raw) ||
    (raw.unit !== 'kg' && raw.unit !== 'lbs') ||
    !('note' in raw) ||
    typeof raw.note !== 'string' ||
    raw.note.length > 500 ||
    !('expected' in raw) ||
    !('attempt' in raw)
  ) {
    return null;
  }
  let expected: WeightDraft['expected'] = null;
  if (raw.expected !== null) {
    const value = raw.expected;
    if (
      !value ||
      typeof value !== 'object' ||
      !('id' in value) ||
      typeof value.id !== 'string' ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.id) ||
      !('revision' in value) ||
      typeof value.revision !== 'number' ||
      !Number.isSafeInteger(value.revision) ||
      value.revision < 1
    ) {
      return null;
    }
    expected = {id: value.id, revision: value.revision};
  }
  const draft: WeightDraft = {
    version: 1,
    date,
    value: raw.value,
    unit: raw.unit,
    note: raw.note,
    expected,
    attempt: null,
  };
  if (raw.attempt !== null) {
    try {
      const input = weightInput(draft);
      if (JSON.stringify(raw.attempt) !== JSON.stringify(input)) {
        return null;
      }
      draft.attempt = input;
    } catch {
      return null;
    }
  }
  return draft;
}

export function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function shiftDay(value: string, days: number) {
  return addDays(value, days).toString();
}

export const weightDate = formatDateLong;
