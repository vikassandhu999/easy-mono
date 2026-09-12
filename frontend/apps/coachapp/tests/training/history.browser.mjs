import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/training/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `history-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `history-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
function dateAfter(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
async function signIn(page, tokens) {
  await page.goto('/login');
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const email = `history-client-${unique}@example.test`;
    const person = (
      await send('post', '/v1/coach/clients/invite', {first_name: 'Alex', last_name: 'Morgan', email}, token)
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
    const clientToken = clientTokens.access_token;
    const endpoint = `/v1/coach/clients/${person.id}/training-sessions`;
    const path = `/clients/${person.id}/training-sessions`;
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, tokens);
    await page.goto(`/clients/${person.id}`);
    await page.route(`**${endpoint}?*`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('link', {name: 'View training history', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}?*`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'No training sessions yet', exact: true})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Clients', exact: true})).toHaveClass(/active/);
    const exercise = (await send('post', '/v1/coach/training-exercises', {name: 'Goblet squat'}, token)).data;
    const prescription = {
      workouts: [
        {
          local_ref: 'full-body',
          name: 'Full body A',
          position: 0,
          prescribed_exercises: [
            {
              local_ref: 'squat',
              exercise_id: exercise.id,
              position: 0,
              prescribed_sets: [
                {set_type: 'warmup', reps: '8', load_value: '0', load_unit: 'kg', rest_seconds: 0},
                {
                  set_type: 'working',
                  reps: '8–10',
                  load_value: '12.5',
                  load_unit: 'kg',
                  rpe: 7,
                  rest_seconds: 90,
                  notes: 'Keep the movement controlled.',
                },
              ],
            },
          ],
        },
      ],
      schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((weekday) => ({
        weekday,
        ...(weekday === 'monday' ? {workout_ref: 'full-body'} : {}),
      })),
    };
    let template = (await send('post', '/v1/coach/training-plans', {name: 'Build consistency'}, token)).data;
    template = (
      await send(
        'put',
        `/v1/coach/training-plans/${template.id}/prescription`,
        {expected_revision: template.revision, ...prescription},
        token,
      )
    ).data;
    const assigned = (
      await send(
        'post',
        `/v1/coach/clients/${person.id}/training-plans/${template.id}/assign`,
        {expected_revision: template.revision, start_date: dateAfter(0)},
        token,
      )
    ).data;
    const session = (
      await send(
        'post',
        '/v1/client/training-sessions',
        {
          training_workout_id: assigned.workouts[0].id,
          soreness_rating: 2,
          notes: 'Felt stronger today. Left knee was comfortable.',
        },
        clientToken,
      )
    ).data;
    const ref = session.prescription_snapshot.workout.exercises[0].ref;
    const setPath = `/v1/client/training-sessions/${session.id}/performed-sets`;
    await send(
      'post',
      setPath,
      {
        exercise_id: exercise.id,
        snapshot_exercise_ref: ref,
        set_type: 'warmup',
        reps: '8',
        load_value: 0,
        load_unit: 'kg',
      },
      clientToken,
    );
    await send(
      'post',
      setPath,
      {
        exercise_id: exercise.id,
        snapshot_exercise_ref: ref,
        set_type: 'working',
        reps: '10',
        load_value: 12.5,
        load_unit: 'kg',
        rpe: 7,
        notes: 'Smooth reps; ready to increase next time.',
      },
      clientToken,
    );
    await send(
      'post',
      setPath,
      {exercise_name: 'Push-up', set_type: 'dropset', reps: '12', load_unit: 'bodyweight'},
      clientToken,
    );
    await send(
      'post',
      setPath,
      {exercise_name: 'Recovery walk', duration_seconds: 900, distance_value: 1.2, distance_unit: 'km'},
      clientToken,
    );
    await send('post', `/v1/client/training-sessions/${session.id}/complete`, {}, clientToken);
    await page.getByRole('button', {name: 'Refresh training sessions', exact: true}).click();
    const rows = page.getByRole('list', {name: 'training sessions', exact: true}).locator(':scope > li');
    await expect(rows).toHaveCount(1);
    const detailEndpoint = `${endpoint}/${session.id}`;
    await page.route(`**${detailEndpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await rows.first().getByRole('link').click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${detailEndpoint}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Full body A', exact: true})).toBeVisible();
    const work = page.getByRole('region', {name: 'Recorded work', exact: true});
    await expect(work.getByText('8 reps · 0 kg', {exact: true})).toBeVisible();
    await expect(work.getByText('10 reps · 12.5 kg · RPE 7', {exact: true})).toBeVisible();
    await expect(work.getByText('12 reps · Bodyweight', {exact: true})).toBeVisible();
    await expect(work.getByText('900 sec · 1.2 km', {exact: true})).toBeVisible();
    await expect(page.getByText('Smooth reps; ready to increase next time.', {exact: true})).toBeVisible();
    await expect(page.getByText('2 / 5', {exact: true})).toBeVisible();
    await page.getByText('View original prescription', {exact: true}).click();
    await expect(page.getByText('8–10 reps · 12.5 kg · RPE 7', {exact: true})).toBeVisible();
    await expect(page.getByText('Working · Rest 90 sec', {exact: true})).toBeVisible();
    await expect(page.getByText('Warm-up · Rest 0 sec', {exact: true})).toBeVisible();
    // Library and plan edits must not rewrite the recorded exercise or prescription.
    await send('patch', `/v1/coach/training-exercises/${exercise.id}`, {name: 'Renamed library exercise'}, token);
    const changed = structuredClone(prescription);
    changed.workouts[0].name = 'Changed workout';
    changed.workouts[0].prescribed_exercises[0].prescribed_sets[1].load_value = '25';
    await send(
      'put',
      `/v1/coach/training-plans/${assigned.id}/prescription`,
      {expected_revision: assigned.revision, ...changed},
      token,
    );
    await page.reload();
    await expect(page.getByRole('heading', {name: 'Full body A', exact: true})).toBeVisible();
    await expect(work.getByRole('heading', {name: 'Goblet squat', exact: true})).toHaveCount(2);
    await expect(page.getByText('Renamed library exercise', {exact: true})).toHaveCount(0);
    await page.getByText('View original prescription', {exact: true}).click();
    await expect(page.getByText('8–10 reps · 12.5 kg · RPE 7', {exact: true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({path: `tests/training/artifacts/history-session-${width}.png`, fullPage: true});
    await page.route(`**${detailEndpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Refresh session', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(work.getByText('900 sec · 1.2 km', {exact: true})).toBeVisible();
    await page.unroute(`**${detailEndpoint}`);
    await page.getByRole('button', {name: 'Refresh session', exact: true}).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    for (let index = 0; index < 43; index++) {
      const saved = (await send('post', '/v1/client/training-sessions', {}, clientToken)).data;
      await send('post', `/v1/client/training-sessions/${saved.id}/complete`, {}, clientToken);
    }
    const discarded = (await send('post', '/v1/client/training-sessions', {}, clientToken)).data;
    await send('post', `/v1/client/training-sessions/${discarded.id}/discard`, {}, clientToken);
    const active = (await send('post', '/v1/client/training-sessions', {}, clientToken)).data;
    await page.getByRole('link', {name: 'Back to training history', exact: true}).click();
    await page.getByRole('button', {name: 'Refresh training sessions', exact: true}).click();
    await expect(rows).toHaveCount(20);
    const total = (await send('get', `${endpoint}?cursor=start`, undefined, token)).count;
    await expect(page.getByText(`${total} training sessions`, {exact: true})).toBeVisible();
    await page.route(`**${endpoint}?*`, (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute(`**${endpoint}?*`);
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await rows.nth(30).scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await rows.nth(30).getByRole('link').click();
    await expect(page.getByRole('heading', {name: 'Freestyle session', level: 1, exact: true})).toBeVisible();
    await expect(page.getByText('No sets recorded', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to training history', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(total);
    await page.getByLabel('Search sessions', {exact: true}).fill('Full body A');
    await expect(rows).toHaveCount(1);
    await page.getByLabel('From date', {exact: true}).fill(dateAfter(1));
    await page.getByLabel('To date', {exact: true}).fill(dateAfter(0));
    await page.getByRole('button', {name: 'Apply dates', exact: true}).click();
    await expect(page.getByText('End date must be on or after start date.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('To date', {exact: true})).toBeFocused();
    await page.getByLabel('From date', {exact: true}).fill(dateAfter(0));
    await page.getByRole('button', {name: 'Apply dates', exact: true}).click();
    await expect(rows).toHaveCount(1);
    await page.reload();
    await expect(page.getByLabel('Search sessions', {exact: true})).toHaveValue('Full body A');
    await expect(page.getByLabel('From date', {exact: true})).toHaveValue(dateAfter(0));
    await expect(rows).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/training/artifacts/history-list-${width}.png`, fullPage: true});
    await chooseOption(selectTrigger(page, 'Show'), 'Discarded');
    await expect(page.getByRole('heading', {name: 'No matching sessions', exact: true})).toBeVisible();
    await page.getByLabel('Search sessions', {exact: true}).fill('');
    await expect(rows).toHaveCount(1);
    await rows.first().getByRole('link').click();
    await expect(page.getByText('Your client discarded this session.', {exact: false})).toBeVisible();
    await page.getByRole('link', {name: 'Back to training history', exact: true}).click();
    await chooseOption(selectTrigger(page, 'Show'), 'In progress');
    await expect(rows).toHaveCount(1);
    await rows.first().getByRole('link').click();
    await expect(page.getByText('Your client is still recording this session.', {exact: false})).toBeVisible();
    await send(
      'post',
      `/v1/client/training-sessions/${active.id}/performed-sets`,
      {exercise_name: 'Loaded carry', load_value: 20, load_unit: 'lbs', distance_value: 50, distance_unit: 'meters'},
      clientToken,
    );
    await page.getByRole('button', {name: 'Refresh session', exact: true}).click();
    await expect(work.getByText('20 lbs · 50 meters', {exact: true})).toBeVisible();
    await page.goto(`/clients/${person.id}/training-sessions/${crypto.randomUUID()}`);
    await expect(page.getByRole('heading', {name: 'Session not found', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Return to training history', exact: true}).click();
    await page
      .getByRole('button', {name: 'Clear dates', exact: true})
      .count()
      .then(async (count) => {
        if (count) {
          await page.getByRole('button', {name: 'Clear dates', exact: true}).click();
        }
      });
    if (width === 375) {
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${detailEndpoint}`, async (route) => {
        const response = await route.fetch();
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await page.goto(`${path}/${session.id}`);
      await held.promise;
      const other = await account(`other-${unique}`);
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, other);
      release.resolve();
      await page.getByRole('link', {name: 'Clients', exact: true}).click();
      await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(
        await page.evaluate(async (id) => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient
            .getQueryCache()
            .getAll()
            .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
        }, session.id),
      ).toBe(false);
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Training history, frozen prescriptions, recorded units, date filters, pagination and recovery passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
