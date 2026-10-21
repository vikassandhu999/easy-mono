import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {signOut} from '../auth/browser-helpers.mjs';
import {checkMobileFoundation} from './mobile-layout.mjs';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const clientURL = process.env.CLIENT_APP_URL || 'http://localhost:1314';
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
await mkdir('tests/clients/artifacts', {recursive: true});

async function post(path, data, token) {
  const response = await api.post(path, {
    data,
    headers: token ? {authorization: `Bearer ${token}`} : {},
  });
  expect(response.ok(), `${path}: ${response.status()}`).toBe(true);
  return response.json();
}

try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const coachEmail = `invite-coach-${unique}@example.test`;
    const clientEmail = `invite-client-${unique}@example.test`;
    await post('/v1/auth/signup', {email: coachEmail, full_name: 'Taylor Coach'});
    const guest = await post('/v1/auth/verify', {email: coachEmail, otp: '123456'});
    await post(
      '/v1/businesses',
      {full_name: 'Taylor Coach', name: 'Everyday Coaching', handle: `invite-${unique}`},
      guest.access_token,
    );
    const tokens = await post('/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/');
    await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    await expect(page.getByText('Invite your first client')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Your account', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Invite client', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Invite client', exact: true})).toBeVisible();
    if (width === 375) {
      await checkMobileFoundation(page);
    }
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByText('Enter full name.', {exact: true})).toBeVisible();
    await expect(page.getByText('Enter email.', {exact: true})).toBeVisible();
    await page.getByLabel('Full name', {exact: true}).fill('Alex Morgan');
    await page.getByLabel('Email', {exact: true}).fill(clientEmail);

    await page.route('**/v1/coach/clients', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable', error_message: 'Unavailable'}}),
    );
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('could not be confirmed');
    await expect(page.getByRole('alert')).toBeInViewport({ratio: 1});
    await expect(page.getByLabel('Email', {exact: true})).toHaveValue(clientEmail);
    await page.unroute('**/v1/coach/clients');
    await page.getByRole('button', {name: 'Check saved clients', exact: true}).click();
    await expect(page.getByText('No matching clients found.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Return and retry', exact: true}).click();
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Alex Morgan', exact: true})).toBeVisible();
    await expect(page.getByText('Waiting for acceptance', {exact: true})).toBeVisible();
    const detailURL = page.url();
    const originalLink = await page.getByLabel('Invitation link', {exact: true}).inputValue();
    expect(originalLink.startsWith(`${clientURL}/invite/`)).toBe(true);
    await page.reload();
    await expect(page.getByLabel('Invitation link', {exact: true})).toHaveValue(originalLink);

    await page.route('**/invite', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable', error_message: 'Unavailable'}}),
    );
    await page.getByRole('button', {name: 'Resend invitation', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('Please try again');
    await expect(page.getByLabel('Invitation link', {exact: true})).toHaveValue(originalLink);
    await page.unroute('**/invite');
    const resentResponse = page.waitForResponse(
      (response) => response.url().endsWith('/invite') && response.status() === 200,
    );
    await page.getByRole('button', {name: 'Resend invitation', exact: true}).click();
    const resent = await (await resentResponse).json();
    await expect(page.getByText('A fresh invitation is on its way', {exact: false})).toBeVisible();
    await expect(page.getByLabel('Invitation link', {exact: true})).toHaveValue(resent.data.invite_url);
    const inviteLink = await page.getByLabel('Invitation link', {exact: true}).inputValue();
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {writeText: () => Promise.reject(new Error('Clipboard unavailable'))},
      });
    });
    await page.getByRole('button', {name: 'Copy link', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('select and copy');
    await page.screenshot({path: `tests/clients/artifacts/invitation-${width}.png`, fullPage: true});
    await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
    await expect(page.getByRole('link', {name: /Alex Morgan/})).toBeVisible();
    await page.getByRole('link', {name: /Alex Morgan/}).click();
    await expect(page).toHaveURL(detailURL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    console.log(`Coach invitation operations passed at ${width}px; checking client acceptance.`);
    const clientContext = await browser.newContext({viewport: {width: 375, height: 812}});
    clientContext.setDefaultTimeout(10000);
    const clientPage = await clientContext.newPage();
    clientPage.on('pageerror', (error) => errors.push(error.message));
    await clientPage.goto(inviteLink);
    await expect(clientPage.getByRole('heading', {name: 'Everyday Coaching', exact: true})).toBeVisible();
    await clientPage.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(clientPage.getByRole('heading', {name: 'Check your email', exact: true})).toBeVisible();
    await clientPage.getByLabel('Login code', {exact: true}).fill('123456');
    const clientLogin = clientPage.waitForResponse(
      (response) => /\/v1\/auth\/invites\/[^/]+\/accept$/.test(response.url()) && response.status() === 200,
    );
    await clientPage.getByRole('button', {name: 'Verify', exact: true}).click();
    expect((await clientLogin).ok()).toBe(true);
    await expect(clientPage).toHaveURL(`${clientURL}/`);
    await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Coaching', exact: true})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Messages', exact: true}).last()).toBeVisible();
    await expect(page.getByRole('button', {name: 'Resend invitation', exact: true})).toHaveCount(0);
    await expect(page.getByLabel('Invitation link', {exact: true})).toHaveCount(0);
    await clientContext.close();
    if (width === 375) {
      await page.goto('/clients/invite');
      await page.getByLabel('Full name', {exact: true}).fill('Delayed client');
      await page.getByLabel('Email', {exact: true}).fill(`delayed-${unique}@example.test`);
      const release = Promise.withResolvers();
      let heldClientId;
      await page.route('**/v1/coach/clients', async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        heldClientId = (await response.json()).data.id;
        await release.promise;
        await route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
      await expect.poll(() => Boolean(heldClientId)).toBe(true);
      await signOut(page);
      await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
      const otherEmail = `other-coach-${unique}@example.test`;
      await post('/v1/auth/signup', {email: otherEmail, full_name: 'Other Coach'});
      const otherGuest = await post('/v1/auth/verify', {email: otherEmail, otp: '123456'});
      await post(
        '/v1/businesses',
        {full_name: 'Other Coach', name: 'Another business', handle: `other-${unique}`},
        otherGuest.access_token,
      );
      const otherTokens = await post('/v1/auth/token', {
        grant_type: 'refresh_token',
        refresh_token: otherGuest.refresh_token,
        role: 'coach',
      });
      await page.evaluate(async (tokens) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(tokens);
      }, otherTokens);
      await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
      await expect(page.getByText('Another business', {exact: true})).toBeVisible();
      const settled = page.waitForResponse((response) => response.url().endsWith('/clients/invite'));
      release.resolve();
      await settled;
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(`${baseURL}/clients`);
      expect(
        await page.evaluate(async (id) => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient.getQueryData(['clients', 'detail', id]);
        }, heldClientId),
      ).toBeUndefined();
      await page.unroute('**/v1/coach/clients');
      console.log('A delayed invitation cannot repopulate another account or navigate it to the previous client.');
    }
    await context.close();
    console.log(`Invite, retry, reload, resend, copy recovery, client acceptance: ${width}px passed.`);
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
