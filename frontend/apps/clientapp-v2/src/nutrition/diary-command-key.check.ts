import {
  beginDiaryCommand,
  completeDiaryCommand,
  deleteEntryIntentFingerprint,
  diaryCommandKey,
  extraIntentFingerprint,
  plannedDayIntentFingerprint,
  plannedItemIntentFingerprint,
  plannedOptionIntentFingerprint,
  replaceIntentFingerprint,
  switchOptionIntentFingerprint,
  updateEntryIntentFingerprint,
} from './diary-command-key.ts';

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

const overlapping = new Map();
const firstIntent = beginDiaryCommand(overlapping, 'first');
const secondIntent = beginDiaryCommand(overlapping, 'second');
completeDiaryCommand(overlapping, firstIntent);
assert(
  beginDiaryCommand(overlapping, 'second').key === secondIntent.key,
  'completing one intent does not clear an overlapping intent',
);
assert(
  beginDiaryCommand(overlapping, 'first').key !== firstIntent.key,
  'a completed intent gets a new key when the user starts it again',
);

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

const plannedItem = plannedItemIntentFingerprint({date: '2026-08-17', plannedItemRef: 'item-1', slot: 'breakfast'});
assert(
  plannedItem === plannedItemIntentFingerprint({date: '2026-08-17', plannedItemRef: 'item-1', slot: 'breakfast'}),
  'planned-item fingerprints are stable',
);
assert(
  plannedOptionIntentFingerprint({date: '2026-08-17', slot: 'breakfast'}) !==
    plannedDayIntentFingerprint({date: '2026-08-17'}),
  'option and day intents stay distinct',
);

const switchSame = {date: '2026-08-17', expectedRevision: 1, mealId: 'meal-b', slot: 'breakfast'};
const switchFingerprint = switchOptionIntentFingerprint(switchSame);
assert(switchFingerprint === switchOptionIntentFingerprint(switchSame), 'switch-option fingerprints are stable');
assert(
  switchFingerprint !==
    switchOptionIntentFingerprint({
      date: '2026-08-17',
      expectedRevision: 2,
      mealId: 'meal-b',
      slot: 'breakfast',
    }),
  'a stale revision rotates the switch-option fingerprint',
);

const replaceSame = {
  date: '2026-08-17',
  expectedRevision: 1,
  id: 'food-eggs',
  kind: 'food',
  plannedItemRef: 'item-1',
  slot: 'breakfast',
  weight: 80,
};
const replaceFingerprint = replaceIntentFingerprint(replaceSame);
assert(replaceFingerprint === replaceIntentFingerprint(replaceSame), 'replace fingerprints are stable');
assert(
  replaceFingerprint !== replaceIntentFingerprint({...replaceSame, weight: 90}),
  'changing the replacement portion rotates the fingerprint',
);
assert(
  updateEntryIntentFingerprint({
    date: '2026-08-17',
    entryId: 'entry-1',
    expectedRevision: 1,
    notes: 'half',
    weight: 25,
  }) !==
    updateEntryIntentFingerprint({
      date: '2026-08-17',
      entryId: 'entry-1',
      expectedRevision: 2,
      notes: 'half',
      weight: 25,
    }),
  'a stale revision rotates the update fingerprint',
);
const deleteSame = {date: '2026-08-17', entryId: 'entry-1', expectedRevision: 1};
const deleteFingerprint = deleteEntryIntentFingerprint(deleteSame);
assert(deleteFingerprint === deleteEntryIntentFingerprint(deleteSame), 'delete fingerprints are stable');
