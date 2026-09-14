import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch({channel: 'chromium'});
await mkdir('tests/clients/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `profile-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `profile-${unique}`}, guest.access_token);
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
    const invite = async (name) =>
      (
        await send(
          'post',
          '/v1/coach/clients/invite',
          {
            first_name: name,
            last_name: 'Morgan',
            email: `${name}-${unique}@example.test`,
          },
          token,
        )
      ).data;
    const accepted = await invite('Alex');
    const pending = await invite('Jordan');
    const invitation_token = new URL(accepted.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email: accepted.email, invitation_token});
    await send('post', '/v1/auth/accept-invite/verify', {email: accepted.email, invitation_token, otp: '123456'});
    const context = await browser.newContext({
      baseURL: process.env.COACHAPP_URL || 'http://localhost:2022',
      viewport: {width, height: 1000},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/?status=pending');
    await expect(page.getByText('1 client', {exact: true})).toBeVisible();
    await page.getByText('Jordan Morgan', {exact: true}).click();
    await page.getByRole('link', {name: 'Client details', exact: true}).click();
    await page.getByLabel('First name', {exact: true}).fill('Jules');
    const pendingEndpoint = `/v1/coach/clients/${pending.id}`;
    await page.evaluate(async () => {
      const {client} = await import('/src/api/client.ts');
      window.profileWrites = [];
      client.use({
        onRequest: async ({request}) => {
          if (request.method === 'PATCH') {
            window.profileWrites.push(JSON.parse(await request.clone().text()));
          }
          return request;
        },
      });
    });
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect.poll(() => page.evaluate(() => window.profileWrites)).toEqual([{first_name: 'Jules'}]);
    await expect(page.getByText('Client details saved.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to client', exact: true}).first().click();
    await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
    await expect(selectTrigger(page, 'Status')).toContainText('Invited');
    await expect(page.getByText('Jules Morgan', {exact: true})).toBeVisible();

    const path = `/clients/${accepted.id}/profile`;
    const endpoint = `/v1/coach/clients/${accepted.id}`;
    const stored = async () => (await send('get', endpoint, undefined, token)).data;
    await page.goto(path);
    await expect(page.getByText(/Your client manages their account name/)).toBeVisible();
    await expect(page.getByLabel('First name', {exact: true})).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Revoke invitation', exact: true})).toHaveCount(0);
    await page.getByLabel('Phone', {exact: true}).fill('555-0100');
    await page.getByLabel('Coaching notes', {exact: true}).fill('Prefers morning sessions.');
    await page.getByText('Training', {exact: true}).last().click();
    await expect(page.getByRole('checkbox', {name: 'Training', exact: true})).toBeChecked();
    await page.getByRole('checkbox', {name: 'Nutrition', exact: true}).press('Space');
    await expect(page.getByRole('checkbox', {name: 'Nutrition', exact: true})).toBeChecked();
    await page.getByLabel('Engagement starts', {exact: true}).fill('2026-01-01');
    await page.getByLabel('Engagement ends', {exact: true}).fill('2099-12-31');
    await chooseOption(selectTrigger(page, 'Coaching stage'), 'Coaching');
    await page.getByLabel('Goal weight', {exact: true}).fill('170');
    await chooseOption(selectTrigger(page, 'Unit'), 'lb');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Client details saved.', {exact: true})).toBeVisible();
    expect(await stored()).toMatchObject({
      phone: '555-0100',
      notes: 'Prefers morning sessions.',
      stage: 'coaching',
      goal_weight_unit: 'lbs',
    });
    await page.reload();
    await expect(page.getByLabel('Phone', {exact: true})).toHaveValue('555-0100');
    await expect(page.getByLabel('Goal weight', {exact: true})).toHaveValue(/^170(?:\.0+)?$/);
    if (width === 1280) {
      for (const [first, second] of [
        ['Contact email', 'Phone'],
        ['Engagement starts', 'Engagement ends'],
      ]) {
        const a = await page.getByLabel(first, {exact: true}).boundingBox();
        const b = await page.getByLabel(second, {exact: true}).boundingBox();
        expect(Math.abs(a.y - b.y)).toBeLessThan(1);
      }
    }
    await page.screenshot({path: `tests/clients/artifacts/profile-${width}.png`, fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // Failed saves retain the draft; the same partial write can be retried after a lost response.
    await page.getByLabel('Coaching notes', {exact: true}).fill('Keep this draft.');
    await page.getByRole('link', {name: 'Back to client', exact: true}).first().click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await page.route(`**${endpoint}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Coaching notes', {exact: true})).toHaveValue('Keep this draft.');
    await page.unroute(`**${endpoint}`);
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        return route.continue();
      }
      await route.fetch();
      await route.abort('failed');
    });
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(
      page.getByText('Could not save client details. Your changes are still here.', {exact: true}),
    ).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Client details saved.', {exact: true})).toBeVisible();
    await page.getByLabel('Engagement ends', {exact: true}).fill('2025-01-01');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByLabel('Engagement ends', {exact: true})).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Engagement ends', {exact: true})).toHaveValue('2025-01-01');
    await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
    await page.getByLabel('Coaching notes', {exact: true}).fill('Discard this edit.');
    await page.getByRole('link', {name: 'Back to client', exact: true}).first().click();
    await page.getByRole('button', {name: 'Discard and leave', exact: true}).click();
    await page.getByRole('link', {name: 'Client details', exact: true}).click();
    await expect(page.getByLabel('Coaching notes', {exact: true})).toHaveValue('Keep this draft.');
    for (const label of ['Phone', 'Coaching notes', 'Goal weight']) {
      await page.getByLabel(label, {exact: true}).fill('');
    }
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Client details saved.', {exact: true})).toBeVisible();
    expect(await stored()).toMatchObject({phone: null, notes: null, goal_weight_value: null, goal_weight_unit: null});

    // Access actions are separate, confirmed, and leave the coaching history intact.
    await page.getByRole('button', {name: 'Deactivate client', exact: true}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Alex Morgan', {exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    expect((await stored()).status).toBe('active');
    await page.getByRole('button', {name: 'Deactivate client', exact: true}).click();
    await dialog.getByRole('button', {name: 'Deactivate client', exact: true}).click();
    await expect(page.getByText('Inactive client', {exact: true})).toBeVisible();
    await send('patch', endpoint, {subscription_ends_on: '2026-01-02'}, token);
    await page.reload();
    await page.getByRole('button', {name: 'Reactivate client', exact: true}).click();
    await dialog.getByRole('button', {name: 'Reactivate client', exact: true}).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('alert')).not.toHaveText('Please check the details and try again.');
    await dialog.getByLabel('Engagement ends', {exact: true}).fill('');
    await dialog.getByRole('button', {name: 'Reactivate client', exact: true}).click();
    await expect(page.getByText('Client reactivated.', {exact: true})).toBeVisible();
    expect(await stored()).toMatchObject({status: 'active', subscription_ends_on: null});
    await page.goto('/?status=active&stage=coaching&search=Alex');
    await expect(page.getByText('1 client', {exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Status'), 'Inactive');
    await expect(page.getByText('No matching clients', {exact: true})).toBeVisible();
    await page.goto(`/clients/${pending.id}/profile`);
    await page.getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await page.route(`**${pendingEndpoint}`, (route) =>
      route.request().method() === 'DELETE' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await page.getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await dialog.getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await page.unroute(`**${pendingEndpoint}`);
    await page.route(`**${pendingEndpoint}`, async (route) => {
      if (route.request().method() !== 'DELETE') {
        return route.continue();
      }
      await route.fetch();
      return route.abort('failed');
    });
    await dialog.getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await expect(dialog.getByText('The change could not be confirmed. Please try again.', {exact: true})).toBeVisible();
    await page.unroute(`**${pendingEndpoint}`);
    await dialog.getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    await expect(page.getByText('1 client', {exact: true})).toBeVisible();
    await page.screenshot({path: `tests/clients/artifacts/roster-${width}.png`, fullPage: true});
    await page.goto('/clients/not-a-uuid/profile');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('link', {name: 'Return to clients', exact: true})).toBeVisible();

    if (width === 375) {
      await page.goto(path);
      await page.getByLabel('Coaching notes', {exact: true}).fill('Late update.');
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${endpoint}`, async (route) => {
        if (route.request().method() !== 'PATCH') {
          return route.continue();
        }
        const response = await route.fetch();
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Save changes', exact: true}).click();
      await held.promise;
      const replacement = await account(`replacement-${unique}`);
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, replacement);
      release.resolve();
      await page.waitForLoadState('networkidle');
      expect(
        await page.evaluate(async (id) => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient
            .getQueryCache()
            .getAll()
            .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
        }, accepted.id),
      ).toBe(false);
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(`Client profile, lifecycle, filters and failure recovery passed at ${width}px.`);
  }
} finally {
  await browser.close();
  await api.dispose();
}
