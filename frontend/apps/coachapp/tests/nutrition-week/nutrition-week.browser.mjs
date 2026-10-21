import {execFileSync} from 'node:child_process';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request, webkit} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
execFileSync('rtk', ['mix', 'run', 'priv/repo/dev_nutrition_week.exs', '--reset'], {
  cwd: `${repo}/backend`,
  stdio: 'inherit',
});
const fixtures = JSON.parse(await readFile(`${repo}/.scratch/nutrition/browser-fixtures.json`, 'utf8'));
const artifacts = `${repo}/frontend/apps/coachapp/tests/nutrition-week/artifacts`;
await mkdir(artifacts, {recursive: true});
await Promise.all(
  ['results.json', 'failure.txt', 'failure.png', 'focus-failure.json'].map((name) =>
    rm(`${artifacts}/${name}`, {force: true}),
  ),
);
const api = await request.newContext({baseURL: process.env.API_URL ?? 'http://localhost:4000'});
const browserType = process.env.PLAYWRIGHT_BROWSER === 'webkit' ? webkit : chromium;
const browser = process.env.PLAYWRIGHT_CDP_URL
  ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
  : await browserType.launch();
const errors = [];
const results = [];
let activePage;
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function send(method, path, body, token) {
  const response = await api[method](path, {data: body, headers: {authorization: `Bearer ${token}`}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function select(page, label, option, scope = page) {
  await scope.getByRole('button', {name: new RegExp(escapePattern(label))}).click();
  await page.getByRole('option', {name: option, exact: true}).click();
}
async function shot(page, name) {
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
  if (width < 1280) {
    await page.getByRole('tab', {name: day, exact: true}).click();
    return page.getByRole('tabpanel', {name: day, exact: true});
  }
  return page.getByRole('listitem', {name: day, exact: true});
}
async function undo(page) {
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Undo', exact: true})).toHaveCount(0);
}

async function pauseWeekRead(page, path) {
  let resume;
  const paused = new Promise((resolve) => {
    resume = resolve;
  });
  const started = page.waitForRequest((request) => request.url().endsWith(path) && request.method() === 'GET');
  await page.route(
    `**${path}`,
    async (route) => {
      await paused;
      await route.continue();
    },
    {times: 1},
  );
  return {started, resume};
}

async function discardWriteResponse(page, path, method) {
  const outcome = {writes: 0, undoToken: ''};
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== method) {
      await route.continue();
      return;
    }
    outcome.writes++;
    const response = await route.fetch();
    expect(response.ok(), 'The uncertain write must actually commit on the server.').toBe(true);
    outcome.undoToken = (await response.json()).undo_token;
    await route.abort('connectionreset');
  });
  return outcome;
}

async function journey(width) {
  const fixture = fixtures[String(width)];
  expect(fixture, `Missing ${width}px seed fixture`).toBeTruthy();
  const context = await browser.newContext({
    baseURL: process.env.COACH_URL ?? 'http://localhost:2022',
    viewport: {width, height: width === 375 ? 812 : 900},
    locale: 'en-US',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.nutritionFocusTrace = [];
    document.addEventListener('focusin', (event) => {
      window.nutritionFocusTrace.push({id: event.target.id, text: event.target.textContent?.slice(0, 80)});
      window.nutritionFocusTrace = window.nutritionFocusTrace.slice(-40);
    });
  });
  activePage = page;
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => errors.push(error.message));
  const token = await login(page, fixture.coachEmail);
  const base = `/v1/coach/clients/${fixture.clientId}`;
  const week = async () => (await send('get', `${base}/nutrition-week`, undefined, token)).data;
  // Reads after a UI action wait until the page's own writes have finished.
  let pendingWrites = 0;
  const isWrite = (request) => request.method() !== 'GET' && request.url().includes('/v1/coach/');
  page.on('request', (request) => isWrite(request) && pendingWrites++);
  for (const event of ['requestfinished', 'requestfailed']) {
    page.on(event, (request) => isWrite(request) && pendingWrites--);
  }
  const settledWeek = async () => {
    await page.waitForTimeout(150);
    await expect.poll(() => pendingWrites).toBe(0);
    return week();
  };
  const initial = await week();
  await page.goto(`/clients/${fixture.clientId}/nutrition`);
  await expect(page.getByRole('heading', {name: 'Nutrition week', exact: true})).toBeVisible();
  let monday = await dayScope(page, width, 'Monday');
  await expect(monday.getByRole('button', {name: 'Add to Monday', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {level: 1})).toHaveCount(1);
  await shot(page, `week-${width}`);
  if (width === 1280) {
    await expect(page.locator('.nutrition-week ol > li')).toHaveCount(7);
  } else {
    await page.getByRole('tab', {name: 'Monday', exact: true}).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', {name: 'Tuesday', exact: true})).toHaveAttribute('aria-selected', 'true');
    monday = await dayScope(page, width, 'Monday');
  }

  // A new meal validates in place, keeps the editor's draft, and saves with its chosen time.
  await monday.getByRole('button', {name: 'Add to Monday', exact: true}).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', {name: 'Create a new meal', exact: true}).click();
  await page.getByRole('button', {name: 'Add to Monday', exact: true}).click();
  await expect(page.getByText('Add a name.', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Meal name', {exact: true})).toBeFocused();
  const mealName = `Browser breakfast ${width}`;
  await page.getByLabel('Meal name', {exact: true}).fill(mealName);
  await page.getByRole('button', {name: 'Add food', exact: true}).click();
  let dialog = page.getByRole('dialog', {name: 'Add food', exact: true});
  await dialog.getByLabel('Search', {exact: true}).fill(fixture.foodName);
  await dialog.getByRole('button', {name: new RegExp(`^${escapePattern(fixture.foodName)} `)}).click();
  await page.getByLabel('Amount of ' + fixture.foodName, {exact: true}).fill('2');
  await page.getByLabel('Time (optional)', {exact: true}).fill('07:15');
  await page.getByRole('button', {name: `Remove ${fixture.foodName}`, exact: true}).click();
  await expect(page.getByText('No foods yet. Add the first food of this option.', {exact: true})).toBeVisible();
  await page.getByLabel('Meal name', {exact: true}).fill(`${mealName} draft`);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(page.getByLabel('Meal name', {exact: true})).toHaveValue(`${mealName} draft`);
  await expect(page.getByLabel('Amount of ' + fixture.foodName, {exact: true})).toHaveValue('2');
  await page.getByLabel('Meal name', {exact: true}).fill(mealName);
  await page.getByRole('button', {name: 'Add option', exact: true}).click();
  await page.getByRole('button', {name: 'Add to Monday', exact: true}).click();
  await expect(page.getByText('Add a food to option 2.', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add food', exact: true}).nth(1)).toBeFocused();
  await page.getByRole('button', {name: 'Remove option', exact: true}).nth(1).click();
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Option 2', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Remove option', exact: true}).nth(1).click();
  await page.getByRole('button', {name: /^Back to .+nutrition week$/}).click();
  dialog = page.getByRole('dialog', {name: 'Discard this new meal?', exact: true});
  await dialog.getByRole('button', {name: 'Keep editing', exact: true}).click();
  await expect(page.getByLabel('Meal name', {exact: true})).toHaveValue(mealName);
  await shot(page, `meal-errors-and-recovery-${width}`);
  await page.route(`**${base}/nutrition-schedules`, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({error_message: 'Check this meal.'}),
        })
      : route.continue(),
  );
  await page.getByRole('button', {name: 'Add to Monday', exact: true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Meal name', {exact: true})).toHaveValue(mealName);
  await page.unroute(`**${base}/nutrition-schedules`);
  await page.route(`**${base}/nutrition-schedules`, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({status: 503, contentType: 'application/json', body: '{}'})
      : route.continue(),
  );
  await page.getByRole('button', {name: 'Add to Monday', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Check saved week', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add to Monday', exact: true})).toBeDisabled();
  await page.unroute(`**${base}/nutrition-schedules`);
  await page.getByRole('button', {name: 'Check saved week', exact: true}).click();
  await expect(
    page.getByText('No matching save was found. Your edits are still here. You can save again.', {exact: true}),
  ).toBeVisible();
  await expect(page.getByLabel('Meal name', {exact: true})).toHaveValue(mealName);
  await expect(page.getByRole('button', {name: 'Add to Monday', exact: true})).toBeEnabled();
  await page.getByRole('button', {name: 'Add to Monday', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Nutrition week', exact: true})).toBeVisible();
  let saved = await settledWeek();
  const newMeal = saved.presets.find((preset) => preset.name === mealName);
  expect(newMeal.options).toHaveLength(1);
  expect(newMeal.options[0].items[0].amount).toBe(2);
  expect(saved.schedules.find((schedule) => schedule.nutrition_preset_id === newMeal.id).time).toMatch(/^07:15/);
  await undo(page);
  expect((await week()).presets.some((preset) => preset.name === mealName)).toBe(false);

  // The request commits, but its response never reaches the app. A blind retry must stay blocked.
  monday = await dayScope(page, width, 'Monday');
  await monday.getByRole('button', {name: 'Add to Monday', exact: true}).click();
  await page.getByRole('button', {name: 'Create a new meal', exact: true}).click();
  const recoveredName = `Interrupted meal ${width}`;
  await page.getByLabel('Meal name', {exact: true}).fill(recoveredName);
  await page.getByRole('button', {name: 'Add food', exact: true}).click();
  dialog = page.getByRole('dialog', {name: 'Add food', exact: true});
  await dialog.getByLabel('Search', {exact: true}).fill(fixture.foodName);
  await dialog.getByRole('button', {name: new RegExp(`^${escapePattern(fixture.foodName)} `)}).click();
  const interruptedAdd = await discardWriteResponse(page, `${base}/nutrition-schedules`, 'POST');
  await page.getByRole('button', {name: 'Add to Monday', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Check saved week', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add to Monday', exact: true})).toBeDisabled();
  await expect(page.getByLabel('Meal name', {exact: true})).toHaveValue(recoveredName);
  saved = await settledWeek();
  expect(saved.presets.filter((preset) => preset.name === recoveredName)).toHaveLength(1);
  expect(interruptedAdd.writes).toBe(1);
  await page.unroute(`**${base}/nutrition-schedules`);
  await page.route(`**${base}/nutrition-week`, (route) =>
    route.fulfill({status: 503, contentType: 'application/json', body: '{}'}),
  );
  await page.getByRole('button', {name: 'Check saved week', exact: true}).click();
  await expect(
    page.getByText(
      'Could not load the saved week. Your edits are still here. Check again when you have a connection.',
      {exact: true},
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Meal name', {exact: true})).toHaveValue(recoveredName);
  await expect(page.getByRole('button', {name: 'Add to Monday', exact: true})).toBeDisabled();
  await page.unroute(`**${base}/nutrition-week`);
  await page.getByRole('button', {name: 'Check saved week', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Nutrition week', exact: true})).toBeVisible();
  await expect(page.locator('.nutrition-meal-editor')).toHaveCount(0);
  expect((await week()).schedules).toHaveLength(initial.schedules.length + 1);
  expect(interruptedAdd.writes).toBe(1);
  await send('post', `${base}/nutrition-undo`, {token: interruptedAdd.undoToken}, token);
  await page.reload();

  // Food and Supplement share portions, and unknown supplement nutrients stay unknown.
  for (const [tab, name] of [
    ['Food', fixture.foodName],
    ['Supplement', fixture.supplementName],
  ]) {
    monday = await dayScope(page, width, 'Monday');
    await monday.getByRole('button', {name: 'Add to Monday', exact: true}).click();
    dialog = page.getByRole('dialog', {name: 'Add to Monday', exact: true});
    await dialog.getByRole('tab', {name: tab, exact: true}).focus();
    await page.keyboard.press('Enter');
    await dialog.getByLabel('Search', {exact: true}).fill(name);
    if (tab === 'Supplement') {
      await expect(dialog.getByText(/Nutrients not listed/).first()).toBeVisible();
    }
    await dialog.getByRole('button', {name: new RegExp(`^${escapePattern(name)} `)}).click();
    await page
      .getByRole('dialog')
      .getByLabel('Amount of ' + name, {exact: true})
      .fill('3');
    await page.getByRole('dialog').getByLabel('Time (optional)', {exact: true}).fill('15:45');
    const before = await week();
    const created = page.waitForResponse(
      (response) => response.url().includes('/nutrition-schedules') && response.request().method() === 'POST',
    );
    await page.getByRole('dialog').getByRole('button', {name: 'Add to Monday', exact: true}).click();
    await created;
    saved = await settledWeek();
    const addition = saved.schedules.find((row) => !before.schedules.some((old) => old.id === row.id));
    const preset = saved.presets.find((row) => row.id === addition.nutrition_preset_id);
    expect(preset.type).toBe(tab.toLowerCase());
    expect(preset.amount).toBe(3);
    expect(addition.weekdays_mask).toBe(1);
    await undo(page);
  }

  // Timing belongs to one schedule; editing its meal reaches both schedules.
  monday = await dayScope(page, width, 'Monday');
  let card = monday.locator('.nutrition-schedule').filter({hasText: fixture.sharedMealName}).first();
  await card.click();
  dialog = page.getByRole('dialog', {name: fixture.sharedMealName, exact: true});
  await expect(
    dialog.getByText('Also on Sat–Sun at 10:30. Editing the meal changes it there too.', {exact: true}),
  ).toBeVisible();
  await dialog.getByLabel('Time (optional)', {exact: true}).fill('09:00');
  await expect(dialog.getByRole('button', {name: 'Edit meal', exact: true})).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(card).toBeFocused();
  await card.click();
  await page.getByRole('dialog').getByRole('button', {name: 'Edit meal', exact: true}).click();
  await page.getByRole('button', {name: 'Remove Rolled oats', exact: true}).click();
  await page.getByLabel('Meal name', {exact: true}).fill('Draft only');
  await page.getByRole('button', {name: 'Discard', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Discard changes', exact: true}).click();
  await expect(page.getByLabel('Meal name', {exact: true})).toHaveValue(fixture.sharedMealName);
  await expect(page.getByRole('button', {name: 'Undo', exact: true})).toHaveCount(0);
  await page.getByLabel('Meal name', {exact: true}).fill('Back draft');
  await page.getByRole('button', {name: /^Back to .+nutrition week$/}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Discard changes', exact: true}).click();
  await expect(page.locator('.nutrition-meal-editor')).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Nutrition week', exact: true})).toBeVisible();
  await card.click();
  await page.getByRole('dialog').getByRole('button', {name: 'Edit meal', exact: true}).click();
  const sharedName = `${fixture.sharedMealName} edited ${width}`;
  await page.getByLabel('Meal name', {exact: true}).fill(sharedName);
  await page.getByRole('button', {name: 'Save for every day', exact: true}).click();
  saved = await settledWeek();
  const shared = saved.presets.find((row) => row.name === sharedName);
  expect(
    saved.schedules
      .filter((row) => row.nutrition_preset_id === shared.id)
      .map((row) => row.weekdays_mask)
      .sort((a, b) => a - b),
  ).toEqual([31, 96]);
  await undo(page);
  monday = await dayScope(page, width, 'Monday');
  card = monday.locator('.nutrition-schedule').filter({hasText: fixture.sharedMealName}).first();
  await card.click();
  await page.getByRole('dialog').getByRole('button', {name: 'Edit meal', exact: true}).click();
  const interruptedSharedName = `Interrupted breakfast ${width}`;
  await page.getByLabel('Meal name', {exact: true}).fill(interruptedSharedName);
  const originalSharedId = (await week()).presets.find((preset) => preset.name === fixture.sharedMealName).id;
  const interruptedEdit = await discardWriteResponse(page, `${base}/nutrition-presets/${originalSharedId}`, 'PATCH');
  await page.getByRole('button', {name: 'Save for every day', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Check saved week', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save for every day', exact: true})).toBeDisabled();
  await expect(page.getByLabel('Meal name', {exact: true})).toHaveValue(interruptedSharedName);
  await page.unroute(`**${base}/nutrition-presets/${originalSharedId}`);
  await page.getByRole('button', {name: 'Check saved week', exact: true}).click();
  saved = await settledWeek();
  const interruptedMeal = saved.presets.find((preset) => preset.name === interruptedSharedName);
  expect(saved.schedules.filter((schedule) => schedule.nutrition_preset_id === interruptedMeal.id)).toHaveLength(2);
  expect(interruptedEdit.writes).toBe(1);
  await send('post', `${base}/nutrition-undo`, {token: interruptedEdit.undoToken}, token);
  await page.reload();

  monday = await dayScope(page, width, 'Monday');
  const supplementCard = monday.locator('.nutrition-schedule').filter({hasText: fixture.supplementName});
  const supplementSchedule = (await week()).schedules.find(
    (schedule) =>
      initial.presets.find((preset) => preset.id === schedule.nutrition_preset_id)?.food?.name ===
      fixture.supplementName,
  );
  await supplementCard.click();
  dialog = page.getByRole('dialog', {name: fixture.supplementName, exact: true});
  await dialog.getByLabel(`Amount of ${fixture.supplementName}`, {exact: true}).fill('2');
  const interruptedSchedule = await discardWriteResponse(
    page,
    `${base}/nutrition-schedules/${supplementSchedule.id}`,
    'PATCH',
  );
  await dialog.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(dialog.getByRole('button', {name: 'Check saved week', exact: true})).toBeVisible();
  await expect(dialog.getByRole('button', {name: 'Save', exact: true})).toBeDisabled();
  await expect(dialog.getByLabel(`Amount of ${fixture.supplementName}`, {exact: true})).toHaveValue('2');
  await page.unroute(`**${base}/nutrition-schedules/${supplementSchedule.id}`);
  await dialog.getByRole('button', {name: 'Check saved week', exact: true}).click();
  saved = await settledWeek();
  expect(saved.presets.find((preset) => preset.food?.name === fixture.supplementName).amount).toBe(2);
  expect(interruptedSchedule.writes).toBe(1);
  await send('post', `${base}/nutrition-undo`, {token: interruptedSchedule.undoToken}, token);
  await page.reload();
  monday = await dayScope(page, width, 'Monday');
  card = monday.locator('.nutrition-schedule').filter({hasText: fixture.sharedMealName}).first();
  await card.click();
  await page.getByRole('dialog').getByLabel('Time (optional)', {exact: true}).fill('09:00');
  await page.getByRole('dialog').getByRole('button', {name: 'Save', exact: true}).click();
  saved = await settledWeek();
  expect(
    saved.schedules.find(
      (row) =>
        row.weekdays_mask === 31 &&
        saved.presets.find((preset) => preset.id === row.nutrition_preset_id)?.name === fixture.sharedMealName,
    ).time,
  ).toMatch(/^09:00/);
  await undo(page);
  await card.click();
  await page.getByRole('dialog').getByRole('button', {name: 'Any time', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Save', exact: true}).click();
  saved = await settledWeek();
  expect(
    saved.schedules.find(
      (row) =>
        row.weekdays_mask === 31 &&
        saved.presets.find((preset) => preset.id === row.nutrition_preset_id)?.name === fixture.sharedMealName,
    ).time,
  ).toBeNull();
  await undo(page);
  const openingWeek = page.waitForResponse(
    (response) => response.url().endsWith(`${base}/nutrition-week`) && response.request().method() === 'GET',
  );
  await card.click();
  await (await openingWeek).finished();
  const removalRead = await pauseWeekRead(page, `${base}/nutrition-week`);
  await page.getByRole('dialog').getByRole('button', {name: 'Remove from Monday', exact: true}).click();
  await removalRead.started;
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', {name: 'Remove from Monday', exact: true})).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Undo', exact: true})).toHaveCount(0);
  await removalRead.resume();
  saved = await settledWeek();
  const breakfastId = saved.presets.find((preset) => preset.name === fixture.sharedMealName).id;
  expect(
    saved.schedules
      .filter((row) => row.nutrition_preset_id === breakfastId)
      .map((row) => row.weekdays_mask)
      .sort((a, b) => a - b),
  ).toEqual([30, 96]);
  await expect(monday.getByRole('button', {name: 'Add to Monday', exact: true})).toBeFocused();
  const undoRead = await pauseWeekRead(page, `${base}/nutrition-week`);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await undoRead.started;
  await expect(monday.getByRole('button', {name: 'Add to Monday', exact: true})).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Undo', exact: true})).toBeDisabled();
  await undoRead.resume();
  await expect(page.getByRole('button', {name: 'Undo', exact: true})).toHaveCount(0);
  await expect(monday.locator('.nutrition-schedule').filter({hasText: fixture.sharedMealName})).toHaveCount(1);

  // Bounds validate after Save. Copying a shared target changes Monday alone.
  monday = await dayScope(page, width, 'Monday');
  await monday.getByRole('button', {name: /^Monday targets:/}).click();
  dialog = page.getByRole('dialog', {name: 'Monday targets', exact: true});
  await expect(dialog.getByText(/is also used on/)).toBeVisible();
  await dialog.getByRole('button', {name: 'Use a copy for Monday only', exact: true}).click();
  await select(page, 'Energy target', 'Between', dialog);
  await dialog.getByLabel('Energy from', {exact: true}).fill('2800');
  await dialog.getByLabel('Energy to', {exact: true}).fill('2600');
  await dialog.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(dialog.getByText('From must not be above to', {exact: true})).toBeVisible();
  await expect(dialog.getByLabel('Energy from', {exact: true})).toBeFocused();
  await dialog.getByLabel('Energy to', {exact: true}).fill('3000');
  await shot(page, `targets-${width}`);
  await dialog.getByRole('button', {name: 'Save', exact: true}).click();
  saved = await settledWeek();
  const originalTargets = saved.nutrition_targets.find((set) => set.name === fixture.targetsName);
  expect(originalTargets.targets.energy_kcal).toEqual({min: 2500, max: 2700});
  const mondayTargetsId = saved.target_schedules.find((row) => row.weekdays_mask & 1).nutrition_targets_id;
  expect(saved.nutrition_targets.find((set) => set.id === mondayTargetsId).targets.energy_kcal).toEqual({
    min: 2800,
    max: 3000,
  });
  expect(mondayTargetsId).not.toBe(originalTargets.id);
  await undo(page);
  await monday.getByRole('button', {name: /^Monday targets:/}).click();
  dialog = page.getByRole('dialog', {name: 'Monday targets', exact: true});
  await select(page, 'Protein target', 'At least', dialog);
  await dialog.getByLabel('Protein value', {exact: true}).fill('175');
  await dialog.getByRole('button', {name: 'Save', exact: true}).click();
  saved = await settledWeek();
  const target = saved.nutrition_targets.find((set) => set.name === fixture.targetsName);
  expect(target.targets.protein_g).toEqual({min: 175});
  expect(saved.target_schedules.find((row) => row.nutrition_targets_id === target.id).weekdays_mask).toBe(21);
  await undo(page);

  await monday.getByRole('button', {name: /^Monday targets:/}).click();
  dialog = page.getByRole('dialog', {name: 'Monday targets', exact: true});
  await dialog.getByRole('button', {name: 'Use a copy for Monday only', exact: true}).click();
  const interruptedTargetName = `Interrupted targets ${width}`;
  await dialog.getByLabel('Name', {exact: true}).fill(interruptedTargetName);
  const interruptedTargets = await discardWriteResponse(page, `${base}/nutrition-target-days/1`, 'PUT');
  await dialog.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(dialog.getByRole('button', {name: 'Check saved week', exact: true})).toBeVisible();
  await expect(dialog.getByRole('button', {name: 'Save', exact: true})).toBeDisabled();
  await expect(dialog.getByLabel('Name', {exact: true})).toHaveValue(interruptedTargetName);
  await page.unroute(`**${base}/nutrition-target-days/1`);
  await dialog.getByRole('button', {name: 'Check saved week', exact: true}).click();
  expect((await week()).nutrition_targets.filter((set) => set.name === interruptedTargetName)).toHaveLength(1);
  expect(interruptedTargets.writes).toBe(1);
  await send('post', `${base}/nutrition-undo`, {token: interruptedTargets.undoToken}, token);
  await page.reload();
  const final = await week();
  expect(final.presets).toEqual(initial.presets);
  expect(final.schedules).toEqual(initial.schedules);
  expect(final.nutrition_targets).toEqual(initial.nutrition_targets);
  expect(final.target_schedules).toEqual(initial.target_schedules);
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Nutrition week', exact: true})).toBeVisible();
  monday = await dayScope(page, width, 'Monday');
  await expect(monday.getByRole('button', {name: 'Add to Monday', exact: true})).toBeVisible();
  await shot(page, `verified-${width}`);
  results.push({
    width,
    clientId: fixture.clientId,
    passed: true,
    addMeal: true,
    addFood: true,
    addSupplement: true,
    sharedEdit: true,
    timing: true,
    removeDay: true,
    targetsCopy: true,
    sharedTargetsEdit: true,
    dirtyRecovery: true,
    failedSaveRetainsDraft: true,
    keyboard: true,
  });
  await context.close();
}

try {
  for (const width of [375, 1280]) {
    await journey(width);
  }
  expect(errors).toEqual([]);
  await writeFile(`${artifacts}/results.json`, `${JSON.stringify({passed: true, results, errors}, null, 2)}\n`);
  console.log('Nutrition week passed at 375px and 1280px with real API saves and Undo.');
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await writeFile(
      `${artifacts}/focus-failure.json`,
      `${JSON.stringify(
        await activePage.evaluate(() => ({
          active: {id: document.activeElement?.id, tag: document.activeElement?.tagName},
          trace: window.nutritionFocusTrace,
        })),
        null,
        2,
      )}\n`,
    );
    await writeFile(`${artifacts}/failure.txt`, await activePage.locator('body').ariaSnapshot());
    await activePage.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
  }
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
