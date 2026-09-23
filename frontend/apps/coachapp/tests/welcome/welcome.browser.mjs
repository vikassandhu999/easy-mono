import {mkdir} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';

const browser = await chromium.launch();
const output = '/tmp/coachapp-welcome';
await mkdir(output, {recursive: true});
const titles = ['Build once. Coach each person.', 'Make healthy choices easier.'];
try {
  for (const width of [375, 1280]) {
    const context = await browser.newContext({
      baseURL: process.env.COACH_APP_URL || 'http://localhost:2022',
      viewport: {width, height: 812},
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const unique = `${Date.now()}-${width}`;
    const email = `welcome-flow-${unique}@example.test`;
    await page.goto('/signup');
    await page.getByLabel('First name').fill('Taylor');
    await page.getByLabel('Email', {exact: true}).fill(email);
    await page.getByRole('button', {name: 'Create account', exact: true}).click();
    await page.getByLabel('Verification code').fill('123456');
    await page.getByRole('button', {name: 'Verify and continue'}).click();
    await page.getByLabel('Business name', {exact: true}).fill('Welcome Coaching');
    await page.getByLabel('Business handle', {exact: true}).fill(`welcome-flow-${unique}`);
    await page.getByRole('button', {name: 'Create business'}).click();
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByRole('heading', {name: titles[0], exact: true})).toBeFocused();
    expect(
      await page.locator('h1').evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
    ).toBeGreaterThanOrEqual(32);
    expect(
      await page.locator('.welcome-page').evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingLeft)),
    ).toBeGreaterThanOrEqual(20);
    await expect(page.getByRole('button', {name: 'Back', exact: true})).toBeDisabled();
    for (let index = 0; index < titles.length; index++) {
      await expect(page.getByRole('heading', {name: titles[index], exact: true})).toBeVisible();
      const image = page.locator('.welcome-preview img');
      await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
      expect(await image.evaluate((node) => node.currentSrc)).toContain(`-${width === 375 ? 'mobile' : 'desktop'}.jpg`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: `${output}/slide-${index + 1}-${width}.png`, fullPage: true});
      if (index === 1) {
        await page.reload();
        await expect(page.getByRole('heading', {name: titles[1], exact: true})).toBeFocused();
        await page.getByRole('button', {name: 'Back', exact: true}).click();
        await expect(page.getByRole('heading', {name: titles[0], exact: true})).toBeFocused();
        await page.getByRole('button', {name: 'Next', exact: true}).click();
      }
      if (index < titles.length - 1) {
        await page.getByRole('button', {name: 'Next', exact: true}).focus();
        await page.keyboard.press('Enter');
      }
    }
    await page.getByRole('button', {name: 'Open clients', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/clients$/);
    await page.getByRole('button', {name: 'Your account', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Explore Easy', exact: true}).click();
    await expect(page.getByRole('heading', {name: titles[0], exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Skip tour', exact: true}).click();
    await expect(page).toHaveURL(/\/clients$/);
    // Returning sign-in must not force the tour again.
    await page.getByRole('button', {name: 'Your account', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Sign out', exact: true}).click();
    await page.getByLabel('Email', {exact: true}).fill(email);
    await page.getByRole('button', {name: 'Continue with email'}).click();
    await page.getByLabel('Verification code').fill('123456');
    await page.getByRole('button', {name: 'Verify and continue'}).click();
    await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    // Preserve the coach's intended destination, including its search.
    await page.goto('/welcome?returnTo=%2Fclients%3Fsearch%3DAlex');
    await page.getByRole('button', {name: 'Skip tour', exact: true}).click();
    await expect(page).toHaveURL(/\/clients\?search=Alex$/);
    await page.goto('/welcome?returnTo=%2Fwelcome%23again');
    await page.getByRole('button', {name: 'Skip tour', exact: true}).click();
    await expect(page).toHaveURL(/\/clients$/);
    await page.route('**/welcome/*.jpg', (route) => route.abort());
    await page.goto('/welcome');
    await expect(page.getByText('Screen preview couldn’t load. You can still continue the tour.')).toBeVisible();
    await page.unroute('**/welcome/*.jpg');
    await page.getByRole('button', {name: 'Retry preview', exact: true}).click();
    await expect
      .poll(() => page.locator('.welcome-preview img').evaluate((node) => node.complete && node.naturalWidth > 0))
      .toBe(true);
    // Profile failure is recoverable and does not silently finish onboarding.
    await page.route('**/v1/coach/me', (route) => route.fulfill({status: 503, json: {}}));
    await page.reload();
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible({timeout: 15000});
    await page.unroute('**/v1/coach/me');
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: titles[0], exact: true})).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Welcome: real signup, two previews, keyboard, reload/back, finish, replay, skip, login, return destination and recovery passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
}
