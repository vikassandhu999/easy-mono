import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/today/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width, height: 812},
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      let release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      let fail = true;
      await page.route('**/v1/client/training-plans/coverage', async (route) => {
        await held;
        return fail ? route.fulfill({status: 503, json: {error_message: 'Temporary test outage'}}) : route.continue();
      });
      await page.goto(`/invite/${fixture.token}`);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByText("Loading today's training…", {exact: true})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Move at your pace', exact: true})).toHaveCount(0);
      await page.screenshot({path: `tests/today/artifacts/loading-${width}.png`, fullPage: true});
      release();
      await expect(page.getByRole('alert')).toContainText("We couldn't load today's training.");
      await expect(page.getByRole('link', {name: 'Move at your pace', exact: true})).toHaveCount(0);
      await page.screenshot({path: `tests/today/artifacts/error-${width}.png`, fullPage: true});
      fail = false;
      await page.getByRole('button', {name: 'Try again', exact: true}).click();
      await expect(
        page.getByText('Your coach hasn’t scheduled a plan for today. You can still record your own workout.', {
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({path: `tests/today/artifacts/no-plan-${width}.png`, fullPage: true});
      await page.goto('/training?search=Old%20filter');
      await expect(
        page.getByText('Your coach hasn’t scheduled a training plan for today.', {exact: true}),
      ).toBeVisible();
      await expect(page.getByRole('button', {name: 'Find a plan'})).toHaveCount(0);
      await page.goto('/nutrition/plans');
      await expect(
        page.getByText('Your coach hasn’t scheduled a nutrition plan for today. You can still record your meals.', {
          exact: true,
        }),
      ).toBeVisible();
      await page.getByRole('link', {name: 'Back', exact: true}).click();
      await expect(page).toHaveURL(/\/nutrition$/);
      await page.goto('/');
      const token = await page.evaluate(
        () => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token,
      );
      const today = (await api('/v1/client/me', {token})).data.local_date;
      const coach = {token: fixture.coachToken};
      const exercise = (
        await api('/v1/coach/training-exercises', {...coach, method: 'POST', body: {name: 'Gentle squat'}})
      ).data;
      let plan = (await api('/v1/coach/training-plans', {...coach, method: 'POST', body: {name: 'A little movement'}}))
        .data;
      plan = (
        await api(`/v1/coach/training-plans/${plan.id}/prescription`, {
          ...coach,
          method: 'PUT',
          body: {
            expected_revision: plan.revision,
            workouts: [
              {
                local_ref: 'gentle',
                name: 'Gentle strength',
                position: 0,
                prescribed_exercises: [
                  {local_ref: 'squat', exercise_id: exercise.id, position: 0, prescribed_sets: [{reps: '5'}]},
                ],
              },
            ],
            schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((weekday) => ({
              weekday,
            })),
          },
        })
      ).data;
      await api(`/v1/coach/clients/${fixture.clientId}/training-plans/${plan.id}/assign`, {
        ...coach,
        method: 'POST',
        body: {expected_revision: plan.revision, start_date: today},
      });
      await page.reload();
      await expect(page.getByText('A rest day. Recharge or choose a workout.', {exact: true})).toBeVisible();
      await page.screenshot({path: `tests/today/artifacts/rest-${width}.png`, fullPage: true});
      fail = true;
      await page.reload();
      await expect(page.getByRole('alert')).toContainText('The latest version could not be checked.');
      await expect(page.getByText('A rest day. Recharge or choose a workout.', {exact: true})).toBeVisible();
      await page.screenshot({path: `tests/today/artifacts/cached-error-${width}.png`, fullPage: true});
      fail = false;
      await page.getByRole('button', {name: 'Check for updates', exact: true}).click();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await page.getByRole('link', {name: 'Move at your pace', exact: true}).click();
      await expect(page).toHaveURL(/\/training$/);
      await expect(page.getByRole('heading', {name: 'A little movement', exact: true})).toBeVisible();
      await expect(
        page.getByText('Today is a rest day. Your workouts are here when you need them.', {exact: true}),
      ).toBeVisible();
      await expect(page.getByRole('button', {name: 'Find a plan'})).toHaveCount(0);
      expect(errors).toEqual([]);
      results.push({
        width,
        loadingErrorRetry: true,
        missingPlan: true,
        restDay: true,
        cachedFailureRetry: true,
        passed: true,
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/today/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
