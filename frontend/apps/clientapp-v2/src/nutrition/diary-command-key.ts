export type DiaryCommandIntent = {fingerprint: string; key: string};

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
