import {workbenchCount} from './workbench-counts.ts';

const counts = {
  check_ins: 2,
  expiring: 3,
  onboarding: 4,
  programming: {all: 5, nutrition: 2, training: 4},
  quiet: 6,
  replies: 7,
};

if (workbenchCount(counts, 'programming') !== 5) {
  throw new Error('the Programming queue must render its distinct-client All count');
}

if (workbenchCount(counts, 'onboarding') !== 4) {
  throw new Error('scalar workbench counts must pass through unchanged');
}

console.log('workbench-counts: all checks passed');
