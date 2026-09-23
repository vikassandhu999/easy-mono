import {execFileSync} from 'node:child_process';
import {mkdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {expect as baseExpect, chromium, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const expect = baseExpect.configure({timeout: 15_000});

execFileSync('rtk', ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./fixtures.exs', import.meta.url))], {
  cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)),
  stdio: 'pipe',
});
const fixtures = JSON.parse(await readFile(new URL('./artifacts/fixtures.json', import.meta.url), 'utf8'));
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://127.0.0.1:44000'});
const browser = await chromium.launch({channel: 'chromium'});
await mkdir('tests/settings/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function login(email) {
  await send('post', '/v1/auth/otp', {email, type: 'authentication'});
  return send('post', '/v1/auth/token', {email, otp: '123456', role: 'coach', grant_type: 'otp'});
}
async function session(page, tokens) {
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
}
async function capture(page, name, width) {
  await page.getByRole('heading', {level: 1}).click();
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({top: 0, behavior: 'instant'});
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({path: `tests/settings/artifacts/${name}-${width}.png`, fullPage: true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
try {
  for (const fixture of fixtures) {
    const {width, owner_email, trainer_email, invitation_token} = fixture;
    const owner = await login(owner_email);
    const foreignFixture = fixtures.find((item) => item.width !== width);
    const foreignOwner = await login(foreignFixture.owner_email);
    const foreignBusiness = (await send('get', '/v1/businesses/me', undefined, foreignOwner.access_token)).data;
    await send('post', '/v1/auth/trainer-accept-invite', {email: trainer_email, invitation_token});
    const trainer = await send('post', '/v1/auth/trainer-accept-invite/verify', {
      email: trainer_email,
      invitation_token,
      otp: '123456',
    });
    const context = await browser.newContext({
      baseURL: process.env.COACHAPP_URL || 'http://localhost:22022',
      viewport: {width, height: 900},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await session(page, owner);
    await page.goto('/');
    await page.getByRole('button', {name: 'Your account', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Your profile', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Your profile', exact: true})).toBeVisible();
    await expect(page.getByLabel('First name', {exact: true})).toHaveValue('Taylor');
    await expect(page.getByText(owner_email, {exact: true})).toBeVisible();
    await page.evaluate(async () => {
      const {client} = await import('/src/api/client.ts');
      window.settingsWrites = [];
      client.use({
        onRequest: async ({request}) => {
          if (request.method === 'PATCH') {
            window.settingsWrites.push(JSON.parse(await request.clone().text()));
          }
          return request;
        },
      });
    });
    await page.getByLabel('First name', {exact: true}).fill('Tay');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Your profile is saved.', {exact: true})).toBeFocused();
    expect(await page.evaluate(() => window.settingsWrites)).toEqual([{first_name: 'Tay'}]);
    await page.getByRole('button', {name: 'Your account', exact: true}).click();
    await expect(page.getByText('Tay Reed', {exact: true})).toBeVisible();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.getByLabel('First name', {exact: true})).toHaveValue('Tay');
    await page.getByLabel('Phone', {exact: true}).fill('+1 555 0100');
    await page.getByRole('link', {name: 'Business', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Discard your changes?'})).toBeVisible();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByLabel('Phone', {exact: true})).toHaveValue('+1 555 0100');
    await page.route('**/v1/coach/me', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({status: 503, json: {error_code: 'unavailable', error_message: 'Unavailable'}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Discard changes', exact: true})).toBeFocused();
    await page.screenshot({path: `tests/settings/artifacts/save-error-${width}.png`});
    await expect(page.getByLabel('Phone', {exact: true})).toHaveValue('+1 555 0100');
    await page.unroute('**/v1/coach/me');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Your profile is saved.', {exact: true})).toBeFocused();
    await expect(page.getByLabel('Phone', {exact: true})).toBeEnabled();
    await capture(page, 'profile', width);
    await page.getByLabel('Phone', {exact: true}).fill('unsaved');
    await page.route('**/v1/coach/me', (route) => route.fulfill({status: 503, json: {error_code: 'unavailable'}}));
    await page.evaluate(async () => {
      const {queryClient} = await import('/src/api/query-client.ts');
      const {authKeys} = await import('/src/api/keys.ts');
      await queryClient.invalidateQueries({queryKey: authKeys.profile()});
    });
    await expect(
      page.getByText('Could not refresh your account details. Your work is still here.', {exact: true}),
    ).toBeVisible();
    await expect(page.getByLabel('Phone', {exact: true})).toHaveValue('unsaved');
    await page.unroute('**/v1/coach/me');
    await page.getByRole('button', {name: 'Retry account details', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry account details', exact: true})).toHaveCount(0);
    await expect(page.getByLabel('Phone', {exact: true})).toHaveValue('unsaved');
    await page.getByRole('link', {name: 'Business', exact: true}).click();
    await page.getByRole('button', {name: 'Discard and leave', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Business settings', exact: true})).toBeVisible();
    await page.route('**/v1/businesses/me', (route) => route.fulfill({status: 503, json: {error_code: 'unavailable'}}));
    await page.reload();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute('**/v1/businesses/me');
    await page.route('**/v1/businesses/timezones', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByLabel('Business name', {exact: true})).toHaveValue('Everyday Coaching');
    await expect(selectTrigger(page, 'Default time zone')).toBeDisabled();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute('**/v1/businesses/timezones');
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(selectTrigger(page, 'Default time zone')).toBeEnabled();
    await page.getByLabel('Business name', {exact: true}).fill('   ');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByLabel('Business name', {exact: true})).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Business name', {exact: true})).toBeFocused();
    await page.getByLabel('Business name', {exact: true}).fill('Steady Strength Coaching');
    await page.getByLabel('About your business', {exact: true}).fill('Strength and nutrition for everyday life.');
    await page.getByLabel('WhatsApp number', {exact: true}).fill('+44 7700 900123');
    await chooseOption(selectTrigger(page, 'Default workout load unit'), 'Pounds (lb)');
    await page.getByRole('listbox', {includeHidden: true}).waitFor({state: 'detached'});
    await chooseOption(selectTrigger(page, 'Default time zone'), 'Europe/London');
    await page.getByRole('listbox', {includeHidden: true}).waitFor({state: 'detached'});
    await page.route('**/v1/businesses/me', async (route) => {
      if (route.request().method() === 'PATCH') {
        const response = await route.fetch({
          postData: JSON.stringify({...route.request().postDataJSON(), timezone: 'Not/AZone'}),
        });
        expect(response.status()).toBe(422);
        await route.fulfill({response});
      } else {
        await route.continue();
      }
    });
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('choose a valid time zone', {exact: true})).toBeVisible();
    await expect(selectTrigger(page, 'Default time zone')).toBeFocused();
    await page.screenshot({path: `tests/settings/artifacts/timezone-error-${width}.png`});
    await expect(selectTrigger(page, 'Default time zone')).toContainText('Europe/London');
    await page.unroute('**/v1/businesses/me');
    let lost = false;
    await page.route('**/v1/businesses/me', async (route) => {
      if (route.request().method() === 'PATCH' && !lost) {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        lost = true;
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      } else {
        await route.continue();
      }
    });
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('form').getByRole('alert')).toBeFocused();
    await expect(page.getByLabel('Business name', {exact: true})).toHaveValue('Steady Strength Coaching');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Business settings are saved.', {exact: true})).toBeFocused();
    await page.unroute('**/v1/businesses/me');
    expect((await send('get', '/v1/businesses/me', undefined, owner.access_token)).data).toMatchObject({
      name: 'Steady Strength Coaching',
      about: 'Strength and nutrition for everyday life.',
      whatsapp_number: '+44 7700 900123',
      timezone: 'Europe/London',
      default_weight_unit: 'lbs',
    });
    await expect(page.locator('.app-business')).toHaveText('Steady Strength Coaching');
    await page.reload();
    await expect(page.getByLabel('WhatsApp number', {exact: true})).toHaveValue('+44 7700 900123');
    await expect(selectTrigger(page, 'Default time zone')).toContainText('Europe/London');
    await expect(selectTrigger(page, 'Default time zone')).toBeEnabled();
    await capture(page, 'business', width);
    await page.getByLabel('About your business', {exact: true}).fill('');
    await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
    await expect(page.getByText('Changes discarded.', {exact: true})).toBeFocused();
    await expect(page.getByLabel('About your business', {exact: true})).toHaveValue(
      'Strength and nutrition for everyday life.',
    );
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    let received;
    const started = new Promise((resolve) => {
      received = resolve;
    });
    await page.route('**/v1/businesses/me', async (route) => {
      if (route.request().method() === 'PATCH') {
        const response = await route.fetch();
        received();
        await held;
        await route.fulfill({response});
      } else {
        await route.continue();
      }
    });
    await page.getByLabel('Business name', {exact: true}).fill('Saved by the owner');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await started;
    await page.getByRole('link', {name: 'Your profile', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Discard and leave', exact: true})).toBeDisabled();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await session(page, foreignOwner);
    release();
    await expect(page.getByLabel('Business name', {exact: true})).toHaveValue(foreignBusiness.name);
    await expect(page.getByText('Business settings are saved.', {exact: true})).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const {queryClient} = await import('/src/api/query-client.ts');
          const {businessKeys} = await import('/src/api/keys.ts');
          return queryClient.getQueryData(businessKeys.detail())?.data.id;
        }),
      )
      .toBe(foreignBusiness.id);
    await session(page, trainer);
    await expect(page.getByText('Only the business owner can change these settings.', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Save changes', exact: true})).toHaveCount(0);
    await expect(page.getByText('Business settings are saved.', {exact: true})).toHaveCount(0);
    await page.unroute('**/v1/businesses/me');
    await capture(page, 'trainer-business', width);
    for (const [path, data] of [
      ['/v1/businesses/me', {name: 'Denied'}],
      ['/v1/coach/me', {whatsapp_number: null}],
    ]) {
      const denied = await api.patch(path, {data, headers: {authorization: `Bearer ${trainer.access_token}`}});
      expect(denied.status()).toBe(403);
    }
    await page.getByRole('link', {name: 'Your profile', exact: true}).click();
    await expect(page.getByLabel('First name', {exact: true})).toHaveValue('Jamie');
    await page.getByLabel('First name', {exact: true}).fill('James');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Your profile is saved.', {exact: true})).toBeFocused();
    expect((await send('get', '/v1/coach/me', undefined, owner.access_token)).data.first_name).toBe('Tay');
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Settings ${width}: persistence, permissions, defaults, load/save recovery, draft protection and account replacement passed.`,
    );
  }
} catch (error) {
  console.error('Settings scenario failed:', error.message);
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
