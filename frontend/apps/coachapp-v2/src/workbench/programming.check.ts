import {
  assignPlanHref,
  filterProgrammingReasons,
  groupProgrammingItems,
  programmingGroupDescription,
  programmingPriorityRank,
} from './programming.ts';

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

function assertTrue(value: boolean, label: string) {
  if (!value) {
    throw new Error(label);
  }
}

const neverTraining = {code: 'service_never_programmed' as const, service: 'training' as const};
const missingNutrition = {
  code: 'service_coverage_missing' as const,
  first_uncovered_on: '2026-08-11',
  service: 'nutrition' as const,
};
const endingTraining = {
  code: 'service_coverage_ending_soon' as const,
  coverage_ends_on: '2026-08-16',
  first_uncovered_on: '2026-08-17',
  service: 'training' as const,
};

assertEqual(
  filterProgrammingReasons([neverTraining, missingNutrition], 'all'),
  [neverTraining, missingNutrition],
  'all filter',
);
assertEqual(
  filterProgrammingReasons([neverTraining, missingNutrition], 'training'),
  [neverTraining],
  'training filter',
);
assertEqual(
  filterProgrammingReasons([neverTraining, missingNutrition], 'nutrition'),
  [missingNutrition],
  'nutrition filter',
);

assertTrue(programmingPriorityRank(neverTraining) === 0, 'never rank');
assertTrue(programmingPriorityRank(missingNutrition) === 1, 'missing rank');
assertTrue(programmingPriorityRank(endingTraining) === 2, 'ending rank');

assertEqual(programmingGroupDescription('never_programmed'), 'Initial plans first', 'never group description');
assertEqual(programmingGroupDescription('coverage_lapsed'), 'Coverage is already broken', 'lapsed group description');
assertEqual(programmingGroupDescription('ending_soon'), 'Prepare the successor plan', 'ending group description');

assertTrue(assignPlanHref('client-1', 'training') === '/clients/client-1?tab=training&assign=plan', 'training href');
assertTrue(assignPlanHref('client-2', 'nutrition') === '/clients/client-2?tab=nutrition&assign=plan', 'nutrition href');

const items = [
  {client: {id: 'a'}, reasons: [endingTraining]},
  {client: {id: 'b'}, reasons: [neverTraining, missingNutrition]},
  {client: {id: 'c'}, reasons: [missingNutrition]},
  {client: {id: 'd'}, reasons: [neverTraining]},
];

assertEqual(
  groupProgrammingItems(items, 'all').map((group) => ({
    id: group.id,
    ids: group.items.map((item) => item.client.id),
    label: group.label,
  })),
  [
    {id: 'never_programmed', ids: ['b', 'd'], label: 'Never programmed'},
    {id: 'coverage_lapsed', ids: ['c'], label: 'Coverage lapsed'},
    {id: 'ending_soon', ids: ['a'], label: 'Ending soon'},
  ],
  'grouped all',
);

assertEqual(
  groupProgrammingItems(items, 'nutrition').map((group) => ({
    id: group.id,
    ids: group.items.map((item) => item.client.id),
  })),
  [{id: 'coverage_lapsed', ids: ['b', 'c']}],
  'grouped nutrition',
);

console.log('workbench-programming: all checks passed');
