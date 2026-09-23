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
  const coach = {token: fixture.coachToken};
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

  const date = (await api('/v1/client/me', {token})).data.local_date;
  const food = (
    await api('/v1/coach/nutrition-foods', {
      ...coach,
      method: 'POST',
      body: {
        name: 'Oats',
        calories_per_100g: 100,
        protein_g_per_100g: 10,
        carbs_g_per_100g: 15,
        fat_g_per_100g: 2,
        fiber_g_per_100g: 3,
      },
    })
  ).data;
  await api(`/v1/client/nutrition-days/${date}`, {
    token,
    method: 'PATCH',
    body: {
      slots: [
        {
          meal_slot: 'lunch',
          meal_id: null,
          expected_revision: 0,
          share: false,
          entries: [
            {
              id: crypto.randomUUID(),
              planned_item_ref: null,
              food_id: food.id,
              recipe_id: null,
              portion: {kind: 'gram', grams: 100},
              notes: null,
            },
          ],
        },
      ],
    },
  });
  await page.goto(`/nutrition/days/${date}/lunch`);
  await page.getByLabel('Note to coach', {exact: true}).fill('Is this portion enough before training?');
  await expect(page.getByText('Draft saved on this device.', {exact: false})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Note to coach', {exact: true})).toHaveValue('Is this portion enough before training?');
  await page.getByRole('button', {name: 'Share meal', exact: true}).click();
  await expect(page.getByText('Meal shared.', {exact: true})).toBeVisible();
  const history = await api('/v1/client/conversation/history', {token});
  const messages = history.data;
  expect(messages.filter((message) => message.body === 'My knee hurt during squats')).toHaveLength(1);
  expect(messages.filter((message) => message.body === 'Is this portion enough before training?')).toHaveLength(1);
  await page.goto('/messages');
  await expect(page.getByText('Is this portion enough before training?', {exact: true})).toBeVisible();
  await page.screenshot({path: 'tests/records/artifacts/record-notes-conversation-375.png', fullPage: true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  results.notes = 'Meal draft restored and sharing creates one normal message with a source reference';
} catch (error) {
  await writeFile('tests/records/artifacts/failure.txt', await page.locator('body').innerText());
  await page.screenshot({path: 'tests/records/artifacts/failure.png', fullPage: true});
  throw error;
} finally {
  await browser.close();
  await writeFile('tests/records/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(results);
