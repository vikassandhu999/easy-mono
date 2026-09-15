import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';
import {checkoutScript, startProvider} from './provider.mjs';

const provider = await startProvider();
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://127.0.0.1:44000'});
const browser = await chromium.launch({channel: 'chromium'});
execFileSync('rtk', ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./fixtures.exs', import.meta.url))], {
  cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)),
  stdio: 'pipe',
});
const fixtures = JSON.parse(await readFile(new URL('./artifacts/fixtures.json', import.meta.url), 'utf8'));
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBe(true);
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
  await page.getByRole('heading', {name: 'Billing', exact: true}).click();
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({top: 0, behavior: 'instant'});
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `tests/billing/artifacts/${name}-${width}.png`, fullPage: true});
}
try {
  for (const fixture of fixtures) {
    const {width, owner_email, trainer_email, invitation_token} = fixture;
    const owner = await login(owner_email);
    const foreign = await login(fixtures.find((item) => item.width !== width).owner_email);
    await send('post', '/v1/auth/trainer-accept-invite', {email: trainer_email, invitation_token});
    const trainer = await send('post', '/v1/auth/trainer-accept-invite/verify', {
      email: trainer_email,
      invitation_token,
      otp: '123456',
    });
    const context = await browser.newContext({
      baseURL: process.env.COACHAPP_URL || 'http://localhost:22022',
      viewport: {width, height: 900},
    });
    context.setDefaultTimeout(15_000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await session(page, owner);
    await page.goto('/');
    let readFailure = true;
    await page.route('**/v1/coach/billing', (route) =>
      readFailure ? route.fulfill({status: 503, json: {error_code: 'unavailable'}}) : route.continue(),
    );
    await page.getByRole('button', {name: 'Your account', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Billing', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    readFailure = false;
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByText('2 free seats · 0 paid seats', {exact: true})).toBeVisible();
    await expect(page.getByText(/Your current capacity is full/)).toBeVisible();
    await capture(page, 'free-capacity', width);
    const invitation = await context.newPage();
    await invitation.goto('/');
    await invitation.getByRole('link', {name: 'Invite client', exact: true}).click();
    await invitation.getByLabel('First name', {exact: true}).fill('Casey');
    await invitation.getByLabel('Last name', {exact: true}).fill('Draft');
    await invitation.getByLabel('Email', {exact: true}).fill(`capacity-${Date.now()}@example.test`);
    await invitation.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(invitation.getByRole('link', {name: 'Open billing in a new tab', exact: true})).toBeVisible();
    const billingTabPromise = context.waitForEvent('page');
    await invitation.getByRole('link', {name: 'Open billing in a new tab', exact: true}).click();
    const billingTab = await billingTabPromise;
    await expect(billingTab.getByRole('heading', {name: 'Billing', exact: true})).toBeVisible();
    await expect(invitation.getByLabel('First name', {exact: true})).toHaveValue('Casey');
    await billingTab.close();
    await invitation.close();

    readFailure = true;
    await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/v1/coach/billing') && response.status() === 503),
      page.getByRole('button', {name: 'Refresh billing', exact: true}).click(),
    ]);
    await expect(page.getByText('2 free seats · 0 paid seats', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Add seats', exact: true})).toBeDisabled();
    readFailure = false;
    await page.getByRole('button', {name: 'Refresh billing', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Add seats', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Add seats', exact: true}).press('Enter');
    await expect(page.getByLabel('Seats to add', {exact: true})).toBeFocused();
    await page.getByLabel('Seats to add', {exact: true}).fill('0');
    await expect(page.getByRole('alert')).toContainText('Enter a whole number from 1 to 100.');
    await expect(page.getByLabel('Seats to add', {exact: true})).toHaveAttribute('aria-invalid', 'true');
    await page.screenshot({path: `tests/billing/artifacts/seat-validation-${width}.png`});
    await expect(page.getByRole('button', {name: 'Review seat change', exact: true})).toBeDisabled();
    await page.getByLabel('Seats to add', {exact: true}).fill('3');
    await page.getByRole('button', {name: 'Review seat change', exact: true}).click();
    await expect(page.getByRole('dialog')).toContainText('Add 3 client seats');
    // A rejected confirmation keeps its error and recovery action in the keyboard sequence.
    await page.route('**/v1/coach/billing/checkout', (route) =>
      route.fulfill({status: 422, json: {error_code: 'invalid_input'}}),
    );
    await page.getByRole('button', {name: 'Continue to payment', exact: true}).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Keep current plan', exact: true})).toBeFocused();
    await page.screenshot({path: `tests/billing/artifacts/confirmation-error-${width}.png`});
    await page.keyboard.press('Enter');
    await page.unroute('**/v1/coach/billing/checkout');
    await expect(page.getByLabel('Seats to add', {exact: true})).toHaveValue('3');
    await page.getByRole('button', {name: 'Review seat change', exact: true}).click();
    await page.route('https://checkout.razorpay.com/v1/checkout.js', (route) => route.abort());
    const before = provider.calls.filter((call) => call.method === 'POST' && call.path === '/v1/subscriptions').length;
    await page.getByRole('button', {name: 'Continue to payment', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('Could not open payment checkout');
    await expect(page.getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Open payment checkout', exact: true})).toBeFocused();
    expect(provider.calls.filter((call) => call.method === 'POST' && call.path === '/v1/subscriptions')).toHaveLength(
      before + 1,
    );
    await page.unroute('https://checkout.razorpay.com/v1/checkout.js');
    await page.route('https://checkout.razorpay.com/v1/checkout.js', (route) =>
      route.fulfill({contentType: 'text/javascript', body: checkoutScript}),
    );
    await page.reload();
    await page.getByRole('button', {name: 'Open payment checkout', exact: true}).click();
    await page.getByRole('button', {name: 'Report success without payment', exact: true}).click();
    await expect(page.getByText('2 free seats · 0 paid seats', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Open payment checkout', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Open payment checkout', exact: true}).click();
    await page.getByRole('button', {name: 'Close test payment', exact: true}).click();
    await expect(page.getByText(/Checkout closed/)).toBeVisible();
    await page.getByRole('button', {name: 'Open payment checkout', exact: true}).click();
    await page.getByRole('button', {name: 'Complete test payment', exact: true}).click();
    await expect(page.getByText('2 free seats · 3 paid seats', {exact: true})).toBeVisible();
    expect(provider.calls.filter((call) => call.method === 'POST' && call.path === '/v1/subscriptions')).toHaveLength(
      before + 1,
    );
    await expect(page.getByRole('button', {name: 'Add seats', exact: true})).toBeEnabled();
    await capture(page, 'active-subscription', width);
    const subscription = [...provider.subscriptions.values()].at(-1);
    subscription.status = 'pending';
    await page.getByRole('button', {name: 'Check payment status', exact: true}).click();
    await expect(page.getByText('Payment needs attention', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Add seats', exact: true})).toHaveCount(0);
    await capture(page, 'payment-attention', width);
    subscription.status = 'active';
    await page.getByRole('button', {name: 'Check payment status', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Add seats', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Add seats', exact: true}).click();
    await page.getByLabel('Seats to add', {exact: true}).fill('2');
    await page.getByRole('button', {name: 'Review seat change', exact: true}).click();
    await page.route('**/v1/coach/billing/checkout', async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
    });
    await page.getByRole('button', {name: 'Confirm seat change', exact: true}).click();
    await expect(page.getByText(/result of your last change is not confirmed/)).toBeVisible();
    await expect(page.getByRole('alert')).toBeFocused();
    await page.unroute('**/v1/coach/billing/checkout');
    await page.getByRole('button', {name: 'Check payment status', exact: true}).click();
    await expect(page.getByText('2 free seats · 5 paid seats', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Cancel subscription', exact: true}).click();
    await expect(page.getByRole('dialog')).toContainText('Your 2 free seats remain.');
    provider.state.fail = 'after';
    await page.getByRole('button', {name: 'Schedule cancellation', exact: true}).click();
    await expect(page.getByText(/Your cancellation has not been confirmed/)).toBeVisible();
    provider.state.fail = null;
    await page.reload();
    await expect(page.getByRole('button', {name: 'Retry cancellation', exact: true})).toBeEnabled();
    await expect(page.getByRole('button', {name: 'Add seats', exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Check payment status', exact: true}).click();
    await expect(page.getByText(/Cancellation still needs confirmation/)).toBeVisible();
    await page.getByRole('button', {name: 'Retry cancellation', exact: true}).click();
    await page.route('**/v1/coach/billing/cancel', async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
    });
    await page.getByRole('button', {name: 'Schedule cancellation', exact: true}).click();
    await expect(page.getByText(/result of your last change is not confirmed/)).toBeVisible();
    await expect(page.getByRole('alert')).toBeFocused();
    await page.unroute('**/v1/coach/billing/cancel');
    await page.getByRole('button', {name: 'Check payment status', exact: true}).click();
    await expect(page.getByText('Cancellation scheduled', {exact: true}).first()).toBeVisible();
    await expect(page.getByText('2 free seats · 5 paid seats', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Cancel subscription', exact: true})).toHaveCount(0);
    await capture(page, 'cancellation', width);
    subscription.status = 'cancelled';
    await page.getByRole('button', {name: 'Check payment status', exact: true}).click();
    await expect(page.getByText('2 free seats · 0 paid seats', {exact: true})).toBeVisible();
    await capture(page, 'ended-subscription', width);
    await page.route('**/v1/coach/billing', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({
        response,
        json: {
          data: {
            ...body.data,
            billing_enabled: false,
            monthly_seat_price_inr: null,
            monthly_total_inr: null,
            can_add_seats: false,
            can_cancel: false,
            can_sync: false,
          },
        },
      });
    });
    await page.getByRole('button', {name: 'Refresh billing', exact: true}).click();
    await expect(page.getByText(/Payments are currently unavailable/)).toBeVisible();
    await expect(page.getByRole('button', {name: 'Add seats', exact: true})).toHaveCount(0);
    await capture(page, 'payments-disabled', width);
    await page.unroute('**/v1/coach/billing');
    await page.getByRole('button', {name: 'Refresh billing', exact: true}).click();

    // Lose the first checkout response, reload, and finish the same provider subscription.
    const createsBeforeRecovery = provider.calls.filter(
      (call) => call.method === 'POST' && call.path === '/v1/subscriptions',
    ).length;
    await page.getByRole('button', {name: 'Add seats', exact: true}).click();
    await page.getByLabel('Seats to add', {exact: true}).fill('1');
    await page.getByRole('button', {name: 'Review seat change', exact: true}).click();
    await page.route('**/v1/coach/billing/checkout', async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
    });
    await page.getByRole('button', {name: 'Continue to payment', exact: true}).click();
    await expect(page.getByText(/result of your last change is not confirmed/)).toBeVisible();
    await expect(page.getByRole('alert')).toBeFocused();
    await page.unroute('**/v1/coach/billing/checkout');
    await page.reload();
    await page.getByRole('button', {name: 'Open payment checkout', exact: true}).click();
    await page.getByRole('button', {name: 'Complete test payment', exact: true}).click();
    await expect(page.getByText('2 free seats · 1 paid seats', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Add seats', exact: true})).toBeEnabled();
    await expect(page.getByRole('button', {name: 'Retry seat change', exact: true})).toHaveCount(0);
    expect(provider.calls.filter((call) => call.method === 'POST' && call.path === '/v1/subscriptions')).toHaveLength(
      createsBeforeRecovery + 1,
    );
    await session(page, trainer);
    await expect(page.getByText('The business owner manages payments and seat changes.', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Check payment status', exact: true})).toHaveCount(0);
    const denied = await api.post('/v1/coach/billing/checkout', {
      data: {seats_to_add: 1, request_id: crypto.randomUUID()},
      headers: {authorization: `Bearer ${trainer.access_token}`},
    });
    expect(denied.status()).toBe(403);
    await capture(page, 'trainer-view', width);
    await session(page, owner);
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    let started;
    const requestStarted = new Promise((resolve) => {
      started = resolve;
    });
    await page.route('**/v1/coach/billing/sync', async (route) => {
      const response = await route.fetch();
      started();
      await held;
      await route.fulfill({response});
    });
    await page.getByRole('button', {name: 'Check payment status', exact: true}).click();
    await requestStarted;
    await session(page, foreign);
    release();
    await expect(page.locator('.app-business')).toHaveText(
      `Billing Coaching ${fixtures.find((item) => item.width !== width).width}`,
    );
    await expect(
      page.getByText('Billing status updated. Your current capacity is shown above.', {exact: true}),
    ).toHaveCount(0);
    await page.unroute('**/v1/coach/billing/sync');
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Billing ${width}: capacity, refresh recovery, checkout/reload/payment verification, lost writes, cancellation, trainer permissions and session isolation passed.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
  await provider.close();
}
