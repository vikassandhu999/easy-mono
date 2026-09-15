import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/forms/artifacts', {recursive: true});
const errors = [];
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: 'Bearer ' + token} : {}});
  expect(response.ok(), path + ': ' + response.status()).toBe(true);
  return response.status() === 204 ? null : response.json();
}
try {
  for (const width of [375, 1280]) {
    const unique = Date.now() + '-' + width;
    const email = 'test-form-recovery-' + unique + '@example.test';
    await send('post', '/v1/auth/signup', {email, first_name: 'Test'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Test form recovery', handle: 'form-recovery-' + unique},
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
    let created;
    try {
      await page.goto('/login');
      await page.evaluate(async (tokens) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(tokens);
      }, tokens);
      const name = 'Test Recovery Form ' + unique;
      const listURL = '/forms?search=' + encodeURIComponent(name) + '&purpose=check_in';
      await page.goto(listURL);
      await expect(page.getByText('No matching forms', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Create form', exact: true}).click();
      await page.getByLabel('Form name', {exact: true}).fill(name);
      await page.getByLabel('Section title', {exact: true}).fill('Reflection');
      await page.getByLabel('Question', {exact: true}).fill('What helped you this week?');
      let writes = 0;
      await page.route('**/v1/coach/form-templates', async (route) => {
        if (route.request().method() !== 'POST') {
          return route.continue();
        }
        writes += 1;
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        created = (await response.json()).data;
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      });
      await page.getByRole('button', {name: 'Save form', exact: true}).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('alert').locator('..')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', {name: 'Check saved forms', exact: true})).toBeFocused();
      await expect(page.getByRole('button', {name: 'Save form', exact: true})).toBeDisabled();
      await expect(page.getByLabel('Question', {exact: true})).toHaveValue('What helped you this week?');
      await expect(page.getByLabel('Question', {exact: true})).toBeDisabled();
      await expect(page.getByRole('button', {name: 'Add section', exact: true})).toBeDisabled();
      await page.getByRole('button', {name: 'Cancel', exact: true}).click();
      const leave = page.getByRole('dialog', {name: 'Leave without saving?', exact: true});
      await expect(leave).toContainText('may already have been saved');
      await leave.getByRole('button', {name: 'Keep editing', exact: true}).click();
      let lookups = 0;
      await page.route('**/v1/coach/form-templates?*', async (route) => {
        const url = new URL(route.request().url());
        expect(url.searchParams.get('search')).toBe(name);
        expect(url.searchParams.get('purpose')).toBe('check_in');
        lookups += 1;
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      });
      await page.getByRole('button', {name: 'Check saved forms', exact: true}).click();
      const recovery = page.getByRole('dialog', {name: 'Check saved forms', exact: true});
      await expect(recovery.getByRole('alert')).toBeVisible();
      await expect(recovery.getByRole('button', {name: 'Return and retry', exact: true})).toHaveCount(0);
      await page.unroute('**/v1/coach/form-templates?*');
      await recovery.getByRole('button', {name: 'Try again', exact: true}).click();
      await expect(recovery.getByText('1 matching form', {exact: true})).toBeVisible();
      await expect(recovery.getByText('1 question', {exact: true})).toBeVisible();
      await recovery.getByRole('button', {name: 'Preview form', exact: true}).click();
      const preview = page.getByRole('dialog', {name, exact: true});
      await expect(preview.getByText('What helped you this week?', {exact: true})).toBeVisible();
      await preview.getByRole('button', {name: 'Close preview', exact: true}).click();
      await expect(recovery.getByRole('button', {name: 'Preview form', exact: true})).toBeFocused();
      await recovery.getByRole('button', {name: 'Keep my draft', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Check saved forms', exact: true})).toBeFocused();
      await expect(page.getByLabel('Question', {exact: true})).toHaveValue('What helped you this week?');
      await page.keyboard.press('Enter');
      await expect(recovery).toBeVisible();
      expect(lookups).toBeGreaterThan(0);
      expect(writes).toBe(1);
      const bounds = await recovery.boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(901);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: 'tests/forms/artifacts/creation-recovery-' + width + '.png'});
      await recovery.getByRole('button', {name: 'Open saved form', exact: true}).click();
      await expect(page).toHaveURL(baseURL + '/forms/' + created.id);
      await expect(page.getByLabel('Question', {exact: true})).toBeEnabled();
      await expect(page.getByLabel('Question', {exact: true})).toHaveValue('What helped you this week?');
      await page.unroute('**/v1/coach/form-templates');
      await page.getByLabel('Question', {exact: true}).fill('What will you continue next week?');
      await page.getByRole('button', {name: 'Save form', exact: true}).click();
      await expect(page).toHaveURL(baseURL + listURL);
      const result = await send(
        'get',
        '/v1/coach/form-templates?cursor=start&search=' + encodeURIComponent(name),
        undefined,
        tokens.access_token,
      );
      expect(result.count).toBe(1);
      expect(result.data[0].sections[0].questions[0].label).toBe('What will you continue next week?');
      await page.getByRole('link', {name: new RegExp(name)}).click();
      await page.reload();
      await expect(page.getByLabel('Question', {exact: true})).toHaveValue('What will you continue next week?');
      console.log(
        'Form creation lookup, preview, retained draft and lost-response recovery passed at ' + width + 'px.',
      );
    } finally {
      await context.close();
      if (created) {
        const path = '/v1/coach/form-templates/' + created.id;
        const latest = await send('get', path, undefined, tokens.access_token);
        await send('delete', path + '?expected_revision=' + latest.data.revision, undefined, tokens.access_token);
      }
    }
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
