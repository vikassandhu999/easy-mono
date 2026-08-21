import {diaryWriteMessageForCode} from './diary-write-error-message.ts';

function assertEqual(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

assertEqual(
  diaryWriteMessageForCode('stale_revision') ?? 'fallback',
  'This item changed on another device. Refresh and try again.',
);
assertEqual(
  diaryWriteMessageForCode('outside_correction_window') ?? 'fallback',
  'This day is no longer open to corrections.',
);
assertEqual(diaryWriteMessageForCode('future_date') ?? 'fallback', 'You can only log today or the past week.');
assertEqual(diaryWriteMessageForCode('invalid_input') ?? 'fallback', 'fallback');
