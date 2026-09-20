import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/forms/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    for (const status of ['dismissed', 'missed']) {
      const fixture = await inviteClient();
      const coach = {token: fixture.coachToken};
      const assignment = (await api(`/v1/coach/clients/${fixture.clientId}/intake`, coach)).data;
      const updated = await api(`/v1/coach/form-assignments/${assignment.id}`, {
        ...coach,
        method: 'PATCH',
        body: {expected_status: assignment.status, status},
      });
      expect(updated.data.status).toBe(status);
      const context = await browser.newContext({
        baseURL: 'http://localhost:1315',
        viewport: {width, height: 812},
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/no-such-client-screen');
        await expect(page).toHaveURL(/\/login$/);
        await page.goto(`/invite/${fixture.token}`);
        await page.getByRole('button', {name: 'Continue with email'}).click();
        await page.getByLabel('Verification code').fill('123456');
        await page.getByRole('button', {name: 'Verify and continue'}).click();
        await page.getByRole('link', {name: 'Forms & check-ins', exact: true}).click();
        await expect(page.getByText('Nothing to complete right now.', {exact: false})).toBeVisible();
        await page.getByRole('link', {name: 'History', exact: true}).click();
        const row = page.getByRole('link', {name: new RegExp(assignment.form_template.name)});
        await expect(row).toContainText(status === 'missed' ? 'Missed' : 'Closed by your coach');
        await page.screenshot({path: `tests/forms/artifacts/${status}-history-${width}.png`, fullPage: true});
        await row.click();
        await expect(
          page.getByText(status === 'missed' ? 'This request was missed.' : 'Your coach has closed this request.', {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByText('You can ask your coach for a new request if you still need to respond.'),
        ).toBeVisible();
        await expect(page.getByRole('button', {name: 'Send response'})).toHaveCount(0);
        await expect(page.getByText('Response saved', {exact: true})).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
          480,
        );
        await page.screenshot({path: `tests/forms/artifacts/${status}-${width}.png`, fullPage: true});
        await page.getByRole('link', {name: 'Back to your forms', exact: true}).click();
        await expect(page).toHaveURL(/\/forms\?state=history$/);
        await expect(row).toBeVisible();
        expect(errors).toEqual([]);
        results.push({width, status, realServerState: true, preservedHistoryReturn: true, passed: true});
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/forms/artifacts/closed-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
