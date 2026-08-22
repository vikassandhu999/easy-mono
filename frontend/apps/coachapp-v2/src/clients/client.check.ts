import {EXTEND_PRESETS, formatPeriodValue, isUnclassified, needsRequiredPlan, periodSummary} from './client.ts';

const assert = (ok: unknown, message: string) => {
  if (!ok) {
    throw new Error(message);
  }
};

// --- periodSummary: one line per way the coaching period can be set ---
assert(
  periodSummary({subscription_ends_on: null, subscription_started_on: null}) === 'No coaching period set',
  'neither date set',
);
assert(
  periodSummary({subscription_ends_on: null, subscription_started_on: '2026-03-01'}).startsWith('Started '),
  'a start with no end reads as ongoing',
);
assert(
  periodSummary({subscription_ends_on: null, subscription_started_on: '2026-03-01'}).endsWith('Ongoing'),
  'a start with no end reads as ongoing',
);
assert(
  periodSummary({subscription_ends_on: '2026-06-01', subscription_started_on: null}).startsWith('Ends '),
  'an end with no start reads as an end date',
);
assert(
  periodSummary({subscription_ends_on: '2026-06-01', subscription_started_on: '2026-03-01'}).includes('→'),
  'both dates read as a range',
);

// --- formatPeriodValue ---
assert(formatPeriodValue('') === 'not set', 'an empty date reads as "not set"');
assert(formatPeriodValue('2026-03-01') !== 'not set', 'a real date is formatted');

// --- EXTEND_PRESETS ---
assert(EXTEND_PRESETS.length === 3, 'three quick-extend presets');
assert(
  EXTEND_PRESETS.every((preset) => preset.label.startsWith('+')),
  'every preset label reads as an addition',
);

// --- isUnclassified: active with nothing chosen, not merely missing a plan ---
assert(isUnclassified({required_services: [], status: 'active'}), 'active with no services is unclassified');
assert(!isUnclassified({required_services: ['training'], status: 'active'}), 'a chosen service is classified');
assert(!isUnclassified({required_services: [], status: 'pending'}), 'only active clients can be unclassified');

// --- needsRequiredPlan ---
assert(
  needsRequiredPlan({nutrition_plan_name: null, required_services: ['training'], training_plan_name: null}),
  'a required service with no plan needs one',
);
assert(
  !needsRequiredPlan({nutrition_plan_name: null, required_services: ['training'], training_plan_name: 'Push/Pull'}),
  'a required service with a plan does not',
);
assert(
  !needsRequiredPlan({nutrition_plan_name: null, required_services: [], training_plan_name: null}),
  'no required services means nothing is missing',
);

console.log('client checks passed');
