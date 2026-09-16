import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect} from '@playwright/test';
import {expectAccount} from './browser-helpers.mjs';

const browser = await chromium.launch();
async function tabTo(page, target) {
  for (let count = 0; count < 20; count++) {
    if (await target.evaluate((node) => node === document.activeElement)) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}
async function capture(page, name, width) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `tests/auth/artifacts/${name}-${width}.png`, fullPage: true, animations: 'disabled'});
}
try {
  for (const width of [375, 1280]) {
    execFileSync(
      'rtk',
      ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./invitation-fixtures.exs', import.meta.url))],
      {
        cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)),
        stdio: 'pipe',
      },
    );
    const fixture = JSON.parse(await readFile(new URL('./artifacts/invitations.json', import.meta.url), 'utf8'));
    const context = await browser.newContext({
      baseURL: process.env.COACH_APP_URL || 'http://localhost:2022',
      viewport: {width, height: 900},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let release;
    try {
      // This token really expired in the API database; recovery must preserve the destination.
      await page.goto(`/verify?token=${fixture.verification_token}&returnTo=%2Fforms%2Fnew`);
      await page.getByRole('button', {name: 'Confirm email', exact: true}).click();
      await expect(page.getByRole('alert')).toBeFocused();
      await expect(page.getByRole('alert')).toContainText('expired');
      await expect(page.getByRole('button', {name: 'Confirm email', exact: true})).toHaveCount(0);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', {name: 'Sign in with a code'})).toBeFocused();
      await capture(page, 'expired-link', width);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/login?returnTo=%2Fforms%2Fnew');
      await page.getByLabel('Email', {exact: true}).fill(fixture.verification_email);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByRole('heading', {name: 'Your coaching business'})).toBeVisible();
      await page.getByLabel('Business name', {exact: true}).fill('Test Expired Link Recovery');
      await page.getByLabel('Business handle', {exact: true}).fill(`expired-recovery-${Date.now()}-${width}`);
      await page.getByRole('button', {name: 'Create business'}).click();
      await expect(page.getByRole('heading', {name: 'Create form', exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Your account', exact: true}).click();
      await page.getByRole('menuitem', {name: 'Sign out', exact: true}).click();

      await page.goto('/accept-invite');
      await expect(page.getByText('This invitation link is incomplete.', {exact: false})).toBeVisible();
      await expect(page.getByRole('main')).toBeFocused();
      await page.goto(`/accept-invite?token=${fixture.unavailable_token}`);
      await expect(page.getByRole('heading', {name: 'Invitation unavailable'})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Continue with email'})).toHaveCount(0);
      await page.goto(`/accept-invite?token=${fixture.expired_token}`);
      await expect(page.getByText('This invitation has expired.', {exact: false})).toBeVisible();
      await capture(page, 'expired-invitation', width);

      const preview = '**/v1/auth/trainer-invitations/*';
      await page.route(preview, async (route) => {
        await new Promise((resolve) => {
          release = resolve;
        });
        await route.fulfill({status: 503, json: {error: {message: 'Invitation temporarily unavailable.'}}});
      });
      await page.goto(`/accept-invite?token=${fixture.token}`);
      await expect(page.getByText('Loading invitation…', {exact: true})).toBeVisible();
      await capture(page, 'invitation-loading', width);
      release();
      await expect(page.getByRole('heading', {name: 'Invitation unavailable'})).toBeVisible();
      await expect(page.getByRole('main')).toBeFocused();
      await page.unroute(preview);
      await tabTo(page, page.getByRole('button', {name: 'Try again'}));
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Join Invitation Coaching'})).toBeVisible();
      await expect(page.getByLabel('Email', {exact: true})).toHaveValue(fixture.email);
      await capture(page, 'invitation', width);
      const email = page.getByLabel('Email', {exact: true});
      await email.fill('');
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await expect(email).toBeFocused();
      await expect(page.getByText('Enter email.', {exact: true})).toBeVisible();
      await email.fill(fixture.email);
      const accept = '**/v1/auth/trainer-accept-invite';
      await page.route(accept, (route) =>
        route.fulfill({status: 503, json: {error: {message: 'Code could not be sent. Try again.'}}}),
      );
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await expect(page.getByRole('alert')).toBeFocused();
      await expect(email).toHaveValue(fixture.email);
      await capture(page, 'invitation-send-error', width);
      await page.unroute(accept);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', {name: 'Continue with email'})).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
      await page.getByRole('link', {name: 'Change email'}).click();
      await expect(email).toHaveValue(fixture.email);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      const otp = page.getByLabel('Verification code');
      await otp.fill('000000');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByText('Invalid code. Please check and try again.')).toBeVisible();
      await expect(otp).toBeFocused();
      // Advance the stored cooldown only; the resend and subsequent verification use the real API.
      await page.evaluate(() => {
        const key = 'coachapp.challenge.v1';
        const challenge = JSON.parse(sessionStorage.getItem(key));
        sessionStorage.setItem(key, JSON.stringify({...challenge, sentAt: Date.now() - 31000}));
      });
      await page.reload();
      await page.route(accept, (route) =>
        route.fulfill({status: 503, json: {error: {message: 'Resend failed. Try again.'}}}),
      );
      await page.getByRole('button', {name: 'Resend code', exact: true}).click();
      await expect(page.getByRole('alert')).toBeFocused();
      await page.unroute(accept);
      await tabTo(page, page.getByRole('button', {name: 'Resend code', exact: true}));
      await page.keyboard.press('Enter');
      await expect(page.getByText('A fresh code is on its way.', {exact: true})).toBeVisible();
      await expect(otp).toBeFocused();
      await otp.fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
      await expect(page.getByText('Invitation Coaching', {exact: true})).toBeVisible();
      await page.reload();
      await expectAccount(page, fixture.email);
      // A different valid invitation cannot replace the signed-in coach.
      const sessionBefore = await page.evaluate(() => localStorage.getItem('coachapp.auth.v1'));
      expect(sessionBefore).not.toBeNull();
      await page.goto(`/accept-invite?token=${fixture.another_token}`);
      await expect(page.getByRole('button', {name: 'Sign out to continue'})).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('coachapp.auth.v1'))).toBe(sessionBefore);
      await page.getByRole('link', {name: 'Return to your account'}).click();
      await expectAccount(page, fixture.email);
      await page.goto(`/accept-invite?token=${fixture.token}`);
      await page.getByRole('button', {name: 'Sign out to continue'}).click();
      await expect(page.getByRole('heading', {name: 'Invitation unavailable'})).toBeVisible();
      expect(errors).toEqual([]);
      console.log(
        `Real invitation states, keyboard recovery, expired confirmation link and account guard passed at ${width}px.`,
      );
    } finally {
      release?.();
      await context.close();
    }
  }
} finally {
  await browser.close();
}
