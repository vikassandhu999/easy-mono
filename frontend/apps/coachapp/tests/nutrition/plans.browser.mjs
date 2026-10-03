import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/nutrition/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path} ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `nutrition-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Everyday Coaching', handle: `nutrition-${unique}`},
    guest.access_token,
  );
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
const dateAfter = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
try {
  for (const width of [375, 1280]) {
    const tokens = await account(`${Date.now()}-${width}`);
    const token = tokens.access_token;
    const food = (
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {
          name: 'Rolled oats',
          calories_per_100g: 380,
          protein_g_per_100g: 13,
          carbs_g_per_100g: 67,
          fat_g_per_100g: 7,
          fiber_g_per_100g: 10,
        },
        token,
      )
    ).data;
    const _recipe = (
      await send(
        'post',
        '/v1/coach/nutrition-recipes',
        {
          name: 'Overnight oats',
          servings_count: 2,
          recipe_ingredients: [{food_id: food.id, portion: {kind: 'gram', grams: 100}}],
        },
        token,
      )
    ).data;
    for (let i = 0; i < 42; i++) {
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {name: `Pantry food ${String(i).padStart(2, '0')}`, calories_per_100g: 100},
        token,
      );
    }
    for (let i = 0; i < 42; i++) {
      await send(
        'post',
        '/v1/coach/nutrition-plans',
        {name: `Nutrition template ${String(i).padStart(2, '0')}`},
        token,
      );
    }
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/nutrition-plans');
    await expect(page.getByRole('status').filter({hasText: '42 nutrition templates'})).toBeVisible();
    let failedPage = false;
    await page.route('**/v1/coach/nutrition-plans?*', (route) => {
      const cursor = new URL(route.request().url()).searchParams.get('cursor');
      if (cursor && cursor !== 'start' && !failedPage) {
        failedPage = true;
        return route.fulfill({status: 503, json: {error_message: 'Temporary page failure'}});
      }
      return route.continue();
    });
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more'})).toBeVisible();
    await page.getByRole('button', {name: 'Retry loading more'}).click();
    await expect(page.getByRole('list', {name: 'nutrition templates'}).locator('li')).toHaveCount(40);
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('list', {name: 'nutrition templates'}).locator('li')).toHaveCount(42);
    await page.unroute('**/v1/coach/nutrition-plans?*');
    await page.getByLabel('Search nutrition plans').fill('Nutrition template 00');
    await expect(page.getByRole('list', {name: 'nutrition templates'}).locator('li')).toHaveCount(1);
    await page.getByRole('link', {name: 'Create nutrition plan', exact: true}).click();
    await page.getByLabel('Plan name', {exact: true}).fill('Balanced everyday');
    await page.getByLabel('Calories · kcal', {exact: true}).fill('2000');
    await page.getByLabel('Protein · g', {exact: true}).fill('100');
    await page.getByLabel('Fiber · g', {exact: true}).fill('0');
    await page.getByRole('button', {name: 'Add meal', exact: true}).click();
    await page.getByLabel('Meal name', {exact: true}).fill('Oats and fruit');
    await page.getByRole('button', {name: 'Add foods or recipes', exact: true}).click();
    const picker = page.getByRole('dialog', {name: 'Add foods or recipes'});
    await picker.getByLabel('Search foods').fill('Rolled oats');
    await picker.getByRole('button', {name: 'Select Rolled oats', exact: true}).click();
    await picker.getByRole('button', {name: 'Recipes', exact: true}).click();
    await picker.getByLabel('Search recipes').fill('Overnight');
    await picker.getByRole('button', {name: 'Select Overnight oats', exact: true}).click();
    await picker.getByRole('button', {name: 'Add 2 items', exact: true}).click();
    await page.getByLabel('Rolled oats portion', {exact: true}).fill('50');
    await page.getByRole('button', {name: 'Remove Overnight oats', exact: true}).click();
    await page.getByText('Meal guidance', {exact: true}).click();
    await page.getByLabel('Notes', {exact: true}).fill('Prepare the night before.');
    await page.getByRole('button', {name: 'Add breakfast alternative', exact: true}).click();
    await page.getByLabel('Meal name', {exact: true}).last().fill('Quick breakfast');
    await page.getByRole('button', {name: 'Add foods or recipes', exact: true}).last().click();
    await picker.getByRole('button', {name: 'Recipes', exact: true}).click();
    await picker.getByRole('button', {name: 'Select Overnight oats', exact: true}).click();
    await picker.getByRole('button', {name: 'Add 1 item', exact: true}).click();
    await page.getByRole('button', {name: 'Create day variation', exact: true}).click();
    const longDayName = 'Training days with an early morning strength session';
    await page.getByLabel('Day menu name', {exact: true}).fill(longDayName);
    const monday = selectTrigger(page, 'monday menu');
    await chooseOption(monday, longDayName);
    expect(await monday.evaluate((button) => button.scrollWidth <= button.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await monday.click();
    await expect(page.getByRole('option', {name: longDayName, exact: true})).toBeInViewport({ratio: 1});
    await page.screenshot({path: `tests/nutrition/artifacts/select-menu-${width}.png`});
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await page.getByLabel('Day menu name', {exact: true}).fill('Training day');
    await page.getByLabel('Rolled oats portion', {exact: true}).fill('75');
    await chooseOption(selectTrigger(page, 'monday menu'), 'Training day');
    await page
      .getByRole('group', {name: 'Day menus', exact: true})
      .getByRole('button', {name: 'Everyday', exact: true})
      .click();
    await expect(page.getByLabel('Rolled oats portion', {exact: true})).toHaveValue('50');
    await page.getByText('Assign menus to weekdays', {exact: true}).click();
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    const preview = page.getByRole('dialog', {name: 'Meal preview', exact: true});
    await expect(preview).toContainText('190 kcal');
    await expect(preview).toContainText('Prepare the night before.');
    await preview.getByRole('button', {name: 'Training day', exact: true}).click();
    await expect(preview).toContainText('285 kcal');
    await preview.getByRole('button', {name: 'Back to editing', exact: true}).click();
    await page.screenshot({
      path: `tests/nutrition/artifacts/editor-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    let failedSave = false;
    await page.route('**/v1/coach/nutrition-plans/*/menu', (route) => {
      if (!failedSave) {
        failedSave = true;
        return route.fulfill({status: 503, json: {error_message: 'Menu save unavailable'}});
      }
      return route.continue();
    });
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('could not reach');
    await expect(page.getByLabel('Plan name', {exact: true})).toHaveValue('Balanced everyday');
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page).toHaveURL(/\/nutrition-plans\/[0-9a-f-]+$/);
    await expect(page.getByLabel('Plan name', {exact: true})).toHaveValue('Balanced everyday');
    await page.unroute('**/v1/coach/nutrition-plans/*/menu');
    const planId = page.url().split('/').at(-1);
    let saved = (await send('get', `/v1/coach/nutrition-plans/${planId}`, undefined, token)).data;
    expect(saved.menu.meals).toHaveLength(4);
    expect(saved.target_fiber_g).toBe(0);
    expect(saved.menu.meals[0].nutrients.calories).toBe(190);
    expect(
      (await send('get', '/v1/coach/nutrition-plans?search=Balanced%20everyday&cursor=start', undefined, token)).count,
    ).toBe(1);
    await page.reload();
    await expect(page.getByLabel('Rolled oats portion', {exact: true})).toHaveValue('50');
    await page.getByLabel('Protein · g', {exact: true}).fill('110');
    await send(
      'patch',
      `/v1/coach/nutrition-plans/${planId}`,
      {expected_revision: saved.revision, description: 'Reviewed by another coach'},
      token,
    );
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('changed elsewhere');
    await expect(page.getByLabel('Protein · g', {exact: true})).toHaveValue('110');
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved plan', exact: true}).click();
    await expect(page.getByText('Saved version loaded.', {exact: true})).toBeFocused();
    await expect(page.getByLabel('Protein · g', {exact: true})).toHaveValue('100');
    const email = `nutrition-client-${Date.now()}@example.test`;
    const person = (await send('post', '/v1/coach/clients', {full_name: 'Alex Morgan', email}, token)).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', `/v1/auth/invites/${invitation_token}/accept`, {
      email,
      invitation_token,
      otp: '123456',
    });
    await page.goto(`/clients/${person.id}`);
    await page.getByRole('link', {name: 'Assign nutrition plan', exact: true}).click();
    await page.getByLabel('Search nutrition plans').fill('Balanced everyday');
    const selectedTemplate = page.getByRole('list', {name: 'nutrition templates'}).getByRole('link');
    await expect(selectedTemplate).toHaveCount(1);
    await page.getByLabel('Search nutrition plans').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Refresh nutrition templates', exact: true})).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(selectedTemplate).toBeFocused();
    const rowFocus = await selectedTemplate.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        visible: node.matches(':focus-visible'),
        width: Number.parseFloat(style.outlineWidth),
        offset: Number.parseFloat(style.outlineOffset),
      };
    });
    expect(rowFocus.visible).toBe(true);
    expect(rowFocus.width).toBeGreaterThan(0);
    expect(rowFocus.offset).toBeLessThanOrEqual(-rowFocus.width);
    await page.screenshot({path: `tests/nutrition/artifacts/assignment-choice-${width}.png`});
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', {name: 'Balanced everyday', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page.getByText('Enter start date.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('Start date', {exact: true})).toBeFocused();
    await page.getByLabel('Start date', {exact: true}).fill(dateAfter(0));
    await page.getByLabel('End date', {exact: true}).fill(dateAfter(-1));
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page.getByText('End date must be on or after the start date.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('End date', {exact: true})).toBeFocused();
    await page.getByLabel('End date', {exact: true}).fill(dateAfter(14));
    saved = (await send('get', `/v1/coach/nutrition-plans/${planId}`, undefined, token)).data;
    await send(
      'patch',
      `/v1/coach/nutrition-plans/${planId}`,
      {expected_revision: saved.revision, description: 'New guidance'},
      token,
    );
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('changed');
    await expect(page.locator('form').getByRole('alert').locator('..')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Refresh preview', exact: true})).toBeFocused();
    await page.route(`**/v1/coach/nutrition-plans/${planId}`, (route) =>
      route.fulfill({status: 503, json: {error_message: 'Refresh unavailable'}}),
    );
    await page.keyboard.press('Enter');
    await expect(page.locator('form').getByRole('alert')).toBeVisible();
    await expect(page.locator('form').getByRole('alert').locator('..')).toBeFocused();
    await expect(page.getByLabel('Start date', {exact: true})).toHaveValue(dateAfter(0));
    await expect(page.getByLabel('End date', {exact: true})).toHaveValue(dateAfter(14));
    await expect(page.getByRole('button', {name: 'Assign nutrition plan', exact: true})).toBeDisabled();
    await page.screenshot({path: `tests/nutrition/artifacts/assignment-refresh-${width}.png`});
    await page.unroute(`**/v1/coach/nutrition-plans/${planId}`);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Refresh preview', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', {name: 'Balanced everyday', exact: true})).toBeFocused();
    await expect(page.getByText('New guidance', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/clients/${person.id}$`));
    await expect(page.getByRole('status').filter({hasText: 'Balanced everyday assigned.'})).toBeVisible();
    const coverage = (await send('get', `/v1/coach/clients/${person.id}/nutrition-coverage`, undefined, token)).data;
    expect(coverage.current.source_template_id).toBe(planId);
    const clientPlan = (
      await send('get', `/v1/client/nutrition-plans/${coverage.current.id}`, undefined, clientTokens.access_token)
    ).data;
    expect(clientPlan.menu.meals[0].nutrients.calories).toBe(190);
    saved = (await send('get', `/v1/coach/nutrition-plans/${planId}`, undefined, token)).data;
    await send(
      'patch',
      `/v1/coach/nutrition-plans/${planId}`,
      {expected_revision: saved.revision, target_calories: 2300},
      token,
    );
    expect(
      (await send('get', `/v1/client/nutrition-plans/${coverage.current.id}`, undefined, clientTokens.access_token))
        .data.target_calories,
    ).toBe(2000);
    await page.getByRole('link', {name: 'Assign nutrition plan', exact: true}).click();
    await page.getByLabel('Search nutrition plans').fill('Balanced everyday');
    await page.getByRole('link', {name: /Balanced everyday/}).click();
    await page.getByLabel('Start date', {exact: true}).fill(dateAfter(2));
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page.getByText(/overlaps another Client Plan/)).toBeVisible();
    await expect(page.getByLabel('Start date', {exact: true})).toBeFocused();
    await page.getByLabel('Start date', {exact: true}).fill(dateAfter(15));
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/clients/${person.id}$`));
    await expect(page.getByRole('region', {name: 'Client nutrition plans'}).getByText(/^upcoming/i)).toBeVisible();
    await page
      .getByRole('region', {name: 'Client nutrition plans'})
      .getByText('View meals and targets', {exact: true})
      .first()
      .click();
    await page.screenshot({
      path: `tests/nutrition/artifacts/assigned-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    // A saved assignment whose response is lost can be reviewed without another write.
    await page.goto(`/clients/${person.id}/nutrition-plans/assign/${planId}`);
    await page.getByLabel('Start date', {exact: true}).fill(dateAfter(-14));
    await page.getByLabel('End date', {exact: true}).fill(dateAfter(-1));
    const assignRoute = `**/v1/coach/clients/${person.id}/nutrition-plans/${planId}/assign`;
    let assignmentWrites = 0;
    await page.route(assignRoute, async (route) => {
      assignmentWrites += 1;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.fulfill({status: 503, json: {error_message: 'Response lost'}});
    });
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page.locator('form').getByRole('alert').locator('..')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', {name: 'Check client plans', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/clients/${person.id}$`));
    await page.unroute(assignRoute);
    const assigned = await send('get', `/v1/coach/clients/${person.id}/nutrition-plans`, undefined, token);
    expect(assigned.count).toBe(3);
    expect(assignmentWrites).toBe(1);
    expect(errors).toEqual([]);
    console.log(
      `Nutrition creation, meals, alternatives, variations, preview, recovery and assignment passed at ${width}px.`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  await api.dispose();
}
