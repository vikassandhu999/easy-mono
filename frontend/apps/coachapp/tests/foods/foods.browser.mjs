import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/foods/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.json();
}
async function account(unique) {
  const email = `food-library-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `fl-${unique}`}, guest.access_token);
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
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/nutrition-plans');
    await page.getByRole('link', {name: 'Food library', exact: true}).click();
    await page.getByRole('link', {name: 'Create food', exact: true}).click();
    const name = page.getByLabel('Food name', {exact: true});
    const calories = page.getByLabel('Calories · kcal', {exact: true});
    const save = page.getByRole('button', {name: 'Save food', exact: true});
    await name.fill(' ');
    await save.click();
    await expect(name).toBeFocused();
    await expect(page.getByText('Enter a food name.', {exact: true})).toBeVisible();
    await name.fill('Rolled oats');
    await calories.fill('-1');
    await save.click();
    await expect(page.getByText('Enter zero or a positive number.', {exact: true})).toBeVisible();
    await calories.fill('380');
    await page.getByLabel('Protein · g', {exact: true}).fill('13');
    await page.getByLabel('Fiber · g', {exact: true}).fill('0');
    await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(calories).toHaveValue('380');
    await page.getByText('Brand, allergens and other details', {exact: true}).click();
    await page.getByLabel('Brand', {exact: true}).fill('Everyday Pantry');
    await page.getByText('wheat', {exact: true}).click();
    await expect(page.getByRole('checkbox', {name: 'wheat', exact: true})).toBeChecked();
    await page.getByRole('checkbox', {name: 'vegan', exact: true}).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('checkbox', {name: 'vegan', exact: true})).toBeChecked();
    await page.getByLabel('Notes', {exact: true}).fill('Nutrition from the package label.');
    let creates = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/v1/coach/nutrition-foods')) {
        creates++;
      }
    });
    await page.route('**/v1/coach/nutrition-foods', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      return route.abort('connectionfailed');
    });
    await save.click();
    await expect(page.getByRole('button', {name: 'Check saved foods', exact: true})).toBeVisible();
    await expect(save).toBeDisabled();
    await page.unroute('**/v1/coach/nutrition-foods');
    await page.getByRole('button', {name: 'Check saved foods', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Check saved foods', exact: true})).toContainText('Everyday Pantry');
    await page.getByRole('button', {name: 'Open saved food', exact: true}).click();
    await expect(page).toHaveURL(/nutrition-foods\/[0-9a-f-]+$/);
    await expect(calories).toHaveValue('380');
    expect(creates).toBe(1);
    const id = page.url().split('/').at(-1);
    const endpoint = `/v1/coach/nutrition-foods/${id}`;
    let food = (await send('get', endpoint, undefined, token)).data;
    expect(food.fiber_g_per_100g).toBe(0);
    expect(food.fat_g_per_100g).toBeNull();
    expect(food.allergens).toEqual(['wheat']);
    expect(food.dietary_tags).toEqual(['vegan']);
    // Unexposed portions must survive a metadata/nutrition edit.
    const servings = [{label: 'bowl', amount: 1, unit: 'bowl', weight_g: 40, is_default: true}];
    food = (await send('patch', endpoint, {expected_revision: food.revision, serving_sizes: servings}, token)).data;
    await page.reload();
    await calories.fill('400');
    await page.route(`**${endpoint}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(calories).toHaveValue('400');
    await page.unroute(`**${endpoint}`);
    await save.click();
    await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
    food = (await send('get', endpoint, undefined, token)).data;
    expect(food.serving_sizes).toEqual(servings);
    await calories.fill('410');
    await send('patch', endpoint, {expected_revision: food.revision, name: 'Oats updated elsewhere'}, token);
    await save.click();
    await expect(page.getByRole('alert')).toContainText('This food changed elsewhere.');
    await expect(save).toBeDisabled();
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved food', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(name).toHaveValue('Oats updated elsewhere');
    await expect(calories).toHaveValue('400');
    await name.fill('Rolled oats');
    await save.click();
    await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(calories).toBeEnabled();
    await page.screenshot({path: `tests/foods/artifacts/editor-${width}.png`, fullPage: true});
    // Shared catalog foods are readable without exposing write controls.
    const shared = {...(await send('get', endpoint, undefined, token)).data, source: 'system'};
    await page.route(`**${endpoint}`, (route) => route.fulfill({json: {data: shared}}));
    await page.reload();
    await expect(page.getByText('This shared food is read-only.', {exact: true})).toBeVisible();
    await expect(calories).toBeDisabled();
    await expect(save).toHaveCount(0);
    await page.unroute(`**${endpoint}`);
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.reload();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(calories).toBeEnabled();
    await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
    await page.getByRole('link', {name: 'Create food', exact: true}).click();
    await name.fill('Water');
    await calories.fill('0');
    await save.click();
    await expect(page).toHaveURL(/nutrition-foods\/[0-9a-f-]+$/);
    await expect(name).toHaveValue('Water');
    await expect(save).toBeDisabled();
    // Paginated search/return uses the same food resource as the meal picker.
    for (let index = 0; index < 43; index++) {
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {name: `Pantry ${String(index).padStart(2, '0')}`, calories_per_100g: index},
        token,
      );
    }
    await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
    const rows = page.getByRole('list', {name: 'foods', exact: true}).locator(':scope > li');
    await page.getByRole('button', {name: 'Refresh foods', exact: true}).click();
    const count = (await send('get', '/v1/coach/nutrition-foods?cursor=start&limit=20', undefined, token)).count;
    await expect(page.getByText(`${count} foods`, {exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.route('**/v1/coach/nutrition-foods?*', (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute('**/v1/coach/nutrition-foods?*');
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    const row = rows.nth(30).getByRole('link');
    await row.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await row.click();
    await expect(name).toBeVisible();
    await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll - 150);
    await page.getByLabel('Search foods', {exact: true}).fill('Rolled oats');
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('400 kcal per 100 g');
    await rows.getByRole('link').click();
    await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
    await expect(page.getByLabel('Search foods', {exact: true})).toHaveValue('Rolled oats');
    await page.reload();
    await expect(rows).toHaveCount(1);
    await page.getByLabel('Search foods', {exact: true}).fill('no-such-food');
    await expect(page.getByText('No matching foods', {exact: true})).toBeVisible();
    await page.getByLabel('Search foods', {exact: true}).fill('Rolled oats');
    await expect(rows).toHaveCount(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path: `tests/foods/artifacts/library-${width}.png`, fullPage: true});
    // Use the created food in a real plan; the server calculates the portion.
    await page.getByRole('link', {name: 'Back to nutrition plans', exact: true}).click();
    await page.getByRole('link', {name: 'Create nutrition plan', exact: true}).click();
    await page.getByLabel('Plan name', {exact: true}).fill('Breakfast plan');
    await page.getByRole('button', {name: 'Add meal', exact: true}).click();
    await page.getByRole('button', {name: 'Add foods or recipes', exact: true}).click();
    await page.getByLabel('Search foods', {exact: true}).fill('Rolled oats');
    await page.getByRole('button', {name: 'Select Rolled oats', exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 item', exact: true}).click();
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Meal preview', exact: true})).toContainText('160 kcal');
    await page.getByRole('button', {name: 'Back to editing', exact: true}).click();
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page).toHaveURL(/nutrition-plans\/[0-9a-f-]+$/);
    if (width === 375) {
      await page.goto(`/nutrition-foods/${id}`);
      await calories.fill('420');
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
      await expect(calories).toBeDisabled();
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
      `Food creation, editing, paging, recovery, meal integration and session isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
