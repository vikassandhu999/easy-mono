import {randomUUID} from 'node:crypto';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const artifacts = fileURLToPath(new URL('./artifacts/', import.meta.url));
await mkdir(artifacts, {recursive: true});
await Promise.all(
  ['results.json', 'failure.txt', 'failure.png', 'failure-client.png'].map((name) =>
    rm(`${artifacts}/${name}`, {force: true}),
  ),
);
const api = await request.newContext({baseURL: process.env.API_URL ?? 'http://localhost:4000'});
const browser = process.env.PLAYWRIGHT_CDP_URL
  ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
  : await chromium.launch();
const errors = [];
const results = [];
const button = (page, name) => page.getByRole('button', {name, exact: true});
const slot = (page, round) => page.getByRole('group', {name: `Back squat set ${round}`, exact: true});
const input = (page, round, metric) => page.getByLabel(`Back squat set ${round} ${metric}`, {exact: true});

async function send(method, path, body, token) {
  const response = await api[method](path, {data: body, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function write(page, method, path, action) {
  const pending = page
    .waitForResponse((response) => {
      const pathname = new URL(response.url()).pathname;
      return (
        response.request().method() === method && (typeof path === 'string' ? pathname === path : path.test(pathname))
      );
    })
    .then(
      (response) => ({response}),
      (error) => ({error}),
    );
  await action();
  const result = await pending;
  if ('error' in result) {
    throw result.error;
  }
  expect(result.response.ok(), `${method} ${path}: ${result.response.status()} ${await result.response.text()}`).toBe(
    true,
  );
  return result.response.json();
}
async function shot(page, name) {
  await page.evaluate(async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow`).toBe(true);
  await page.screenshot({path: `${artifacts}/${name}.png`, fullPage: true});
}
async function openTrainingWeek(page, path, date) {
  await page.goto(path);
  await expect(page.getByRole('heading', {name: 'Training week', exact: true})).toBeVisible();
  const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString('en', {weekday: 'long', timeZone: 'UTC'});
  const tab = page.getByRole('tab', {name: weekday, exact: true});
  if (await tab.count()) {
    await tab.click();
  }
}
async function account(width) {
  const suffix = `${Date.now()}-${width}`;
  const email = `session-coach-${suffix}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Sam'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Sam', preferred_name: 'Sam', name: 'Session recording', handle: `ws-${suffix}`, timezone: 'Etc/UTC'},
    guest.access_token,
  );
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  const profile = (await send('get', '/v1/coach/me', undefined, tokens.access_token)).data;
  const client = (
    await send(
      'post',
      '/v1/coach/clients',
      {full_name: 'Alex', preferred_name: 'Alex', email: `session-client-${suffix}@example.test`},
      tokens.access_token,
    )
  ).data;
  return {tokens, coachId: profile.id, client};
}
async function seedWorkout(fixture) {
  const token = fixture.tokens.access_token;
  const client = (await send('get', `/v1/coach/clients/${fixture.client.id}`, undefined, token)).data;
  expect(client.current_term).not.toBeNull();
  const today = client.local_date;
  const exercise = (await send('post', '/v1/coach/exercises', {name: 'Back squat', kind: 'movement'}, token)).data;
  const workout = (
    await send(
      'post',
      `/v1/coach/clients/${client.id}/workouts`,
      {
        name: 'Coach-led session',
        groups: [
          {
            rounds: 3,
            exercises: [
              {
                exercise_id: exercise.id,
                targets: [{reps: {mode: 'exact', value: 8}, rest: {mode: 'exact', value_s: 60}}],
              },
            ],
          },
        ],
      },
      token,
    )
  ).data;
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
  const schedule = (
    await send(
      'post',
      `/v1/coach/clients/${client.id}/workout-schedules`,
      {
        workout_id: workout.id,
        weekdays_mask: 2 ** (weekday - 1),
        coach_id: fixture.coachId,
      },
      token,
    )
  ).data;
  return {...fixture, today, exercise, workout, schedule, entry: workout.groups[0].exercises[0]};
}
async function seedOlderActive(fixture, clientToken) {
  for (let index = 0; index < 20; index++) {
    const row = (
      await send(
        'post',
        '/v1/client/workout-logs',
        {id: randomUUID(), date: fixture.today, workout_id: fixture.workout.id},
        clientToken,
      )
    ).data;
    await send('post', `/v1/client/workout-logs/${row.id}/finish`, {}, clientToken);
  }
  const yesterday = new Date(Date.parse(`${fixture.today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  let log = (
    await send(
      'post',
      '/v1/client/workout-logs',
      {id: randomUUID(), date: yesterday, workout_id: fixture.workout.id},
      clientToken,
    )
  ).data;
  const activityId = randomUUID();
  await send(
    'post',
    `/v1/client/workout-logs/${log.id}/exercise-logs`,
    {id: activityId, exercise_id: fixture.exercise.id, workout_exercise_id: fixture.entry.id},
    clientToken,
  );
  await send(
    'post',
    `/v1/client/workout-logs/${log.id}/exercise-logs/${activityId}/sets`,
    {id: randomUUID(), state: 'completed', round: 1, reps: 5, weight_kg: 50},
    clientToken,
  );
  log = (
    await send(
      'post',
      `/v1/client/workout-logs/${log.id}/exercise-logs/${activityId}/sets`,
      {id: randomUUID(), state: 'skipped', round: 2},
      clientToken,
    )
  ).data;
  expect([log.state, log.recorded_by, log.recorder_name]).toEqual(['active', 'client', 'Alex']);
  return log;
}

async function journey(width) {
  let fixture = await account(width);
  const coachContext = await browser.newContext({
    baseURL: process.env.COACH_URL ?? 'http://localhost:2022',
    viewport: {width, height: width === 375 ? 812 : 900},
  });
  const clientContext = await browser.newContext({
    baseURL: process.env.CLIENT_APP_URL ?? 'http://localhost:1315',
    viewport: {width: 375, height: 812},
  });
  // Exercise the supported explicit Load more path, as the existing list suite does.
  await coachContext.addInitScript(() => {
    delete window.IntersectionObserver;
  });
  const coach = await coachContext.newPage();
  const client = await clientContext.newPage();
  for (const page of [coach, client]) {
    page.setDefaultTimeout(20000);
    page.on('pageerror', (error) => errors.push(error.message));
  }
  try {
    await client.goto(new URL(fixture.client.invite_url).pathname);
    await client.getByRole('button', {name: 'Continue with email'}).click();
    await client.getByLabel('Verification code', {exact: true}).fill('123456');
    const accepted = client.waitForResponse(
      (response) =>
        /\/v1\/auth\/invites\/[^/]+\/accept$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'POST',
    );
    await client.getByRole('button', {name: 'Verify and continue'}).click();
    const clientToken = (await (await accepted).json()).access_token;
    await expect(client.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
    fixture = await seedWorkout(fixture);
    const base = `/v1/coach/clients/${fixture.client.id}`;
    const weekPath = `/clients/${fixture.client.id}/training`;
    await coach.goto('/login');
    await coach.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, fixture.tokens);
    const activeRequests = [];
    let rejectActiveLookup = true;
    await coach.route(`**${base}/workout-logs?**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('state') === 'active') {
        activeRequests.push({state: url.searchParams.get('state'), limit: url.searchParams.get('limit')});
        if (rejectActiveLookup) {
          rejectActiveLookup = false;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({error_code: 'service_unavailable', error_message: 'Injected active lookup failure'}),
          });
          return;
        }
      }
      await route.continue();
    });
    await openTrainingWeek(coach, weekPath, fixture.today);
    await expect(coach.getByRole('heading', {name: 'Training week', exact: true})).toBeVisible();
    await expect(button(coach, 'Check active session')).toBeVisible();
    await expect(button(coach, 'Start session')).toBeEnabled();
    const startKey = await coach.evaluate(
      async ({clientId, scheduleId, date}) => {
        const {getSession} = await import('/src/api/session.ts');
        const key = `easy.workout-start.v1:${getSession().id}:${clientId}:${scheduleId}:${date}`;
        localStorage.setItem(key, '{bad');
        return key;
      },
      {clientId: fixture.client.id, scheduleId: fixture.schedule.id, date: fixture.today},
    );
    let rejectedStart;
    const startPattern = `**${base}/workout-logs`;
    await coach.route(startPattern, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      rejectedStart = route.request().postDataJSON();
      expect(await coach.evaluate((key) => localStorage.getItem(key), startKey)).toBe(rejectedStart.id);
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({error_code: 'invalid_input', error_message: 'Injected start rejection'}),
      });
    });
    await button(coach, 'Start session').click();
    await expect(coach.getByText('Injected start rejection', {exact: true})).toBeVisible();
    expect(rejectedStart.id).toBeTruthy();
    expect(await coach.evaluate((key) => localStorage.getItem(key), startKey)).toBeNull();
    await coach.evaluate((key) => {
      const original = Storage.prototype.removeItem;
      window.reviewStorageReset = () => {
        Storage.prototype.removeItem = original;
      };
      Storage.prototype.removeItem = function (name) {
        if (name === key) {
          throw new Error('Injected storage removal failure');
        }
        return original.call(this, name);
      };
    }, startKey);
    const rejectedAgain = coach.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && new URL(response.url()).pathname === `${base}/workout-logs`,
    );
    await button(coach, 'Start session').click();
    expect((await rejectedAgain).status()).toBe(422);
    await expect(button(coach, 'Start session')).toBeEnabled();
    await expect(coach.getByText('Injected start rejection', {exact: true})).toBeVisible();
    await coach.evaluate((key) => {
      window.reviewStorageReset();
      delete window.reviewStorageReset;
      localStorage.removeItem(key);
    }, startKey);
    await coach.unroute(startPattern);
    const started = await write(coach, 'POST', `${base}/workout-logs`, () => button(coach, 'Start session').click());
    expect(started.data.id).not.toBe(rejectedStart.id);
    expect(activeRequests.length).toBeGreaterThanOrEqual(2);
    expect(activeRequests.every((query) => query.state === 'active' && query.limit === '1')).toBe(true);

    const logId = started.data.id;
    expect([started.data.recorded_by, started.data.coach_id, started.data.recorder_name]).toEqual([
      'coach',
      fixture.coachId,
      'Sam',
    ]);
    await expect(coach).toHaveURL(new RegExp(`/clients/${fixture.client.id}/training/sessions/${logId}$`));
    await input(coach, 1, 'Reps').fill('8');
    await input(coach, 1, 'Weight (kg)').fill('60.5');
    await write(coach, 'POST', /\/exercise-logs\/[^/]+\/sets$/, () =>
      button(coach, 'Done set 1 of Back squat').click(),
    );
    await expect.poll(() => slot(coach, 1).evaluate((element) => element.contains(document.activeElement))).toBe(true);
    const corruptedDraftKey = await coach.evaluate((id) => {
      const key = Object.keys(localStorage).find((name) => name.includes(id));
      if (!key) {
        throw new Error('The recording draft was not kept on this device');
      }
      localStorage.setItem(key, '{bad');
      return key;
    }, logId);
    await coach.reload();
    await expect(input(coach, 1, 'Reps')).toHaveValue('8');
    await expect(input(coach, 1, 'Weight (kg)')).toHaveValue('60.5');
    expect(await coach.evaluate((key) => localStorage.getItem(key), corruptedDraftKey)).toBeNull();
    await input(coach, 2, 'Reps').fill('6');
    await input(coach, 2, 'Weight (kg)').fill('62.5');
    await write(coach, 'POST', /\/exercise-logs\/[^/]+\/sets$/, () =>
      button(coach, 'Done set 2 of Back squat').click(),
    );
    const recorded = await write(coach, 'POST', /\/exercise-logs\/[^/]+\/sets$/, () =>
      button(coach, 'Skip set 3 of Back squat').click(),
    );
    await expect.poll(() => slot(coach, 3).evaluate((element) => element.contains(document.activeElement))).toBe(true);
    expect(recorded.data.exercise_logs[0].sets.map((set) => [set.round, set.state, set.reps, set.weight_kg])).toEqual([
      [1, 'completed', 8, 60.5],
      [2, 'completed', 6, 62.5],
      [3, 'skipped', null, null],
    ]);
    await expect(slot(coach, 1)).toContainText('Done');
    await expect(slot(coach, 2)).toContainText('Done');
    await expect(slot(coach, 3)).toContainText('Skipped');
    await shot(coach, `coach-active-${width}`);

    await client.goto(`/?date=${fixture.today}`);
    await expect(client.getByText('Sam is recording this session', {exact: true})).toBeVisible();
    await client
      .getByRole('list', {name: 'Plan', exact: true})
      .getByRole('button', {name: /Coach-led session/})
      .first()
      .click();
    await expect(client.getByText('Sam is recording this session', {exact: true})).toBeVisible();
    await expect(slot(client, 1)).toContainText('Done');
    await expect(slot(client, 2)).toContainText('Done');
    await expect(slot(client, 3)).toContainText('Skipped');
    const clientView = (await send('get', `/v1/client/workout-logs/${logId}`, undefined, clientToken)).data;
    expect(clientView.exercise_logs).toEqual(recorded.data.exercise_logs);
    await shot(client, `client-same-session-${width}`);
    await button(coach, 'Finish workout').click();
    const finish = coach.getByRole('dialog', {name: 'Finish workout', exact: true});
    const finished = await write(coach, 'POST', `${base}/workout-logs/${logId}/finish`, () =>
      button(finish, 'Finish workout').click(),
    );
    expect([finished.data.state, finished.data.recorded_by, finished.data.recorder_name]).toEqual([
      'completed',
      'coach',
      'Sam',
    ]);
    await openTrainingWeek(coach, weekPath, fixture.today);
    await expect(coach.getByRole('heading', {name: 'Recent sessions', exact: true})).toBeVisible();
    let sessions = coach.getByRole('list', {name: 'sessions', exact: true});
    const coachLink = sessions.getByRole('link', {name: /Coach-led session/});
    await expect(coachLink).toContainText(/completed/i);
    await expect(coachLink).toContainText('Sam');
    await expect(button(coach, 'Open')).toBeVisible();
    await button(coach, 'Open').click();
    await expect(coach).toHaveURL(new RegExp(`/sessions/${logId}$`));
    await expect(coach.getByText(/Completed/, {exact: false}).first()).toBeVisible();
    await openTrainingWeek(coach, weekPath, fixture.today);
    await expect(coach.getByRole('heading', {name: 'Training week', exact: true})).toBeVisible();
    await expect(button(coach, 'Open')).toBeVisible();
    await expect(coach.getByRole('list', {name: 'sessions', exact: true})).toContainText('Sam');
    await shot(coach, `coach-completed-recent-${width}`);

    const older = await seedOlderActive(fixture, clientToken);
    const firstPage = await send(
      'get',
      `${base}/workout-logs?offset=0&limit=20`,
      undefined,
      fixture.tokens.access_token,
    );
    expect(firstPage.count).toBe(22);
    expect(firstPage.workout_logs).toHaveLength(20);
    expect(firstPage.workout_logs.some((row) => row.id === older.id)).toBe(false);
    await openTrainingWeek(coach, weekPath, fixture.today);
    await expect(coach.getByText('22 sessions', {exact: true})).toBeVisible();
    const activeLookup = await send(
      'get',
      `${base}/workout-logs?state=active&limit=1`,
      undefined,
      fixture.tokens.access_token,
    );
    expect(activeLookup.count).toBe(1);
    expect(activeLookup.workout_logs.map((log) => log.id)).toEqual([older.id]);
    await expect(button(coach, 'Open')).toBeVisible();

    await expect(coach.getByRole('link', {name: 'Open active session', exact: true})).toHaveAttribute(
      'href',
      `/clients/${fixture.client.id}/training/sessions/${older.id}`,
    );
    sessions = coach.getByRole('list', {name: 'sessions', exact: true});
    await expect(sessions.getByRole('link')).toHaveCount(20);
    await expect(sessions.locator(`a[href$="/${older.id}"]`)).toHaveCount(0);
    const more = button(coach, 'Load more');
    await expect(more).toBeEnabled();
    const nextPage = coach.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'GET' &&
        url.pathname === `${base}/workout-logs` &&
        url.searchParams.get('offset') === '20'
      );
    });
    await more.focus();
    await expect(more).toBeFocused();
    await coach.keyboard.press('Enter');
    const loadedPage = await nextPage;
    expect(loadedPage.ok()).toBe(true);
    expect((await loadedPage.json()).workout_logs).toHaveLength(2);
    await expect(sessions.getByRole('link')).toHaveCount(22);
    const olderLink = sessions.locator(`a[href$="/${older.id}"]`);
    await expect(olderLink).toContainText('Alex');
    await expect(olderLink).toContainText(/active|in progress/i);
    await shot(coach, `recent-paginated-${width}`);
    await olderLink.click();
    await expect(coach).toHaveURL(new RegExp(`/clients/${fixture.client.id}/training/sessions/${older.id}$`));
    await expect(coach.getByText('Alex is recording this session', {exact: true})).toBeVisible();
    await expect(slot(coach, 1)).toContainText('Done');
    await expect(slot(coach, 2)).toContainText('Skipped');
    await expect(slot(coach, 3)).toContainText('Unrecorded');
    await expect(input(coach, 3, 'Reps')).toHaveValue('');
    const persisted = (await send('get', `${base}/workout-logs/${older.id}`, undefined, fixture.tokens.access_token))
      .data;
    expect(persisted.exercise_logs[0].sets.map((set) => [set.round, set.state])).toEqual([
      [1, 'completed'],
      [2, 'skipped'],
    ]);
    await shot(coach, `client-recorded-session-${width}`);
    results.push({
      width,
      passed: true,
      clientId: fixture.client.id,
      coachLogId: logId,
      clientLogId: older.id,
      coachRecorder: true,
      sharedClientView: true,
      recentCount: 22,
      explicitPagination: true,
      olderActiveLookup: true,
      rejectedStartRecovered: true,
      uuidOnlyStartStorage: true,
      rejectedStartSurvivesStorageFailure: true,
      activeLookupRetry: true,
      unreadableDraftRecovered: true,
      completedOccurrenceOpens: true,
      doneSkippedAbsent: true,
    });
  } catch (error) {
    await writeFile(`${artifacts}/failure.txt`, await coach.locator('body').ariaSnapshot());
    await coach.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
    await client.screenshot({path: `${artifacts}/failure-client.png`, fullPage: true});
    throw error;
  } finally {
    await coachContext.close();
    await clientContext.close();
  }
}

try {
  for (const width of [1280, 375]) {
    await journey(width);
  }
  expect(errors).toEqual([]);
  await writeFile(`${artifacts}/results.json`, `${JSON.stringify({passed: true, results, errors}, null, 2)}\n`);
  console.log(
    'Coach and client session recording, recorder names, Recent sessions and pagination passed at 1280px and 375px.',
  );
} finally {
  await browser.close();
  await api.dispose();
}
