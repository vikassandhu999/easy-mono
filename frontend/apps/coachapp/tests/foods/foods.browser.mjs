import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect, request, webkit} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = process.env.PLAYWRIGHT_CDP_URL
  ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
  : await (process.env.PLAYWRIGHT_BROWSER === 'webkit' ? webkit : chromium).launch();
await mkdir('tests/foods/artifacts', {recursive: true});
const results = [];
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function account(unique) {
  const email = `food-catalogue-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Food Catalogue', handle: `fc-${unique}`},
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
    const tokens = await account(`${Date.now()}-${width}`);
    const token = tokens.access_token;
    const context = await browser.newContext({
      baseURL: process.env.COACH_APP_URL || 'http://localhost:2022',
      viewport: {width, height: 900},
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto('/login');
      await page.evaluate(async (value) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(value);
      }, tokens);
      await page.goto('/foods');
      await expect(page.getByRole('heading', {name: 'Food catalogue', exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Create food', exact: true}).click();
      const name = page.getByLabel('Food name', {exact: true});
      const energy = page.getByLabel('Energy · kcal', {exact: true});
      const save = page.getByRole('button', {name: 'Save food', exact: true});
      await name.fill(' ');
      await save.click();
      await expect(name).toBeFocused();
      await expect(page.getByText('Enter a food name.', {exact: true})).toBeVisible();
      await name.fill('Rolled oats');
      await energy.fill('-1');
      await save.click();
      await expect(page.getByText('Enter zero or a positive number.', {exact: true})).toBeVisible();
      await energy.fill('380');
      await page.getByLabel('Protein · g', {exact: true}).fill('13');
      await page.getByLabel('Fiber · g', {exact: true}).fill('0');
      await page.getByRole('button', {name: 'Add serving size', exact: true}).click();
      await page.getByLabel('Serving name', {exact: true}).fill('bowl');
      await page.getByLabel('Amount · g', {exact: true}).fill('40');
      await page.getByRole('button', {name: 'Remove serving', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Undo', exact: true})).toBeFocused();
      await page.getByRole('button', {name: 'Undo', exact: true}).click();
      await expect(page.getByLabel('Amount · g', {exact: true})).toHaveValue('40');
      await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
      await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
      await expect(energy).toHaveValue('380');
      await page.route('**/v1/coach/foods', (route) =>
        route.request().method() === 'POST' ? route.fulfill({status: 503, json: {}}) : route.continue(),
      );
      await save.click();
      await expect(page.getByRole('button', {name: 'Check saved foods', exact: true})).toBeVisible();
      await expect(name).toBeDisabled();
      await page.unroute('**/v1/coach/foods');
      await page.getByRole('button', {name: 'Check saved foods', exact: true}).click();
      await expect(page.getByText('No matching foods found.', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Create a separate food', exact: true}).click();
      await expect(name).toBeEnabled();
      await expect(name).toBeFocused();
      await save.click();
      await expect(page).toHaveURL(/\/foods\/[0-9a-f-]+$/);
      const id = new URL(page.url()).pathname.split('/').at(-1);
      const food = (await send('get', `/v1/coach/foods/${id}`, undefined, token)).data;
      expect(food).toMatchObject({
        name: 'Rolled oats',
        kind: 'food',
        basis: '100g',
        unit_label: null,
        nutrients: {energy_kcal: 380, protein_g: 13, fiber_g: 0},
        servings: [{label: 'bowl', amount: 40}],
      });
      expect(Object.hasOwn(food.nutrients, 'fat_g')).toBe(false);
      await energy.fill('400');
      await page.route(`**/v1/coach/foods/${id}`, (route) =>
        route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
      );
      await save.click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(energy).toHaveValue('400');
      await page.unroute(`**/v1/coach/foods/${id}`);
      await save.click();
      await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
      await page.reload();
      await expect(energy).toHaveValue('400');
      await expect(page.getByLabel('Amount · g', {exact: true})).toHaveValue('40');
      await page.screenshot({path: `tests/foods/artifacts/editor-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
      await page.getByRole('link', {name: 'Create food', exact: true}).click();
      await name.fill('Vitamin D');
      await chooseOption(selectTrigger(page, 'Kind'), 'Supplement');
      await chooseOption(selectTrigger(page, 'Nutrient values per'), '1 unit');
      await save.click();
      await expect(page.getByText('Enter a unit name.', {exact: true})).toBeVisible();
      await page.getByLabel('Unit name', {exact: true}).fill('capsule');
      await page.getByLabel('Vitamin D · µg', {exact: true}).fill('25');
      await page.getByRole('button', {name: 'Add serving size', exact: true}).click();
      await page.getByLabel('Serving name', {exact: true}).fill('dose');
      await page.getByLabel('Amount · capsule', {exact: true}).fill('2');
      await save.click();
      await expect(page).toHaveURL(/\/foods\/[0-9a-f-]+$/);
      const supplementId = new URL(page.url()).pathname.split('/').at(-1);
      expect((await send('get', `/v1/coach/foods/${supplementId}`, undefined, token)).data).toMatchObject({
        kind: 'supplement',
        basis: '1unit',
        unit_label: 'capsule',
        nutrients: {vitamin_d_ug: 25},
        servings: [{label: 'dose', amount: 2}],
      });
      await page.screenshot({path: `tests/foods/artifacts/supplement-${width}.png`, fullPage: true});
      for (let index = 0; index < 43; index++) {
        await send(
          'post',
          '/v1/coach/foods',
          {
            name: `Pantry ${String(index).padStart(2, '0')}`,
            kind: 'food',
            basis: '100ml',
            nutrients: {energy_kcal: index},
          },
          token,
        );
      }
      await page.goto('/foods');
      const rows = page.getByRole('list', {name: 'foods and supplements', exact: true}).locator(':scope > li');
      await expect(page.getByText('45 foods and supplements', {exact: true})).toBeVisible();
      await expect(rows).toHaveCount(20);
      await page.route('**/v1/coach/foods?*', (route) =>
        new URL(route.request().url()).searchParams.get('cursor') !== 'start'
          ? route.fulfill({status: 503, json: {}})
          : route.continue(),
      );
      await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
      await expect(rows).toHaveCount(20);
      await page.unroute('**/v1/coach/foods?*');
      await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
      await expect.poll(() => rows.count()).toBeGreaterThanOrEqual(40);
      const search = page.getByLabel('Search foods and supplements', {exact: true});
      await search.fill('Pantry 00');
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText('Pantry 00');
      await rows.getByRole('link').focus();
      await page.keyboard.press('Enter');
      await expect(name).toHaveValue('Pantry 00');
      await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
      await expect(search).toHaveValue('Pantry 00');
      await search.fill('');
      await chooseOption(selectTrigger(page, 'Kind'), 'Supplements');
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText('Vitamin D');
      await search.fill('No such supplement');
      await expect(page.getByText('No matching foods', {exact: true})).toBeVisible();
      await search.fill('Vitamin D');
      await expect(rows).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: `tests/foods/artifacts/catalogue-${width}.png`, fullPage: true});
      expect(errors).toEqual([]);
      results.push({
        width,
        passed: true,
        unknownNutrients: true,
        servingBasis: true,
        supplement: true,
        createRecovery: true,
        paginationRecovery: true,
        serverSearch: true,
        keyboard: true,
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await api.dispose();
  await writeFile('tests/foods/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
