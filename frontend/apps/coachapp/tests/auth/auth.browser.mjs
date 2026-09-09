import {mkdir} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const browser = await chromium.launch();
const context = await browser.newContext({baseURL, viewport: {width: 375, height: 812}});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await expect(page.getByText('Enter email.')).toBeVisible();
  await mkdir('tests/auth/artifacts', {recursive: true});
  await page.screenshot({path: 'tests/auth/artifacts/login-mobile.png', fullPage: true});
  const email = `coach-auth-${Date.now()}@example.test`;
  const handle = `auth-${Date.now()}`;
  await page.getByRole('link', {name: 'Create an account'}).click();
  await page.getByLabel('First name').fill('Alex');
  await page.getByLabel('Last name').fill('Coach');
  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Create account', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Enter the 6-digit code sent to ${email}.`)).toBeVisible();
  await page.getByLabel('Verification code').fill('000000');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByText('Invalid code. Please check and try again.')).toBeVisible();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Your coaching business'})).toBeVisible();
  await page.reload();
  await page.getByLabel('Business name', {exact: true}).fill(' ');
  await page.getByLabel('Business handle', {exact: true}).fill(handle);
  await page.getByRole('button', {name: 'Create business'}).click();
  await expect(page.getByLabel('Business name', {exact: true})).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Business name', {exact: true}).fill('Intentional Coaching');
  let businessesCreated = 0;
  await page.route('**/v1/businesses', async (route) => {
    const response = await route.fetch();
    if (response.status() === 201) {
      businessesCreated += 1;
    }
    await route.fulfill({response});
  });
  await page.route('**/v1/auth/token', (route) =>
    businessesCreated > 0
      ? route.fulfill({status: 503, json: {error_code: 'unavailable', error_message: 'Unavailable'}})
      : route.continue(),
  );
  await page.getByRole('button', {name: 'Create business'}).click();
  await expect(page.getByText('We could not reach the service. Please try again shortly.')).toBeVisible();
  await page.unroute('**/v1/auth/token');
  await page.getByRole('button', {name: 'Create business'}).click();
  await expect(page.getByRole('heading', {name: "You're signed in"})).toBeVisible();
  expect(businessesCreated).toBe(1);
  await page.unroute('**/v1/businesses');
  await expect(page.getByText(email, {exact: true})).toBeVisible();
  await page.reload();
  await expect(page.getByText(email, {exact: true})).toBeVisible();
  await page.setViewportSize({width: 1280, height: 900});
  await page.screenshot({path: 'tests/auth/artifacts/account-desktop.png', fullPage: true});
  const secondTab = await context.newPage();
  await secondTab.goto('/');
  await expect(secondTab.getByText(email, {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(secondTab.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  await secondTab.close();
  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
  await page.getByRole('link', {name: 'Change email'}).click();
  await expect(page.getByLabel('Email', {exact: true})).toHaveValue(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
  await page.evaluate(() => {
    const challenge = JSON.parse(sessionStorage.getItem('coachapp.challenge.v1'));
    sessionStorage.setItem('coachapp.challenge.v1', JSON.stringify({...challenge, sentAt: Date.now() - 31_000}));
  });
  await page.reload();
  await page.getByRole('button', {name: 'Resend code', exact: true}).click();
  await expect(page.getByText('A fresh code is on its way.')).toBeVisible();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByText(email, {exact: true})).toBeVisible();

  const expire = () =>
    page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('coachapp.auth.v1'));
      localStorage.setItem('coachapp.auth.v1', JSON.stringify({...session, expiresAt: 1}));
    });
  const peer = await context.newPage();
  await peer.goto('/');
  await expect(peer.getByText(email, {exact: true})).toBeVisible();
  let refreshes = 0;
  const countRefreshes = (request) => {
    if (request.url().endsWith('/v1/auth/token') && request.postDataJSON()?.grant_type === 'refresh_token') {
      refreshes += 1;
    }
  };
  context.on('request', countRefreshes);
  await expire();
  await Promise.all([page.reload(), peer.reload()]);
  await expect(page.getByText(email, {exact: true})).toBeVisible();
  await expect(peer.getByText(email, {exact: true})).toBeVisible();
  expect(refreshes).toBe(1);
  context.off('request', countRefreshes);

  await page.route('**/v1/auth/token', (route) =>
    route.fulfill({status: 503, json: {error_code: 'unavailable', error_message: 'Unavailable'}}),
  );
  await expire();
  await page.reload();
  await expect(page.getByRole('button', {name: 'Try again'})).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('coachapp.auth.v1'))).not.toBeNull();
  await page.unroute('**/v1/auth/token');
  await page.getByRole('button', {name: 'Try again'}).click();
  await expect(page.getByText(email, {exact: true})).toBeVisible();

  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('coachapp.auth.v1'));
    session.tokens.access_token = 'invalid-access-token';
    localStorage.setItem('coachapp.auth.v1', JSON.stringify(session));
  });
  const forcedRefreshRecovered = await page.evaluate(async () => {
    const {refreshSession} = await import('/src/api/client.ts');
    const [, forced] = await Promise.all([
      refreshSession(),
      refreshSession({rejectedAccessToken: 'invalid-access-token'}),
    ]);
    return forced.tokens.access_token !== 'invalid-access-token';
  });
  expect(forcedRefreshRecovered).toBe(true);
  await page.reload();
  await expect(page.getByText(email, {exact: true})).toBeVisible();

  await page.route('**/v1/coach/me', (route) =>
    route.fulfill({status: 403, json: {error_code: 'unauthorized', error_message: 'Insufficient permissions'}}),
  );
  await page.reload();
  await expect(page.getByText('Insufficient permissions', {exact: true})).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('coachapp.auth.v1'))).not.toBeNull();
  await page.unroute('**/v1/coach/me');
  await page.getByRole('button', {name: 'Try again'}).click();
  await expect(page.getByText(email, {exact: true})).toBeVisible();

  let refreshReceived = false;
  const releaseRefresh = Promise.withResolvers();
  await page.route('**/v1/auth/token', async (route) => {
    const response = await route.fetch();
    refreshReceived = true;
    await releaseRefresh.promise;
    await route.fulfill({response});
  });
  await expire();
  await page.reload();
  await expect.poll(() => refreshReceived).toBe(true);
  await peer.getByRole('button', {name: 'Sign out', exact: true}).click();
  releaseRefresh.resolve();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('coachapp.auth.v1'))?.tokens)).toBeUndefined();
  await page.unroute('**/v1/auth/token');
  await peer.close();

  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
  let verificationReceived = false;
  const releaseVerification = Promise.withResolvers();
  await page.route('**/v1/auth/token', async (route) => {
    const response = await route.fetch();
    verificationReceived = true;
    await releaseVerification.promise;
    await route.fulfill({response});
  });
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect.poll(() => verificationReceived).toBe(true);
  const loginPeer = await context.newPage();
  await loginPeer.goto('/login');
  await loginPeer.getByLabel('Email', {exact: true}).fill(email);
  await loginPeer.getByRole('button', {name: 'Continue with email'}).click();
  await loginPeer.getByLabel('Verification code').fill('123456');
  await loginPeer.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(loginPeer.getByText(email, {exact: true})).toBeVisible();
  await loginPeer.getByRole('button', {name: 'Sign out', exact: true}).click();
  const verificationResponse = page.waitForResponse((response) => response.url().endsWith('/v1/auth/token'));
  releaseVerification.resolve();
  await verificationResponse;
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('coachapp.auth.v1'))?.tokens)).toBeUndefined();
  await page.unroute('**/v1/auth/token');
  await loginPeer.close();

  const unfinishedEmail = `unfinished-${Date.now()}@example.test`;
  await page.goto('/signup');
  await page.getByLabel('Email', {exact: true}).fill(unfinishedEmail);
  await page.getByRole('button', {name: 'Create account', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
  await page.getByRole('link', {name: 'Change email'}).click();
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Your coaching business'})).toBeVisible();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await page.getByLabel('Email', {exact: true}).fill(unfinishedEmail);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Your coaching business'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Create business'})).toBeVisible();
  await page.route('**/v1/auth/token', (route) =>
    route.fulfill({status: 400, json: {error_code: 'session_revoked', error_message: 'The session has been revoked'}}),
  );
  await expire();
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('coachapp.auth.v1'))?.tokens)).toBeUndefined();
  await page.unroute('**/v1/auth/token');
  expect(errors).toEqual([]);
  console.log(
    'Real API: signup, invalid OTP recovery, business field errors/setup, change email, resend, login, reload and cross-tab refresh/logout passed.',
  );
  console.log(
    'Failure recovery: refresh outage, forbidden profile, corrupt access token, and logout during refresh/verification passed.',
  );
  console.log(
    'Interrupted signup/setup: email confirmation recovery, guest login, one business after failed promotion, and revoked session passed.',
  );
} finally {
  await context.close();
  await browser.close();
}
