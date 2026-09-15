import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:22022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:44000'});
const browser = await chromium.launch();
await mkdir('tests/exercises/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `exercise-management-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `em-${unique}`}, guest.access_token);
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
    const source = (
      await send(
        'post',
        '/v1/coach/training-exercises',
        {
          name: 'Goblet squat',
          instructions: 'Keep your whole foot on the floor.',
          description: 'A squat with a dumbbell held at chest height.',
          mechanics: 'compound',
          force: 'push',
          images: ['https://example.test/exercise.png'],
        },
        token,
      )
    ).data;
    const endpoint = `/v1/coach/training-exercises/${source.id}`;
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (value) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(value);
    }, tokens);
    await page.goto('/training-exercises?search=Goblet');
    await page.getByRole('link', {name: /Goblet squat/}).click();
    const name = page.getByLabel('Exercise name', {exact: true});
    const instructions = page.getByLabel('Coaching instructions', {exact: true});
    const copy = page.getByRole('button', {name: 'Copy exercise', exact: true});
    const dialog = page.getByRole('dialog');
    await instructions.fill('Unsaved instructions');
    await expect(copy).toBeDisabled();
    await page.getByText('Remove from library', {exact: true}).click();
    await expect(page.getByRole('button', {name: 'Delete exercise', exact: true})).toBeDisabled();
    await instructions.fill(source.instructions);
    await copy.click();
    await dialog.getByLabel('Name for the copy', {exact: true}).fill(' ');
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(dialog.getByLabel('Name for the copy', {exact: true})).toBeFocused();
    await dialog.getByLabel('Name for the copy', {exact: true}).fill(source.name);
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(dialog.getByText('has already been taken', {exact: true})).toBeVisible();
    await dialog.getByLabel('Name for the copy', {exact: true}).fill('Goblet squat with a pause');
    await page.screenshot({path: `tests/exercises/artifacts/copy-${width}.png`});
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(name).toHaveValue('Goblet squat with a pause');
    const copiedId = page.url().split('/').at(-1);
    expect(copiedId).not.toBe(source.id);
    const copied = (await send('get', `/v1/coach/training-exercises/${copiedId}`, undefined, token)).data;
    for (const field of ['instructions', 'description', 'mechanics', 'force', 'images', 'tracking_type']) {
      expect(copied[field]).toEqual(source[field]);
    }
    await instructions.fill('Pause at the bottom for two seconds.');
    await page.getByRole('button', {name: 'Save exercise', exact: true}).click();
    await expect(page.getByText('Exercise saved.', {exact: true})).toBeVisible();
    expect((await send('get', endpoint, undefined, token)).data.instructions).toBe(source.instructions);
    // Returning from saved-copy review restores the editable name before a deliberate retry.
    await copy.click();
    const retryName = dialog.getByLabel('Name for the copy', {exact: true});
    await retryName.fill('Test separate exercise copy');
    let failedCopies = 0;
    await page.route('**/v1/coach/training-exercises/*/copy', (route) => {
      failedCopies++;
      return route.fulfill({status: 503, json: {}});
    });
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(dialog.getByText('No matching exercises found.', {exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: 'Create a separate copy', exact: true}).press('Enter');
    await expect(retryName).toBeEnabled();
    await expect(retryName).toBeFocused();
    await expect(retryName).toHaveValue('Test separate exercise copy');
    expect(failedCopies).toBe(1);
    await page.unroute('**/v1/coach/training-exercises/*/copy');
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    // Lost copy responses require review; no automatic POST retry.
    await copy.click();
    await dialog.getByLabel('Name for the copy', {exact: true}).fill('Goblet squat recovered');
    let copies = 0;
    await page.route('**/v1/coach/training-exercises/*/copy', async (route) => {
      copies++;
      expect((await route.fetch()).status()).toBe(201);
      return route.abort('connectionfailed');
    });
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(dialog.getByRole('alert')).toContainText('copy could not be confirmed');
    await expect(dialog.getByRole('button', {name: 'Create copy', exact: true})).toHaveCount(0);
    await page.unroute('**/v1/coach/training-exercises/*/copy');
    await dialog.getByRole('button', {name: 'Open saved exercise', exact: true}).click();
    await expect(name).toHaveValue('Goblet squat recovered');
    expect(copies).toBe(1);
    const recoveredId = page.url().split('/').at(-1);
    const recoveredPath = `/v1/coach/training-exercises/${recoveredId}`;
    await page.getByText('Remove from library', {exact: true}).click();
    await page.getByRole('button', {name: 'Delete exercise', exact: true}).click();
    await expect(dialog).toContainText('Goblet squat recovered');
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    expect((await send('get', recoveredPath, undefined, token)).data.id).toBe(recoveredId);
    await page.getByRole('button', {name: 'Delete exercise', exact: true}).click();
    await page.route(`**${recoveredPath}`, (route) =>
      route.request().method() === 'DELETE' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await dialog.getByRole('button', {name: 'Delete exercise', exact: true}).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await page.unroute(`**${recoveredPath}`);
    await page.route(`**${recoveredPath}`, async (route) => {
      if (route.request().method() !== 'DELETE') {
        return route.continue();
      }
      expect((await route.fetch()).status()).toBe(204);
      return route.abort('connectionfailed');
    });
    await dialog.getByRole('button', {name: 'Delete exercise', exact: true}).click();
    await expect(page).toHaveURL(/training-exercises\?search=Goblet$/);
    await expect(page.getByText('Goblet squat recovered deleted.', {exact: true})).toBeVisible();
    await expect(page.getByRole('link', {name: /Goblet squat recovered/})).toHaveCount(0);
    await page.unroute(`**${recoveredPath}`);
    // A real saved workout blocks deletion.
    await page.goto('/training-plans/new');
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('Squat foundations');
    await page.getByRole('button', {name: 'Add exercises', exact: true}).click();
    await page.getByLabel('Search exercises', {exact: true}).fill('Goblet squat');
    await page.getByRole('button', {name: 'Select Goblet squat', exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 exercise', exact: true}).click();
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page).toHaveURL(/training-plans\/[0-9a-f-]+$/);
    await page.goto(`/training-exercises/${source.id}`);
    await page.getByText('Remove from library', {exact: true}).click();
    await page.getByRole('button', {name: 'Delete exercise', exact: true}).click();
    await dialog.getByRole('button', {name: 'Delete exercise', exact: true}).click();
    await expect(dialog.getByRole('alert')).toContainText('A training plan still uses this exercise');
    expect((await send('get', endpoint, undefined, token)).data.id).toBe(source.id);
    await page.screenshot({path: `tests/exercises/artifacts/delete-in-use-${width}.png`});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await instructions.fill('Retained draft');
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.evaluate(async (id) => {
      const {queryClient} = await import('/src/api/query-client.ts');
      const {exerciseKeys} = await import('/src/api/keys.ts');
      await queryClient.invalidateQueries({queryKey: exerciseKeys.detail(id)});
    }, source.id);
    await expect(page.getByRole('button', {name: 'Retry exercise', exact: true})).toBeVisible();
    await expect(instructions).toHaveValue('Retained draft');
    await expect(copy).toBeDisabled();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Retry exercise', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry exercise', exact: true})).toHaveCount(0);
    await expect(instructions).toHaveValue('Retained draft');
    await instructions.fill(source.instructions);
    // Shared details expose copying and hide destructive editing.
    await page.route(`**${endpoint}`, (route) => route.fulfill({json: {data: {...source, source: 'system'}}}));
    await page.reload();
    await expect(name).toBeDisabled();
    await expect(page.getByText('Remove from library', {exact: true})).toHaveCount(0);
    await copy.click();
    await dialog.getByLabel('Name for the copy', {exact: true}).fill('Shared exercise copy');
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(name).toHaveValue('Shared exercise copy');
    await expect(name).toBeEnabled();
    await page.unroute(`**${endpoint}`);
    // Pending copy cannot dismiss or navigate after an account replacement.
    await copy.click();
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    await page.route('**/v1/coach/training-exercises/*/copy', async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      held.resolve();
      await release.promise;
      return route.fulfill({response});
    });
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await held.promise;
    await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    const other = await account(`other-${unique}`);
    await page.evaluate(async (value) => {
      const {clearSession, saveSession} = await import('/src/api/session.ts');
      clearSession();
      saveSession(value);
    }, other);
    release.resolve();
    await page.goto('/');
    await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(async (id) => {
        const {queryClient} = await import('/src/api/query-client.ts');
        return queryClient
          .getQueryCache()
          .getAll()
          .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
      }, source.id),
    ).toBe(false);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Exercise copy, independent editing, deletion constraints, interrupted requests and session isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
