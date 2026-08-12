/**
 * Self-check for client-detail-data.ts (and the formatAnswer it re-checks from
 * checkins/lib/form-answers.ts). Runs on every `pnpm build` via the `check` script:
 *
 *   pnpm run check
 *
 * Not a test-framework suite — the app has none, and this needs none. It exists
 * because these functions were rewritten from scratch and every one of them fails
 * SILENTLY when wrong: an off-by-one in the week maths renders a plausible strip
 * against the wrong days, and a UTC-parsed day string renders yesterday. The
 * expected strings are the ones the dc.html displays.
 *
 * A fixed `today` is passed everywhere a function accepts one, so this cannot
 * start failing tomorrow.
 */

import {formatAnswer} from '../../checkins/lib/form-answers.ts';
import {
  coachingAccessState,
  coachingPeriodUpdate,
  extendedSubscriptionEnd,
  renewalEndDateIsValid,
  subscriptionDatesAreOrdered,
} from './client.ts';
import {
  averageLoggedCalories,
  completedCheckIns,
  completedSessionDates,
  entryStatus,
  formatCompactDuration,
  formatDayMonth,
  formatKcal,
  formatRowDate,
  formatWeight,
  lastNDays,
  loggedMealDates,
  parseDay,
  plannedMealItems,
  relativeDay,
  skippedPlannedItems,
  sparklinePoints,
  startOfWeek,
  toDayIso,
  weekdayInitial,
  weekGroupLabel,
  weightTrend,
} from './client-detail-data.ts';

/**
 * Local assert, not `node:assert` — this is a browser app with no `@types/node`,
 * and adding a dependency so one file can call `assert.equal` is a poor trade.
 *
 * ponytail: `deepEqual` compares JSON, so it is key-ORDER sensitive and blind to
 * undefined-vs-absent. Fine for the plain arrays and objects below, which are
 * built literally right here. Reach for a real matcher if this ever compares an
 * API payload.
 */
const assert = {
  deepEqual(actual: unknown, expected: unknown, message?: string): void {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error(`${message ?? 'not deep equal'}\n  actual:   ${a}\n  expected: ${e}`);
    }
  },
  equal(actual: unknown, expected: unknown, message?: string): void {
    if (!Object.is(actual, expected)) {
      throw new Error(`${message ?? 'not equal'}\n  actual:   ${String(actual)}\n  expected: ${String(expected)}`);
    }
  },
};

// The design's reference day: Tuesday 21 July 2026.
const TODAY = new Date(2026, 6, 21);

assert.equal(subscriptionDatesAreOrdered('2026-03-03', '2026-11-22'), true);
assert.equal(subscriptionDatesAreOrdered('2026-03-03', '2025-11-22'), false);
assert.equal(subscriptionDatesAreOrdered('2026-03-03', ''), true);

assert.equal(extendedSubscriptionEnd('2026-08-11', '2026-08-11', {days: 14}), '2026-08-25');
assert.equal(extendedSubscriptionEnd('2026-08-01', '2026-08-11', {days: 14}), '2026-08-25');
assert.equal(extendedSubscriptionEnd(null, '2026-08-11', {months: 1}), '2026-09-11');

assert.deepEqual(
  coachingAccessState({status: 'pending', inactive_reason: null, subscription_ends_on: null}, '2026-08-11'),
  {
    accessAction: null,
    mode: 'pending',
    periodAction: 'edit',
    requiresPeriodUpdate: false,
  },
);
assert.deepEqual(
  coachingAccessState({status: 'active', inactive_reason: null, subscription_ends_on: null}, '2026-08-11'),
  {
    accessAction: 'pause',
    mode: 'active',
    periodAction: 'edit',
    requiresPeriodUpdate: false,
  },
);
assert.deepEqual(
  coachingAccessState({status: 'inactive', inactive_reason: 'manual', subscription_ends_on: null}, '2026-08-11'),
  {accessAction: 'reactivate', mode: 'manual', periodAction: 'edit', requiresPeriodUpdate: false},
);
assert.deepEqual(
  coachingAccessState(
    {status: 'inactive', inactive_reason: 'manual', subscription_ends_on: '2026-08-10'},
    '2026-08-11',
  ),
  {accessAction: 'reactivate', mode: 'manual', periodAction: 'edit', requiresPeriodUpdate: true},
);
assert.deepEqual(
  coachingAccessState(
    {status: 'inactive', inactive_reason: 'subscription_expired', subscription_ends_on: '2026-08-10'},
    '2026-08-11',
  ),
  {accessAction: 'renew', mode: 'expired', periodAction: 'renew', requiresPeriodUpdate: true},
);
assert.deepEqual(
  coachingAccessState({status: 'inactive', inactive_reason: 'awaiting_seat', subscription_ends_on: null}, '2026-08-11'),
  {accessAction: 'add-seat', mode: 'awaiting-seat', periodAction: 'view', requiresPeriodUpdate: false},
);
assert.equal(renewalEndDateIsValid('', '2026-08-11'), true);
assert.equal(renewalEndDateIsValid('2026-08-10', '2026-08-11'), false);
assert.equal(renewalEndDateIsValid('2026-08-11', '2026-08-11'), true);
assert.equal(renewalEndDateIsValid('2026-11-11', '2026-08-11'), true);
assert.deepEqual(coachingPeriodUpdate('2026-08-11', '2026-11-11', true), {
  status: 'active',
  subscription_ends_on: '2026-11-11',
  subscription_started_on: '2026-08-11',
});

// — day strings are local, not UTC —————————————————————————————————————————
// The bug this guards: `new Date('2026-07-21')` is UTC MIDNIGHT, which is
// 2026-07-20 anywhere west of Greenwich.
//
// Compare timestamps, not `getDate()`. A `getDate()` assertion passes on this
// machine even with the bug present — in a UTC+5:30 zone, UTC midnight is still
// the 21st locally, so the whole class of bug is invisible here. Verified: the
// UTC form was substituted in and `getDate()` still said 21.
assert.equal(
  parseDay('2026-07-21').getTime(),
  new Date(2026, 6, 21).getTime(),
  'must be LOCAL midnight — `new Date(iso)` is UTC and shifts the day west of Greenwich',
);
assert.equal(parseDay('2026-07-21').getHours(), 0, 'no time-of-day offset survives parsing');
assert.equal(toDayIso(new Date(2026, 6, 1)), '2026-07-01', 'single digits pad');
assert.equal(toDayIso(parseDay('2026-07-21')), '2026-07-21', 'round-trips');

// — the CD-OV week strip: W 15 · T 16 · F 17 · S 18 · S 19 · M 20 · T 21 ————
const week = lastNDays(7, TODAY);
assert.equal(week.length, 7);
assert.equal(week[6], '2026-07-21', 'ends today');
assert.equal(week[0], '2026-07-15', 'starts 6 days back');
assert.deepEqual(week.map(weekdayInitial).join(' '), 'W T F S S M T', 'the design shows W T F S S M T for 15..21 Jul');

// — displayed date formats ——————————————————————————————————————————————
assert.equal(formatDayMonth('2026-07-17'), '17 Jul');
assert.equal(formatRowDate('2026-07-21'), 'Tue 21 Jul', 'CD-TR / CD-NU rows');
assert.equal(formatRowDate('2026-07-21', {weekday: false}), '21 Jul', 'CD-WH rows');
assert.equal(relativeDay('2026-07-18', TODAY), '3d ago', 'CD-OV "submitted 3d ago"');
assert.equal(relativeDay('2026-07-21', TODAY), 'Today');
assert.equal(relativeDay('2026-07-20', TODAY), 'Yesterday');
assert.equal(relativeDay('2026-06-30', TODAY), '30 Jun', 'beyond a week falls back to a date');
assert.equal(relativeDay(null, TODAY), null);

// — week grouping: Mon-based, so Tue 21 and Mon 20 are the same group ————————
assert.equal(startOfWeek('2026-07-21'), '2026-07-20', 'Tue -> Mon');
assert.equal(startOfWeek('2026-07-19'), '2026-07-13', 'Sun belongs to the week that started Mon');
assert.equal(weekGroupLabel('2026-07-21', TODAY), 'This week');
assert.equal(weekGroupLabel('2026-07-20', TODAY), 'This week', 'CD-TR groups Mon 20 with Tue 21');
assert.equal(weekGroupLabel('2026-07-17', TODAY), 'Last week', 'CD-TR shows Fri 17 under "Last week"');
assert.equal(weekGroupLabel('2026-07-07', TODAY), 'Week of 6 Jul');

// — durations: 49m and 1h 4m are both in CD-TR ——————————————————————————
assert.equal(formatCompactDuration('2026-07-21T09:00:00Z', '2026-07-21T09:49:00Z'), '49m');
assert.equal(formatCompactDuration('2026-07-10T09:00:00Z', '2026-07-10T10:04:00Z'), '1h 4m');
assert.equal(formatCompactDuration('2026-07-21T09:00:00Z', null), null, 'unfinished session');
assert.equal(formatCompactDuration('2026-07-21T09:00:00Z', '2026-07-21T09:00:00Z'), null, 'zero is not a duration');

// — numbers ————————————————————————————————————————————————————————
assert.equal(formatKcal(1900), '1,900', 'CD-NU "1,720 / 1,900"');
assert.equal(formatKcal(1720), '1,720');
assert.equal(formatWeight(72.4, 'kg'), '72.4 kg');
assert.equal(formatWeight(73, 'kg'), '73.0 kg', 'CD-WH keeps the trailing zero');
assert.equal(formatWeight(68, 'kg', {decimals: 0}), '68 kg', 'the goal has no decimal');

// — adherence derivation ———————————————————————————————————————————————
const sessions = [
  {date: '2026-07-21', state: 'completed'},
  {date: '2026-07-20', state: 'discarded'},
  {date: '2026-07-17', state: 'completed'},
  {date: null, state: 'completed'},
] as any;
assert.deepEqual(
  [...completedSessionDates(sessions)].sort(),
  ['2026-07-17', '2026-07-21'],
  'only completed, only dated',
);
assert.equal(completedSessionDates(undefined).size, 0);

const logs = [
  {date: '2026-07-21', food_log_entries: [{}], logged_calories: 900},
  {date: '2026-07-21', food_log_entries: [{}], logged_calories: 820},
  {date: '2026-07-20', food_log_entries: [], logged_calories: null},
  {date: '2026-07-19', food_log_entries: [{}], logged_calories: 1820},
] as any;
assert.deepEqual([...loggedMealDates(logs)].sort(), ['2026-07-19', '2026-07-21'], 'an empty log day is not logged');
// 21 Jul sums two meals to 1720 (the design's figure), 19 Jul is 1820 -> mean 1770.
assert.equal(averageLoggedCalories(logs), 1770, 'per-DAY totals are averaged, not per-meal rows');
assert.equal(averageLoggedCalories([]), null);

assert.equal(completedCheckIns([{status: 'completed'}, {status: 'assigned'}, {status: 'completed'}]), 2);
assert.equal(completedCheckIns(undefined), 0);

// — the weight trend: CD-OV shows ▼ 1.2 kg in 4 weeks ——————————————————————
const entries = [
  {date: '2026-07-21', id: 'd', unit: 'kg', value: 72.4},
  {date: '2026-06-23', id: 'a', unit: 'kg', value: 73.6},
] as any;
const trend = weightTrend(entries, 68);
assert.equal(trend?.direction, 'down');
assert.equal(trend?.magnitude, 1.2, '73.6 -> 72.4 is 1.2, not 1.2000000000000028');
assert.equal(trend?.weeks, 4, '23 Jun -> 21 Jul is 4 weeks');
assert.equal(trend?.latest.date, '2026-07-21', 'latest is by date, not array order');
assert.equal(trend?.goal, 68);
assert.equal(weightTrend([], 68), null);
assert.equal(weightTrend(entries.slice(0, 1), 68)?.direction, 'flat', 'one entry is not a trend');
assert.equal(
  weightTrend(
    [
      {date: '2026-07-01', value: 70, unit: 'kg', id: 'x'},
      {date: '2026-07-21', value: 70, unit: 'kg', id: 'y'},
    ] as never,
    null,
  )?.direction,
  'flat',
);

// — meal reconciliation: positional against planned_snapshot.items ——————————
const snapshot = {
  items: [{food_name: 'Oats & whey'}, {food_name: 'Greek yogurt'}, {food_name: 'Chicken & rice'}],
};
assert.equal(plannedMealItems(snapshot).length, 3);
assert.equal(plannedMealItems(null).length, 0, 'a missing snapshot degrades to no chips');
assert.equal(plannedMealItems({items: 'nonsense'}).length, 0);

const planned = plannedMealItems(snapshot);
assert.equal(entryStatus({food_name: 'Blueberries', planned_item_index: null}, planned), 'added');
assert.equal(entryStatus({food_name: 'Oats & whey', planned_item_index: 0}, planned), null, 'match is unremarkable');
assert.equal(entryStatus({food_name: 'Salmon', planned_item_index: 0}, planned), 'swapped');
assert.equal(
  entryStatus({food_name: 'Salmon', planned_item_index: 9}, planned),
  null,
  'an index outside the snapshot is unknown, not a swap — claiming swapped would be a guess',
);

// Entry 0 filled, entry 2 filled, so planned slot 1 (Greek yogurt) was skipped.
assert.deepEqual(
  skippedPlannedItems(snapshot, [
    {food_name: 'Oats & whey', planned_item_index: 0},
    {food_name: 'Chicken & rice', planned_item_index: 2},
    {food_name: 'Blueberries', planned_item_index: null},
  ]).map((s) => s.item.food_name),
  ['Greek yogurt'],
  'CD-ND renders a skipped planned item as its own muted row',
);
assert.equal(skippedPlannedItems(snapshot, []).length, 3, 'nothing logged means everything skipped');

// — answers: a photo answer must never render its attachment id ————————————
assert.equal(
  formatAnswer('84b8f540-f00e-4046-8d9a-a4db724463bd', 'photo'),
  'Photo attached',
  'a photo answer is an attachment id — rendering it put a raw UUID on the CD-OV card',
);
assert.equal(formatAnswer(['a', 'b'], 'photo'), '2 photos attached');
assert.equal(formatAnswer(null, 'photo'), '—');
assert.equal(formatAnswer(['Mon', 'Wed', 'Fri'], 'multi_select'), 'Mon · Wed · Fri');
assert.equal(formatAnswer(true, 'boolean'), 'Yes');
assert.equal(formatAnswer(4, 'rating'), '4');
assert.equal(formatAnswer('', 'text'), '—');

// — sparkline —————————————————————————————————————————————————————
assert.equal(sparklinePoints([], 100, 20), '');
assert.equal(sparklinePoints([5], 100, 20), '0,10 100,10', 'one point draws a flat mid-line');
assert.equal(sparklinePoints([0, 10], 100, 20), '0,20 100,0', 'lowest value sits at the BOTTOM');
assert.equal(sparklinePoints([7, 7, 7], 100, 20), '0,10 50,10 100,10', 'flat series does not divide by zero');

console.log('client-detail-data: all checks passed');
