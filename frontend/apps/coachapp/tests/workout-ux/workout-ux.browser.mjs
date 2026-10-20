import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect} from '@playwright/test';

// Run after test:today, which prepares the seeded accounts and a completed session.
const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const phase = process.env.UX_PHASE ?? 'after';
const artifacts = `${repo}/.scratch/workout/ux-review/${phase}`;
await mkdir(artifacts, {recursive: true});
const fixture = JSON.parse(
  await readFile(`${repo}/frontend/apps/clientapp/tests/today/artifacts/fixture.json`, 'utf8'),
);
const browser = await chromium.launch();
const errors = [];
const results = [];
const button = (page, name) => page.getByRole('button', {name, exact: true});

async function login(page, base, email) {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email', {exact: true}).fill(email);
  await button(page, 'Continue with email').click();
  await page.getByLabel('Verification code', {exact: true}).fill('123456');
  const token = page.waitForResponse(
    (response) => response.url().endsWith('/v1/auth/token') && response.request().method() === 'POST',
  );
  await button(page, 'Verify and continue').click();
  expect((await token).ok()).toBe(true);
  await expect(page).toHaveURL(base === 'http://localhost:1315' ? /1315\/$/ : /2022\/clients$/);
}

async function shot(page, name, fullPage = true) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
  await page.screenshot({path: `${artifacts}/${name}.png`, fullPage});
}

async function responsivePicker(page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  if (phase === 'after') {
    const box = await dialog.locator('..').boundingBox();
    if (page.viewportSize().width === 375) {
      expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.width - page.viewportSize().width)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.y + box.height - page.viewportSize().height)).toBeLessThanOrEqual(1);
    } else {
      expect(box.x).toBeGreaterThan(0);
      expect(box.x + box.width).toBeLessThan(page.viewportSize().width);
      expect(box.y + box.height).toBeLessThan(page.viewportSize().height);
    }
    expect(box.y).toBeGreaterThan(0);
  }
  const search = dialog.getByLabel('Search exercises', {exact: true});
  await search.focus();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
}

async function recover(page, inputName, actionName, name) {
  await page.getByLabel(inputName, {exact: true}).fill('11');
  const routePattern = /\/workout-logs\/[^/]+\/exercise-logs\/[^/]+\/sets(?:\/[^/?]+)?(?:\?.*)?$/;
  let fail;
  const held = new Promise((resolve) => {
    fail = resolve;
  });
  await page.route(routePattern, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    if (phase === 'after') {
      await held;
    }
    await route.abort();
  });
  await button(page, actionName).click();
  if (phase === 'after') {
    await expect(page.getByRole('region', {name: 'Workout save status', exact: true})).toContainText('Saving…');
    await shot(page, `${name}-saving`, false);
    fail();
  }
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(button(page, 'Retry saving')).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, `${name}-recovery`, false);
  if (phase === 'after') {
    await expect(button(page, 'Retry saving')).toBeInViewport();
    await expect(page.getByRole('alert')).toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await expect(button(page, 'Retry saving')).toBeInViewport();
    await shot(page, `${name}-recovery-scrolled`, false);
  }
  await page.unroute(routePattern);
  await button(page, 'Retry saving').click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(button(page, actionName)).toBeEnabled();
}

try {
  const clientContext = await browser.newContext({viewport: {width: 375, height: 812}, locale: 'en-US'});
  const client = await clientContext.newPage();
  client.on('pageerror', (error) => errors.push(error.message));
  await login(client, 'http://localhost:1315', fixture.email);
  await client.goto(`http://localhost:1315/?date=${fixture.today}`);
  const plan = client.getByRole('list', {name: 'Plan', exact: true});
  await expect(plan).toBeVisible();
  await shot(client, 'today-375');
  await plan
    .getByRole('button', {name: /Lower A/})
    .first()
    .click();
  const clientSave = 'Save changes to set 1 left of Bulgarian split squat';
  await expect(button(client, 'Reopen').or(button(client, clientSave))).toBeVisible();
  if (await button(client, 'Reopen').count()) {
    await button(client, 'Reopen').click();
  }
  await expect(button(client, clientSave)).toBeEnabled();
  if (phase === 'after') {
    const reps = await client.getByLabel('Bulgarian split squat set 1 left Reps', {exact: true}).boundingBox();
    const weight = await client.getByLabel('Bulgarian split squat set 1 left Weight (kg)', {exact: true}).boundingBox();
    expect(Math.abs(reps.y - weight.y)).toBeLessThanOrEqual(1);
    expect(reps.height).toBeGreaterThanOrEqual(44);
  }
  await client.evaluate(() => window.scrollTo(0, 0));
  await shot(client, 'client-session-375');
  await button(client, 'Swap Front squat').click();
  await expect(client.getByLabel('Search exercises', {exact: true})).toBeVisible();
  await expect(client.getByRole('dialog').getByRole('list')).toBeVisible();
  await shot(client, 'client-picker-375', false);
  await responsivePicker(client);
  await expect(button(client, 'Swap Front squat')).toBeFocused();
  await recover(client, 'Bulgarian split squat set 1 left Reps', clientSave, 'client-375');

  for (const width of [1280, 375]) {
    const context = await browser.newContext({viewport: {width, height: 900}, locale: 'en-US'});
    const coach = await context.newPage();
    coach.on('pageerror', (error) => errors.push(error.message));
    await login(coach, 'http://localhost:2022', fixture.coachEmail);
    await coach.goto('http://localhost:2022/exercises');
    await expect(coach.getByRole('heading', {name: 'Exercise library', exact: true})).toBeVisible();
    await expect(coach.getByRole('list', {name: 'exercises', exact: true})).toBeVisible();
    await shot(coach, `exercise-library-${width}`);
    await coach.goto(`http://localhost:2022/exercises/${fixture.splitExerciseId}`);
    await expect(coach.getByLabel('Exercise name', {exact: true})).toBeVisible();
    await shot(coach, `exercise-editor-${width}`);
    if (phase === 'after' && width === 375) {
      const save = await button(coach, 'Save exercise').boundingBox();
      const remove = await button(coach, 'Delete exercise').boundingBox();
      expect(remove.y).toBeGreaterThan(save.y + save.height);
    }
    await coach.goto(`http://localhost:2022/clients/${fixture.clientId}/training`);
    await expect(coach.getByRole('heading', {name: 'Training week', exact: true})).toBeVisible();
    await expect(coach.getByRole('region', {name: 'Recent sessions', exact: true})).toBeVisible();
    if (phase === 'after' && width === 375) {
      const today = new Date(`${fixture.today}T12:00:00Z`).toLocaleDateString('en', {weekday: 'long', timeZone: 'UTC'});
      await expect(coach.getByRole('tablist', {name: 'Day', exact: true})).toBeVisible();
      await expect(coach.getByRole('tab', {name: today, exact: true})).toHaveAttribute('aria-selected', 'true');
      await expect(coach.getByRole('tabpanel')).toHaveCount(1);
      await expect(coach.getByRole('button', {name: `Add to ${today}`, exact: true})).toBeVisible();
    } else if (phase === 'after') {
      await expect(coach.getByRole('button', {name: 'Add to Sunday', exact: true})).toBeVisible();
      await expect(coach.getByRole('tablist', {name: 'Day', exact: true})).toHaveCount(0);
    }
    await expect(button(coach, 'Open')).toBeEnabled();
    await shot(coach, `training-week-${width}`);
    await coach.goto(`http://localhost:2022/clients/${fixture.clientId}/training/workouts/${fixture.workoutId}`);
    await expect(coach.getByLabel('Workout name', {exact: true})).toBeVisible();
    await button(coach, 'Add exercise').click();
    await expect(coach.getByLabel('Search exercises', {exact: true})).toBeVisible();
    await expect(coach.getByRole('dialog').getByRole('list', {name: 'exercises', exact: true})).toBeVisible();
    await shot(coach, `builder-picker-${width}`, false);
    await responsivePicker(coach);
    await expect(button(coach, 'Add exercise')).toBeFocused();
    if (phase === 'after') {
      await coach.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
      const header = await coach.locator('.app-header').boundingBox();
      const saved = await coach.getByRole('status').filter({hasText: 'All changes saved'}).boundingBox();
      expect(saved.y).toBeGreaterThanOrEqual(header.y + header.height);
      await shot(coach, `builder-scrolled-${width}`, false);
    }
    // Open the client-recorded session through Recent sessions.
    await coach.goto(`http://localhost:2022/clients/${fixture.clientId}/training`);
    await coach
      .getByRole('list', {name: 'sessions', exact: true})
      .getByRole('link')
      .filter({hasText: 'Lower A'})
      .first()
      .click();
    await expect(coach.getByText('Alex is recording this session', {exact: true})).toBeVisible();
    await expect(button(coach, clientSave)).toBeEnabled();
    if (phase === 'after') {
      const overall = coach.getByRole('group', {name: 'Overall result for Run', exact: true});
      const distance = await overall.getByLabel('Run overall Distance (m)', {exact: true}).boundingBox();
      const save = await button(overall, 'Save overall result').boundingBox();
      expect(save.y).toBeGreaterThanOrEqual(distance.y + distance.height);
    }
    await coach.evaluate(() => window.scrollTo(0, 0));
    await shot(coach, `coach-session-${width}`);
    await button(coach, 'Swap Front squat').click();
    await expect(coach.getByRole('dialog').getByRole('list', {name: 'exercises', exact: true})).toBeVisible();
    await shot(coach, `coach-session-picker-${width}`, false);
    await responsivePicker(coach);
    await expect(button(coach, 'Swap Front squat')).toBeFocused();
    await recover(coach, 'Bulgarian split squat set 1 left Reps', clientSave, `coach-${width}`);
    results.push({width, coach: true, pickerKeyboard: true, recovery: true});
    await context.close();
  }
  await button(client, 'Finish workout').click();
  await button(client.getByRole('dialog'), 'Save workout').click();
  await expect(client.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  await clientContext.close();
  expect(errors).toEqual([]);
  await writeFile(`${artifacts}/ux-results.json`, JSON.stringify({phase, results, errors}, null, 2));
  console.log(`Workout UX ${phase}: seeded coach 1280/375, client 375, picker focus and failed-save recovery passed.`);
} finally {
  await browser.close();
}
