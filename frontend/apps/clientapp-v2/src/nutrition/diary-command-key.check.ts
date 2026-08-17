import {diaryCommandKey, extraIntentFingerprint} from './diary-command-key.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const reused = diaryCommandKey(null, 'same');
const retry = diaryCommandKey(reused, 'same');
const rotated = diaryCommandKey(reused, 'other');

assert(reused.key === retry.key, 'retries of the same extra intent reuse the idempotency key');
assert(reused.fingerprint === 'same', 'the stored fingerprint matches the intent');
assert(rotated.key !== reused.key, 'a different extra intent gets a new idempotency key');

const fingerprint = extraIntentFingerprint({
  date: '2026-08-17',
  defaultAmount: null,
  defaultWeightG: 80,
  id: 'food-banana',
  kind: 'food',
  slot: 'breakfast',
});
assert(
  fingerprint ===
    extraIntentFingerprint({
      date: '2026-08-17',
      defaultAmount: null,
      defaultWeightG: 80,
      id: 'food-banana',
      kind: 'food',
      slot: 'breakfast',
    }),
  'the extra fingerprint is stable for the same pick',
);
assert(
  fingerprint !==
    extraIntentFingerprint({
      date: '2026-08-17',
      defaultAmount: null,
      defaultWeightG: 90,
      id: 'food-banana',
      kind: 'food',
      slot: 'breakfast',
    }),
  'changing the portion rotates the extra fingerprint',
);
assert(
  fingerprint !==
    extraIntentFingerprint({
      date: '2026-08-16',
      defaultAmount: null,
      defaultWeightG: 80,
      id: 'food-banana',
      kind: 'food',
      slot: 'breakfast',
    }),
  'changing the Nutrition Day date rotates the extra fingerprint',
);
