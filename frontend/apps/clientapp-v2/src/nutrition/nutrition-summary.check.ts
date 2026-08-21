import {adherenceDisplay, calorieShare, kcalText} from './nutrition-summary.ts';

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(kcalText(null), '—', 'null calories stay unknown');
assertEqual(kcalText(undefined), '—', 'missing calories stay unknown');
assertEqual(kcalText('1820.4'), '1820', 'string decimals still round for display');

assertEqual(
  adherenceDisplay({
    summary: {adherence: 'none', has_intake: false},
  }),
  'none',
  'no intake is none',
);

assertEqual(
  adherenceDisplay({
    summary: {adherence: null, has_intake: true},
  }),
  'unknown',
  'intake with unknown calories does not invent a verdict',
);

assertEqual(
  adherenceDisplay({
    summary: {adherence: 'under', has_intake: true},
  }),
  'under',
  'backend adherence is displayed as-is',
);

assertEqual(calorieShare(null, 2000), null, 'unknown logged calories have no share');
assertEqual(calorieShare(1800, null), null, 'unknown target calories have no share');
assertEqual(calorieShare(1710, 1900), 90, 'share uses backend totals only');
