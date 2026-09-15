import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

execFileSync(
  'rtk',
  ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./seed-catalog.exs', import.meta.url))],
  {cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)), stdio: 'pipe'},
);

const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/exercises/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.json();
}
async function account(unique) {
  const email = `exercise-library-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `el-${unique}`}, guest.access_token);
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
    const context = await browser.newContext({
      baseURL: process.env.COACH_APP_URL || 'http://localhost:2022',
      viewport: {width, height: 900},
    });
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/training-plans');
    await page.getByRole('link', {name: 'Exercise library', exact: true}).click();
    await page.getByRole('link', {name: 'Create exercise', exact: true}).click();
    const name = page.getByLabel('Exercise name', {exact: true});
    const instructions = page.getByLabel('Coaching instructions', {exact: true});
    const save = page.getByRole('button', {name: 'Save exercise', exact: true});
    const details = page.getByText('Equipment, muscles and other details', {exact: true});
    await name.fill(' ');
    await save.click();
    await expect(name).toBeFocused();
    await expect(page.getByText('Enter an exercise name.', {exact: true})).toBeVisible();
    await name.fill('Goblet squat');
    await instructions.fill('Hold the dumbbell close to your chest. Sit between your hips and stand tall.');
    await details.click();
    await page.getByLabel('Short description', {exact: true}).fill('A squat with a dumbbell held at chest height.');
    await chooseOption(selectTrigger(page, 'Movement type'), 'Compound');
    await chooseOption(selectTrigger(page, 'Force'), 'Push');
    await page.route('**/v1/coach/training-equipment?*', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Choose equipment', exact: true}).click();
    const equipmentDialog = page.getByRole('dialog', {name: 'Choose equipment', exact: true});
    await expect(equipmentDialog.getByRole('alert')).toBeVisible();
    await page.unroute('**/v1/coach/training-equipment?*');
    await equipmentDialog.getByRole('button', {name: 'Try again', exact: true}).click();
    await equipmentDialog.getByLabel('Search equipment', {exact: true}).fill('Dumbbells');
    await equipmentDialog.getByRole('checkbox', {name: 'Dumbbells', exact: true}).focus();
    await page.keyboard.press('Space');
    await equipmentDialog.getByLabel('Search equipment', {exact: true}).fill('Bench');
    await equipmentDialog.getByText('Bench', {exact: true}).click();
    await equipmentDialog.getByRole('button', {name: 'Remove Bench', exact: true}).click();
    await equipmentDialog.getByRole('button', {name: 'Use selection', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Choose muscles', exact: true}).click();
    const musclesDialog = page.getByRole('dialog', {name: 'Choose muscles', exact: true});
    await musclesDialog.getByLabel('Search muscles', {exact: true}).fill('Quadriceps');
    await musclesDialog.getByText('Quadriceps', {exact: true}).click();
    await musclesDialog.getByRole('button', {name: 'Use selection', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    // Classification errors must reveal the optional section and explain the focused field.
    for (const [field, label] of [
      ['mechanics', 'Movement type'],
      ['force', 'Force'],
    ]) {
      await details.click();
      await page.route('**/v1/coach/training-exercises', (route) =>
        route.fulfill({
          status: 422,
          json: {
            error_code: 'invalid_input',
            error_detail: {fields: {[field]: ['Choose a supported classification.']}},
          },
        }),
      );
      await save.click();
      await expect(selectTrigger(page, label)).toBeFocused();
      await expect(page.getByText('Choose a supported classification.', {exact: true})).toBeVisible();
      await expect(selectTrigger(page, label).locator('..')).toHaveAttribute('data-invalid', 'true');
      await expect(selectTrigger(page, label)).toHaveAccessibleDescription('Choose a supported classification.');
      await page.screenshot({path: `tests/exercises/artifacts/validation-${field}-${width}.png`});
      await page.unroute('**/v1/coach/training-exercises');
    }
    await page.getByRole('link', {name: 'Back to exercises', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await save.click();
    await expect(page).toHaveURL(/training-exercises\/[0-9a-f-]+$/);
    await expect(instructions).toHaveValue(
      'Hold the dumbbell close to your chest. Sit between your hips and stand tall.',
    );
    await expect(save).toBeDisabled();
    const id = page.url().split('/').at(-1);
    const endpoint = `/v1/coach/training-exercises/${id}`;
    let exercise = (await send('get', endpoint, undefined, token)).data;
    expect(exercise.mechanics).toBe('compound');
    expect(exercise.force).toBe('push');
    expect(exercise.equipment.map((item) => item.name)).toEqual(['Dumbbells']);
    expect(exercise.muscles.map((item) => item.name)).toEqual(['Quadriceps']);
    // A concurrent change to an untouched field and existing images must survive this edit.
    await send(
      'patch',
      endpoint,
      {description: 'Changed by another coach', images: ['https://example.test/squat.png']},
      token,
    );
    await instructions.fill('Keep your whole foot on the floor. Stand tall.');
    await page.route(`**${endpoint}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(instructions).toHaveValue('Keep your whole foot on the floor. Stand tall.');
    await page.unroute(`**${endpoint}`);
    await save.click();
    await expect(page.getByText('Exercise saved.', {exact: true})).toBeFocused();
    exercise = (await send('get', endpoint, undefined, token)).data;
    expect(exercise.description).toBe('Changed by another coach');
    expect(exercise.images).toEqual(['https://example.test/squat.png']);
    await details.click();
    await expect(page.getByLabel('Short description', {exact: true})).toHaveValue('Changed by another coach');
    await page.getByLabel('Short description', {exact: true}).fill('A squat with a dumbbell held at chest height.');
    await save.click();
    await expect(page.getByText('Exercise saved.', {exact: true})).toBeFocused();
    await expect(name).toBeEnabled();
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/exercises/artifacts/editor-${width}.png`, fullPage: true});
    await chooseOption(selectTrigger(page, 'Force'), 'Not specified');
    await chooseOption(selectTrigger(page, 'Movement type'), 'Not specified');
    await page.getByRole('button', {name: 'Choose muscles', exact: true}).click();
    await musclesDialog.getByRole('button', {name: 'Remove Quadriceps', exact: true}).click();
    await musclesDialog.getByRole('button', {name: 'Use selection', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await page.getByLabel('Short description', {exact: true}).fill('');
    await save.click();
    await expect(page.getByText('Exercise saved.', {exact: true})).toBeFocused();
    exercise = (await send('get', endpoint, undefined, token)).data;
    expect(exercise.muscles).toEqual([]);
    expect(exercise.force).toBeNull();
    expect(exercise.mechanics).toBeNull();
    expect(exercise.description).toBeNull();
    // An interrupted update can be reviewed without silently replacing the draft.
    await instructions.fill('Temporary draft');
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        return route.continue();
      }
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      return route.abort('connectionfailed');
    });
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(instructions).toHaveValue('Temporary draft');
    await page.unroute(`**${endpoint}`);
    await expect(page.locator('form').getByRole('alert').locator('..')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Review saved version', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Load saved exercise', exact: true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('form').getByRole('alert').locator('..')).toBeFocused();
    await expect(instructions).toHaveValue('Temporary draft');
    await page.unroute(`**${endpoint}`);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Review saved version', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    await page.getByRole('button', {name: 'Load saved exercise', exact: true}).click();
    await expect(page.getByText('Saved version loaded.', {exact: true})).toBeFocused();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(save).toBeDisabled();
    await instructions.fill('Keep your whole foot on the floor. Stand tall.');
    await save.click();
    await expect(page.getByText('Exercise saved.', {exact: true})).toBeFocused();
    const shared = {...(await send('get', endpoint, undefined, token)).data, source: 'system'};
    await page.route(`**${endpoint}`, (route) => route.fulfill({json: {data: shared}}));
    await page.reload();
    await expect(page.getByText('This shared exercise is read-only.', {exact: true})).toBeVisible();
    await expect(instructions).toBeDisabled();
    await expect(save).toHaveCount(0);
    await page.unroute(`**${endpoint}`);
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.reload();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(name).toBeEnabled();
    await page.getByRole('link', {name: 'Back to exercises', exact: true}).click();
    await page.getByRole('link', {name: 'Create exercise', exact: true}).click();
    await name.fill('Goblet squat');
    await save.click();
    await expect(page.getByText('has already been taken', {exact: true})).toBeVisible();
    await expect(name).toBeFocused();
    await name.fill('Unconfirmed press');
    let unknownAttempts = 0;
    await page.route('**/v1/coach/training-exercises', (route) => {
      unknownAttempts += 1;
      return route.fulfill({status: 503, json: {}});
    });
    await save.click();
    await expect(page.getByRole('button', {name: 'Check saved exercises', exact: true})).toBeVisible();
    await expect(name).toBeDisabled();
    await expect(instructions).toBeDisabled();
    await page.unroute('**/v1/coach/training-exercises');
    await page.getByRole('button', {name: 'Check saved exercises', exact: true}).click();
    await expect(page.getByText('No matching exercises found.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Return to draft', exact: true}).click();
    await expect(name).toHaveValue('Unconfirmed press');
    await expect(name).toBeDisabled();
    await page.getByRole('button', {name: 'Check saved exercises', exact: true}).click();
    await page.getByRole('button', {name: 'Create a separate exercise', exact: true}).click();
    await expect(name).toBeEnabled();
    await expect(name).toBeFocused();
    await expect(name).toHaveValue('Unconfirmed press');
    expect(unknownAttempts).toBe(1);
    await name.fill('Split squat');
    let creates = 0;
    await page.route('**/v1/coach/training-exercises', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }
      creates++;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      return route.abort('connectionfailed');
    });
    await save.click();
    await expect(page.getByRole('button', {name: 'Check saved exercises', exact: true})).toBeVisible();
    await expect(save).toBeDisabled();
    await page.unroute('**/v1/coach/training-exercises');
    await page.getByRole('button', {name: 'Check saved exercises', exact: true}).click();
    await page.getByRole('button', {name: 'Open saved exercise', exact: true}).click();
    await expect(page).toHaveURL(/training-exercises\/[0-9a-f-]+$/);
    await expect(name).toHaveValue('Split squat');
    expect(creates).toBe(1);
    for (let index = 0; index < 43; index++) {
      await send('post', '/v1/coach/training-exercises', {name: `Movement ${String(index).padStart(2, '0')}`}, token);
    }
    await page.getByRole('link', {name: 'Back to exercises', exact: true}).click();
    const rows = page.getByRole('list', {name: 'exercises', exact: true}).locator(':scope > li');
    await page.getByRole('button', {name: 'Refresh exercises', exact: true}).click();
    const count = (await send('get', '/v1/coach/training-exercises?cursor=start&limit=20', undefined, token)).count;
    await expect(page.getByText(`${count} exercises`, {exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.route('**/v1/coach/training-exercises?*', (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute('**/v1/coach/training-exercises?*');
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    const row = rows.nth(30).getByRole('link');
    await row.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await row.click();
    await expect(name).toBeVisible();
    await page.getByRole('link', {name: 'Back to exercises', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll - 150);
    await page.getByLabel('Search exercises', {exact: true}).fill('Goblet squat');
    await expect(rows).toHaveCount(1);
    await rows.getByRole('link').click();
    await page.getByRole('link', {name: 'Back to exercises', exact: true}).click();
    await expect(page.getByLabel('Search exercises', {exact: true})).toHaveValue('Goblet squat');
    await page.reload();
    await expect(rows).toHaveCount(1);
    await page.getByLabel('Search exercises', {exact: true}).fill('no-such-exercise');
    await expect(page.getByText('No matching exercises', {exact: true})).toBeVisible();
    await page.getByLabel('Search exercises', {exact: true}).fill('Goblet squat');
    await expect(rows).toHaveCount(1);
    await page.screenshot({path: `tests/exercises/artifacts/library-${width}.png`, fullPage: true});
    await page.getByRole('link', {name: 'Back to training plans', exact: true}).click();
    await page.getByRole('link', {name: 'Create template', exact: true}).click();
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('Squat foundations');
    await page.getByRole('button', {name: 'Add exercises', exact: true}).click();
    await page.getByLabel('Search exercises', {exact: true}).fill('Goblet squat');
    const picker = page.getByRole('dialog', {name: 'Add exercises', exact: true});
    await picker.getByText('Exercise details', {exact: true}).click();
    await expect(picker).toContainText('Keep your whole foot on the floor. Stand tall.');
    await expect(picker).toContainText('Dumbbells');
    await page.getByRole('button', {name: 'Select Goblet squat', exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 exercise', exact: true}).click();
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page).toHaveURL(/training-plans\/[0-9a-f-]+$/);
    if (width === 375) {
      await page.goto(`/training-exercises/${id}`);
      await instructions.fill('Pending update');
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${endpoint}`, async (route) => {
        if (route.request().method() !== 'PATCH') {
          return route.continue();
        }
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await save.click();
      await held.promise;
      await expect(instructions).toBeDisabled();
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
        }, id),
      ).toBe(false);
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Exercise authoring, references, recovery, lists, training reuse and session isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
