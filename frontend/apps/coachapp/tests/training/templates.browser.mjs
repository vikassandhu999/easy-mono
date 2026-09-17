import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const appURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
await mkdir('tests/training/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.json();
}
async function assignDay(page, day, name) {
  await page.getByRole('button', {name: new RegExp(`^${day}:`)}).click();
  await page.getByRole('dialog').getByRole('button', {name, exact: true}).click();
}
async function account(unique) {
  const email = `builder-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `builder-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const exercisePrefix = `Template ${unique}`;
    const firstExercise = `${exercisePrefix} Exercise 00`;
    const secondExercise = `${exercisePrefix} Exercise 01`;
    for (let index = 0; index < 43; index++) {
      await send(
        'post',
        '/v1/coach/training-exercises',
        {name: `${exercisePrefix} Exercise ${String(index).padStart(2, '0')}`},
        token,
      );
    }
    const catalog = await send('get', '/v1/coach/training-exercises?cursor=start&limit=1', undefined, token);
    const context = await browser.newContext({baseURL: appURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/');
    await page.getByRole('link', {name: 'Training', exact: true}).click();
    await expect(page.getByText('Create your first training template', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Create template', exact: true}).click();
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('');
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toBeFocused();
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('Full body foundations');
    await page.getByText('Add a description', {exact: true}).click();
    await page.getByLabel('Description', {exact: true}).fill('Build consistency with two weekly sessions.');
    await page.route('**/v1/coach/training-plans', (route) =>
      route.request().method() === 'POST' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Check training plans', exact: true})).toBeVisible();
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toHaveValue('Full body foundations');
    await expect(page.getByRole('button', {name: 'Save plan', exact: true})).toBeDisabled();
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toBeDisabled();
    await expect(page.getByRole('button', {name: 'Add exercises', exact: true})).toBeDisabled();
    await page.unroute('**/v1/coach/training-plans');
    await page.route('**/v1/coach/training-plans?*', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Check training plans', exact: true}).click();
    const recovery = page.getByRole('dialog', {name: 'Check training plans', exact: true});
    await expect(recovery.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await expect(recovery.getByRole('button', {name: 'Create a separate template', exact: true})).toBeDisabled();
    await page.unroute('**/v1/coach/training-plans?*');
    await recovery.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(recovery.getByText('No saved template found with this name.', {exact: false})).toBeVisible();
    await page.screenshot({path: `tests/training/artifacts/creation-recovery-${width}.png`, animations: 'disabled'});
    await recovery.getByRole('button', {name: 'Return to draft', exact: true}).click();
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toBeDisabled();
    await page.getByRole('button', {name: 'Back to library', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Discard changes', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await page.getByRole('button', {name: 'Check training plans', exact: true}).click();
    await recovery.getByRole('button', {name: 'Create a separate template', exact: true}).click();
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toBeFocused();
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toHaveValue('Full body foundations');
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page).toHaveURL(/training-plans\/[0-9a-f-]+$/);
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toHaveValue('Full body foundations');
    const planId = new URL(page.url()).pathname.split('/').at(-1);
    const endpoint = `/v1/coach/training-plans/${planId}`;
    await page.route('**/v1/coach/training-exercises?*', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Add exercises', exact: true}).click();
    const picker = page.getByRole('dialog', {name: 'Add exercises', exact: true});
    await expect(picker.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.unroute('**/v1/coach/training-exercises?*');
    await picker.getByRole('button', {name: 'Try again', exact: true}).click();
    const exerciseRows = picker.getByRole('list', {name: 'exercises', exact: true}).locator(':scope > li');
    await expect(exerciseRows).toHaveCount(20);
    await expect(picker.getByText(`${catalog.count} exercises`, {exact: true})).toBeVisible();
    await picker.getByLabel('Search exercises', {exact: true}).fill(exercisePrefix);
    await expect(picker.getByText('43 exercises', {exact: true})).toBeVisible();
    await expect(exerciseRows).toHaveCount(20);
    let pageFailures = 0;
    await page.route('**/v1/coach/training-exercises?*', (route) => {
      if (new URL(route.request().url()).searchParams.get('cursor') !== 'start') {
        pageFailures++;
        return route.fulfill({status: 503, json: {}});
      }
      return route.continue();
    });
    await picker.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(picker.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(exerciseRows).toHaveCount(20);
    expect(pageFailures).toBe(1);
    await page.unroute('**/v1/coach/training-exercises?*');
    await picker.getByRole('button', {name: 'Retry loading more', exact: true}).focus();
    await page.keyboard.press('Enter');
    await expect(exerciseRows).toHaveCount(40);
    await picker.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(exerciseRows).toHaveCount(43);
    await picker.getByLabel('Search exercises', {exact: true}).fill('zzzz');
    await expect(picker.getByText('No matching exercises. Try a different name.', {exact: true})).toBeVisible();
    await picker.getByLabel('Search exercises', {exact: true}).fill(firstExercise);
    await expect(picker.getByText('1 exercise', {exact: true})).toBeVisible();
    await picker.getByRole('button', {name: `Select ${firstExercise}`, exact: true}).click();
    await picker.getByRole('button', {name: 'Add 1 exercise', exact: true}).click();
    await expect(picker).toHaveCount(0);
    await page.getByRole('textbox', {name: 'Workout name', exact: true}).fill('');
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('textbox', {name: 'Workout name', exact: true})).toBeFocused();
    await page.getByRole('textbox', {name: 'Workout name', exact: true}).fill('Full body A');
    await chooseOption(selectTrigger(page, 'Sets'), '1');
    await page.getByRole('button', {name: 'Vary sets & add details', exact: true}).click();
    const prescription = page.getByRole('region', {
      name: `${firstExercise} prescription`,
      exact: true,
      includeHidden: true,
    });
    await prescription.getByLabel('Reps', {exact: true}).fill('8–10');
    await prescription.getByLabel('Load', {exact: true}).fill('0');
    await prescription.getByRole('button', {name: 'Set 1 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'More details', exact: true}).click();
    await chooseOption(selectTrigger(prescription, 'Load unit'), 'kg');
    await prescription.getByLabel('Rest (seconds)', {exact: true}).fill('0');
    await prescription.getByLabel('RPE', {exact: true}).fill('11');
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(prescription.getByText('Enter an RPE from 1 to 10.', {exact: true})).toBeVisible();
    await prescription.getByLabel('RPE', {exact: true}).fill('7.5');
    await prescription.getByLabel('Duration (seconds)', {exact: true}).fill('60');
    await prescription.getByLabel('Distance', {exact: true}).fill('1.5');
    await chooseOption(selectTrigger(prescription, 'Distance unit'), 'km');
    await prescription.getByLabel('Set notes', {exact: true}).fill('Controlled movement.');
    await prescription.getByRole('button', {name: 'Repeat last set', exact: true}).click();
    await prescription.getByRole('button', {name: 'Set 2 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'More details', exact: true}).click();
    await chooseOption(selectTrigger(prescription, 'Set type').nth(1), 'Warm-up');
    await prescription.getByLabel('Load', {exact: true}).nth(1).fill('12.5');
    await prescription.getByRole('button', {name: 'Set 2 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Move up', exact: true}).click();
    await expect(prescription.getByLabel('Load', {exact: true}).first()).toHaveValue('12.5');
    await assignDay(page, 'monday', 'Full body A');
    await assignDay(page, 'thursday', 'Full body A');
    await page.getByRole('link', {name: 'Training', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Leave without saving?', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await page.route(`**${endpoint}/prescription`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(prescription.getByLabel('Load', {exact: true}).first()).toHaveValue('12.5');
    await page.unroute(`**${endpoint}/prescription`);
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    let saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.workout_count).toBe(1);
    const originalWorkoutId = saved.workouts[0].id;
    const originalExerciseId = saved.workouts[0].workout_elements[0].id;
    expect(saved.schedule.monday).toBe(originalWorkoutId);
    expect(saved.schedule.tuesday).toBe(null);
    expect(saved.workouts[0].workout_elements[0].planned_sets[1]).toMatchObject({
      load_value: '0',
      rest_seconds: 0,
      duration_seconds: 60,
      distance_value: '1.5',
      distance_unit: 'km',
      rpe: '7.5',
      notes: 'Controlled movement.',
    });
    await page.reload();
    await expect(prescription.getByLabel('Load', {exact: true}).first()).toHaveValue('12.5');
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('Full body strength');
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Add workout', exact: true}).click();
    await page.getByRole('dialog').getByLabel('Search exercises', {exact: true}).fill(secondExercise);
    await page.getByRole('button', {name: `Select ${secondExercise}`, exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 exercise', exact: true}).click();
    await page.getByRole('textbox', {name: 'Workout name', exact: true}).fill('Full body B');
    await page.getByRole('button', {name: 'workout 2 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Move up', exact: true}).click();
    await expect(page.getByRole('textbox', {name: 'Workout name', exact: true}).first()).toHaveValue('Full body B');
    await expect(prescription.getByLabel('Load', {exact: true}).first()).toHaveValue('12.5');
    await assignDay(page, 'friday', 'Full body B');
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.workouts.map((workout) => workout.name)).toEqual(['Full body B', 'Full body A']);
    expect(saved.workouts[1].id).toBe(originalWorkoutId);
    expect(saved.workouts[1].workout_elements[0].id).toBe(originalExerciseId);
    await page.getByRole('textbox', {name: 'Workout name', exact: true}).first().fill('My unsaved change');
    await send('patch', endpoint, {expected_revision: saved.revision, name: 'Updated elsewhere'}, token);
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('This plan changed elsewhere.');
    await expect(page.getByRole('textbox', {name: 'Workout name', exact: true}).first()).toHaveValue(
      'My unsaved change',
    );
    await expect(page.getByRole('button', {name: 'Save plan', exact: true})).toBeDisabled();
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved prescription', exact: true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Latest saved version loaded.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toHaveValue('Updated elsewhere');
    await expect(page.getByRole('textbox', {name: 'Workout name', exact: true}).first()).toHaveValue('Full body B');
    await page.getByRole('button', {name: 'workout 1 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Remove workout 1', exact: true}).click();
    await expect(page.getByRole('button', {name: 'friday: Rest', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    await page.getByRole('textbox', {name: 'Workout name', exact: true}).fill('Saved despite lost response');
    await page.route(`**${endpoint}/prescription`, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.fulfill({status: 503, json: {}});
    });
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}/prescription`);
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved prescription', exact: true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Latest saved version loaded.', {exact: true})).toBeVisible();
    await expect(page.getByRole('textbox', {name: 'Workout name', exact: true})).toHaveValue(
      'Saved despite lost response',
    );
    await expect(page.getByRole('button', {name: 'Save plan', exact: true})).toBeDisabled();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path: `tests/training/artifacts/template-editor-${width}.png`, fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', {name: 'Back to library', exact: true}).click();
    await expect(page.getByRole('link', {name: /Updated elsewhere/})).toContainText('1 workout');
    await page.getByLabel('Search training plans', {exact: true}).fill('Updated elsewhere');
    await expect(page).toHaveURL(/search=Updated/);
    await page.getByRole('link', {name: /Updated elsewhere/}).click();
    await page.getByRole('link', {name: 'Back to training plans', exact: true}).click();
    await expect(page).toHaveURL(/search=Updated/);
    await page.reload();
    await expect(page.getByLabel('Search training plans', {exact: true})).toHaveValue('Updated elsewhere');
    const person = (
      await send(
        'post',
        '/v1/coach/clients/invite',
        {email: `builder-client-${unique}@example.test`, first_name: 'Alex'},
        token,
      )
    ).data;
    await page.goto(`/clients/${person.id}/training-plans/assign`);
    await page.getByRole('link', {name: /Updated elsewhere/}).click();
    await expect(page.getByText('Saved despite lost response', {exact: true})).toBeVisible();
    await page.getByLabel('Start date', {exact: true}).fill(new Date().toISOString().slice(0, 10));
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(page.getByRole('list', {name: 'assigned plans', exact: true})).toContainText('Updated elsewhere');
    for (let index = 0; index < 44; index++) {
      await send('post', '/v1/coach/training-plans', {name: `Library ${String(index).padStart(2, '0')}`}, token);
    }
    await page.goto('/training-plans');
    await page.getByRole('button', {name: 'Refresh training templates', exact: true}).click();
    const rows = page.getByRole('list', {name: 'training templates', exact: true}).locator(':scope > li');
    await expect(rows).toHaveCount(20);
    await expect(page.getByText('45 training templates', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(40);
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(45);
    const row = rows.nth(30).getByRole('link');
    const href = await row.getAttribute('href');
    await row.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await page.route(`**/v1/coach${href}`, (route) => route.fulfill({status: 503, json: {}}));
    await row.click();
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.unroute(`**/v1/coach${href}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByText('Start with the movements', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to training plans', exact: true}).click();
    await expect(rows).toHaveCount(45);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll - 150);
    await page.getByLabel('Search training plans', {exact: true}).fill('Updated elsewhere');
    await expect(page).toHaveURL(/search=Updated/);
    await expect(rows).toHaveCount(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path: `tests/training/artifacts/template-library-${width}.png`, fullPage: true});
    if (width === 375) {
      await page.getByRole('link', {name: /Updated elsewhere/}).click();
      await page.getByRole('textbox', {name: 'Workout name', exact: true}).fill('Do not leak this draft');
      const otherTokens = await account(`other-${unique}`);
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${endpoint}/prescription`, async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        held.resolve();
        await release.promise;
        await route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Save plan', exact: true}).click();
      await held.promise;
      await expect(page.getByRole('textbox', {name: 'Workout name', exact: true})).toBeDisabled();
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, otherTokens);
      await page.getByRole('link', {name: 'Training', exact: true}).click();
      await expect(page.getByText('Create your first training template', {exact: true})).toBeVisible();
      release.resolve();
      await page.waitForLoadState('networkidle');
      expect(
        await page.evaluate(async (id) => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient
            .getQueryCache()
            .getAll()
            .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
        }, planId),
      ).toBe(false);
      await expect(page).toHaveURL(`${appURL}/training-plans`);
    }
    await context.close();
    console.log(`Template creation, exercise paging, editing, revision recovery and assignment passed at ${width}px.`);
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
