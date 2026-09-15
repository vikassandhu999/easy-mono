import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const appURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/nutrition/artifacts', {recursive: true});

async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function signIn(page, tokens) {
  await page.goto('/login');
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
}
async function fits(page, name, width) {
  await page.screenshot({path: `tests/nutrition/artifacts/assignment-${name}-${width}.png`, fullPage: true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `nutrition-selection-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Everyday Coaching', handle: `selection-${unique}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const person = (
      await send(
        'post',
        '/v1/coach/clients/invite',
        {
          first_name: 'Alex',
          last_name: 'Morgan',
          email: `nutrition-selection-client-${unique}@example.test`,
        },
        token,
      )
    ).data;
    const choosePath = `/clients/${person.id}/nutrition-plans/assign`;
    const listRoute = '**/v1/coach/nutrition-plans?*';
    const context = await browser.newContext({baseURL: appURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    await context.addInitScript(() => {
      delete window.IntersectionObserver;
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, tokens);
    await page.goto(choosePath);
    await expect(page.getByRole('status').filter({hasText: /^0 nutrition templates$/})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Create nutrition plan', exact: true})).toBeVisible();
    await fits(page, 'empty', width);

    const plans = [];
    const longName = `Travel nutrition ${'ConvenientPortableMeals'.repeat(7)}`;
    const longDescription = `Preparation reference: ${'batch-cooking-reference-'.repeat(12)}`;
    for (let index = 0; index < 45; index += 1) {
      plans.push(
        (
          await send(
            'post',
            '/v1/coach/nutrition-plans',
            {
              name: index === 44 ? longName : `Selection template ${String(index).padStart(2, '0')}`,
              description: index === 44 ? longDescription : 'Flexible meals for a consistent routine.',
              target_calories: index === 44 ? 0 : 2000,
            },
            token,
          )
        ).data,
      );
    }
    const releaseRead = Promise.withResolvers();
    await page.route(listRoute, async (route) => {
      await releaseRead.promise;
      await route.fulfill({status: 503, json: {error_message: 'Read unavailable'}});
    });
    await page.reload();
    await expect(page.getByRole('status').filter({hasText: 'Loading nutrition templates…'})).toBeVisible();
    await fits(page, 'loading', width);
    releaseRead.resolve();
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.unroute(listRoute);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    const rows = page.getByRole('list', {name: 'nutrition templates', exact: true}).getByRole('listitem');
    await expect(rows).toHaveCount(20);
    await expect(page.getByRole('status').filter({hasText: /^45 nutrition templates$/})).toBeVisible();
    const firstPageLinks = await rows
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const remotePlan = plans.find(
      (plan) => plan.name !== longName && !firstPageLinks.some((href) => href.endsWith(`/${plan.id}`)),
    );
    expect(remotePlan).toBeDefined();
    await page.route(listRoute, (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {error_message: 'Page unavailable'}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute(listRoute);
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(40);
    await page.getByRole('button', {name: 'Load more', exact: true}).click();
    await expect(rows).toHaveCount(45);
    expect(
      new Set(await rows.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).size,
    ).toBe(45);
    await rows.nth(30).getByRole('link').scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await rows.nth(30).getByRole('link').click();
    await expect(page.getByRole('link', {name: 'Choose another plan', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Choose another plan', exact: true}).click();
    await expect(rows).toHaveCount(45);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll - 100);
    await page.route(listRoute, (route) => route.fulfill({status: 503, json: {error_message: 'Refresh unavailable'}}));
    await page.getByRole('button', {name: 'Refresh nutrition templates', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(45);
    await page.unroute(listRoute);
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toHaveCount(0);
    const search = page.getByLabel('Search nutrition plans', {exact: true});
    await search.fill('No matching template');
    await expect(page.getByRole('status').filter({hasText: /^0 nutrition templates$/})).toBeVisible();
    await search.fill(remotePlan.name);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(remotePlan.name);
    await expect(page.getByRole('status').filter({hasText: /^1 nutrition template$/})).toBeVisible();
    await page.reload();
    await expect(search).toHaveValue(remotePlan.name);
    const detailRoute = `**/v1/coach/nutrition-plans/${remotePlan.id}`;
    await page.route(detailRoute, (route) =>
      route.fulfill({status: 503, json: {error_message: 'Preview unavailable'}}),
    );
    await rows.getByRole('link').click();
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.unroute(detailRoute);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: remotePlan.name, exact: true})).toBeVisible();
    await page.reload();
    await page.getByRole('link', {name: 'Choose another plan', exact: true}).click();
    await expect(search).toHaveValue(remotePlan.name);
    await expect(rows).toHaveCount(1);

    await search.fill('Travel nutrition');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(longName);
    await expect(rows.first().getByText('0 kcal target', {exact: true})).toBeVisible();
    await fits(page, 'long-list', width);
    // A clipped list can hide overflow; text must also fit within the row itself.
    expect(await rows.getByRole('link').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await rows.getByRole('link').click();
    await expect(page.getByRole('heading', {name: longName, exact: true})).toBeVisible();
    await fits(page, 'long-preview', width);
    await send(
      'post',
      `/v1/coach/nutrition-plans/${plans[44].id}/archive?expected_revision=${plans[44].revision}`,
      undefined,
      token,
    );
    await page.reload();
    await expect(
      page.getByText('This plan is unavailable. Choose another active template.', {exact: true}),
    ).toBeVisible();
    await expect(page.getByRole('button', {name: 'Assign nutrition plan', exact: true})).toBeDisabled();
    await page.getByRole('link', {name: 'Choose another plan', exact: true}).click();
    await expect(page.getByRole('status').filter({hasText: /^0 nutrition templates$/})).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();

    const autoContext = await browser.newContext({baseURL: appURL, viewport: {width, height: 900}});
    const autoPage = await autoContext.newPage();
    await signIn(autoPage, tokens);
    await autoPage.goto(choosePath);
    const autoRows = autoPage.getByRole('list', {name: 'nutrition templates', exact: true}).getByRole('listitem');
    await expect(autoRows).toHaveCount(20);
    await autoRows.last().scrollIntoViewIfNeeded();
    await expect(autoRows).toHaveCount(40);
    await autoRows.last().scrollIntoViewIfNeeded();
    await expect(autoRows).toHaveCount(44);
    await autoContext.close();
    console.log(
      `Nutrition assignment ${width}: empty/read retry, 45 rows, manual/automatic paging, search/return, long copy, preview retry and archived exclusion passed.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
