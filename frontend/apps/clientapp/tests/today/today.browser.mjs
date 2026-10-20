import {execFileSync} from 'node:child_process';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const artifacts = `${repo}/frontend/apps/clientapp/tests/today/artifacts`;
await mkdir(artifacts, {recursive: true});
await Promise.all(
  ['failure.txt', 'failure.png', 'workout-writes.json', 'results.json'].map((name) =>
    rm(`${artifacts}/${name}`, {force: true}),
  ),
);
execFileSync('rtk', ['proxy', 'mix', 'run', `${repo}/frontend/apps/clientapp/tests/today/fixtures.exs`], {
  cwd: `${repo}/backend`,
  stdio: 'inherit',
});
const fixture = JSON.parse(await readFile(`${artifacts}/fixture.json`, 'utf8'));
const api = await request.newContext({baseURL: process.env.API_URL ?? 'http://localhost:4000'});
const browser = process.env.PLAYWRIGHT_CDP_URL
  ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
  : await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_APP_URL ?? 'http://localhost:1315',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
const workoutWrites = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (req) => {
  if (req.url().includes('/v1/client/workout-logs') && req.method() !== 'GET') {
    workoutWrites.push({path: new URL(req.url()).pathname, method: req.method(), body: req.postDataJSON()});
  }
});
let token;
const button = (name, scope = page) => scope.getByRole('button', {name, exact: true});
const plan = () => page.getByRole('list', {name: 'Plan', exact: true});
const slot = (exercise, round, side) =>
  page.getByRole('group', {name: `${exercise} set ${round}${side ? ` ${side}` : ''}`, exact: true});
const input = (exercise, round, side, metric) =>
  page.getByLabel(`${exercise} set ${round}${side ? ` ${side}` : ''} ${metric}`, {exact: true});

async function send(path) {
  const response = await api.get(path, {headers: {authorization: `Bearer ${token}`}});
  expect(response.ok(), `${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function day() {
  return (await send(`/v1/client/days/${fixture.today}`)).data;
}
async function write(method, path, action) {
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
async function shot(name) {
  await expect(page.getByText('Saving…', {exact: true})).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    `${name}: horizontal overflow`,
  ).toBe(true);
  await page.screenshot({path: `${artifacts}/${name}.png`, fullPage: true});
}
async function home() {
  await page.goto(`/?date=${fixture.today}`);
  await expect(plan()).toBeVisible();
}
async function openWorkout() {
  await plan()
    .getByRole('button', {name: /Lower A/})
    .first()
    .click();
  await expect(page.getByRole('heading', {name: 'Lower A', exact: true})).toBeVisible();
}
function outcomes(log, exerciseId) {
  const activity = log.exercise_logs.find((row) => row.exercise_id === exerciseId);
  expect(activity, `activity ${exerciseId} exists`).toBeTruthy();
  return activity;
}
function assertRecording(log) {
  expect(log.exercise_logs.map((activity) => activity.exercise_id)).toEqual([
    fixture.splitExerciseId,
    fixture.replacementId,
    fixture.runExerciseId,
  ]);
  const original = outcomes(log, fixture.splitExerciseId);
  const replacement = outcomes(log, fixture.replacementId);
  const run = outcomes(log, fixture.runExerciseId);
  expect(original.sets.map((set) => [set.round, set.side, set.state, set.reps, set.weight_kg])).toEqual([
    [1, 'left', 'completed', 10, 16],
    [1, 'right', 'completed', 9, 16],
  ]);
  expect(replacement.sets.map((set) => [set.round, set.side, set.state, set.reps, set.weight_kg])).toEqual([
    [2, 'left', 'completed', 8, 18],
    [2, 'right', 'skipped', null, null],
  ]);
  expect(replacement.workout_exercise_id).toBe(original.workout_exercise_id);
  expect(replacement.rounds).toBe(3);
  expect(replacement.side_mode).toBe('per_side');
  expect([...original.sets, ...replacement.sets].some((set) => set.round === 3)).toBe(false);
  expect([original.state, replacement.state, run.state]).toEqual(['active', 'active', 'active']);
  expect([run.distance_m, run.duration_s]).toEqual([5000, 1800]);
  expect(run.sets.map((set) => [set.round, set.state, set.distance_m, set.duration_s])).toEqual([
    [1, 'completed', 1000, 360],
  ]);
  expect(Object.hasOwn(run, 'total_distance_m')).toBe(false);
}

try {
  await page.goto('/login');
  await page.getByLabel('Email', {exact: true}).fill(fixture.email);
  await button('Continue with email').click();
  await page.getByLabel('Verification code', {exact: true}).fill('123456');
  const auth = page.waitForResponse(
    (response) => response.url().endsWith('/v1/auth/token') && response.request().method() === 'POST',
  );
  await button('Verify and continue').click();
  token = (await (await auth).json()).access_token;
  await home();
  const initial = await day();
  expect(initial.workout_logs).toEqual([]);
  expect(initial.active_workout).toBeNull();
  await openWorkout();
  await expect(button('Start Lower A')).toBeVisible();
  expect(workoutWrites).toEqual([]);
  expect((await day()).workout_logs).toEqual([]);
  await shot('workout-preview');
  const started = await write('POST', '/v1/client/workout-logs', () => button('Start Lower A').click());
  const logId = started.data.id;
  const logPath = `/v1/client/workout-logs/${logId}`;
  expect(started.data.exercise_logs).toEqual([]);
  expect([started.data.recorded_by, started.data.coach_id]).toEqual(['client', null]);
  await expect(input('Bulgarian split squat', 1, 'left', 'Reps')).toHaveValue('');
  await expect(input('Bulgarian split squat', 1, 'left', 'Weight (kg)')).toHaveValue('');

  await input('Bulgarian split squat', 1, 'left', 'Reps').fill('10');
  await input('Bulgarian split squat', 1, 'left', 'Weight (kg)').fill('16');
  const firstSetPath = `**/v1/client/workout-logs/${logId}/exercise-logs/*/sets`;
  const setAttempts = [];
  await page.route(firstSetPath, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    setAttempts.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.ok(), `set persisted before response: ${response.status()}`).toBe(true);
    if (setAttempts.length === 1) {
      // The server has committed this set; the client loses only the response.
      await route.abort('connectionreset');
    } else {
      await route.fulfill({response});
    }
  });
  await button('Done set 1 left of Bulgarian split squat').click();
  await expect(page.getByRole('alert')).toContainText('Your action stays on this device.');
  await expect(button('Retry saving')).toBeEnabled();
  expect(setAttempts).toHaveLength(1);
  const persisted = (await send(logPath)).data;
  expect(persisted.exercise_logs).toHaveLength(1);
  expect(persisted.exercise_logs[0].sets.map((set) => set.id)).toEqual([setAttempts[0].id]);
  await page.reload();
  await expect(button('Retry saving')).toBeVisible();
  const first = await write('POST', /\/exercise-logs\/[^/]+\/sets$/, () => button('Retry saving').click());
  await page.unroute(firstSetPath);
  expect(setAttempts).toHaveLength(2);
  expect(setAttempts[1]).toEqual(setAttempts[0]);
  expect(first.data.exercise_logs).toHaveLength(1);
  expect(first.data.exercise_logs[0].sets.map((set) => set.id)).toEqual([setAttempts[0].id]);
  const recovered = (await send(logPath)).data;
  expect(recovered.exercise_logs.flatMap((activity) => activity.sets).map((set) => set.id)).toEqual([
    setAttempts[0].id,
  ]);
  await shot('workout-retry-recovered');
  await expect(slot('Bulgarian split squat', 1, 'left')).toContainText('Done');
  const clientDraftKey = await page.evaluate(
    ({date, scheduleId}) => {
      const key = Object.keys(localStorage).find((name) =>
        name.endsWith(`.draft.workout-recording.${date}.${scheduleId}`),
      );
      if (!key) {
        throw new Error('Client recording draft key is missing');
      }
      return key;
    },
    {date: fixture.today, scheduleId: fixture.workoutScheduleId},
  );
  for (const corrupt of ['{bad', JSON.stringify({version: 1, inputs: [], pending: null})]) {
    await page.evaluate(({key, value}) => localStorage.setItem(key, value), {key: clientDraftKey, value: corrupt});
    await page.reload();
    await expect(input('Bulgarian split squat', 1, 'left', 'Reps')).toHaveValue('10');
    await expect(input('Bulgarian split squat', 1, 'left', 'Weight (kg)')).toHaveValue('16');
    expect(await page.evaluate((key) => localStorage.getItem(key), clientDraftKey)).toBeNull();
  }
  await shot('workout-corrupt-draft-recovered');
  await input('Bulgarian split squat', 1, 'right', 'Reps').fill('9');
  await input('Bulgarian split squat', 1, 'right', 'Weight (kg)').fill('16');
  await write('POST', /\/exercise-logs\/[^/]+\/sets$/, () =>
    button('Done set 1 right of Bulgarian split squat').click(),
  );
  await button('Swap Bulgarian split squat').click();
  const picker = page.getByRole('dialog');
  await picker.getByLabel('Search exercises', {exact: true}).fill('Front squat');
  const swapped = await write('POST', /\/exercise-logs\/[^/]+\/replace$/, () =>
    picker.getByRole('button', {name: /^Front squat/}).click(),
  );
  expect(swapped.data.exercise_logs).toHaveLength(2);
  expect(outcomes(swapped.data, fixture.splitExerciseId).sets).toHaveLength(2);
  expect(outcomes(swapped.data, fixture.replacementId).sets).toEqual([]);
  await expect(slot('Bulgarian split squat', 1, 'left')).toContainText('Done');
  await input('Front squat', 2, 'left', 'Reps').fill('8');
  await input('Front squat', 2, 'left', 'Weight (kg)').fill('18');
  await write('POST', /\/exercise-logs\/[^/]+\/sets$/, () => button('Done set 2 left of Front squat').click());
  await write('POST', /\/exercise-logs\/[^/]+\/sets$/, () => button('Skip set 2 right of Front squat').click());
  await expect(slot('Front squat', 2, 'right')).toContainText('Skipped');
  await expect(input('Front squat', 3, 'left', 'Reps')).toHaveValue('');
  await expect(input('Front squat', 3, 'right', 'Reps')).toHaveValue('');

  if (!(await page.getByLabel('Run overall Distance (m)', {exact: true}).isVisible())) {
    await page
      .getByRole('region', {name: 'Activity Run', exact: true})
      .getByText('Overall result', {exact: true})
      .click();
  }
  await page.getByLabel('Run overall Distance (m)', {exact: true}).fill('5000');
  await page.getByLabel('Run overall Time (s or m:ss)', {exact: true}).fill('30:00');
  const runSection = page.getByRole('group', {name: 'Overall result for Run', exact: true});
  await write('PATCH', /\/exercise-logs\/[^/]+$/, () => button('Save overall result', runSection).click());
  await input('Run', 1, null, 'Distance (m)').fill('1000');
  await input('Run', 1, null, 'Time (s or m:ss)').fill('6:00');
  const recorded = await write('POST', /\/exercise-logs\/[^/]+\/sets$/, () => button('Done set 1 of Run').click());
  assertRecording(recorded.data);
  await expect(page.getByText(/^Sets total/)).toHaveCount(0);
  await expect(page.getByText('2 km', {exact: true})).toHaveCount(0);
  await shot('workout-active');
  await button('Finish workout').click();
  let finish = page.getByRole('dialog', {name: 'Finish workout', exact: true});
  await expect(finish.getByRole('radio', {checked: true})).toHaveCount(0);
  await shot('workout-finish-optional');
  const finished = await write('POST', `${logPath}/finish`, () => button('Save workout', finish).click());
  expect([finished.data.state, finished.data.effort, finished.data.pain, finished.data.text]).toEqual([
    'completed',
    null,
    null,
    null,
  ]);
  assertRecording(finished.data);
  await home();
  await page.reload();
  await expect(plan()).toBeVisible();
  await openWorkout();
  await expect(slot('Bulgarian split squat', 1, 'left')).toContainText('Done');
  await expect(slot('Bulgarian split squat', 1, 'right')).toContainText('Done');
  await expect(slot('Front squat', 2, 'left')).toContainText('Done');
  await expect(slot('Front squat', 2, 'right')).toContainText('Skipped');
  await expect(input('Front squat', 3, 'left', 'Reps')).toHaveValue('');
  await expect(input('Front squat', 3, 'right', 'Reps')).toHaveValue('');
  assertRecording((await send(logPath)).data);
  await shot('workout-completed');
  await write('POST', `${logPath}/reopen`, () => button('Reopen').click());
  await expect(input('Front squat', 3, 'left', 'Reps')).toBeEnabled();
  await button('Finish workout').click();
  finish = page.getByRole('dialog', {name: 'Finish workout', exact: true});
  await finish.getByRole('radio', {name: 'Hard', exact: true}).locator('xpath=ancestor::label').click();
  const hard = await write('POST', `${logPath}/finish`, () => button('Save workout', finish).click());
  expect(hard.data.effort).toBe(4);
  assertRecording(hard.data);
  await home();
  await expect(
    plan()
      .getByRole('button', {name: /Lower A/})
      .first(),
  ).toContainText('Hard');
  await shot('today-hard');
  expect(errors).toEqual([]);
  await writeFile(`${artifacts}/workout-writes.json`, JSON.stringify(workoutWrites, null, 2));
  await writeFile(
    `${artifacts}/results.json`,
    `${JSON.stringify({passed: true, width: 375, logId, checks: ['preview creates no records', 'lazy activities', 'per-side swap', 'done skipped absent', 'partial intervals keep overall', 'optional feedback', 'reopen', 'Hard on Today'], errors}, null, 2)}\n`,
  );
  console.log(
    'Today workout recording passed at 375px with per-side swaps, partial intervals, optional feedback and reopen.',
  );
} catch (error) {
  await writeFile(`${artifacts}/workout-writes.json`, JSON.stringify(workoutWrites, null, 2));
  await writeFile(`${artifacts}/failure.txt`, await page.locator('body').ariaSnapshot());
  await page.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
  throw error;
} finally {
  await context.close();
  await browser.close();
  await api.dispose();
}
