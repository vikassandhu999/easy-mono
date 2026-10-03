import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';

const fixtures = JSON.parse(
  await readFile(new URL('../../../../../.scratch/coaching-terms/browser-fixtures.json', import.meta.url), 'utf8'),
);
const browser = await chromium.launch();
const results = [];
await mkdir('tests/coaching/artifacts', {recursive: true});
try {
  for (const state of process.env.COACHING_STATES?.split(',') ?? ['ended', 'joined', 'active']) {
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width: 375, height: 812},
    });
    const page = await context.newPage();
    const errors = [];
    const failedReads = [];
    const writes = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/v1/client/') && request.method() !== 'GET') {
        writes.push(request.url());
      }
    });
    page.on('response', async (response) => {
      if (new URL(response.url()).pathname === '/v1/client/me' && response.status() >= 400) {
        failedReads.push({status: response.status(), body: await response.text()});
      }
    });
    try {
      await page.goto('/login');
      await page
        .getByLabel('Email', {exact: true})
        .fill(fixtures[process.env.COACHING_FIXTURE_WIDTH || '375'].clients[state].email);
      await page.getByRole('button', {name: 'Continue with email', exact: true}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      if (state === 'joined') {
        await expect(page.getByRole('heading', {name: 'Coaching starts soon'})).toBeVisible();
        for (const path of ['/training', '/nutrition', '/messages', '/account/details']) {
          await page.goto(path);
          await expect(page.getByRole('heading', {name: 'Coaching starts soon'})).toBeVisible();
          await expect(page.getByRole('navigation', {name: 'Main navigation'})).toHaveCount(0);
        }
        await page.screenshot({path: 'tests/coaching/artifacts/connected-joined-375.png', fullPage: true});
        await page.getByRole('button', {name: 'Sign out', exact: true}).click();
        await expect(page.getByLabel('Email', {exact: true})).toBeVisible();
      } else if (state === 'ended') {
        await expect(page.getByText(/^Coaching ended /)).toBeVisible();
        await page.goto('/training');
        await expect(page.getByRole('link', {name: /Freestyle workout/})).toBeVisible();
        await page.getByRole('link', {name: /Freestyle workout/}).click();
        await expect(page.getByRole('heading', {name: 'Freestyle workout'})).toBeVisible();
        await expect(page.getByText(/^Coaching ended /)).toBeVisible();
        await expect(page.getByRole('button', {name: /Correct|Save|Finish|Discard|Edit|Remove/})).toHaveCount(0);
        await page.screenshot({path: 'tests/coaching/artifacts/connected-ended-workout-375.png', fullPage: true});
        const conversation = page.waitForResponse(
          (response) => new URL(response.url()).pathname === '/v1/client/conversation/history',
        );
        await page.goto('/messages');
        const history = await (await conversation).json();
        expect(history.data).toHaveLength(1);
        await expect(page.getByRole('status').filter({hasText: 'Conversation history'})).toBeVisible();
        await expect(page.getByText(history.data[0].body, {exact: true})).toBeVisible();
        await expect(page.getByRole('textbox')).toHaveCount(0);
        await expect(page.getByRole('button', {name: /Send|Record|Attach/})).toHaveCount(0);
        await expect(page.getByText(/^Coaching ended /)).toBeVisible();
        await page.screenshot({path: 'tests/coaching/artifacts/connected-ended-messages-375.png', fullPage: true});
        await page.goto('/nutrition');
        await expect(page.getByRole('heading', {name: 'Nutrition', exact: true})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Record another meal'})).toHaveCount(0);
        await page.goto('/account/details');
        await expect(page.getByText('Ended Client', {exact: true})).toBeVisible();
        await expect(page.getByRole('textbox')).toHaveCount(0);
      } else {
        await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
        await expect(page.getByText(/^Coaching ended /)).toHaveCount(0);
        await page.goto('/training');
        await expect(page.getByRole('button', {name: 'Start freestyle workout'})).toBeVisible();
        await page.goto('/account/details');
        await expect(page.getByLabel('Full name', {exact: true})).toHaveValue('Active Client');
        await page.getByLabel('What should we call you?', {exact: true}).fill('Active client');
        await page.getByRole('button', {name: 'Save details'}).click();
        await expect(page.getByText('Your details are saved.', {exact: true})).toBeVisible();
        await page.reload();
        await expect(page.getByLabel('What should we call you?', {exact: true})).toHaveValue('Active client');
        await page.screenshot({path: 'tests/coaching/artifacts/connected-active-profile-375.png', fullPage: true});
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (state !== 'active') {
        expect(writes).toEqual([]);
      }
      expect(errors).toEqual([]);
      results.push({state, width: 375, passed: true});
      await writeFile(
        `tests/coaching/artifacts/connected-${state}-result.json`,
        JSON.stringify({state, width: 375, passed: true}, null, 2),
      );
    } catch (error) {
      await page.screenshot({path: `tests/coaching/artifacts/connected-failure-${state}.png`, fullPage: true});
      await writeFile(
        `tests/coaching/artifacts/connected-failure-${state}.txt`,
        await page.locator('body').innerText(),
      );
      await writeFile(
        `tests/coaching/artifacts/connected-failure-${state}-requests.json`,
        JSON.stringify(failedReads, null, 2),
      );
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/coaching/artifacts/connected-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
