import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/nutrition/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path} ${response.status()}`).toBe(true);
  return response.json();
}
async function account() {
  const unique = Date.now();
  const email = `nutrition-recovery-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Everyday Coaching', handle: `nr-${unique}`},
    guest.access_token,
  );
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
try {
  for (const width of [375, 1280]) {
    const tokens = await account();
    const token = tokens.access_token;
    await send('post', '/v1/coach/nutrition-foods', {name: 'Brown rice', calories_per_100g: 120}, token);
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    const page = await context.newPage();
    context.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/nutrition-plans/new');
    await page.getByLabel('Plan name', {exact: true}).fill('Recovery plan');
    await page.getByLabel('Calories · kcal', {exact: true}).fill('-1');
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page.getByText('Enter zero or a positive number.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('Calories · kcal', {exact: true})).toBeFocused();
    await page.getByLabel('Calories · kcal', {exact: true}).fill('1800');
    await page.getByRole('button', {name: 'Add meal', exact: true}).click();
    await page.getByLabel('Meal name', {exact: true}).fill('Rice bowl');
    await page.getByRole('button', {name: 'Add foods or recipes', exact: true}).click();
    await page.getByRole('button', {name: 'Select Brown rice', exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 item', exact: true}).click();
    await page.getByLabel('Brown rice portion', {exact: true}).fill('0');
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('greater than zero');
    await page.getByLabel('Brown rice portion', {exact: true}).fill('125');
    await page.getByRole('button', {name: 'Remove Rice bowl meal', exact: true}).click();
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Meal preview'})).toContainText('No meals are prescribed.');
    await page.getByRole('button', {name: 'Back to editing', exact: true}).click();
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect(page.getByLabel('Brown rice portion', {exact: true})).toHaveValue('125');
    await page.route('**/v1/coach/nutrition-plans/preview-menu', (route) =>
      route.fulfill({status: 503, json: {error_message: 'Unavailable'}}),
    );
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('could not reach');
    await page.unroute('**/v1/coach/nutrition-plans/preview-menu');
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Meal preview'})).toContainText('150 kcal');
    await page.getByRole('button', {name: 'Back to editing', exact: true}).click();
    await page.getByRole('link', {name: 'Back to nutrition plans', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Leave without saving?'})).toBeVisible();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    // No response and no persisted creation: lookup must precede deliberate retry.
    await page.route('**/v1/coach/nutrition-plans', (route) =>
      route.request().method() === 'POST' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Check saved plans', exact: true})).toBeVisible();
    await expect(page.getByLabel('Plan name', {exact: true})).toBeDisabled();
    await expect(page.getByLabel('Brown rice portion', {exact: true})).toBeDisabled();
    await expect(page.getByRole('button', {name: 'Create day variation', exact: true})).toBeDisabled();
    await page.unroute('**/v1/coach/nutrition-plans');
    await page.route('**/v1/coach/nutrition-plans?*', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Check saved plans', exact: true}).click();
    const recovery = page.getByRole('dialog', {name: 'Check saved plans', exact: true});
    await expect(recovery.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await expect(recovery.getByRole('button', {name: 'Create a separate template', exact: true})).toHaveCount(0);
    await page.unroute('**/v1/coach/nutrition-plans?*');
    await recovery.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(
      recovery.getByText('No matching plan found. Your worksheet is still here.', {exact: true}),
    ).toBeVisible();
    expect(await recovery.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.screenshot({path: `tests/nutrition/artifacts/creation-recovery-${width}.png`, animations: 'disabled'});
    await recovery.getByRole('button', {name: 'Close', exact: true}).click();
    await expect(page.getByLabel('Plan name', {exact: true})).toBeDisabled();
    await page.getByRole('link', {name: 'Back to nutrition plans', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Discard changes', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await page.getByRole('button', {name: 'Check saved plans', exact: true}).click();
    await recovery.getByRole('button', {name: 'Create a separate template', exact: true}).click();
    await expect(page.getByLabel('Plan name', {exact: true})).toBeFocused();
    await expect(page.getByLabel('Plan name', {exact: true})).toHaveValue('Recovery plan');
    await expect(page.getByLabel('Brown rice portion', {exact: true})).toHaveValue('125');
    let creates = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/v1/coach/nutrition-plans')) {
        creates++;
      }
    });
    await page.route('**/v1/coach/nutrition-plans', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      return route.abort('connectionfailed');
    });
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Check saved plans', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Save nutrition plan', exact: true})).toBeDisabled();
    await page.unroute('**/v1/coach/nutrition-plans');
    await page.getByRole('button', {name: 'Check saved plans', exact: true}).click();
    await page
      .getByRole('dialog', {name: 'Check saved plans'})
      .getByRole('button', {name: 'Recovery plan', exact: true})
      .click();
    await page.getByRole('button', {name: 'Use this empty template', exact: true}).click();
    await expect(page.getByLabel('Plan name', {exact: true})).toBeFocused();
    await expect(page.getByLabel('Brown rice portion', {exact: true})).toHaveValue('125');
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page).toHaveURL(/\/nutrition-plans\/[0-9a-f-]+$/);
    expect(creates).toBe(1);
    await expect(page.getByLabel('Plan name', {exact: true})).toHaveValue('Recovery plan');
    const planId = page.url().split('/').at(-1);
    await page.getByLabel('Calories · kcal', {exact: true}).fill('1850');
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page.getByText('Nutrition plan saved.', {exact: true})).toBeFocused();
    expect((await send('get', `/v1/coach/nutrition-plans/${planId}`, undefined, token)).data.target_calories).toBe(
      1850,
    );
    await page.getByLabel('Brown rice portion', {exact: true}).fill('140');
    await expect(page.getByText('Nutrition plan saved.', {exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page.getByText('Nutrition plan saved.', {exact: true})).toBeFocused();

    await page.getByLabel('Calories · kcal', {exact: true}).fill('1900');
    let resume;
    const delayed = new Promise((resolve) => {
      resume = resolve;
    });
    let received;
    const write = new Promise((resolve) => {
      received = resolve;
    });
    await page.route(`**/v1/coach/nutrition-plans/${planId}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        return route.continue();
      }
      const response = await route.fetch();
      received();
      await delayed;
      await route.fulfill({response});
    });
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await write;
    const other = await account();
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      const {queryClient} = await import('/src/api/query-client.ts');
      queryClient.clear();
      saveSession(tokens);
    }, other);
    resume();
    await page.waitForTimeout(600);
    await expect(page.getByLabel('Plan name', {exact: true})).toHaveCount(0);
    await page.goto('/nutrition-plans');
    await expect(page.getByText('Create your first nutrition plan', {exact: true})).toBeVisible();
    expect(errors).toEqual([]);
    console.log(
      `Nutrition validation, removal/undo, preview retry, lost-create recovery and session isolation passed at ${width}px.`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  await api.dispose();
}
