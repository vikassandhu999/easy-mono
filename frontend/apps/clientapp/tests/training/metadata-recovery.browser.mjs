import {chromium, expect} from '@playwright/test';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315'});
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const {trainingSaveMatches} = await import('/src/api/training.ts');
    const input = {
      kind: 'save',
      body: {date: '2026-09-21', notes: 'Correction: exercise hurt.', soreness_rating: 3, expected_revision: 4},
    };
    const saved = {
      date: '2026-09-21',
      notes: 'Correction: exercise hurt.',
      soreness_rating: 3,
      revision: 5,
      state: 'completed',
    };
    return {
      exactCorrection: trainingSaveMatches(input, saved, 'completed'),
      laterRevision: trainingSaveMatches(input, {...saved, revision: 6}, 'completed'),
      differentDate: trainingSaveMatches(input, {...saved, date: '2026-09-22'}, 'completed'),
      differentNote: trainingSaveMatches(input, {...saved, notes: 'Changed on another device'}, 'completed'),
      differentSoreness: trainingSaveMatches(input, {...saved, soreness_rating: null}, 'completed'),
      changedState: trainingSaveMatches(input, {...saved, state: 'discarded'}, 'completed'),
      neverAccepted: trainingSaveMatches(input, {...saved, revision: 4}, 'completed'),
      completion: trainingSaveMatches({...input, kind: 'complete'}, saved, 'active'),
      unfinishedCompletion: trainingSaveMatches({...input, kind: 'complete'}, {...saved, state: 'active'}, 'active'),
      clearedNote: trainingSaveMatches(
        {...input, body: {...input.body, notes: ''}},
        {...saved, notes: null},
        'completed',
      ),
      missingCorrectionRevision: trainingSaveMatches({kind: 'save', body: {notes: saved.notes}}, saved, 'completed'),
    };
  });
  expect(results).toEqual({
    exactCorrection: true,
    laterRevision: false,
    differentDate: false,
    differentNote: false,
    differentSoreness: false,
    changedState: false,
    neverAccepted: false,
    completion: true,
    unfinishedCompletion: false,
    clearedNote: true,
    missingCorrectionRevision: false,
  });
  console.log('Workout metadata recovery accepts only the exact next saved revision and intended state.');
} finally {
  await browser.close();
}
