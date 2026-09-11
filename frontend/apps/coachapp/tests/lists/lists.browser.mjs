import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
await mkdir('tests/lists/artifacts', {recursive: true});

async function post(path, data, token) {
  const response = await api.post(path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${path}: ${response.status()}`).toBe(true);
  return response.json();
}

try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `lists-${unique}@example.test`;
    await post('/v1/auth/signup', {email, first_name: 'Taylor'});
    const guest = await post('/v1/auth/verify', {email, otp: '123456'});
    await post('/v1/businesses', {name: 'List testing', handle: `lists-${unique}`}, guest.access_token);
    const tokens = await post('/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    for (let index = 0; index < 45; index++) {
      await post(
        '/v1/coach/form-templates',
        {
          name: `Form ${String(index).padStart(2, '0')}`,
          purpose: index % 2 ? 'check_in' : 'intake',
          sections: [{questions: [{id: crypto.randomUUID(), label: 'Goals?', type: 'text'}]}],
        },
        tokens.access_token,
      );
    }
    for (let index = 0; index < 4; index++) {
      await post(
        '/v1/coach/clients/invite',
        {first_name: `Person ${String(index).padStart(2, '0')}`, email: `client-${unique}-${index}@example.test`},
        tokens.access_token,
      );
    }
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/forms');
    const rows = page.getByRole('list', {name: 'forms', exact: true}).getByRole('listitem');
    await expect(rows).toHaveCount(20);
    await expect(page.getByRole('status').getByText('46 forms', {exact: true})).toBeVisible();
    await expect(rows.first()).toContainText(/1 question|Weekly check-in/);

    let failedRequests = 0;
    await page.route('**/v1/coach/form-templates?*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('cursor') !== 'start') {
        failedRequests++;
        return route.fulfill({status: 503, json: {error_message: 'Page unavailable'}});
      }
      return route.continue();
    });
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    // Give the observer multiple render/visibility opportunities; an error must pause it.
    await page.evaluate(() => window.scrollBy(0, -100));
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    expect(failedRequests).toBe(1);
    await page.unroute('**/v1/coach/form-templates?*');
    const retry = page.getByRole('button', {name: 'Retry loading more', exact: true});
    await retry.focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(40);
    await expect(page.getByRole('button', {name: 'Load more', exact: true})).toBeFocused();
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(46);
    await expect(page.getByRole('button', {name: 'All forms loaded', exact: true})).toBeDisabled();
    const ids = await rows.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(new Set(ids).size).toBe(46);

    // Browser Back and the editor's own Cancel preserve loaded pages and position.
    await rows.nth(30).getByRole('link').scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await rows.nth(30).getByRole('link').click();
    await expect(page.getByLabel('Form name', {exact: true})).toBeVisible();
    await page.goBack();
    await expect(rows).toHaveCount(46);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before - 100);
    await rows.nth(30).getByRole('link').click();
    await page.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(rows).toHaveCount(46);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before - 100);

    await page.getByLabel('Search forms', {exact: true}).fill('Form 00');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Form 00');
    await expect(page.getByLabel('Search forms', {exact: true})).toBeFocused();
    await page.reload();
    await expect(page.getByLabel('Search forms', {exact: true})).toHaveValue('Form 00');
    await expect(rows).toHaveCount(1);
    await chooseOption(selectTrigger(page, 'Form purpose'), 'Check-in');
    await expect(page.getByText('No matching forms', {exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Form purpose'), 'Intake');
    await expect(rows).toHaveCount(1);
    await rows.first().getByRole('link').click();
    await page.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(page.getByLabel('Search forms', {exact: true})).toHaveValue('Form 00');
    await expect(selectTrigger(page, 'Form purpose')).toHaveText('Intake');

    // A cancelled slow search must never replace newer results.
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    await page.route('**/v1/coach/form-templates?*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('search') === 'slow') {
        const response = await route.fetch();
        held.resolve();
        await release.promise;
        try {
          await route.fulfill({response});
        } catch {
          // Search cancellation may close this request before its held response is released.
        }
        return;
      }
      return route.continue();
    });
    await page.getByLabel('Search forms', {exact: true}).fill('slow');
    await held.promise;
    await page.getByLabel('Search forms', {exact: true}).fill('Form 02');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Form 02');
    release.resolve();
    await page.waitForLoadState('networkidle');
    await expect(rows.first()).toContainText('Form 02');
    await page.unroute('**/v1/coach/form-templates?*');

    // Failed refresh preserves rows; explicit refresh retries successfully.
    await page.route('**/v1/coach/form-templates?*', (route) =>
      route.fulfill({status: 503, json: {error_message: 'Refresh unavailable'}}),
    );
    await page.getByRole('button', {name: 'Refresh forms', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(1);
    await page.unroute('**/v1/coach/form-templates?*');
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.screenshot({path: `tests/lists/artifacts/forms-${width}.png`, fullPage: true});

    // Use small real API pages to exercise the shared list within free-account seat limits.
    await page.route('**/v1/coach/clients?*', (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set('limit', '2');
      return route.continue({url: url.toString()});
    });
    await page.getByRole('link', {name: 'Clients', exact: true}).click();
    const clients = page.getByRole('list', {name: 'clients', exact: true}).getByRole('listitem');
    await expect(page.getByRole('status').getByText('4 clients', {exact: true})).toBeVisible();
    // Short pages fill the viewport automatically.
    await expect(clients).toHaveCount(4);
    await page.getByLabel('Search clients', {exact: true}).fill('Person 00');
    await expect(clients).toHaveCount(1);
    await expect(clients.first()).toContainText('Person 00');
    expect(
      await clients
        .first()
        .locator('.client-row-meta')
        .evaluate((node) => {
          const parent = node.getBoundingClientRect();
          return Array.from(node.querySelectorAll('p')).every(
            (paragraph) => paragraph.getBoundingClientRect().right <= parent.right + 1,
          );
        }),
    ).toBe(true);
    await clients.first().getByRole('link').click();
    await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
    await expect(page.getByLabel('Search clients', {exact: true})).toHaveValue('Person 00');
    await expect(clients).toHaveCount(1);
    await page.getByRole('link', {name: 'Invite client', exact: true}).click();
    await page.getByRole('link', {name: 'Cancel', exact: true}).click();
    await expect(page.getByLabel('Search clients', {exact: true})).toHaveValue('Person 00');
    await expect(clients).toHaveCount(1);
    await page.screenshot({path: `tests/lists/artifacts/clients-${width}.png`, fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Manual loading remains available without an intersection observer.
    await page.addInitScript(() => {
      delete window.IntersectionObserver;
    });
    await page.goto('/');
    await expect(clients).toHaveCount(2);
    const moreClients = page.getByRole('button', {name: 'Load more', exact: true});
    await moreClients.focus();
    await page.keyboard.press('Enter');
    await expect(clients).toHaveCount(4);
    await context.setOffline(true);
    await page.getByRole('button', {name: 'Refresh clients', exact: true}).click();
    await expect(
      page.getByText('Waiting for a connection… Your loaded results are still here.', {exact: true}),
    ).toBeVisible();
    await expect(clients).toHaveCount(4);
    await context.setOffline(false);
    await expect(
      page.getByText('Waiting for a connection… Your loaded results are still here.', {exact: true}),
    ).toHaveCount(0);

    if (width === 375) {
      const otherEmail = `other-lists-${unique}@example.test`;
      await post('/v1/auth/signup', {email: otherEmail});
      const otherGuest = await post('/v1/auth/verify', {email: otherEmail, otp: '123456'});
      await post(
        '/v1/businesses',
        {name: 'Other list account', handle: `other-lists-${unique}`},
        otherGuest.access_token,
      );
      const otherTokens = await post('/v1/auth/token', {
        grant_type: 'refresh_token',
        refresh_token: otherGuest.refresh_token,
        role: 'coach',
      });
      await page.goto('/forms');
      await expect(rows).toHaveCount(20);
      const late = Promise.withResolvers();
      const finish = Promise.withResolvers();
      await page.route('**/v1/coach/form-templates?*', async (route) => {
        const response = await route.fetch();
        late.resolve();
        await finish.promise;
        try {
          await route.fulfill({response});
        } catch {
          // Account replacement aborts queries from the prior session.
        }
      });
      await page.getByRole('button', {name: 'Load more', exact: true}).click();
      await late.promise;
      await page.evaluate(async (tokens) => {
        const {saveSession, clearSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, otherTokens);
      await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
      await page.unroute('**/v1/coach/form-templates?*');
      finish.resolve();
      await page.getByRole('link', {name: 'Clients', exact: true}).click();
      await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Forms', exact: true}).click();
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText('Weekly check-in');
      await expect(page.getByRole('status').getByText('1 form', {exact: true})).toBeVisible();
    }
    await context.close();
    console.log(
      `Cursor lists: pagination, page-error retry, search races, filtering, totals and navigation passed at ${width}px.`,
    );
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
