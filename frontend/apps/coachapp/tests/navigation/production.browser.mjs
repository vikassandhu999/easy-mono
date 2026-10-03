import {mkdir} from 'node:fs/promises';
import {chromium, expect, webkit} from '@playwright/test';
import {preview} from 'vite';

const engine = process.env.BROWSER_ENGINE || 'chromium';
if (engine !== 'chromium' && engine !== 'webkit') {
  throw new Error('Choose chromium or webkit.');
}
const app = await preview({
  preview: {
    host: '127.0.0.1',
    port: 0,
    proxy: {
      '/v1': {target: process.env.COACHAPP_API_URL || 'http://localhost:4000', changeOrigin: true},
      '/socket': {target: process.env.COACHAPP_API_URL || 'http://localhost:4000', ws: true, changeOrigin: true},
    },
  },
});
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const baseURL = `http://127.0.0.1:${app.httpServer.address().port}`;
await mkdir('tests/navigation/artifacts', {recursive: true});
try {
  for (const width of [375, 1280]) {
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    const scripts = new Set();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.resourceType() === 'script') {
        scripts.add(new URL(request.url()).pathname);
      }
    });
    const suffix = `${Date.now()}-${engine}-${width}`;
    const email = `production-${suffix}@example.test`;
    const name = `Test Production ${engine} ${width}`;
    try {
      await page.goto('/training-exercises/new');
      await expect(page).toHaveURL(/\/login\?returnTo=/);
      await page.getByRole('link', {name: 'Create an account', exact: true}).click();
      await page.getByLabel('Full name', {exact: true}).fill('Test Production');
      await page.getByLabel('Email', {exact: true}).fill(email);
      await page.getByRole('button', {name: 'Create account', exact: true}).click();
      await page.getByLabel('Verification code', {exact: true}).fill('000000');
      await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
      await expect(page.getByLabel('Verification code', {exact: true})).toHaveAttribute('aria-invalid', 'true');
      await page.getByLabel('Verification code', {exact: true}).fill('123456');
      await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
      await page.getByLabel('Business name', {exact: true}).fill('Test Production Business');
      await page.getByLabel('Business handle', {exact: true}).fill(`production-${suffix}`);
      await page.getByRole('button', {name: 'Create business', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}/welcome?returnTo=%2Ftraining-exercises%2Fnew`);
      for (const title of ['Build once. Coach each person.', 'Make healthy choices easier.']) {
        const heading = page.getByRole('heading', {level: 1, name: title, exact: true});
        await expect(heading).toBeVisible();
        await expect(heading).toBeFocused();
        const image = page.getByRole('figure').locator('img');
        await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
        expect(await image.evaluate((node) => new URL(node.currentSrc).pathname)).toMatch(
          width === 375 ? /^\/welcome\/.+-mobile\.jpg$/ : /^\/welcome\/.+-desktop\.jpg$/,
        );
        expect(
          await heading.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
        ).toBeGreaterThanOrEqual(32);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (title !== 'Make healthy choices easier.') {
          await page.getByRole('button', {name: 'Next', exact: true}).click();
        }
      }
      await page.screenshot({path: `/tmp/coachapp-welcome-production-${engine}-${width}.png`, animations: 'disabled'});
      await page.getByRole('button', {name: 'Continue to your page', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}/training-exercises/new`);
      await page.getByLabel('Exercise name', {exact: true}).fill(name);
      const createdResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/v1/coach/training-exercises') &&
          response.request().method() === 'POST' &&
          response.status() === 201,
      );
      await page.getByRole('button', {name: 'Save exercise', exact: true}).click();
      const exercise = (await (await createdResponse).json()).data;
      expect(exercise.name).toBe(name);
      await page.goto(`/training-exercises/${exercise.id}`);
      await expect(page.getByLabel('Exercise name', {exact: true})).toHaveValue(name);
      await page.reload();
      await expect(page.getByLabel('Exercise name', {exact: true})).toHaveValue(name);
      for (const [label, path, title] of [
        ['Messages', '/messages', 'Messages'],
        ['Clients', '/clients', 'Clients'],
        ['Training', '/training-plans', 'Training plans'],
        ['Nutrition', '/nutrition-plans', 'Nutrition plans'],
      ]) {
        await page
          .getByRole('navigation', {name: 'Coaching', exact: true})
          .getByRole('link', {name: label, exact: true})
          .click();
        await expect(page).toHaveURL(baseURL + path);
        await expect(page.getByRole('heading', {level: 1, name: title, exact: true})).toBeVisible();
        await expect(page.getByRole('status').filter({hasText: /Loading|Opening/})).toHaveCount(0);
        await expect(page.getByRole('alert')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.screenshot({
        path: `tests/navigation/artifacts/production-${engine}-${width}.png`,
        animations: 'disabled',
      });
      await page.goto(`/training-exercises/${exercise.id}`);
      const session = await page.evaluate(() => JSON.parse(localStorage.getItem('coachapp.auth.v1')));
      const removal = await context.request.delete(`${baseURL}/v1/coach/training-exercises/${exercise.id}`, {
        headers: {authorization: `Bearer ${session.tokens.access_token}`},
      });
      expect(removal.status()).toBe(204);
      await page.getByRole('button', {name: 'Your account', exact: true}).click();
      await page.getByRole('menuitem', {name: 'Sign out', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}/login`);
      await page.goto(`/training-exercises/${exercise.id}`);
      await expect(page).toHaveURL(/\/login\?returnTo=/);
      await page.getByLabel('Email', {exact: true}).fill(email);
      await page.getByRole('button', {name: 'Continue with email', exact: true}).click();
      await page.getByLabel('Verification code', {exact: true}).fill('123456');
      await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}/training-exercises/${exercise.id}`);
      await expect(page.getByRole('alert')).toContainText('The requested resource was not found.');
      await page.getByRole('link', {name: 'Back to exercises', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Exercise library', exact: true})).toBeVisible();
      expect([...scripts].every((path) => path.startsWith('/assets/') && path.endsWith('.js'))).toBe(true);
      expect(errors).toEqual([]);
      console.log(
        `Production ${engine} ${width}px: signup, two-slide welcome with shipped previews, retained deep link, validation/recovery, saved exercise/reload, four sections, logout/login and missing-record recovery passed. Only built asset scripts loaded.`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await app.close();
}
