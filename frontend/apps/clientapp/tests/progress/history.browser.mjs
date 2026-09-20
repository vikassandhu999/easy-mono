import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/progress/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const assignment = (await api(`/v1/coach/clients/${fixture.clientId}/intake`, {token: fixture.coachToken})).data;
    await api(`/v1/coach/form-templates/${assignment.form_template_id}`, {
      token: fixture.coachToken,
      method: 'PATCH',
      body: {
        name: 'Your starting point',
        expected_revision: assignment.form_template.revision,
        sections: [{questions: [{id: 'weight', label: 'Current weight', type: 'weight', required: true}]}],
      },
    });
    const context = await browser.newContext({baseURL: 'http://localhost:1315', viewport: {width, height: 812}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`/invite/${fixture.token}`);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
      const token = await page.evaluate(
        () => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token,
      );
      const today = (await api('/v1/client/me', {token})).data.local_date;
      const offset = (days) => {
        const date = new Date(`${today}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().slice(0, 10);
      };
      for (let index = 0; index < 22; index++) {
        await api('/v1/client/weight_entries', {
          token,
          method: 'POST',
          body: {
            date: offset(-index),
            value: 70 + index / 10,
            unit: 'kg',
            note: index === 21 ? 'Earlier check-in ' + 'steadily'.repeat(35) : null,
          },
        });
      }
      await page.goto(`/forms/${assignment.id}`);
      await page.getByLabel('Current weight (kg)', {exact: false}).fill('70.2');
      await page.getByRole('button', {name: 'Send response'}).click();
      await expect(page.getByText(/Response saved/)).toBeVisible();
      const filters = new URLSearchParams({from: offset(-30), to: today, unit: 'lbs'});
      let failNext = true;
      const cursors = [];
      await page.route('**/v1/client/weight-progress?*', (route) => {
        const cursor = new URL(route.request().url()).searchParams.get('cursor');
        if (cursor && cursor !== 'start') {
          cursors.push(cursor);
          if (failNext) {
            return route.fulfill({status: 503, json: {error_message: 'Unavailable'}});
          }
        }
        return route.continue();
      });
      await page.goto(`/progress?${filters}`);
      await expect(page.getByText('23 weight records', {exact: true})).toBeVisible();
      const list = page.getByRole('list', {name: 'weight records'});
      await expect(list.getByRole('listitem')).toHaveCount(20);
      const projection = await api(`/v1/client/weight-progress?${filters}&limit=20`, {token});
      expect(projection.chart.points).toHaveLength(22);
      const trend = page.getByRole('region', {name: 'Weight trend'});
      await expect(trend).toContainText(String(projection.summary.latest_entry.value));
      await expect(trend.locator('circle')).toHaveCount(22);
      const source = list.getByRole('link', {name: /^View check-in response/});
      await source.click();
      await expect(page.getByText('70.2', {exact: true})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Send response'})).toHaveCount(0);
      await page.getByRole('link', {name: 'Back to your progress', exact: true}).click();
      await expect(page).toHaveURL(`/progress?${filters}`);
      await expect(page.getByText('23 weight records', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', {name: 'Retry loading more'})).toBeVisible();
      await expect(list.getByRole('listitem')).toHaveCount(20);
      failNext = false;
      await page.getByRole('button', {name: 'Retry loading more'}).click();
      await expect(list.getByRole('listitem')).toHaveCount(23);
      expect(cursors.length).toBeGreaterThan(0);
      expect(cursors.every((cursor) => cursor === projection.next_cursor)).toBe(true);
      await expect(trend.locator('circle')).toHaveCount(22);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: `tests/progress/artifacts/history-${width}.png`, fullPage: true});
      const self = list.getByRole('link', {name: /Edit weight.*70.00 kg/});
      await self.click();
      await expect(page.getByRole('textbox', {name: 'Weight', exact: true})).toHaveValue('70.00');
      await page.getByRole('button', {name: 'Delete weight', exact: true}).click();
      await page.getByRole('dialog').getByRole('button', {name: 'Delete weight', exact: true}).click();
      await expect(page.getByText('Your weight record was removed.')).toBeVisible();
      const remaining = await api(`/v1/client/weight-progress?${filters}&limit=100`, {token});
      expect(remaining.count).toBe(22);
      expect(remaining.data.find((entry) => entry.form_assignment_id === assignment.id)?.value).toBe('70.20');
      expect(errors).toEqual([]);
      results.push({width, count: projection.count, chartPointsAcrossPages: 22, passed: true});
    } catch (error) {
      await writeFile(`tests/progress/artifacts/history-failure-${width}.txt`, await page.locator('body').innerText());
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/progress/artifacts/history-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
