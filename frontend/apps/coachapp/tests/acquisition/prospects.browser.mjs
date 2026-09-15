import {execFileSync} from 'node:child_process';
import {mkdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

execFileSync(
  'rtk',
  ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./prospects-fixtures.exs', import.meta.url))],
  {cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)), stdio: 'pipe'},
);
const fixtures = JSON.parse(await readFile(new URL('./artifacts/prospects-fixtures.json', import.meta.url), 'utf8'));
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://127.0.0.1:44000'});
const browser = await chromium.launch({channel: 'chromium'});
await mkdir('tests/acquisition/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function login(email) {
  await send('post', '/v1/auth/otp', {email, type: 'authentication'});
  return send('post', '/v1/auth/token', {email, otp: '123456', role: 'coach', grant_type: 'otp'});
}
async function session(page, tokens) {
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
}
async function capture(page, name, width) {
  await page.getByRole('heading', {level: 1}).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({path: `tests/acquisition/artifacts/${name}-${width}.png`, fullPage: true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
try {
  for (const fixture of fixtures) {
    const {width, owner_email, applicants} = fixture;
    const tokens = await login(owner_email);
    const context = await browser.newContext({
      baseURL: process.env.COACHAPP_URL || 'http://localhost:22022',
      viewport: {width, height: 900},
    });
    await context.addInitScript(() => {
      delete window.IntersectionObserver;
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await session(page, tokens);
    await page.route('**/v1/coach/prospects?**', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.goto('/applications');
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.unroute('**/v1/coach/prospects?**');
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('status').filter({hasText: /^46 applications/})).toBeVisible();
    const rows = page.getByRole('list', {name: 'applications', exact: true}).getByRole('listitem');
    await expect(rows).toHaveCount(20);
    await page.route('**/v1/coach/prospects?**', (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {error_code: 'unavailable'}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute('**/v1/coach/prospects?**');
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await page.getByRole('button', {name: 'Load more', exact: true}).click();
    await expect(rows).toHaveCount(46);
    expect(
      new Set(await rows.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).size,
    ).toBe(46);
    await page.route('**/v1/coach/prospects?**', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.getByRole('button', {name: 'Refresh applications', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(46);
    await page.unroute('**/v1/coach/prospects?**');
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toHaveCount(0);
    await page.getByLabel('Search applications', {exact: true}).fill('No such applicant');
    await expect(page.getByRole('heading', {name: 'No matching applications', exact: true})).toBeVisible();
    await page.getByLabel('Search applications', {exact: true}).fill('Later Applicant');
    await expect(rows).toHaveCount(1);
    await expect(page.getByRole('status').filter({hasText: /^1 application$/})).toBeVisible();
    await page.reload();
    await expect(rows).toHaveCount(1);
    await capture(page, 'inbox-search', width);
    const target = applicants[45];
    await page.route(`**/v1/coach/prospects/${target.id}`, (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await rows.getByRole('link').click();
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.unroute(`**/v1/coach/prospects/${target.id}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {level: 1})).toHaveText(target.name);
    await expect(page.getByText('What would you like help with?', {exact: true})).toBeVisible();
    await expect(
      page.getByText('Build a consistent strength routine around work and family.', {exact: true}),
    ).toBeVisible();
    await chooseOption(selectTrigger(page, 'Status'), 'In review');
    await page.getByLabel('Private notes', {exact: true}).fill('Good fit. Discuss training around work shifts.');
    let lostReview = false;
    await page.route(`**/v1/coach/prospects/${target.id}`, async (route) => {
      if (route.request().method() === 'PATCH' && !lostReview) {
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        lostReview = true;
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      } else {
        await route.continue();
      }
    });
    await page.getByRole('button', {name: 'Save review', exact: true}).click();
    await expect(page.getByText('Review saved.', {exact: true})).toBeVisible();
    await page.unroute(`**/v1/coach/prospects/${target.id}`);
    await capture(page, 'application-review', width);
    const current = (await send('get', `/v1/coach/prospects/${target.id}`, undefined, tokens.access_token)).data;
    await send(
      'patch',
      `/v1/coach/prospects/${target.id}`,
      {status: 'reviewing', notes: 'Saved by another coach.', expected_revision: current.revision},
      tokens.access_token,
    );
    await page.getByLabel('Private notes', {exact: true}).fill('My older draft.');
    await page.getByRole('button', {name: 'Save review', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Load saved review', exact: true})).toBeVisible();
    await expect(page.locator('form').getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Load saved review', exact: true})).toBeFocused();
    await expect(page.getByLabel('Private notes', {exact: true})).toHaveValue('My older draft.');
    await page.getByRole('button', {name: 'Load saved review', exact: true}).click();
    await page.route(`**/v1/coach/prospects/${target.id}`, (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.getByRole('button', {name: 'Load review', exact: true}).click();
    const reloadDialog = page.getByRole('dialog', {name: 'Load the saved review?', exact: true});
    await expect(reloadDialog.getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(reloadDialog.getByRole('button', {name: 'Keep editing', exact: true})).toBeFocused();
    await expect(page.getByLabel('Private notes', {exact: true})).toHaveValue('My older draft.');
    await page.screenshot({path: `tests/acquisition/artifacts/review-recovery-${width}.png`});
    await page.unroute(`**/v1/coach/prospects/${target.id}`);
    await page.keyboard.press('Tab');
    await expect(reloadDialog.getByRole('button', {name: 'Load review', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Private notes', {exact: true})).toHaveValue('Saved by another coach.');
    await expect(page.getByText('Saved review loaded.', {exact: true})).toBeFocused();
    await page.getByLabel('Private notes', {exact: true}).fill('Unsaved note');
    await page.getByRole('link', {name: 'Enroll as client', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Leave your changes?', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await page.getByRole('button', {name: 'Save review', exact: true}).click();
    await expect(page.getByText('Review saved.', {exact: true})).toBeVisible();
    await page.route('**/v1/coach/form-templates/default-intake', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.getByRole('link', {name: 'Enroll as client', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry intake', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Send invitation', exact: true})).toBeDisabled();
    await page.unroute('**/v1/coach/form-templates/default-intake');
    await page.getByRole('button', {name: 'Retry intake', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Send invitation', exact: true})).toBeEnabled();
    await expect(page.getByLabel('First name', {exact: true})).toHaveValue('Later');
    await page.getByLabel('First name', {exact: true}).fill('Priya');
    await page.getByLabel('Last name', {exact: true}).fill('Sharma');
    await page.route('**/v1/coach/form-templates/default-intake', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.evaluate(async () => {
      const {queryClient} = await import('/src/api/query-client.ts');
      const {formKeys} = await import('/src/api/keys.ts');
      await queryClient.invalidateQueries({queryKey: formKeys.all});
    });
    await expect(page.getByRole('button', {name: 'Retry intake', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Preview intake', exact: true})).toBeVisible();
    await expect(page.getByLabel('First name', {exact: true})).toHaveValue('Priya');
    await expect(page.getByRole('button', {name: 'Send invitation', exact: true})).toBeDisabled();
    await page.unroute('**/v1/coach/form-templates/default-intake');
    await page.getByRole('button', {name: 'Retry intake', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Send invitation', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Preview intake', exact: true}).click();
    await expect(page.getByRole('region', {name: 'Intake questions'})).toBeVisible();
    await page.getByRole('button', {name: 'Close preview', exact: true}).click();
    // Field validation arrives while the form is pending; focus waits for the input to re-enable.
    const originalEmail = await page.getByLabel('Email', {exact: true}).inputValue();
    await page.route(`**/v1/coach/prospects/${target.id}/enroll`, (route) =>
      route.fulfill({
        status: 422,
        json: {error_code: 'invalid_input', error_detail: {fields: {email: ['Check this email address.']}}},
      }),
    );
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByLabel('Email', {exact: true})).toBeFocused();
    await expect(page.getByLabel('Email', {exact: true})).toHaveValue(originalEmail);
    await expect(page.getByText('Check this email address.', {exact: true})).toBeVisible();
    await page.unroute(`**/v1/coach/prospects/${target.id}/enroll`);
    const beforeEnrollment = (await send('get', `/v1/coach/prospects/${target.id}`, undefined, tokens.access_token))
      .data;
    await send(
      'patch',
      `/v1/coach/prospects/${target.id}`,
      {status: 'reviewing', notes: 'Ready to invite.', expected_revision: beforeEnrollment.revision},
      tokens.access_token,
    );
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Refresh application', exact: true})).toBeVisible();
    await expect(page.locator('form').getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Refresh application', exact: true})).toBeFocused();
    await expect(page.getByLabel('First name', {exact: true})).toHaveValue('Priya');
    await page.getByRole('button', {name: 'Refresh application', exact: true}).click();
    await expect(page.getByLabel('First name', {exact: true})).toBeFocused();
    await expect(page.getByRole('button', {name: 'Send invitation', exact: true})).toBeEnabled();
    await capture(page, 'enrollment', width);
    let lostEnrollment = false;
    await page.route(`**/v1/coach/prospects/${target.id}/enroll`, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      lostEnrollment = true;
      await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
    });
    await page.route(`**/v1/coach/prospects/${target.id}`, (route) =>
      lostEnrollment ? route.fulfill({status: 503, json: {error_code: 'unavailable'}}) : route.continue(),
    );
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Check enrollment', exact: true})).toBeVisible();
    await expect(page.locator('form').getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Check enrollment', exact: true})).toBeFocused();
    await expect(page.getByLabel('First name', {exact: true})).toBeDisabled();
    await page.screenshot({path: `tests/acquisition/artifacts/enrollment-recovery-${width}.png`});
    await page.unroute(`**/v1/coach/prospects/${target.id}/enroll`);
    await page.unroute(`**/v1/coach/prospects/${target.id}`);
    await page.getByRole('button', {name: 'Check enrollment', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Enrolled as a client', exact: true})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Enrolled as a client', exact: true})).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', {name: 'View client', exact: true})).toBeFocused();
    await page.evaluate(async (id) => {
      const {queryClient} = await import('/src/api/query-client.ts');
      const {prospectKeys} = await import('/src/api/keys.ts');
      await queryClient.invalidateQueries({queryKey: prospectKeys.detail(id)});
    }, target.id);
    await expect(page.getByRole('link', {name: 'View client', exact: true})).toBeFocused();
    const enrolled = (await send('get', `/v1/coach/prospects/${target.id}`, undefined, tokens.access_token)).data;
    expect(enrolled.status).toBe('won');
    expect(enrolled.client.first_name).toBe('Priya');
    expect((await send('get', '/v1/coach/clients', undefined, tokens.access_token)).count).toBe(1);
    await page.getByRole('link', {name: 'View client', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/clients/${enrolled.client.id}$`));
    await page.getByRole('link', {name: 'Back to applications', exact: true}).click();
    await expect(page.getByLabel('Search applications', {exact: true})).toHaveValue('Later Applicant');
    await chooseOption(selectTrigger(page, 'Status'), 'Accepted (1)');
    await expect(rows).toHaveCount(1);
    await rows.getByRole('link').click();
    await expect(page.getByText('Accepted · enrolled as a client', {exact: true})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Enroll as client', exact: true})).toHaveCount(0);
    const second = applicants[0];
    await send('post', `/v1/coach/prospects/${second.id}/enroll`, {}, tokens.access_token);
    const third = applicants[1];
    await page.goto(`/applications/${third.id}/enroll`);
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('link', {name: 'Open billing in a new tab', exact: true})).toBeVisible();
    await expect(page.locator('form').getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', {name: 'Open billing in a new tab', exact: true})).toBeFocused();
    await expect(page.getByLabel('First name', {exact: true})).toHaveValue('Applicant');
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('link', {name: 'Open billing in a new tab', exact: true}).click();
    const popup = await popupPromise;
    await expect(popup.getByRole('heading', {name: 'Billing', exact: true})).toBeVisible();
    await popup.close();
    expect((await send('get', '/v1/coach/clients', undefined, tokens.access_token)).count).toBe(2);
    const foreign = fixtures.find((item) => item.width !== width);
    const foreignTokens = await login(foreign.owner_email);
    await page.goto(`/applications/${third.id}`);
    await page.getByLabel('Private notes', {exact: true}).fill('Private to this business');
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    let received;
    const started = new Promise((resolve) => {
      received = resolve;
    });
    await page.route(`**/v1/coach/prospects/${third.id}`, async (route) => {
      if (route.request().method() === 'PATCH') {
        const response = await route.fetch();
        received();
        await held;
        await route.fulfill({response});
      } else {
        await route.continue();
      }
    });
    await page.getByRole('button', {name: 'Save review', exact: true}).click();
    await started;
    await session(page, foreignTokens);
    release();
    await page.goto('/applications?status=all');
    await expect(page.locator('.app-business')).toHaveText(`Steady Strength ${foreign.width}`);
    await expect(page.getByText('Private to this business', {exact: true})).toHaveCount(0);
    const cachedIds = await page.evaluate(async () => {
      const {queryClient} = await import('/src/api/query-client.ts');
      return queryClient
        .getQueryCache()
        .getAll()
        .filter((query) => query.queryKey[0] === 'prospects' && query.queryKey[1] === 'detail')
        .map((query) => query.queryKey[2]);
    });
    expect(cachedIds).not.toContain(third.id);
    expect(errors).toEqual([]);
    await context.close();
    const trainerBody = {email: fixture.trainer_email, invitation_token: fixture.trainer_token};
    await send('post', '/v1/auth/trainer-accept-invite', trainerBody);
    const trainerTokens = await send('post', '/v1/auth/trainer-accept-invite/verify', {...trainerBody, otp: '123456'});
    const scrollingContext = await browser.newContext({
      baseURL: process.env.COACHAPP_URL || 'http://localhost:22022',
      viewport: {width, height: 900},
    });
    const scrollingPage = await scrollingContext.newPage();
    await scrollingPage.goto('/login');
    await session(scrollingPage, trainerTokens);
    await scrollingPage.goto('/applications?status=all');
    const scrollingRows = scrollingPage.getByRole('list', {name: 'applications', exact: true}).getByRole('listitem');
    await expect(scrollingRows).toHaveCount(20);
    await scrollingRows.last().scrollIntoViewIfNeeded();
    await expect(scrollingRows).toHaveCount(40);
    await scrollingRows.last().scrollIntoViewIfNeeded();
    await expect(scrollingRows).toHaveCount(46);
    await scrollingRows.last().getByRole('link').click();
    await scrollingPage.getByRole('link', {name: 'Applications', exact: true}).last().click();
    await expect(scrollingRows).toHaveCount(46);
    await expect.poll(() => scrollingPage.evaluate(() => window.scrollY)).toBeGreaterThan(900);
    await scrollingPage.goto(`/applications/${third.id}`);
    await scrollingPage.getByLabel('Private notes', {exact: true}).fill('Trainer reviewed this application.');
    await scrollingPage.getByRole('button', {name: 'Save review', exact: true}).click();
    await expect(scrollingPage.getByText('Review saved.', {exact: true})).toBeVisible();
    expect((await send('get', `/v1/coach/prospects/${third.id}`, undefined, tokens.access_token)).data.notes).toBe(
      'Trainer reviewed this application.',
    );
    await scrollingContext.close();
    console.log(
      `Applications ${width}: 46 rows, paging retry, remote search, review recovery/revisions, intake preview, lost enrollment recovery, seat limits and account isolation passed.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
