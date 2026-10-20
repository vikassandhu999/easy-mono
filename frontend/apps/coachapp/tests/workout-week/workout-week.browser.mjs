import {execFileSync} from 'node:child_process';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
execFileSync('rtk', ['mix', 'run', 'priv/repo/dev_workout_week.exs', '--reset'], {
  cwd: `${repo}/backend`,
  stdio: 'inherit',
});
const fixtures = JSON.parse(await readFile(`${repo}/.scratch/workout/browser-fixtures.json`, 'utf8'));
const artifacts = `${repo}/frontend/apps/coachapp/tests/workout-week/artifacts`;
await mkdir(artifacts, {recursive: true});
await Promise.all(
  ['results.json', 'failure.txt', 'failure.png'].map((name) => rm(`${artifacts}/${name}`, {force: true})),
);
const api = await request.newContext({baseURL: process.env.API_URL ?? 'http://localhost:4000'});
const browser = process.env.PLAYWRIGHT_CDP_URL
  ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
  : await chromium.launch();
const results = [];
const errors = [];
let activePage;
const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function send(method, path, body, token) {
  const response = await api[method](path, {data: body, headers: {authorization: `Bearer ${token}`}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `${artifacts}/${name}.png`, fullPage: true});
}
async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  const response = page.waitForResponse(
    (response) => response.url().endsWith('/v1/auth/token') && response.request().method() === 'POST',
  );
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  const tokens = await (await response).json();
  await expect(page).toHaveURL(/\/(clients|welcome)$/);
  return tokens.access_token;
}
async function dayScope(page, width, day) {
  if (width === 375) {
    await page.getByRole('tab', {name: day, exact: true}).click();
    return page.getByRole('tabpanel', {name: day, exact: true});
  }
  return page.getByRole('listitem', {name: day, exact: true});
}
async function chooseExercise(page, name) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search exercises', {exact: true}).fill(name);
  await dialog.getByRole('button', {name: new RegExp(`^${escaped(name)} `)}).click();
  await expect(dialog).toHaveCount(0);
}
async function setExact(page, chip, value) {
  await chip.click();
  const editor = page
    .locator('[id^="target-editor-"]')
    .filter({has: page.getByRole('button', {name: 'Done', exact: true})});
  await editor.getByRole('button', {name: 'Exact', exact: true}).click();
  await editor.getByLabel(/^Value/).fill(value);
  await editor.getByRole('button', {name: 'Done', exact: true}).click();
}
function pastDate(today) {
  const date = new Date(`${today}T12:00:00Z`);
  do {
    date.setUTCDate(date.getUTCDate() - 1);
  } while (![1, 4].includes(date.getUTCDay()));
  return date.toISOString().slice(0, 10);
}
function historicalPrescription(week) {
  return {
    workouts: week.workouts.map(({id, name, description, type, groups}) => ({id, name, description, type, groups})),
    schedules: week.schedules.map(({id, workout_id, weekdays_mask, time, place, meeting_url, coach_id}) => ({
      id,
      workout_id,
      weekdays_mask,
      time,
      place,
      meeting_url,
      coach_id,
    })),
  };
}

async function journey(width) {
  const fixture = fixtures[String(width)];
  const context = await browser.newContext({
    baseURL: process.env.COACH_URL ?? 'http://localhost:2022',
    viewport: {width, height: width === 375 ? 812 : 900},
    locale: 'en-US',
  });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => errors.push(error.message));
  const token = await login(page, fixture.coachEmail);
  const base = `/v1/coach/clients/${fixture.clientId}`;
  const week = async (on) => (await send('get', `${base}/workout-week${on ? `?on=${on}` : ''}`, undefined, token)).data;
  const workout = async (id) => (await send('get', `/v1/coach/workouts/${id}`, undefined, token)).data;
  let pendingWrites = 0;
  const isWrite = (request) => request.method() !== 'GET' && request.url().includes('/v1/coach/');
  page.on('request', (request) => {
    if (isWrite(request)) {
      pendingWrites++;
    }
  });
  for (const event of ['requestfinished', 'requestfailed']) {
    page.on(event, (request) => {
      if (isWrite(request)) {
        pendingWrites--;
      }
    });
  }
  // The week shows nothing when saved (only saving or failure); the builder still says "All changes saved".
  const saved = async () => {
    await expect.poll(() => pendingWrites).toBe(0);
    await expect(page.getByText('Saving…', {exact: true})).toHaveCount(0);
    await expect(page.getByText(/^Not saved/)).toHaveCount(0);
  };
  const settledWeek = async () => {
    await saved();
    return week();
  };

  // The exercise editor has its own browser suite; seed the builder's catalogue input through the API.
  const exerciseName = `Browser hold ${width}`;
  const created = await send(
    'post',
    '/v1/coach/exercises',
    {
      name: `${exerciseName} edited`,
      kind: 'practice',
      goals: ['recovery'],
      places: ['home'],
      metrics: [
        {key: 'duration', label: null},
        {key: 'effort', label: null},
      ],
    },
    token,
  );
  const custom = [created.data];

  // Build a superset using the real catalogue. Rest follows the last exercise.
  await page.goto(`/workouts/${fixture.builderWorkoutId}`);
  await expect(page.getByLabel('Workout name', {exact: true})).toHaveValue(`Builder practice ${width}`);
  const name = `Browser superset ${width}`;
  await page.getByLabel('Workout name', {exact: true}).fill(name);
  await page.getByRole('button', {name: 'Add exercise', exact: true}).last().click();
  await chooseExercise(page, 'Bench press');
  const eachSide = page.getByRole('checkbox', {name: 'Each side for Bench press', exact: true});
  await eachSide.focus();
  await eachSide.press('Space');
  await expect(eachSide).toBeChecked();
  await saved();
  await page.reload();
  await expect(page.getByRole('checkbox', {name: 'Each side for Bench press', exact: true})).toBeChecked();
  await expect(page.getByText('each side', {exact: true})).toBeVisible();
  await setExact(page, page.getByRole('button', {name: 'Reps Any', exact: true}), '8');
  await setExact(page, page.getByRole('button', {name: 'Rest Any', exact: true}), '1:30');
  await page.getByRole('button', {name: 'Add exercise (superset)', exact: true}).click();
  await chooseExercise(page, 'Pull-up');
  await saved();
  let built = await workout(fixture.builderWorkoutId);
  expect(built.groups).toHaveLength(1);
  expect(built.groups[0].rounds).toBe(3);
  expect(built.groups[0].exercises.map((row) => row.exercise.name)).toEqual(['Bench press', 'Pull-up']);
  expect(built.groups[0].exercises[0].side_mode).toBe('per_side');
  expect(built.groups[0].exercises.map((row) => row.targets.map((round) => round.rest))).toEqual([
    [{mode: 'none'}],
    [{mode: 'exact', value_s: 90}],
  ]);
  await expect(page.getByRole('textbox', {name: 'A · Superset', exact: true})).toBeVisible();

  await page.getByRole('button', {name: 'Reps Any', exact: true}).click();
  let editor = page
    .locator('[id^="target-editor-"]')
    .filter({has: page.getByRole('button', {name: 'Done', exact: true})});
  await editor.getByRole('button', {name: 'Different per round', exact: true}).click();
  await editor.getByRole('button', {name: 'Exact', exact: true}).click();
  await editor.getByLabel(/^Value/).fill('6');
  await editor.getByRole('button', {name: 'Done', exact: true}).click();
  const table = page.getByRole('table', {name: 'Targets for Pull-up by round', exact: true});
  await setExact(page, table.getByRole('row').nth(2).getByRole('button').first(), '7');
  await table.getByRole('row').nth(3).getByRole('button').first().click();
  editor = page.locator('[id^="target-editor-"]').filter({has: page.getByRole('button', {name: 'Done', exact: true})});
  await editor.getByRole('button', {name: 'As much as possible', exact: true}).click();
  await editor.getByRole('button', {name: 'Done', exact: true}).click();
  await saved();
  built = await workout(fixture.builderWorkoutId);
  expect(built.groups[0].exercises[1].targets_mode).toBe('per_round');
  expect(built.groups[0].exercises[1].targets).toEqual([
    {reps: {mode: 'exact', value: 6}, rest: {mode: 'exact', value_s: 90}},
    {reps: {mode: 'exact', value: 7}, rest: {mode: 'exact', value_s: 90}},
    {reps: {mode: 'max'}, rest: {mode: 'exact', value_s: 90}},
  ]);
  await shot(page, `builder-superset-${width}`);

  // Immediate remove/Undo retains unrelated edits. Reorder remains a separate mode.
  await page.getByRole('button', {name: 'Remove Pull-up', exact: true}).click();
  await page
    .getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})
    .fill('Keep a steady tempo.');
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await saved();
  expect((await workout(fixture.builderWorkoutId)).groups[0].exercises).toHaveLength(2);
  await expect(page.getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})).toHaveValue(
    'Keep a steady tempo.',
  );
  await page.getByRole('button', {name: 'Reorder', exact: true}).click();
  await page.getByRole('button', {name: 'Move Pull-up up', exact: true}).click();
  await page.getByRole('button', {name: 'Done reordering', exact: true}).click();
  await saved();
  expect((await workout(fixture.builderWorkoutId)).groups[0].exercises.map((row) => row.exercise.name)).toEqual([
    'Pull-up',
    'Bench press',
  ]);

  // Exercise references show current catalogue metadata; workout targets retain their instructions.
  const prescribedName = `${exerciseName} edited`;
  await page.getByRole('button', {name: 'Add exercise', exact: true}).last().click();
  await chooseExercise(page, prescribedName);
  await setExact(page, page.getByRole('button', {name: 'Time Any', exact: true}), '30');
  await setExact(page, page.getByRole('button', {name: 'Effort Any', exact: true}), '6');
  await saved();
  await send(
    'patch',
    `/v1/coach/exercises/${custom[0].id}`,
    {
      name: `${exerciseName} catalogue changed`,
      metrics: [
        {key: 'duration', label: 'Time under tension'},
        {key: 'effort', label: null},
      ],
    },
    token,
  );
  await page
    .getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})
    .fill('Metadata after catalogue change.');
  await saved();
  let referenced = (await workout(fixture.builderWorkoutId)).groups
    .flatMap((group) => group.exercises)
    .find((row) => row.exercise_id === custom[0].id);
  expect(referenced.exercise.name).toBe(`${exerciseName} catalogue changed`);
  expect(referenced.exercise.metrics).toEqual([
    {key: 'duration', label: 'Time under tension'},
    {key: 'effort', label: null},
  ]);
  expect(referenced.targets).toEqual([
    {duration: {mode: 'exact', value: 30}, effort: {mode: 'exact', value: 6}, rest: {mode: 'client_chooses'}},
  ]);
  await page.getByRole('button', {name: 'Reorder', exact: true}).click();
  await page
    .getByRole('combobox', {name: `Letter for ${exerciseName} catalogue changed`, exact: true})
    .selectOption('0');
  await page.getByRole('button', {name: 'Done reordering', exact: true}).click();
  await saved();
  built = await workout(fixture.builderWorkoutId);
  expect(built.groups).toHaveLength(1);
  referenced = built.groups[0].exercises.find((row) => row.exercise_id === custom[0].id);
  expect(referenced.exercise.name).toBe(`${exerciseName} catalogue changed`);
  expect(referenced.targets).toEqual([
    {duration: {mode: 'exact', value: 30}, effort: {mode: 'exact', value: 6}, rest: {mode: 'client_chooses'}},
  ]);

  // Failed autosave persists on this device across a reload, then Retry saves it.
  const builderPath = `/v1/coach/workouts/${fixture.builderWorkoutId}`;
  await page.route(`**${builderPath}`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({status: 503, contentType: 'application/json', body: '{}'})
      : route.continue(),
  );
  await page
    .getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})
    .fill('Retry keeps these instructions.');
  await expect(page.getByRole('button', {name: 'Retry', exact: true})).toBeVisible();
  await shot(page, `builder-retry-${width}`);
  await page.reload();
  await expect(page.getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})).toHaveValue(
    'Retry keeps these instructions.',
  );
  await page.unroute(`**${builderPath}`);
  await page.getByRole('button', {name: 'Retry', exact: true}).click();
  await saved();
  expect((await workout(fixture.builderWorkoutId)).description).toBe('Retry keeps these instructions.');

  // A library selection makes an independent client copy. Several days share one row.
  const initial = await week();
  const on = pastDate(fixture.today);
  const historicalBefore = historicalPrescription(await week(on));
  await page.goto(`/clients/${fixture.clientId}/training`);
  await expect(page.getByRole('heading', {name: 'Training week', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add to Monday', exact: true})).toBeVisible();
  if (width === 375) {
    await page.getByRole('tab', {name: 'Monday', exact: true}).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', {name: 'Tuesday', exact: true})).toHaveAttribute('aria-selected', 'true');
  }
  await shot(page, `week-initial-${width}`);
  let tuesday = await dayScope(page, width, 'Tuesday');
  await tuesday.getByRole('button', {name: 'Add to Tuesday', exact: true}).click();
  let dialog = page.getByRole('dialog', {name: 'Add to Tuesday', exact: true});
  await dialog.getByLabel('Search workouts', {exact: true}).fill(fixture.libraryName);
  await dialog
    .getByRole('list', {name: 'library workouts', exact: true})
    .getByRole('button', {name: new RegExp(`^${escaped(fixture.libraryName)} `)})
    .click();
  let current = await settledWeek();
  const copy = current.workouts.find((row) => row.name === fixture.libraryName);
  expect(copy.id).not.toBe(fixture.libraryWorkoutId);
  expect(copy.groups[0].id).not.toBe((await workout(fixture.libraryWorkoutId)).groups[0].id);
  const copyId = copy.id;
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  current = await settledWeek();
  expect(current.workouts).toEqual(initial.workouts);
  expect(current.schedules).toEqual(initial.schedules);

  tuesday = await dayScope(page, width, 'Tuesday');
  await tuesday.getByRole('button', {name: 'Add to Tuesday', exact: true}).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search workouts', {exact: true}).fill(fixture.libraryName);
  await dialog
    .getByRole('list', {name: 'library workouts', exact: true})
    .getByRole('button', {name: new RegExp(`^${escaped(fixture.libraryName)} `)})
    .click();
  current = await settledWeek();
  const clientCopy = current.workouts.find((row) => row.name === fixture.libraryName);
  expect(clientCopy.id).not.toBe(copyId);
  const thursday = await dayScope(page, width, 'Thursday');
  await thursday.getByRole('button', {name: 'Add to Thursday', exact: true}).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search workouts', {exact: true}).fill(fixture.libraryName);
  await dialog
    .getByRole('list', {name: 'client workouts', exact: true})
    .getByRole('button', {name: new RegExp(`^${escaped(fixture.libraryName)} `)})
    .click();
  current = await settledWeek();
  expect(current.schedules.filter((row) => row.workout_id === clientCopy.id).map((row) => row.weekdays_mask)).toEqual([
    10,
  ]);

  tuesday = await dayScope(page, width, 'Tuesday');
  await tuesday.getByRole('button', {name: new RegExp(`^${escaped(fixture.libraryName)}`)}).click();
  dialog = page.getByRole('dialog', {name: fixture.libraryName, exact: true});
  await dialog.getByLabel(/^Time/).fill('17:30');
  await dialog.getByRole('button', {name: 'Friday', exact: true}).click();
  await dialog.getByRole('button', {name: 'Save', exact: true}).click();
  current = await settledWeek();
  const beforeRemoval = current.schedules;
  expect(
    current.schedules.filter((row) => row.workout_id === clientCopy.id).map((row) => [row.weekdays_mask, row.time]),
  ).toEqual([[26, '17:30']]);
  await shot(page, `week-session-${width}`);
  await tuesday.getByRole('button', {name: new RegExp(`^${escaped(fixture.libraryName)}`)}).click();
  dialog = page.getByRole('dialog');
  await shot(page, `schedule-dialog-${width}`);
  await dialog.getByRole('button', {name: 'Remove from Tuesday', exact: true}).click();
  current = await settledWeek();
  expect(current.schedules.filter((row) => row.workout_id === clientCopy.id).map((row) => row.weekdays_mask)).toEqual([
    24,
  ]);
  await expect(tuesday.getByRole('button', {name: 'Add to Tuesday', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  expect((await settledWeek()).schedules).toEqual(beforeRemoval);

  // Editing a workout after past use copies its content and moves future schedules.
  const monday = await dayScope(page, width, 'Monday');
  await monday.getByRole('button', {name: /^Lower A/}).click();
  await page.getByRole('dialog').getByRole('link', {name: 'Edit workout', exact: true}).click();
  await expect(page.getByLabel('Workout name', {exact: true})).toHaveValue('Lower A');
  await page.getByLabel('Workout name', {exact: true}).fill(`Lower A edited ${width}`);
  await saved();
  current = await week();
  const replacement = current.workouts.find((row) => row.name === `Lower A edited ${width}`);
  expect(replacement.id).not.toBe(fixture.pastWorkoutId);
  expect(current.schedules.some((row) => row.workout_id === fixture.pastWorkoutId)).toBe(false);
  expect(
    current.schedules
      .filter((row) => row.workout_id === replacement.id)
      .map((row) => [row.weekdays_mask, row.from_date]),
  ).toEqual([[9, fixture.today]]);
  expect(historicalPrescription(await week(on))).toEqual(historicalBefore);
  await shot(page, `builder-preserved-history-${width}`);
  await expect(page.getByRole('button', {name: 'Undo', exact: true})).toHaveCount(1);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(page.getByLabel('Workout name', {exact: true})).toHaveValue('Lower A');
  await saved();
  expect((await week()).workouts.find((row) => row.name === 'Lower A').id).toBe(fixture.pastWorkoutId);
  expect(historicalPrescription(await week(on))).toEqual(historicalBefore);
  await page.getByRole('button', {name: 'Remove Plank', exact: true}).click();
  await saved();
  await expect(page.getByRole('button', {name: 'Undo', exact: true})).toHaveCount(1);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await saved();
  expect(
    (await week()).workouts
      .find((row) => row.name === 'Lower A')
      .groups.flatMap((group) => group.exercises)
      .map((row) => row.exercise.name),
  ).toEqual(['Back squat', 'Plank']);
  expect(historicalPrescription(await week(on))).toEqual(historicalBefore);
  await page.goto(`/clients/${fixture.clientId}/training`);
  await expect(page.getByRole('heading', {name: 'Training week', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add to Monday', exact: true})).toBeVisible();
  await shot(page, `week-verified-${width}`);
  results.push({
    width,
    clientId: fixture.clientId,
    passed: true,
    superset: true,
    perRound: true,
    eachSide: true,
    restTransfer: true,
    autosaveRetry: true,
    libraryCopy: true,
    repeatingDays: true,
    time: true,
    removeDay: true,
    undo: true,
    pastPreserved: true,
  });
  await context.close();
}

try {
  for (const width of [375, 1280]) {
    await journey(width);
  }
  expect(errors).toEqual([]);
  await writeFile(`${artifacts}/results.json`, `${JSON.stringify({passed: true, results, errors}, null, 2)}\n`);
  console.log(
    'Workout builder and training week passed at 375px and 1280px with real API saves, Undo and past history.',
  );
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await writeFile(`${artifacts}/failure.txt`, await activePage.locator('body').ariaSnapshot());
    await activePage.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
  }
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
