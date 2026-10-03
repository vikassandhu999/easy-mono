import {writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

// Retained deliberately for manual testing; this creates a separate coaching business.
const fixture = await inviteClient({fullName: 'Sam'});
const coach = {token: fixture.coachToken};
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await page.goto(`http://localhost:1315/invite/${fixture.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  const today = (await api('/v1/client/me', {token})).data.local_date;
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const exercises = [];
  for (const name of ['Goblet squat', 'Dumbbell row', 'Romanian deadlift']) {
    exercises.push((await api('/v1/coach/training-exercises', {...coach, method: 'POST', body: {name}})).data);
  }
  let plan = (await api('/v1/coach/training-plans', {...coach, method: 'POST', body: {name: 'Feel stronger'}})).data;
  plan = (
    await api(`/v1/coach/training-plans/${plan.id}/prescription`, {
      ...coach,
      method: 'PUT',
      body: {
        expected_revision: plan.revision,
        workouts: [
          {
            local_ref: 'full-body',
            name: 'Full-body flow',
            position: 0,
            prescribed_exercises: exercises.map((exercise, position) => ({
              local_ref: `exercise-${position}`,
              exercise_id: exercise.id,
              position,
              prescribed_sets: [
                {
                  reps: '10',
                  load_value: '12',
                  load_unit: 'kg',
                  rest_seconds: 60,
                  notes: 'Find a comfortable, controlled pace.',
                },
              ],
            })),
          },
        ],
        schedule: weekdays.map((weekday) => ({weekday, workout_ref: 'full-body'})),
      },
    })
  ).data;
  await api(`/v1/coach/clients/${fixture.clientId}/training-plans/${plan.id}/assign`, {
    ...coach,
    method: 'POST',
    body: {expected_revision: plan.revision, start_date: today},
  });
  const foods = [];
  for (const [name, calories] of [
    ['Greek yogurt', 80],
    ['Rolled oats', 370],
    ['Mixed berries', 60],
  ]) {
    foods.push(
      (await api('/v1/coach/nutrition-foods', {...coach, method: 'POST', body: {name, calories_per_100g: calories}}))
        .data,
    );
  }
  let nutrition = (
    await api('/v1/coach/nutrition-plans', {...coach, method: 'POST', body: {name: 'Everyday nourishment'}})
  ).data;
  const meal = crypto.randomUUID();
  const pattern = crypto.randomUUID();
  nutrition = (
    await api(`/v1/coach/nutrition-plans/${nutrition.id}/menu`, {
      ...coach,
      method: 'PUT',
      body: {
        expected_revision: nutrition.revision,
        menu: {
          meals: [
            {
              id: meal,
              name: 'Berry breakfast bowl',
              meal_items: foods.map((food) => ({
                id: crypto.randomUUID(),
                kind: 'food',
                food_id: food.id,
                portion: {kind: 'gram', grams: 100},
              })),
            },
          ],
          day_patterns: [{id: pattern, name: 'Everyday', slots: [{meal_slot: 'breakfast', meal_ids: [meal]}]}],
          schedule: Object.fromEntries(weekdays.map((weekday) => [weekday, pattern])),
        },
      },
    })
  ).data;
  await api(`/v1/coach/clients/${fixture.clientId}/nutrition-plans/${nutrition.id}/assign`, {
    ...coach,
    method: 'POST',
    body: {expected_revision: nutrition.revision, start_date: today},
  });
  const conversation = (await api('/v1/client/conversation', {token})).data;
  await api(`/v1/coach/conversations/${conversation.id}/messages`, {
    ...coach,
    method: 'POST',
    body: {
      body: 'Hey Sam! Your workout and breakfast plan are ready. Take things at your pace, and message me whenever you need a hand.',
    },
  });
  await page.reload();
  await expect(page.getByRole('link', {name: 'Full-body flow', exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'Nutrition', exact: true}).click();
  await expect(page.getByRole('link', {name: /Breakfast/})).toBeVisible();
  await page.getByRole('link', {name: 'Your account', exact: true}).click();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await page.getByLabel('Email', {exact: true}).fill(fixture.email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Your account', exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'Today', exact: true}).click();
  await expect(page.getByRole('link', {name: 'Full-body flow', exact: true})).toBeVisible();
  const preview = {
    url: 'http://localhost:1315',
    email: fixture.email,
    code: '123456',
    created: today,
    clientId: fixture.clientId,
  };
  await writeFile('../../../.scratch/clientapp-rebuild/preview.json', JSON.stringify(preview, null, 2));
  console.log(JSON.stringify(preview));
} finally {
  await browser.close();
}
