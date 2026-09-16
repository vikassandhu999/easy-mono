import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/foods/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `food-categories-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, first_name: 'Test Categories'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Test Food Categories', handle: `food-categories-${unique}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const grains = `Test grains ${unique}`;
    const fruit = `Test fruit ${unique}`;
    const longCategory = `Test ${'WholegrainBreakfast'.repeat(10)} ${unique}`;
    const foods = [];
    for (let index = 0; index < 47; index++) {
      const category = index < 43 ? grains : index < 45 ? fruit : index === 45 ? longCategory : null;
      foods.push(
        (
          await send(
            'post',
            '/v1/coach/nutrition-foods',
            {
              name: `Test food ${String(index).padStart(2, '0')} ${unique}`,
              category,
              calories_per_100g: index,
            },
            token,
          )
        ).data,
      );
    }
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    await context.addInitScript(() => {
      delete window.IntersectionObserver;
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto('/login');
      await page.evaluate(async (tokens) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(tokens);
      }, tokens);
      await page.route('**/v1/coach/nutrition-foods/categories', (route) => route.fulfill({status: 503, json: {}}));
      await page.goto('/nutrition-foods');
      const category = selectTrigger(page, 'Category');
      const search = page.getByLabel('Search foods', {exact: true});
      const count = (value) =>
        page.getByRole('status').getByText(`${value} ${value === 1 ? 'food' : 'foods'}`, {exact: true});
      const rows = page.getByRole('list', {name: 'foods', exact: true}).getByRole('listitem');
      await expect(page.getByRole('button', {name: 'Retry categories', exact: true})).toBeVisible();
      await search.fill(foods[0].name);
      await expect(count(1)).toBeVisible();
      await expect(rows).toHaveCount(1);
      await page.unroute('**/v1/coach/nutrition-foods/categories');
      await page.getByRole('button', {name: 'Retry categories', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Retry categories', exact: true})).toHaveCount(0);
      await expect(category).toBeFocused();
      await search.fill('');
      await chooseOption(category, grains);
      await expect(count(43)).toBeVisible();
      await expect(rows).toHaveCount(20);
      const firstPage = await rows.allTextContents();
      const remote = foods.slice(0, 43).find((food) => !firstPage.some((text) => text.includes(food.name)));
      expect(remote).toBeDefined();
      const initialHref = await rows.first().getByRole('link').getAttribute('href');
      await page.route('**/v1/coach/nutrition-foods?*', (route) => {
        const url = new URL(route.request().url());
        return url.searchParams.get('cursor') !== 'start' ? route.fulfill({status: 503, json: {}}) : route.continue();
      });
      await page.getByRole('button', {name: 'Load more', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
      await expect(rows).toHaveCount(20);
      await expect(count(43)).toBeVisible();
      await page.unroute('**/v1/coach/nutrition-foods?*');
      await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
      await expect(rows).toHaveCount(40);
      await page.getByRole('button', {name: 'Load more', exact: true}).click();
      await expect(rows).toHaveCount(43);
      expect(
        new Set(await rows.getByRole('link').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))))
          .size,
      ).toBe(43);
      await rows.first().getByRole('link').click();
      await expect(page).toHaveURL(`http://localhost:2022${initialHref}`);
      await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
      await expect(category).toContainText(grains);
      await expect(rows).toHaveCount(43);
      await search.fill(remote.name);
      await expect(count(1)).toBeVisible();
      await expect(rows.first()).toContainText(remote.name);
      await search.fill(foods[43].name);
      await expect(count(0)).toBeVisible();
      await expect(page.getByRole('heading', {name: 'No matching foods', exact: true})).toBeVisible();
      await chooseOption(category, fruit);
      await expect(count(1)).toBeVisible();
      await page.reload();
      await expect(category).toContainText(fruit);
      await expect(search).toHaveValue(foods[43].name);
      await expect(count(1)).toBeVisible();
      await chooseOption(category, 'All categories');
      expect(new URL(page.url()).searchParams.has('category')).toBe(false);
      await expect(count(1)).toBeVisible();

      // A category created in the editor becomes available when returning to this list.
      await page.getByRole('link', {name: 'Create food', exact: true}).click();
      await page.getByLabel('Food name', {exact: true}).fill(`Test new category ${unique}`);
      await page.getByText('Brand, allergens and other details', {exact: true}).click();
      await page.getByLabel('Category', {exact: true}).fill('all');
      const created = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().endsWith('/v1/coach/nutrition-foods'),
      );
      await page.getByRole('button', {name: 'Save food', exact: true}).click();
      const savedFood = (await (await created).json()).data;
      foods.push(savedFood);
      await expect(page).toHaveURL(`http://localhost:2022/nutrition-foods/${savedFood.id}`);
      await expect(page.getByLabel('Food name', {exact: true})).toHaveValue(savedFood.name);
      await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
      await expect(search).toHaveValue(foods[43].name);
      await chooseOption(category, 'all');
      expect(new URL(page.url()).searchParams.get('category')).toBe('all');
      await search.fill(`Test new category ${unique}`);
      await expect(count(1)).toBeVisible();

      await search.fill('');
      await chooseOption(category, longCategory);
      await expect(count(1)).toBeVisible();
      await category.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const options = page.getByRole('listbox');
      expect(await options.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      await page.screenshot({path: `tests/foods/artifacts/categories-${width}.png`, animations: 'disabled'});
      await page.keyboard.press('Escape');
      await page.goto(`/nutrition-foods?category=${encodeURIComponent(`Missing ${unique}`)}`);
      await expect(count(0)).toBeVisible();
      await expect(category).toContainText(`Missing ${unique}`);
      await chooseOption(category, 'All categories');
      await search.fill(foods[46].name);
      await expect(count(1)).toBeVisible();
      expect(errors).toEqual([]);
      for (const food of foods) {
        await send('delete', `/v1/coach/nutrition-foods/${food.id}`, undefined, token);
      }
      console.log(
        `Food category choices/retry, three filtered pages, server search/counts, return/reload, creation invalidation, long labels and unknown selection passed at ${width}px.`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await api.dispose();
}
