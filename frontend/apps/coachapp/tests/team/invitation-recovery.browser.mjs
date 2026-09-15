import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const baseURL = process.env.COACHAPP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/team/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: 'Bearer ' + token} : {}});
  expect(response.ok(), path + ': ' + response.status()).toBe(true);
  return response.status() === 204 ? null : response.json();
}
const errors = [];
try {
  for (const width of [375, 1280]) {
    const unique = Date.now() + '-' + width;
    const ownerEmail = 'test-team-owner-' + unique + '@example.test';
    const email = 'test-team-invitation-' + unique + '@example.test';
    await send('post', '/v1/auth/signup', {email: ownerEmail, first_name: 'Test'});
    const guest = await send('post', '/v1/auth/verify', {email: ownerEmail, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Test Team Recovery', handle: 'team-recovery-' + unique},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    const created = [];
    const release = Promise.withResolvers();
    try {
      await page.goto('/login');
      await page.evaluate(async (tokens) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(tokens);
      }, tokens);
      const listURL = '/team?search=' + encodeURIComponent(email) + '&status=invited';
      await page.goto(listURL);
      await expect(page.getByText('No matching team members', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Invite coach', exact: true}).click();
      await page.getByLabel('Email', {exact: true}).fill(ownerEmail);
      await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
      await expect(page.getByLabel('Email', {exact: true})).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByLabel('Email', {exact: true})).toBeFocused();
      await expect(page.getByLabel('Email', {exact: true})).toBeEnabled();
      await expect(page.getByRole('button', {name: 'Check Team', exact: true})).toHaveCount(0);
      await page.getByLabel('Email', {exact: true}).fill(email);
      await page.getByLabel('First name', {exact: true}).fill('Test Recovery Coach');
      let writes = 0;
      let original;
      await page.route('**/v1/coach/team/invite', async (route) => {
        writes += 1;
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        original = (await response.json()).data;
        created.push(original.id);
        await release.promise;
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      });
      await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
      await expect.poll(() => created.length).toBe(1);
      await page.getByRole('link', {name: 'Back to team', exact: true}).click();
      const leave = page.getByRole('dialog', {name: 'Leave this invitation?', exact: true});
      await expect(leave.getByRole('button', {name: 'Discard and leave', exact: true})).toBeDisabled();
      await leave.getByRole('button', {name: 'Keep editing', exact: true}).click();
      release.resolve();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('button', {name: 'Send invitation', exact: true})).toBeDisabled();
      await expect(page.getByLabel('Email', {exact: true})).toBeDisabled();
      await expect(page.getByLabel('Email', {exact: true})).toHaveValue(email);
      await expect(page.getByRole('alert').locator('..')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', {name: 'Check Team', exact: true})).toBeFocused();
      await page.route('**/v1/coach/team?*', async (route) => {
        expect(new URL(route.request().url()).searchParams.get('search')).toBe(email);
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      });
      await page.keyboard.press('Enter');
      const lookup = page.getByRole('dialog', {name: 'Check Team', exact: true});
      await expect(lookup.getByRole('alert')).toBeVisible();
      await expect(lookup.getByRole('button', {name: 'Return and retry', exact: true})).toHaveCount(0);
      await page.unroute('**/v1/coach/team?*');
      await lookup.getByRole('button', {name: 'Try again', exact: true}).click();
      await expect(lookup.getByText('1 matching coach', {exact: true})).toBeVisible();
      await expect(lookup.getByText(email, {exact: true})).toBeVisible();
      await lookup.getByRole('button', {name: 'Keep my details', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Check Team', exact: true})).toBeFocused();
      await page.getByRole('link', {name: 'Cancel', exact: true}).click();
      await expect(leave).toContainText('does not revoke a sent invitation');
      await leave.getByRole('button', {name: 'Keep editing', exact: true}).click();
      await page.getByRole('button', {name: 'Check Team', exact: true}).click();
      await expect(lookup.getByText('1 matching coach', {exact: true})).toBeVisible();
      const bounds = await lookup.boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(901);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: 'tests/team/artifacts/invitation-recovery-' + width + '.png'});
      await lookup.getByRole('button', {name: 'View coach', exact: true}).click();
      await expect(page).toHaveURL(baseURL + '/team/' + original.id);
      await expect(page.getByRole('heading', {name: 'Test Recovery Coach', exact: true})).toBeVisible();
      await page.reload();
      await expect(page.getByText('Waiting for this coach to accept their invitation.', {exact: true})).toBeVisible();
      const saved = await send('get', '/v1/coach/team/' + original.id, undefined, tokens.access_token);
      expect(saved.data.invitation_sent_at).toBe(original.invitation_sent_at);
      expect(writes).toBe(1);
      await page.getByRole('link', {name: 'Back to team', exact: true}).click();
      await expect(page).toHaveURL(baseURL + listURL);
      await expect(page.getByRole('link', {name: /Test Recovery Coach/})).toBeVisible();

      await page.unroute('**/v1/coach/team/invite');
      await page.getByRole('link', {name: 'Invite coach', exact: true}).click();
      const secondEmail = 'test-team-retry-' + unique + '@example.test';
      await page.getByLabel('Email', {exact: true}).fill(secondEmail);
      await page.getByLabel('First name', {exact: true}).fill('Test Retry Coach');
      await page.route('**/v1/coach/team/invite', (route) =>
        route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
      );
      await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await page.getByRole('button', {name: 'Check Team', exact: true}).click();
      await expect(lookup.getByText('No matching coaches found.', {exact: true})).toBeVisible();
      await lookup.getByRole('button', {name: 'Return and retry', exact: true}).click();
      await expect(page.getByLabel('Email', {exact: true})).toBeFocused();
      await expect(page.getByLabel('Email', {exact: true})).toHaveValue(secondEmail);
      await page.unroute('**/v1/coach/team/invite');
      const response = page.waitForResponse(
        (value) => value.url().endsWith('/v1/coach/team/invite') && value.status() === 200,
      );
      await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
      created.push((await (await response).json()).data.id);
      await expect(page.getByRole('heading', {name: 'Test Retry Coach', exact: true})).toBeVisible();
      console.log(
        'Team invitation lookup, retained details, pending navigation and explicit retry passed at ' + width + 'px.',
      );
    } finally {
      release.resolve();
      await context.close();
      for (const id of created) {
        await send('delete', '/v1/coach/team/' + id, undefined, tokens.access_token);
      }
    }
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
