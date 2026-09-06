import {adherenceBand, caloriePct, nutritionDayTotals} from '../../src/clients/client-nutrition-summary.ts';

const totals = nutritionDayTotals({
  summary: {
    adherence: 'on',
    counts: {added: 1, as_planned: 2, pending: 0, recorded: 0, skipped: 3, swapped: 4},
    has_intake: true,
    logged: {calories: 1720},
  },
  targets: {calories: 1900},
});

if (totals.added !== 1 || totals.skipped !== 3 || totals.swapped !== 4 || totals.logged !== 1720) {
  throw new Error('coach summary totals must preserve Nutrition Day counts and calories');
}
if (caloriePct(totals) !== 91 || adherenceBand(totals) !== 'success') {
  throw new Error('on-target coach summaries must calculate their percentage and success band');
}
if (caloriePct({...totals, adherence: 'none'}) !== null || adherenceBand({...totals, adherence: 'none'}) !== null) {
  throw new Error('unknown adherence must not invent a percentage or band');
}
if (adherenceBand({...totals, adherence: 'under'}) !== 'warning') {
  throw new Error('under-target adherence must use the warning band');
}
if (adherenceBand({...totals, adherence: 'over'}) !== 'danger') {
  throw new Error('over-target adherence must use the danger band');
}

console.log('coach nutrition-summary checks passed');
