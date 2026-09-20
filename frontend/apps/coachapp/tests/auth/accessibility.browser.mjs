import {createHash} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';

const browser = await chromium.launch();
await mkdir('tests/auth/artifacts', {recursive: true});
const findings = [];
async function check(label, action) {
  try {
    await action();
  } catch (error) {
    findings.push(label);
    console.error(`${label}: ${error.message}`);
  }
}
async function tabTo(page, target) {
  for (let count = 0; count < 40; count++) {
    if (await target.evaluate((node) => node === document.activeElement)) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}
async function geometry(page, name) {
  await check(`${name}: no horizontal overflow`, async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  await page.screenshot({path: `tests/auth/artifacts/${name}.png`, fullPage: true});
}
try {
  for (const width of [375, 1280]) {
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
      const suffix = Date.now();
      const email = `test-${suffix}-${'a'.repeat(40)}@${'b'.repeat(60)}.example.test`;
      await page.goto('/signup');
      await expect(page.getByRole('heading', {name: 'Create your account', exact: true})).toBeVisible();
      await check(`signup-${width}: main focus`, () => expect(page.getByRole('main')).toBeFocused());
      await tabTo(page, page.getByRole('textbox', {name: 'First name', exact: true}));
      await page.keyboard.type('Test Keyboard');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('textbox', {name: 'Last name', exact: true})).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('textbox', {name: 'Email', exact: true})).toBeFocused();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(page.getByText('Enter email.', {exact: true})).toBeVisible();
      await expect(page.getByRole('textbox', {name: 'Email', exact: true})).toBeFocused();
      await page.keyboard.type(email);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Check your email', exact: true})).toBeVisible();
      await page.goto('/login');
      await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
      await check(`login-${width}: initial main focus`, () => expect(page.getByRole('main')).toBeFocused());
      const emailField = page.getByRole('textbox', {name: 'Email', exact: true});
      await tabTo(page, emailField);
      await emailField.fill('');
      await page.keyboard.press('Tab');
      const submit = page.locator('form').getByRole('button');
      await expect(submit).toBeFocused();
      expect(await submit.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe('none');
      await page.keyboard.press('Enter');
      await expect(emailField).toBeFocused();
      await expect(emailField).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('Enter email.', {exact: true})).toBeVisible();
      await emailField.fill(email);
      const hold = new Promise((resolve) => {
        release = resolve;
      });
      let attempts = 0;
      await page.route('**/v1/auth/otp', async (route) => {
        attempts++;
        await hold;
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      });
      await page.keyboard.press('Tab');
      await expect(submit).toBeFocused();
      const resting = await submit.boundingBox();
      await page.keyboard.press('Enter');
      await expect.poll(() => attempts).toBe(1);
      await check(`login-${width}: pending action name`, () =>
        expect(submit).toHaveAccessibleName('Continue with email'),
      );
      await check(`login-${width}: pending disabled`, () => expect(submit).toBeDisabled());
      expect(await submit.boundingBox()).toEqual(resting);
      await page.keyboard.press('Enter');
      release();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(attempts).toBe(1);
      await expect(emailField).toHaveValue(email);
      await page.unroute('**/v1/auth/otp');
      await tabTo(page, submit);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Check your email', exact: true})).toBeVisible();
      await check(`verify-${width}: route focus`, () => expect(page.getByRole('main')).toBeFocused());
      await geometry(page, `verify-long-email-${width}`);
      const otp = page.getByRole('textbox', {name: 'Verification code', exact: true});
      await tabTo(page, otp);
      await otp.fill('123');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(otp).toBeFocused();
      await expect(page.getByText('Enter the 6-digit code from your email.', {exact: true})).toBeVisible();

      // The real confirmation link uses the token issued with this test account's dev OTP.
      const token = createHash('sha256')
        .update(email + '123456')
        .digest('hex');
      await page.goto(`/verify?token=${token}&returnTo=%2Fforms%2Fnew`);
      await expect(page.getByRole('heading', {name: 'Confirm your email', exact: true})).toBeVisible();
      await page.route('**/v1/auth/verify', (route) =>
        route.fulfill({status: 503, json: {error: {message: 'Verification temporarily unavailable. Try again.'}}}),
      );
      await tabTo(page, page.getByRole('button', {name: 'Confirm email', exact: true}));
      await page.keyboard.press('Enter');
      await expect(page.getByRole('alert')).toBeFocused();
      await expect(page.getByRole('button', {name: 'Confirm email', exact: true})).toBeEnabled();
      await page.unroute('**/v1/auth/verify');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', {name: 'Confirm email', exact: true})).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Your coaching business', exact: true})).toBeVisible();
      await check(`setup-${width}: route focus`, () => expect(page.getByRole('main')).toBeFocused());
      const business = page.getByRole('textbox', {name: 'Business name', exact: true});
      await tabTo(page, business);
      await business.fill('Test Keyboard Coaching');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('textbox', {name: 'Business handle', exact: true})).toBeFocused();
      await page.keyboard.type(`keyboard-${suffix}-${width}`);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', {name: 'Create business', exact: true})).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Know the person behind the plan.', exact: true})).toBeFocused();
      await tabTo(page, page.getByRole('button', {name: 'Skip tour', exact: true}));
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Create form', exact: true})).toBeVisible();
      await check(`account-${width}: focus after profile loads`, () => expect(page.getByRole('main')).toBeFocused());
      const draftName = page.getByRole('textbox', {name: 'Form name', exact: true});
      await tabTo(page, draftName);
      await page.keyboard.type('Unfinished form');
      await page.evaluate(async () => {
        const {queryClient} = await import('/src/api/query-client.ts');
        const {authKeys} = await import('/src/api/keys.ts');
        await queryClient.invalidateQueries({queryKey: authKeys.profile()});
      });
      await expect(draftName).toBeFocused();
      await expect(draftName).toHaveValue('Unfinished form');
      await draftName.fill('');

      await page.goto('/missing-test-route');
      await expect(page.getByRole('heading', {name: 'Page not found', exact: true})).toBeVisible();
      await check(`not-found-${width}: main focus`, () => expect(page.getByRole('main')).toBeFocused());
      await tabTo(page, page.getByRole('link', {name: 'Return to your account', exact: true}));
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
      await tabTo(page, page.getByRole('button', {name: 'Your account', exact: true}));
      await page.keyboard.press('Enter');
      await page.keyboard.press('End');
      await expect(page.getByRole('menuitem', {name: 'Sign out', exact: true})).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
      await page.goto(`/verify?token=${token}&returnTo=%2Fforms%2Fnew`);
      await expect(page.getByRole('heading', {name: 'Confirm your email', exact: true})).toBeVisible();
      await tabTo(page, page.getByRole('button', {name: 'Confirm email', exact: true}));
      await page.keyboard.press('Enter');
      await expect(page.getByRole('alert')).toBeFocused();
      await expect(page.getByRole('button', {name: 'Confirm email', exact: true})).toHaveCount(0);
      await tabTo(page, page.getByRole('link', {name: 'Sign in with a code', exact: true}));
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/login?returnTo=%2Fforms%2Fnew');
      expect(errors).toEqual([]);
      console.log(`Auth keyboard, pending, long content, confirmation link and route recovery checked at ${width}px.`);
    } finally {
      release?.();
      await context.close();
    }
  }
  expect(findings).toEqual([]);
} finally {
  await browser.close();
}
