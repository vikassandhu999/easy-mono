import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {inviteClient} from './fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/auth/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const business = 'Everyday Coaching for Strength, Confidence and a Healthier Tomorrow';
    const fixture = await inviteClient({businessName: business});
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width, height: 812},
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const screenshot = async (name) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      await page.screenshot({path: `tests/auth/artifacts/mobile-${name}-${width}.png`, fullPage: true});
    };
    try {
      await page.goto('/login?returnTo=%2Fmessages');
      const email = page.getByLabel('Email', {exact: true});
      const next = page.getByRole('button', {name: 'Continue with email'});
      await screenshot('login');
      await next.click();
      await expect(email).toBeFocused();
      await expect(page.getByText('Enter email.', {exact: true})).toBeVisible();
      await email.fill('not-an-email');
      await next.click();
      await expect(page.getByText('Enter a valid email address.', {exact: true})).toBeVisible();
      await email.fill(`missing-${Date.now()}@example.test`);
      await next.click();
      await expect(page.getByRole('alert')).toContainText('No client account was found');
      await expect(page.getByRole('alert')).toBeFocused();
      await screenshot('login-error');
      // Observe the expired-screen contract without changing the server's invitation clock.
      await page.route('**/v1/auth/invitations/*', async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        await route.fulfill({response, json: {...body, data: {...body.data, state: 'expired'}}});
      });
      await page.goto(`/invite/${fixture.token}`);
      await expect(page.getByRole('heading', {name: 'Invitation unavailable'})).toBeVisible();
      await screenshot('expired');
      await page.getByRole('link', {name: 'Sign in', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
      await page.unroute('**/v1/auth/invitations/*');
      let releaseInvitation;
      const invitationHeld = new Promise((resolve) => {
        releaseInvitation = resolve;
      });
      await page.route('**/v1/auth/invitations/*', async (route) => {
        await invitationHeld;
        await route.fulfill({status: 503, json: {error_message: 'Temporarily unavailable'}});
      });
      await page.goto(`/invite/${fixture.token}`);
      await expect(page.getByText('Loading invitation…', {exact: true})).toBeVisible();
      await screenshot('loading');
      releaseInvitation();
      await expect(page.getByRole('button', {name: 'Try again'})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Sign in to an existing account'})).toBeVisible();
      await screenshot('invitation-error');
      await page.unroute('**/v1/auth/invitations/*');
      await page.getByRole('button', {name: 'Try again'}).click();
      await expect(page.getByRole('heading', {name: `Join ${business}`})).toBeVisible();
      await expect(email).toHaveValue(fixture.email);
      await screenshot('invitation-long');
      await next.click();
      const code = page.getByLabel('Verification code');
      const verify = page.getByRole('button', {name: 'Verify and continue'});
      await expect(code).toBeVisible();
      await page.getByRole('link', {name: 'Change email'}).click();
      await expect(email).toHaveValue(fixture.email);
      await next.click();
      await expect(code).toBeVisible();
      await page.reload();
      await expect(code).toHaveValue('');
      await verify.click();
      await expect(page.getByText('Enter verification code.', {exact: true})).toBeVisible();
      await code.fill('123');
      await verify.click();
      await expect(page.getByText('Enter the 6-digit code from your email.', {exact: true})).toBeVisible();
      await code.fill('000000');
      await verify.click();
      await expect(page.getByText('Invalid code.', {exact: false})).toBeVisible();
      await expect(code).toBeFocused();
      await screenshot('code-error');
      await expect(page.getByRole('button', {name: /Resend in/})).toBeDisabled();
      await page.clock.install();
      await page.clock.fastForward(31_000);
      await page.route('**/v1/auth/accept-invite', (route) =>
        route.fulfill({status: 503, json: {error_message: 'Resend unavailable'}}),
      );
      await page.getByRole('button', {name: 'Resend code', exact: true}).click();
      await expect(page.getByRole('alert')).toHaveText('We could not reach the service. Please try again shortly.');
      await expect(page.getByRole('alert')).toBeFocused();
      await page.unroute('**/v1/auth/accept-invite');
      await page.getByRole('button', {name: 'Resend code', exact: true}).click();
      await expect(page.getByText('A fresh code is on its way.', {exact: true})).toBeVisible();
      await expect(code).toHaveValue('');
      await expect(code).toBeFocused();
      await screenshot('code-ready');
      await code.fill('123456');
      await verify.click();
      await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
      await page.goto(`/invite/${fixture.token}`);
      await expect(page.getByRole('heading', {name: "You're signed in"})).toBeVisible();
      await screenshot('signed-in');
      await page.getByRole('button', {name: 'Sign out to continue'}).click();
      await expect(page.getByRole('heading', {name: 'Invitation accepted'})).toBeVisible();
      await screenshot('accepted');
      await page.getByRole('link', {name: 'Sign in', exact: true}).click();
      await page.goto('/login?returnTo=%2Fmessages');
      await email.fill(fixture.email);
      await next.click();
      await code.fill('123456');
      await verify.click();
      await expect(page.getByRole('heading', {name: 'Messages', exact: true})).toBeVisible();
      expect(errors).toEqual([]);
      results.push({
        width,
        passed: true,
        scenarios:
          'Email/code validation, real missing account, invitation failure/retry and long name, Change email, challenge restart, invalid code, resend cooldown/failure/retry, accepted invitation, signed-in boundary and protected return',
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/auth/artifacts/mobile-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
