import {mkdir} from 'node:fs/promises';
import {chromium, expect, request, webkit} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const engine = process.env.BROWSER_ENGINE || 'chromium';
if (engine !== 'chromium' && engine !== 'webkit') {
  throw new Error(`Unsupported BROWSER_ENGINE: ${engine}`);
}
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
await mkdir('tests/nutrition/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function fits(page, label, width) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label).toBe(true);
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) {
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth), label).toBe(true);
  } else {
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  }
  await page.screenshot({
    path: `tests/nutrition/artifacts/audit-${label}-${width}.png`,
    fullPage: !(await dialog.count()),
    animations: 'disabled',
  });
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `nutrition-audit-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, first_name: 'Test Coach'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Test Nutrition Audit', handle: `nutrition-audit-${unique}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const foodName = `Test oats ${'WholegrainBreakfast'.repeat(8)}`;
    const food = (
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {name: foodName, brand: 'BreakfastKitchen'.repeat(6), calories_per_100g: 120},
        token,
      )
    ).data;
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto('/login');
      await page.evaluate(async (tokens) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(tokens);
      }, tokens);
      await expect(page).not.toHaveURL(/\/login$/);
      await page.waitForLoadState('networkidle');
      await page.goto('/nutrition-plans/new');
      await page.getByLabel('Plan name', {exact: true}).fill('Test weekly nutrition');
      await page.getByRole('button', {name: 'Add meal', exact: true}).click();
      await page.getByLabel('Meal name', {exact: true}).fill('Morning oats');
      await page.getByRole('button', {name: 'Add foods or recipes', exact: true}).click();
      const picker = page.getByRole('dialog', {name: 'Add foods or recipes', exact: true});
      await picker.getByLabel('Search foods', {exact: true}).fill(foodName);
      await expect(picker.getByText('1 food', {exact: true})).toBeVisible();
      await fits(page, 'long-picker', width);
      expect(
        await picker
          .getByText('BreakfastKitchen'.repeat(6), {exact: false})
          .evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      await picker.getByRole('button', {name: `Select ${foodName}`, exact: true}).click();
      await fits(page, 'long-selection', width);
      expect(
        await picker
          .getByText(foodName, {exact: true})
          .last()
          .evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      await picker.getByRole('button', {name: 'Add 1 item', exact: true}).click();
      const portion = page.getByLabel(`${foodName} portion`, {exact: true});
      await portion.fill('100');
      await fits(page, 'long-food', width);
      await page.getByRole('button', {name: `Change portion for ${foodName}`, exact: true}).click();
      await expect(page.getByRole('button', {name: 'Apply portion', exact: true})).toBeVisible();
      await fits(page, 'long-portion', width);
      await page.getByRole('dialog').getByRole('button', {name: 'Cancel', exact: true}).click();
      await page.getByRole('button', {name: `Remove ${foodName}`, exact: true}).click();
      await fits(page, 'long-item-undo', width);
      await page.getByRole('button', {name: 'Undo item removal', exact: true}).click();
      await page.getByRole('button', {name: 'Create day variation', exact: true}).click();
      await portion.fill('0');
      const days = page.getByRole('group', {name: 'Day menus', exact: true});
      await days.getByRole('button', {name: 'Everyday', exact: true}).click();
      await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
      await expect(page.getByLabel('Day menu name', {exact: true})).toHaveValue('Everyday variation');
      await expect(portion).toBeFocused();
      await expect(portion).toHaveAccessibleDescription('Enter more than zero.');
      await fits(page, 'hidden-portion', width);
      // Validation guides once; the coach can still inspect another day before correcting it.
      await days.getByRole('button', {name: 'Everyday', exact: true}).click();
      await expect(page.getByLabel('Day menu name', {exact: true})).toHaveValue('Everyday');
      await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
      await expect(portion).toBeFocused();
      await expect(page.getByLabel('Day menu name', {exact: true})).toHaveValue('Everyday variation');

      await portion.fill('150');
      await page.getByLabel('Meal name', {exact: true}).fill('');
      await days.getByRole('button', {name: 'Everyday', exact: true}).click();
      await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
      const mealName = page.getByLabel('Meal name', {exact: true});
      await expect(mealName).toBeFocused();
      await expect(mealName).toHaveAttribute('aria-invalid', 'true');
      await expect(mealName).toHaveAccessibleDescription('Name each meal.');
      await mealName.fill('Variation oats');
      await page.getByLabel('Day menu name', {exact: true}).fill('');
      await days.getByRole('button', {name: 'Everyday', exact: true}).click();
      await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
      const dayName = page.getByLabel('Day menu name', {exact: true});
      await expect(dayName).toBeFocused();
      await expect(dayName).toHaveAccessibleDescription('Name each day menu.');
      await dayName.fill(`Training ${'HighActivityDay'.repeat(10)}`);
      await chooseOption(selectTrigger(page, 'monday menu'), `Training ${'HighActivityDay'.repeat(10)}`);
      await fits(page, 'long-variation', width);
      await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
      const preview = page.getByRole('dialog', {name: 'Meal preview', exact: true});
      await expect(preview).toContainText('120 kcal');
      await fits(page, 'long-preview', width);
      expect(
        await preview
          .getByRole('group', {name: 'Preview day menus'})
          .evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      for (const value of await preview.locator('dd').all()) {
        expect(await value.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      }
      await preview.getByRole('button', {name: /^Training HighActivityDay/}).click();
      await expect(preview).toContainText('180 kcal');
      await preview.getByRole('button', {name: 'Back to editing', exact: true}).click();
      await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
      await expect(page).toHaveURL(/nutrition-plans\/[0-9a-f-]+$/);
      await page.waitForLoadState('networkidle');
      const endpoint = `/v1/coach/nutrition-plans/${new URL(page.url()).pathname.split('/').at(-1)}`;
      const saved = (await send('get', endpoint, undefined, token)).data;
      expect(saved.menu.meals.map((meal) => meal.meal_items[0].portion.grams)).toEqual([100, 150]);
      await page.reload();
      await expect(portion).toHaveValue('100');
      expect(errors).toEqual([]);
      await send('delete', `${endpoint}?expected_revision=${saved.revision}`, undefined, token);
      await send('delete', `/v1/coach/nutrition-foods/${food.id}`, undefined, token);
      console.log(
        `Nutrition long-content, hidden day/meal/portion validation, server preview and persistence passed at ${width}px.`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await api.dispose();
}
