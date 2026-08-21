export type DiaryCommandIntent = {fingerprint: string; key: string};
export type DiaryCommandIntents = Map<string, DiaryCommandIntent>;

export function beginDiaryCommand(intents: DiaryCommandIntents, fingerprint: string): DiaryCommandIntent {
  const existing = intents.get(fingerprint);
  if (existing) {
    return existing;
  }

  const intent = diaryCommandKey(null, fingerprint);
  intents.set(fingerprint, intent);
  return intent;
}

export function completeDiaryCommand(intents: DiaryCommandIntents, intent: DiaryCommandIntent): void {
  if (intents.get(intent.fingerprint)?.key === intent.key) {
    intents.delete(intent.fingerprint);
  }
}

export function diaryCommandKey(previous: DiaryCommandIntent | null, fingerprint: string): DiaryCommandIntent {
  if (previous?.fingerprint === fingerprint) {
    return previous;
  }
  return {fingerprint, key: crypto.randomUUID()};
}

export function extraIntentFingerprint(picked: {
  date: string;
  defaultAmount: null | number;
  defaultWeightG: null | number;
  id: string;
  kind: string;
  slot: string;
}): string {
  return JSON.stringify({
    amount: picked.defaultAmount ?? null,
    date: picked.date,
    id: picked.id,
    kind: picked.kind,
    slot: picked.slot,
    weight: picked.defaultWeightG ?? null,
  });
}

export function plannedItemIntentFingerprint(input: {date: string; mealItemId: string; slot: string}): string {
  return JSON.stringify({date: input.date, mealItemId: input.mealItemId, scope: 'planned-item', slot: input.slot});
}

export function plannedOptionIntentFingerprint(input: {date: string; slot: string}): string {
  return JSON.stringify({date: input.date, scope: 'planned-option', slot: input.slot});
}

export function plannedDayIntentFingerprint(input: {date: string}): string {
  return JSON.stringify({date: input.date, scope: 'planned-day'});
}

export function switchOptionIntentFingerprint(input: {
  date: string;
  expectedRevision: number;
  mealId: string;
  slot: string;
}): string {
  return JSON.stringify({
    date: input.date,
    expectedRevision: input.expectedRevision,
    mealId: input.mealId,
    scope: 'switch-option',
    slot: input.slot,
  });
}

export function replaceIntentFingerprint(input: {
  date: string;
  expectedRevision: number;
  id: string;
  kind: string;
  mealItemId: string;
  slot: string;
  weight: null | number;
}): string {
  return JSON.stringify({
    date: input.date,
    expectedRevision: input.expectedRevision,
    id: input.id,
    kind: input.kind,
    mealItemId: input.mealItemId,
    scope: 'replace',
    slot: input.slot,
    weight: input.weight,
  });
}

export function updateEntryIntentFingerprint(input: {
  date: string;
  entryId: string;
  expectedRevision: number;
  notes: null | string;
  weight: number;
}): string {
  return JSON.stringify({
    date: input.date,
    entryId: input.entryId,
    expectedRevision: input.expectedRevision,
    notes: input.notes,
    scope: 'update-entry',
    weight: input.weight,
  });
}

export function deleteEntryIntentFingerprint(input: {date: string; entryId: string; expectedRevision: number}): string {
  return JSON.stringify({
    date: input.date,
    entryId: input.entryId,
    expectedRevision: input.expectedRevision,
    scope: 'delete-entry',
  });
}
