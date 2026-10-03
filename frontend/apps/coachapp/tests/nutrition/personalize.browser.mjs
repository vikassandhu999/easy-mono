import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/nutrition/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `nutrition-edit-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Everyday Coaching', handle: `ne-${unique}`},
    guest.access_token,
  );
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
function dateAfter(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
async function signIn(page, tokens) {
  await page.goto('/login');
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const food = (await send('post', '/v1/coach/nutrition-foods', {name: 'Brown rice', calories_per_100g: 120}, token))
      .data;
    let template = (
      await send(
        'post',
        '/v1/coach/nutrition-plans',
        {name: 'Balanced everyday', target_calories: 2000, target_protein_g: 100},
        token,
      )
    ).data;
    const dayId = crypto.randomUUID();
    const mealId = crypto.randomUUID();
    template = (
      await send(
        'put',
        `/v1/coach/nutrition-plans/${template.id}/menu`,
        {
          expected_revision: template.revision,
          menu: {
            meals: [
              {
                id: mealId,
                name: 'Rice bowl',
                meal_items: [
                  {id: crypto.randomUUID(), kind: 'food', food_id: food.id, portion: {kind: 'gram', grams: 100}},
                ],
              },
            ],
            day_patterns: [{id: dayId, name: 'Everyday', slots: [{meal_slot: 'lunch', meal_ids: [mealId]}]}],
            schedule: Object.fromEntries(
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [day, dayId]),
            ),
          },
        },
        token,
      )
    ).data;
    const email = `nutrition-person-${unique}@example.test`;
    const person = (await send('post', '/v1/coach/clients', {full_name: 'Alex Morgan', email}, token)).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', `/v1/auth/invites/${invitation_token}/accept`, {
      email,
      invitation_token,
      otp: '123456',
    });
    const assigned = (
      await send(
        'post',
        `/v1/coach/clients/${person.id}/nutrition-plans/${template.id}/assign`,
        {
          expected_revision: template.revision,
          start_date: dateAfter(-1),
          end_date: dateAfter(28),
        },
        token,
      )
    ).data;
    const upcoming = (
      await send(
        'post',
        `/v1/coach/clients/${person.id}/nutrition-plans/${template.id}/assign`,
        {
          expected_revision: template.revision,
          start_date: dateAfter(29),
        },
        token,
      )
    ).data;
    template = (await send('get', `/v1/coach/nutrition-plans/${template.id}`, undefined, token)).data;
    const endpoint = `/v1/coach/nutrition-plans/${assigned.id}`;
    const clientPath = `/clients/${person.id}`;
    const editPath = `${clientPath}/nutrition-plans/${assigned.id}/edit`;
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, tokens);
    await page.goto('/?search=Alex');
    await page.getByRole('link', {name: /Alex Morgan/}).click();
    const coverage = page.getByRole('region', {name: 'Client nutrition plans', exact: true});
    await coverage.locator('summary').first().click();
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await coverage.getByRole('link', {name: 'Personalize nutrition plan', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Nutrition for Alex Morgan', exact: true})).toBeVisible();
    await expect(
      page.getByText('Changes apply to this client only. Your reusable template stays unchanged.', {exact: true}),
    ).toBeVisible();
    const name = page.getByLabel('Plan name', {exact: true});
    const calories = page.getByLabel('Calories · kcal', {exact: true});
    const portion = page.getByLabel('Brown rice portion', {exact: true});
    const save = page.getByRole('button', {name: 'Save client plan', exact: true});
    await expect(save).toBeDisabled();
    await portion.fill('150');
    await page.getByRole('link', {name: 'Back to client', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(portion).toHaveValue('150');
    await calories.fill('1800');
    await page.getByLabel('Protein · g', {exact: true}).fill('');
    await name.fill('Alex’s everyday meals');
    await page.route('**/v1/coach/nutrition-plans/preview-menu', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute('**/v1/coach/nutrition-plans/preview-menu');
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    const preview = page.getByRole('dialog', {name: 'Meal preview', exact: true});
    await expect(preview).toContainText('180 kcal');
    await expect(preview).toContainText('Preview for Alex Morgan.');
    await page.getByRole('button', {name: 'Back to editing', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await page.route(`**${endpoint}/menu`, (route) => route.fulfill({status: 503, json: {}}));
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(portion).toHaveValue('150');
    let persisted = (await send('get', endpoint, undefined, token)).data;
    expect(persisted.target_calories).toBe(1800);
    expect(persisted.target_protein_g).toBeNull();
    expect(persisted.menu.meals[0].meal_items[0].portion.grams).toBe(100);
    await page.unroute(`**${endpoint}/menu`);
    await save.click();
    await expect(page).toHaveURL(`http://localhost:2022${clientPath}`);
    await expect(page.getByText('Alex’s everyday meals saved for this client.', {exact: true})).toBeVisible();
    await coverage.locator('summary').first().click();
    await expect(coverage.locator('details').first()).toContainText('1800');
    await expect(coverage.locator('details').first()).toContainText('180 kcal');
    const clientPlan = (
      await send('get', `/v1/client/nutrition-plans/${assigned.id}`, undefined, clientTokens.access_token)
    ).data;
    expect(clientPlan.target_calories).toBe(1800);
    expect(clientPlan.menu.meals[0].meal_items[0].portion.grams).toBe(150);
    expect((await send('get', `/v1/coach/nutrition-plans/${template.id}`, undefined, token)).data).toEqual(template);
    await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
    await expect(page.getByLabel('Search clients', {exact: true})).toHaveValue('Alex');
    await page.goto(editPath);
    await expect(portion).toHaveValue('150');
    await page.getByRole('button', {name: 'Create day variation', exact: true}).click();
    await page.getByLabel('Day menu name', {exact: true}).fill('Training days');
    await portion.fill('200');
    await chooseOption(selectTrigger(page, 'monday menu'), 'Training days');
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/nutrition/artifacts/personalize-${width}.png`, fullPage: true});
    await portion.scrollIntoViewIfNeeded();
    await expect(portion).toBeInViewport({ratio: 1});
    await page.screenshot({path: `tests/nutrition/artifacts/personalize-meals-${width}.png`});
    await save.click();
    await expect(page).toHaveURL(`http://localhost:2022${clientPath}`);
    persisted = (await send('get', endpoint, undefined, token)).data;
    expect(persisted.menu.day_patterns).toHaveLength(2);
    expect(persisted.menu.meals.map((meal) => meal.meal_items[0].portion.grams)).toEqual([150, 200]);
    await page.goto(editPath);
    await calories.fill('1700');
    await send('patch', endpoint, {expected_revision: persisted.revision, name: 'Updated by another coach'}, token);
    await save.click();
    await expect(page.getByRole('alert')).toContainText('This plan changed elsewhere.');
    await expect(save).toBeDisabled();
    await expect(calories).toHaveValue('1700');
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Load saved plan', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(page.getByRole('alert').locator('..')).toBeFocused();
    await expect(calories).toHaveValue('1700');
    await page.unroute(`**${endpoint}`);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Review saved version', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    await page.getByRole('button', {name: 'Load saved plan', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(page.getByText('Saved version loaded.', {exact: true})).toBeFocused();
    await expect(name).toHaveValue('Updated by another coach');
    await expect(calories).toHaveValue('1800');
    await calories.fill('1900');
    await page.route(`**${endpoint}/menu`, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.fulfill({status: 503, json: {}});
    });
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}/menu`);
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved plan', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(page.getByText('Saved version loaded.', {exact: true})).toBeFocused();
    await expect(calories).toHaveValue('1900');
    await expect(save).toBeDisabled();
    // Upcoming coverage has an independently editable plan too.
    await page.goto(clientPath);
    await coverage.locator('summary').last().click();
    await coverage.getByRole('link', {name: 'Personalize nutrition plan', exact: true}).click();
    await expect(page).toHaveURL(`http://localhost:2022${clientPath}/nutrition-plans/${upcoming.id}/edit`);
    await expect(calories).toHaveValue('2000');
    await calories.fill('2100');
    await save.click();
    await expect(page).toHaveURL(`http://localhost:2022${clientPath}`);
    await coverage.locator('summary').last().click();
    await expect(coverage.locator('details').last()).toContainText('2100');
    expect((await send('get', endpoint, undefined, token)).data.target_calories).toBe(1900);
    await page.goto(`${clientPath}/nutrition-plans/${template.id}/edit`);
    await expect(page.getByRole('alert')).toContainText('This plan does not belong here.');
    await expect(save).toHaveCount(0);
    await page.goto(`/clients/${crypto.randomUUID()}/nutrition-plans/${assigned.id}/edit`);
    await expect(page.getByRole('alert')).toContainText('This plan does not belong here.');
    await page.goto(`/nutrition-plans/${assigned.id}`);
    await expect(page.getByRole('alert')).toContainText('This plan does not belong here.');
    if (width === 375) {
      await page.goto(editPath);
      await calories.fill('1600');
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
        }, assigned.id),
      ).toBe(false);
      await page.unroute(`**${endpoint}`);
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, tokens);
    }
    await send('post', `${endpoint}/archive`, {}, token);
    await page.goto(editPath);
    await expect(page.getByRole('alert')).toContainText('This nutrition plan is archived');
    await expect(save).toBeDisabled();
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Client nutrition editing, preview, variations, independent copies, coverage and recovery passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
