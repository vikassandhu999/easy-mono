import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
try {
  const clients = [];
  for (const firstName of ['Original', 'Other']) {
    const fixture = await inviteClient({firstName});
    const context = await browser.newContext({baseURL: 'http://localhost:1315', viewport: {width: 375, height: 812}});
    const page = await context.newPage();
    await page.goto(`/invite/${fixture.token}`);
    await page.getByRole('button', {name: 'Continue with email'}).click();
    await page.getByLabel('Verification code').fill('123456');
    await page.getByRole('button', {name: 'Verify and continue'}).click();
    await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Messages', exact: true}).click();
    await expect(page.getByLabel('Message your coach', {exact: true})).toBeVisible();
    await expect(page.getByText('Conversation connected', {exact: true})).toBeVisible();
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')));
    clients.push({page, session});
  }
  const [original, other] = clients;
  const input = original.page.getByLabel('Message your coach', {exact: true});
  await input.fill('Private message for the original coach');
  await expect(original.page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  // A second tab can hold the refresh lock while this tab prepares a send.
  await original.page.evaluate(
    () =>
      new Promise((ready) => {
        navigator.locks.request(
          'clientapp.auth.refresh',
          () =>
            new Promise((release) => {
              window.releaseRefresh = release;
              ready();
            }),
        );
      }),
  );
  await original.page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect
    .poll(() =>
      original.page.evaluate(
        async () =>
          (await navigator.locks.query()).pending.filter((lock) => lock.name === 'clientapp.auth.refresh').length,
      ),
    )
    .toBeGreaterThan(0);
  // Model a completed sign-in in another tab before the queued request obtains its lock.
  await original.page.evaluate((session) => {
    const oldValue = localStorage.getItem('clientapp.auth.v1');
    const newValue = JSON.stringify(session);
    localStorage.setItem('clientapp.auth.v1', newValue);
    window.dispatchEvent(new StorageEvent('storage', {key: 'clientapp.auth.v1', oldValue, newValue}));
    window.releaseRefresh();
  }, other.session);
  await expect(original.page.getByLabel('Message your coach', {exact: true})).toHaveValue('');
  await expect.poll(() => original.page.evaluate(async () => (await navigator.locks.query()).pending.length)).toBe(0);
  // Wait for the original mutation to settle, then check both authoritative histories.
  await original.page.evaluate(async () => {
    const {queryClient} = await import('/src/api/query-client.ts');
    await new Promise((resolve) => {
      const idle = () => queryClient.isMutating() === 0;
      if (idle()) {
        return resolve();
      }
      const stop = queryClient.getMutationCache().subscribe(() => {
        if (idle()) {
          stop();
          resolve();
        }
      });
    });
  });
  for (const {session} of clients) {
    const history = await api('/v1/client/conversation/history', {token: session.tokens.access_token});
    expect(history.count, 'An old-account request must not send under a replacement session').toBe(0);
  }
  console.log('A send waiting for the refresh lock cannot cross into another account.');
} finally {
  await browser.close();
}
