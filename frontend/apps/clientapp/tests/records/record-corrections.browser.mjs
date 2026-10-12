import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const context = await browser.newContext({baseURL: 'http://localhost:1315', viewport: {width: 375, height: 812}});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await mkdir('tests/records/artifacts', {recursive: true});
const results = {};
try {
  const fixture = await inviteClient();
  await page.goto(`/invite/${fixture.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  const session = (
    await api('/v1/client/training-sessions', {token, method: 'POST', body: {training_workout_id: null}})
  ).data;
  const set = (
    await api(`/v1/client/training-sessions/${session.id}/performed-sets`, {
      token,
      method: 'POST',
      body: {request_id: crypto.randomUUID(), exercise_name: 'Squat', reps: '8'},
    })
  ).data;
  const closed = (
    await api(`/v1/client/training-sessions/${session.id}/complete`, {
      token,
      method: 'POST',
      body: {notes: 'My knee hurt during squats'},
    })
  ).data;
  await page.goto(`/training/sessions/${session.id}`);
  await page.getByRole('button', {name: 'Correct this workout', exact: true}).click();
  await page.getByRole('button', {name: 'Edit set', exact: true}).click();
  await page.getByLabel('Reps', {exact: true}).fill('10');
  await page.getByRole('button', {name: 'Save set changes', exact: true}).click();
  await expect(page.getByText('10 reps', {exact: false})).toBeVisible();
  const workout = (await api(`/v1/client/training-sessions/${session.id}`, {token})).data;
  expect(workout.state).toBe('completed');
  expect(workout.closed_at).toBe(closed.closed_at);
  expect(workout.performed_sets[0].id).toBe(set.id);
  expect(workout.performed_sets[0].reps).toBe('10');
  const recordedOn = new Date(`${workout.date}T12:00:00Z`);
  recordedOn.setUTCDate(recordedOn.getUTCDate() - 3);
  const occurredOn = recordedOn.toISOString().slice(0, 10);
  await page.getByRole('button', {name: 'Workout date & note to coach', exact: true}).click();
  await page.getByLabel('Workout date', {exact: true}).fill(occurredOn);
  await page.getByRole('button', {name: 'Save corrections and share note', exact: true}).click();
  await expect(page.getByText('Corrections shared.', {exact: true})).toBeVisible();
  await page.reload();
  const lateWorkout = (await api(`/v1/client/training-sessions/${session.id}`, {token})).data;
  expect(lateWorkout.date).toBe(occurredOn);
  expect(lateWorkout.closed_at).toBe(closed.closed_at);
  expect(lateWorkout.prescription_snapshot).toEqual(closed.prescription_snapshot);
  await page.screenshot({path: 'tests/records/artifacts/workout-correction-375.png', fullPage: true});
  results.workout = 'Completed set and occurrence date corrected; identity, prescription and sharing time preserved';

  const history = await api('/v1/client/conversation/history', {token});
  expect(history.data.filter((message) => message.body === 'My knee hurt during squats')).toHaveLength(1);
  await page.goto('/messages');
  await expect(page.getByText('My knee hurt during squats', {exact: true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  results.notes = 'Workout correction creates one message with a source reference';
} catch (error) {
  await writeFile('tests/records/artifacts/failure.txt', await page.locator('body').innerText());
  await page.screenshot({path: 'tests/records/artifacts/failure.png', fullPage: true});
  throw error;
} finally {
  await browser.close();
  await writeFile('tests/records/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(results);
