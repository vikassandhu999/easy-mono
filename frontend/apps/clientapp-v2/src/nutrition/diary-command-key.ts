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
