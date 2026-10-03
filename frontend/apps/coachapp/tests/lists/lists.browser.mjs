import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
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
    await post('/v1/auth/signup', {email, full_name: 'Taylor'});
    const guest = await post('/v1/auth/verify', {email, otp: '123456'});
    await post(
      '/v1/businesses',
      {full_name: 'Taylor', name: 'List testing', handle: `lists-${unique}`},
      guest.access_token,
    );
    const tokens = await post('/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    for (let index = 0; index < 4; index++) {
      await post(
        '/v1/coach/clients',
        {full_name: `Person ${String(index).padStart(2, '0')}`, email: `client-${unique}-${index}@example.test`},
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
    // Use small real API pages to exercise the shared list within free-account seat limits.
    await page.route('**/v1/coach/clients?*', (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set('limit', '2');
      return route.continue({url: url.toString()});
    });
    await page.goto('/clients');
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

    await context.close();
    console.log(
      `Cursor lists: pagination, totals, filtered return navigation, offline recovery and manual loading passed at ${width}px.`,
    );
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
