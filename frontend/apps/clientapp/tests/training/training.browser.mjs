import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const browser = await chromium.launch();
const results = [];
await mkdir('tests/training/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const exercise = (
      await api('/v1/coach/training-exercises', {
        method: 'POST',
        token: fixture.coachToken,
        body: {name: 'Back squat with a controlled pause and a deliberately long exercise name'},
      })
    ).data;
    const template = (
      await api('/v1/coach/training-plans', {
        method: 'POST',
        token: fixture.coachToken,
        body: {name: 'Steady strength'},
      })
    ).data;
    const programmed = (
      await api(`/v1/coach/training-plans/${template.id}/prescription`, {
        method: 'PUT',
        token: fixture.coachToken,
        body: {
          expected_revision: template.revision,
          workouts: [
            {
              local_ref: 'lower',
              name: 'Lower body',
              position: 0,
              prescribed_exercises: [
                {
                  local_ref: 'squat',
                  exercise_id: exercise.id,
                  position: 0,
                  prescribed_sets: [
                    {reps: '5', load_value: '80', load_unit: 'kg', rest_seconds: 90, notes: 'Stay controlled.'},
                  ],
                },
              ],
            },
          ],
          schedule: weekdays.map((weekday) => ({weekday, workout_ref: 'lower'})),
        },
      })
    ).data;
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const plan = (
      await api(`/v1/coach/clients/${fixture.clientId}/training-plans/${programmed.id}/assign`, {
        method: 'POST',
        token: fixture.coachToken,
        body: {expected_revision: programmed.revision, start_date: today},
      })
    ).data;
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width, height: 812},
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`/invite/${fixture.token}`);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Lower body', exact: true})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Resume workout', exact: true})).toHaveCount(0);
      await page.screenshot({path: `tests/training/artifacts/today-assigned-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: 'Lower body', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Start workout', exact: true})).toBeVisible();
      await page.goto('/');
      await page
        .getByRole('navigation', {name: 'Main navigation'})
        .getByRole('link', {name: 'Training', exact: true})
        .click();
      await expect(page.getByRole('link', {name: /Steady strength/})).toBeVisible();
      await page.screenshot({path: `tests/training/artifacts/plans-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: /Steady strength/}).click();
      await expect(page.getByRole('link', {name: /^Lower body/})).toBeVisible();
      await page.screenshot({path: `tests/training/artifacts/plan-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: /^Lower body/}).click();
      await expect(page.getByRole('button', {name: 'Start workout', exact: true})).toBeVisible();
      await page.screenshot({path: `tests/training/artifacts/preview-${width}.png`, fullPage: true});
      await expect(page.getByText('5 reps · 80 kg · Rest 90 sec', {exact: false})).toBeVisible();
      let starts = 0;
      await page.route('**/v1/client/training-sessions', async (route) => {
        if (route.request().method() !== 'POST') {
          return route.continue();
        }
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        starts++;
        await route.abort('connectionreset');
      });
      await page.getByRole('button', {name: 'Start workout', exact: true}).click();
      await expect(page).toHaveURL(/\/training\/sessions\//);
      const sessionId = new URL(page.url()).pathname.split('/').at(-1);
      expect(starts).toBe(1);
      await page.unroute('**/v1/client/training-sessions');
      await page.getByLabel('Reps', {exact: true}).fill('8');
      await page.getByLabel('Weight (kg)', {exact: true}).fill('85');
      await page.getByText('Units, set type & notes', {exact: true}).click();
      await page.getByLabel('Set notes', {exact: true}).fill('Only this first set.');
      await page.getByLabel('Effort (1–10)', {exact: true}).fill('7');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('Reps', {exact: true})).toHaveValue('8');
      await expect(page.getByLabel('Weight (kg)', {exact: true})).toHaveValue('85');
      const submitted = [];
      await page.route(`**/v1/client/training-sessions/${sessionId}/performed-sets`, async (route) => {
        submitted.push(route.request().postDataJSON());
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        await route.abort('connectionreset');
      });
      await page.getByRole('button', {name: 'Save set', exact: true}).click();
      await expect(page.getByText('Your set save could not be confirmed.', {exact: false})).toBeVisible();
      await expect(page.getByLabel('Reps', {exact: true})).toBeDisabled();
      await page.reload();
      await expect(page.getByRole('button', {name: 'Retry set save'})).toBeVisible();
      await page.unroute(`**/v1/client/training-sessions/${sessionId}/performed-sets`);
      await page.getByRole('button', {name: 'Retry set save'}).click();
      await expect(page.getByText('Set saved.', {exact: true})).toBeVisible();
      let saved = (
        await api(`/v1/coach/clients/${fixture.clientId}/training-sessions/${sessionId}`, {token: fixture.coachToken})
      ).data;
      expect(saved.performed_sets).toHaveLength(1);
      expect(saved.performed_sets[0].exercise_id).toBe(exercise.id);
      expect(submitted).toHaveLength(1);
      expect(submitted[0].request_id).toBeTruthy();
      await expect(page.getByLabel('Reps', {exact: true})).toHaveValue('');
      await page.getByRole('button', {name: 'Use last set', exact: true}).click();
      await expect(page.getByLabel('Reps', {exact: true})).toHaveValue('8');
      await expect(page.getByLabel('Weight (kg)', {exact: true})).toHaveValue('85');
      await expect(page.getByRole('button', {name: 'Use last set', exact: true})).toHaveCount(0);
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('Reps', {exact: true})).toHaveValue('8');
      await page.getByText('Units, set type & notes', {exact: true}).click();
      await expect(page.getByLabel('Set notes', {exact: true})).toHaveValue('');
      await expect(page.getByLabel('Effort (1–10)', {exact: true})).toHaveValue('');
      saved = (
        await api(`/v1/coach/clients/${fixture.clientId}/training-sessions/${sessionId}`, {token: fixture.coachToken})
      ).data;
      expect(saved.performed_sets).toHaveLength(1);
      await page.getByRole('button', {name: 'Save set', exact: true}).click();
      await expect(page.getByRole('list', {name: 'Saved sets'}).getByRole('listitem')).toHaveCount(2);
      await page.getByRole('button', {name: 'Edit set', exact: true}).first().click();
      await expect(page.getByLabel('Reps', {exact: true})).toHaveValue('8');
      await page.getByLabel('Reps', {exact: true}).fill('10');
      await page.getByRole('button', {name: 'Save set changes'}).click();
      await expect(
        page.getByRole('list', {name: 'Saved sets'}).getByText('10 reps · 85 kg', {exact: true}),
      ).toBeVisible();
      await page.route('**/v1/client/training-performed-sets/*', async (route) => {
        if (route.request().method() !== 'DELETE') {
          return route.continue();
        }
        const response = await route.fetch();
        expect(response.status()).toBe(204);
        await route.abort('connectionreset');
      });
      await page.getByRole('button', {name: 'Remove set', exact: true}).last().click();
      await page.getByRole('dialog').getByRole('button', {name: 'Remove saved set'}).click();
      await expect(page.getByRole('list', {name: 'Saved sets'}).getByRole('listitem')).toHaveCount(1);
      await page.unroute('**/v1/client/training-performed-sets/*');
      await page.getByText('Workout notes & soreness', {exact: true}).click();
      await page.getByLabel('Workout notes', {exact: true}).fill('Felt steady today.');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await page.reload();
      await page.getByText('Workout notes & soreness', {exact: true}).click();
      await expect(page.getByLabel('Workout notes', {exact: true})).toHaveValue('Felt steady today.');
      expect(
        await page
          .getByRole('button', {name: 'Save set', exact: true})
          .evaluate((node) => Boolean(node.closest('[inert]'))),
      ).toBe(true);
      await page.route(`**/v1/client/training-sessions/${sessionId}`, async (route) => {
        if (route.request().method() === 'PATCH') {
          return route.abort('connectionreset');
        }
        return route.continue();
      });
      await page.getByRole('button', {name: 'Save workout notes', exact: true}).click();
      await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Your notes could not be saved');
      await expect(page.getByLabel('Workout notes', {exact: true})).toHaveValue('Felt steady today.');
      await page.unroute(`**/v1/client/training-sessions/${sessionId}`);
      await page.getByRole('button', {name: 'Save workout notes', exact: true}).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText('Workout notes saved.', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Workout notes & soreness', exact: true}).click();
      await expect(page.getByLabel('Workout notes', {exact: true})).toHaveValue('Felt steady today.');
      await page.screenshot({path: `tests/training/artifacts/notes-${width}.png`});
      await page.getByRole('button', {name: 'Close', exact: true}).click();
      await page.goto('/');
      const resume = page.getByRole('link', {name: 'Resume workout', exact: true});
      await expect(resume).toBeVisible();
      await expect(resume).toHaveAttribute('href', `/training/sessions/${sessionId}`);
      expect((await resume.boundingBox()).y).toBeLessThan(400);
      await page.screenshot({path: `tests/training/artifacts/today-active-${width}.png`, fullPage: true});
      await resume.click();
      await expect(
        page.getByRole('list', {name: 'Saved sets'}).getByText('10 reps · 85 kg', {exact: true}),
      ).toBeVisible();
      await page.getByRole('button', {name: 'Workout notes & soreness', exact: true}).click();
      await expect(page.getByLabel('Workout notes', {exact: true})).toHaveValue('Felt steady today.');
      await page.getByRole('button', {name: 'Close', exact: true}).click();
      await api(`/v1/coach/training-plans/${plan.id}/prescription`, {
        method: 'PUT',
        token: fixture.coachToken,
        body: {
          expected_revision: plan.revision,
          workouts: plan.workouts.map((workout) => ({
            id: workout.id,
            name: workout.name,
            position: workout.position,
            prescribed_exercises: workout.workout_elements.map((item) => ({
              id: item.id,
              exercise_id: item.exercise_id,
              position: item.position,
              prescribed_sets: [{reps: '12', load_value: '100', load_unit: 'kg'}],
            })),
          })),
          schedule: weekdays.map((weekday) => ({weekday, workout_id: plan.workouts[0].id})),
        },
      });
      await page.reload();
      await expect(page.getByText('5 reps · 80 kg · Rest 90 sec', {exact: false})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      await expect(page.getByRole('button', {name: 'Save set', exact: true})).toBeEnabled();
      await page.screenshot({path: `tests/training/artifacts/recording-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: 'Finish workout', exact: true}).click();
      await page.getByRole('dialog').getByRole('button', {name: 'Finish and save workout'}).click();
      await expect(page.getByText('Your workout is saved.', {exact: true})).toBeVisible();
      await expect(page.getByText('Felt steady today.', {exact: true})).toBeVisible();
      await page.reload();
      saved = (
        await api(`/v1/coach/clients/${fixture.clientId}/training-sessions/${sessionId}`, {token: fixture.coachToken})
      ).data;
      expect(saved.state).toBe('completed');
      expect(saved.performed_sets).toHaveLength(1);
      expect(saved.performed_sets[0].reps).toBe('10');
      expect(saved.notes).toBe('Felt steady today.');
      expect(saved.prescription_snapshot.workout.exercises[0].sets[0].reps).toBe('5');
      await page.screenshot({path: `tests/training/artifacts/saved-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: 'Back to workout history'}).click();
      await expect(page.getByRole('link', {name: /Lower body.*Completed/})).toBeVisible();
      await page.getByRole('button', {name: 'Filter workouts'}).click();
      await page.getByLabel('Search workouts').fill('No match');
      await page.getByRole('button', {name: 'Apply filters'}).click();
      await expect(page.getByText('0 workouts', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Your plans', exact: true}).click();
      await page.getByRole('button', {name: 'Find a plan', exact: true}).click();
      await page.getByLabel('Search plans').fill('No match');
      await page.getByRole('button', {name: 'Apply filters'}).click();
      await expect(page.getByText('0 plans', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Find a plan', exact: true}).click();
      await page.getByLabel('Search plans').fill('');
      await page.getByRole('button', {name: 'Apply filters'}).click();
      await expect(page.getByText('1 plan', {exact: true})).toBeVisible();
      await page.goto('/no-such-client-screen');
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Resume workout', exact: true})).toHaveCount(0);
      await page.screenshot({path: `tests/training/artifacts/today-completed-${width}.png`, fullPage: true});
      expect(errors).toEqual([]);
      results.push({
        width,
        passed: true,
        planned: true,
        todayAssignedAndResume: true,
        unknownRouteReturn: true,
        lostStartResponse: true,
        lostSetResponse: true,
        frozenPrescription: true,
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/training/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
