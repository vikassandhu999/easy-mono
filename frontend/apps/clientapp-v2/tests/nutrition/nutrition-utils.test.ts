import {dateLabel} from '../../src/nutrition/nutrition-utils.ts';

const assert: (ok: unknown, message: string) => asserts ok = (ok, message) => {
  if (!ok) {
    throw new Error(message);
  }
};

assert(dateLabel('2026-04-03', '2026-04-03').startsWith('Today'), 'today names itself');
assert(dateLabel('2026-04-03', '2026-04-03').includes('Fri'), 'today still shows its weekday');
assert(!dateLabel('2026-04-02', '2026-04-03').startsWith('Today'), 'another day does not');
assert(dateLabel('2026-04-02', '2026-04-03').startsWith('Thu'), 'another day leads with its weekday');
assert(dateLabel('2026-04-02', '2026-04-03').includes('Apr 2'), 'another day carries day and month');

console.log('nutrition-utils checks passed');
