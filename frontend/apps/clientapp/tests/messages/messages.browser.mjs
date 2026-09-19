import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/messages/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width, height: 812},
    });
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
      const conversation = (await api('/v1/client/conversation', {token})).data;
      const coachSend = (body) =>
        api(`/v1/coach/conversations/${conversation.id}/messages`, {
          token: fixture.coachToken,
          method: 'POST',
          body: {body},
        });
      await coachSend('How did your training feel today?');
      await expect(page.getByText('1 unread message from your coach.')).toBeVisible();
      await page.getByRole('link', {name: 'Messages', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Messages', exact: true})).toBeVisible();
      await expect(page.getByText('How did your training feel today?', {exact: true})).toBeVisible();
      await expect(page.getByText('Conversation connected', {exact: true})).toBeVisible();
      await expect.poll(async () => (await api('/v1/client/conversation', {token})).data.unread_count).toBe(0);
      const input = page.getByLabel('Message your coach', {exact: true});
      await input.fill('The last set felt strong.\nCan we review my technique?');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await page.reload();
      await expect(input).toHaveValue('The last set felt strong.\nCan we review my technique?');
      let writes = 0;
      let identity;
      await page.route('**/v1/client/conversation/messages', async (route) => {
        if (route.request().method() !== 'POST') {
          return route.continue();
        }
        identity = route.request().postDataJSON().request_id;
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        writes++;
        await route.abort('connectionreset');
      });
      await page.getByRole('button', {name: 'Send', exact: true}).click();
      await expect(
        page.getByText('Delivery could not be confirmed. Retry safely to check or send this message once.'),
      ).toBeVisible();
      await expect(input).toBeDisabled();
      await page.reload();
      await expect(input).toHaveValue('The last set felt strong.\nCan we review my technique?');
      await expect(input).toBeDisabled();
      expect(writes).toBe(1);
      await page.unroute('**/v1/client/conversation/messages');
      await page.getByRole('button', {name: 'Retry send', exact: true}).click();
      await expect(page.getByText('Message sent.', {exact: true})).toBeVisible();
      await expect(input).toHaveValue('');
      let history = await api('/v1/client/conversation/history', {token});
      expect(history.count).toBe(2);
      expect(history.data.filter((message) => message.request_id === identity)).toHaveLength(1);
      await coachSend('Yes. Send a short clip when you are ready.');
      await expect(page.getByText('Yes. Send a short clip when you are ready.', {exact: true})).toBeVisible();
      await input.fill('A deliberately long word: ' + 'training'.repeat(45));
      await page.getByRole('button', {name: 'Send', exact: true}).click();
      await expect(input).toHaveValue('');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      const sendBounds = await page.getByRole('button', {name: 'Send', exact: true}).boundingBox();
      const navBounds = await page.getByRole('navigation', {name: 'Main navigation'}).boundingBox();
      expect(sendBounds.y + sendBounds.height).toBeLessThanOrEqual(navBounds.y);
      await page.screenshot({path: `tests/messages/artifacts/conversation-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: 'Today', exact: true}).click();
      await expect(page.getByRole('link', {name: 'Message your coach', exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Message your coach', exact: true}).click();
      await expect(page.getByText('How did your training feel today?', {exact: true})).toBeVisible();
      if (width === 375) {
        await input.fill('A version changed in another tab');
        await page.route('**/v1/client/conversation/messages', async (route) => {
          const body = route.request().postDataJSON();
          await api('/v1/client/conversation/messages', {
            method: 'POST',
            token,
            body: {...body, body: 'The earlier version already sent'},
          });
          await route.continue();
        });
        await page.getByRole('button', {name: 'Send', exact: true}).click();
        await expect(page.getByRole('button', {name: 'Discard conflicting draft', exact: true})).toBeVisible();
        await expect(input).toBeDisabled();
        await page.unroute('**/v1/client/conversation/messages');
        const beforeDiscard = await api('/v1/client/conversation/history', {token});
        await page.getByRole('button', {name: 'Discard conflicting draft', exact: true}).click();
        await page.getByRole('dialog').getByRole('button', {name: 'Discard draft', exact: true}).click();
        await expect(input).toHaveValue('');
        await expect(input).toBeEnabled();
        expect((await api('/v1/client/conversation/history', {token})).count).toBe(beforeDiscard.count);
      }
      expect(errors).toEqual([]);
      history = await api('/v1/client/conversation/history', {token});
      results.push({width, count: history.count, lostResponseWrites: writes, requestId: identity, passed: true});
    } catch (error) {
      await page.screenshot({path: `tests/messages/artifacts/failure-${width}.png`, fullPage: true});
      await writeFile(`tests/messages/artifacts/failure-${width}.txt`, await page.locator('body').innerText());
      await writeFile(`tests/messages/artifacts/errors-${width}.json`, JSON.stringify(errors));
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/messages/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(
  'Mobile messaging text, live coach updates, bounded read, draft restart and duplicate-safe delivery passed at 375/768/1280px.',
);
