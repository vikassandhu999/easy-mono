import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const appUrl = process.env.COACHAPP_URL || 'http://localhost:2022';
const browser = await chromium.launch();
await mkdir('tests/weight-progress/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `weight-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `weight-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
function shift(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const email = `weight-client-${unique}@example.test`;
    const person = (
      await send('post', '/v1/coach/clients/invite', {first_name: 'Alex', last_name: 'Morgan', email}, token)
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientToken = (await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'}))
      .access_token;
    const endpoint = `/v1/coach/clients/${person.id}/weight-progress`;
    const initial = await send('get', endpoint, undefined, token);
    const today = initial.to;
    const context = await browser.newContext({baseURL: appUrl, viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto(`/clients/${person.id}`);
    await page.route(`**${endpoint}?*`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('link', {name: 'View weight progress', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}?*`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'No measurements in this range', exact: true})).toBeVisible();
    await expect(page.getByText('Not set', {exact: true})).toBeVisible();
    await expect(page.getByLabel('From date', {exact: true})).toHaveValue(initial.from);
    await expect(page.getByLabel('To date', {exact: true})).toHaveValue(today);
    await send('patch', `/v1/coach/clients/${person.id}`, {goal_weight_value: 85, goal_weight_unit: 'kg'}, token);
    async function log(date, value, unit = 'kg', note = null) {
      return (await send('post', '/v1/client/weight_entries', {date, value, unit, note}, clientToken)).data;
    }
    const first = await log(today, 90, 'kg', 'Morning, before breakfast.');
    await page.getByRole('button', {name: 'Refresh measurements', exact: true}).click();
    const rows = page.getByRole('list', {name: 'measurements', exact: true}).locator(':scope > li');
    await expect(rows).toHaveCount(1);
    await expect(page.getByText('One reading recorded', {exact: true})).toBeVisible();
    await expect(page.getByRole('figure', {name: 'Weight trend in kg', exact: true})).toBeVisible();
    await expect(rows.first().getByText('Morning, before breakfast.', {exact: true})).toBeVisible();
    await log(shift(today, -1), 90);
    await page.getByRole('button', {name: 'Refresh measurements', exact: true}).click();
    await expect(rows).toHaveCount(2);
    const constant = await send('get', `${endpoint}?cursor=start`, undefined, token);
    expect(constant.chart.points.map((point) => point.value)).toEqual([90, 90]);
    expect(constant.chart.min < 90 && constant.chart.max > 90).toBe(true);
    const line = page.getByRole('figure', {name: 'Weight trend in kg', exact: true}).locator('polyline');
    const positions = (await line.getAttribute('points')).split(' ').map((point) => point.split(',')[1]);
    expect(positions[0]).toBe(positions[1]);
    for (let index = 2; index < 45; index++) {
      await log(shift(today, -index), 90 + index / 10, 'kg', index === 44 ? 'First reading in this range.' : null);
    }
    const weightQuestion = crypto.randomUUID();
    const form = (
      await send(
        'post',
        '/v1/coach/form-templates',
        {
          name: 'Weekly weight',
          purpose: 'check_in',
          sections: [
            {title: 'Progress', questions: [{id: weightQuestion, type: 'weight', label: 'Weight', required: true}]},
          ],
        },
        token,
      )
    ).data;
    const assignment = (
      await send('post', `/v1/coach/clients/${person.id}/form-assignments`, {form_template_id: form.id}, token)
    ).data;
    await send(
      'post',
      `/v1/client/form-assignments/${assignment.id}/submit`,
      {answers: {[weightQuestion]: 89.5}},
      clientToken,
    );
    const poundsReading = await log(today, 198.416, 'lbs', 'Recorded in pounds.');
    await page.getByRole('button', {name: 'Refresh measurements', exact: true}).click();
    await expect(rows).toHaveCount(20);
    const all = await send('get', `${endpoint}?cursor=start&unit=kg`, undefined, token);
    const persistedPoundsReading = all.data.find((entry) => entry.id === poundsReading.id);
    expect(all.count).toBe(46);
    expect(all.chart.points).toHaveLength(45);
    await expect(page.getByText('46 measurements', {exact: true})).toBeVisible();
    await expect(page.getByText('Form response', {exact: true})).toBeVisible();
    await expect(rows.getByRole('heading', {name: `${persistedPoundsReading.value} lbs`, exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Trend unit'), 'Kilograms (kg)');
    await expect(page.getByRole('figure', {name: 'Weight trend in kg', exact: true})).toBeVisible();
    await expect(
      page.locator('main dl').first().getByText(`${all.summary.latest_entry.value} kg`, {exact: true}),
    ).toBeVisible();
    await page.route(`**${endpoint}?*`, (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute(`**${endpoint}?*`);
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await rows.nth(30).scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await page.getByRole('link', {name: 'Back to client', exact: true}).evaluate((link) => link.click());
    await expect(page.getByRole('heading', {name: 'Alex Morgan', exact: true})).toBeVisible();
    await page.goBack();
    await expect(rows).toHaveCount(40);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(46);
    await expect(rows.last().getByText('First reading in this range.', {exact: true})).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/weight-progress/artifacts/progress-${width}.png`});
    await rows.first().scrollIntoViewIfNeeded();
    await page.screenshot({path: `tests/weight-progress/artifacts/history-${width}.png`});

    await chooseOption(selectTrigger(page, 'Trend unit'), 'Pounds (lbs)');
    const pounds = await send('get', `${endpoint}?cursor=start&unit=lbs`, undefined, token);
    await expect(page.getByRole('figure', {name: 'Weight trend in lbs', exact: true})).toBeVisible();
    await expect(page.getByText(`${pounds.goal.value} lbs`, {exact: true})).toBeVisible();
    await expect(rows.getByRole('heading', {name: `${persistedPoundsReading.value} lbs`, exact: true})).toBeVisible();
    await page.getByLabel('From date', {exact: true}).fill(today);
    await page.getByLabel('To date', {exact: true}).fill(shift(today, -1));
    await page.getByRole('button', {name: 'Apply dates', exact: true}).click();
    await expect(page.getByText('End date must be on or after start date.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('To date', {exact: true})).toBeFocused();
    await page.getByLabel('From date', {exact: true}).fill(shift(today, -366));
    await page.getByLabel('To date', {exact: true}).fill(today);
    await page.getByRole('button', {name: 'Apply dates', exact: true}).click();
    await expect(page.getByText('Choose a date range of up to one year.', {exact: true})).toBeVisible();
    await page.getByLabel('From date', {exact: true}).fill(shift(today, -2));
    await page.getByRole('button', {name: 'Apply dates', exact: true}).click();
    await expect(rows).toHaveCount(4);
    await page.reload();
    await expect(page.getByLabel('From date', {exact: true})).toHaveValue(shift(today, -2));
    await expect(selectTrigger(page, 'Trend unit')).toContainText('Pounds (lbs)');
    await expect(rows).toHaveCount(4);
    await page.route(`**${endpoint}?*`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Refresh measurements', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(rows).toHaveCount(4);
    await expect(page.getByRole('figure', {name: 'Weight trend in lbs', exact: true})).toBeVisible();
    await page.unroute(`**${endpoint}?*`);
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByLabel('From date', {exact: true}).fill(shift(today, -365));
    await page.getByLabel('To date', {exact: true}).fill(shift(today, -300));
    await page.getByRole('button', {name: 'Apply dates', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'No measurements in this range', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Last 90 days', exact: true}).click();
    await expect(rows).toHaveCount(20);
    await send('delete', `/v1/client/weight_entries/${first.id}`, undefined, clientToken);
    await page.getByRole('button', {name: 'Refresh measurements', exact: true}).click();
    await expect(page.getByText('45 measurements', {exact: true})).toBeVisible();
    await expect(page.getByText('Recorded in pounds.', {exact: true})).toHaveCount(0);

    if (width === 375) {
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${endpoint}?*`, async (route) => {
        const response = await route.fetch();
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Refresh measurements', exact: true}).click();
      await held.promise;
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
        }, all.chart.points[0].id),
      ).toBe(false);
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Weight progress: chart, mixed units, form provenance, pagination, dates and recovery passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
