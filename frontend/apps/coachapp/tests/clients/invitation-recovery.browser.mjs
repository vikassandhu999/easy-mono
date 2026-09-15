import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
await mkdir('tests/clients/artifacts', {recursive: true});
async function post(path, data, token) {
  const response = await api.post(path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${path}: ${response.status()}`).toBe(true);
  return response.json();
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `test-recovery-client-${unique}@example.test`;
    const coachEmail = `test-recovery-coach-${unique}@example.test`;
    await post('/v1/auth/signup', {email: coachEmail, first_name: 'Test', last_name: 'Coach'});
    const guest = await post('/v1/auth/verify', {email: coachEmail, otp: '123456'});
    await post('/v1/businesses', {name: 'Test invitation recovery', handle: `recovery-${unique}`}, guest.access_token);
    const tokens = await post('/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    let savedId;
    const release = Promise.withResolvers();
    try {
      await page.goto('/login');
      await page.evaluate(async (tokens) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(tokens);
      }, tokens);
      const roster = `/?search=${encodeURIComponent(email)}&status=pending`;
      await page.goto(roster);
      await expect(page.getByText('No matching clients', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Invite client', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Intake', exact: true})).toBeVisible();
      await page.getByLabel('First name', {exact: true}).fill('Test Recovery');
      await page.getByLabel('Email', {exact: true}).fill(email);
      await page.getByRole('link', {name: 'Cancel', exact: true}).click();
      const leave = page.getByRole('dialog', {name: 'Leave this invitation?'});
      await expect(leave).toBeVisible();
      await expect(leave.getByRole('button', {name: 'Keep editing', exact: true})).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(leave).toHaveCount(0);
      await expect(page.getByLabel('Email', {exact: true})).toHaveValue(email);
      const unload = page.waitForEvent('dialog');
      const reload = page.reload().catch(() => {
        // Dismissing beforeunload intentionally cancels this navigation.
      });
      const warning = await unload;
      expect(warning.type()).toBe('beforeunload');
      await warning.dismiss();
      await reload;
      await expect(page.getByLabel('Email', {exact: true})).toHaveValue(email);
      await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
      await expect(leave).toBeVisible();
      await leave.getByRole('button', {name: 'Discard invitation', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}${roster}`);
      await page.getByRole('link', {name: 'Invite client', exact: true}).click();
      await expect(page.getByLabel('First name', {exact: true})).toHaveValue('');
      await page.getByLabel('First name', {exact: true}).fill('Test Recovery');
      await page.getByLabel('Email', {exact: true}).fill(email);

      let sends = 0;
      let searches = 0;
      let failLookup = true;
      await page.route('**/v1/coach/clients?*', async (route) => {
        expect(new URL(route.request().url()).searchParams.get('search')).toBe(email);
        searches += 1;
        if (failLookup) {
          await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
        } else {
          await route.continue();
        }
      });
      await page.route('**/v1/coach/clients/invite', async (route) => {
        sends += 1;
        if (sends === 1) {
          await release.promise;
        } else {
          const response = await route.fetch();
          expect(response.status()).toBe(201);
          savedId = (await response.json()).data.id;
        }
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      });
      await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
      await expect.poll(() => sends).toBe(1);
      await expect(page.getByLabel('Email', {exact: true})).toBeDisabled();
      await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
      await expect(leave.getByText('Please wait while the invitation is sending.')).toBeVisible();
      await expect(leave.getByRole('button', {name: 'Discard invitation', exact: true})).toBeDisabled();
      await leave.getByRole('button', {name: 'Keep editing', exact: true}).click();
      release.resolve();
      await expect(page.getByRole('alert')).toContainText('could not be confirmed');
      await expect(page.getByRole('alert')).toBeInViewport({ratio: 1});
      await expect(page.getByRole('button', {name: 'Send invitation', exact: true})).toBeDisabled();
      await page.getByRole('button', {name: 'Check saved clients', exact: true}).click();
      const recovery = page.getByRole('dialog', {name: 'Check saved clients', exact: true});
      await expect(recovery.getByRole('alert')).toBeVisible();
      await expect(recovery.getByRole('button', {name: 'Return and retry', exact: true})).toHaveCount(0);
      failLookup = false;
      await recovery.getByRole('button', {name: 'Try again', exact: true}).click();
      await expect(recovery.getByText('No matching clients found.', {exact: true})).toBeVisible();
      await recovery.getByRole('button', {name: 'Return and retry', exact: true}).click();
      await expect(page.getByLabel('Email', {exact: true})).toHaveValue(email);
      await expect(page.getByLabel('Email', {exact: true})).toBeEnabled();
      await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
      await expect(page.getByRole('alert')).toContainText('could not be confirmed');
      await page.getByRole('button', {name: 'Check saved clients', exact: true}).click();
      await expect(recovery.getByText('1 matching client', {exact: true})).toBeVisible();
      await expect(recovery.getByText(email, {exact: true})).toBeVisible();
      expect(searches).toBeGreaterThanOrEqual(3);
      expect(sends).toBe(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: `tests/clients/artifacts/invitation-recovery-${width}.png`, fullPage: true});
      await recovery.getByRole('button', {name: 'View client', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}/clients/${savedId}`);
      await expect(page.getByRole('heading', {name: 'Test Recovery', exact: true})).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('Invitation link', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}${roster}`);
      await expect(page.getByRole('link', {name: /Test Recovery/})).toBeVisible();
      const saved = await api.get(`/v1/coach/clients?cursor=start&search=${encodeURIComponent(email)}`, {
        headers: {authorization: `Bearer ${tokens.access_token}`},
      });
      expect(saved.ok()).toBe(true);
      expect((await saved.json()).count).toBe(1);
      console.log(
        `Invitation draft, pending navigation, lookup retry and lost-response recovery passed at ${width}px.`,
      );
    } finally {
      release.resolve();
      await context.close();
      if (savedId) {
        const deleted = await api.delete(`/v1/coach/clients/${savedId}`, {
          headers: {authorization: `Bearer ${tokens.access_token}`},
        });
        expect(deleted.ok()).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
