import {execFileSync} from 'node:child_process';
import {mkdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

execFileSync('rtk', ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./fixtures.exs', import.meta.url))], {
  cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)),
  stdio: 'pipe',
});
const fixtures = JSON.parse(await readFile(new URL('./artifacts/fixtures.json', import.meta.url), 'utf8'));
const apiURL = process.env.COACH_API_URL || 'http://localhost:44000';
const appURL = process.env.COACH_APP_URL || 'http://localhost:22022';
const api = await request.newContext({baseURL: apiURL});
const browser = await chromium.launch();
await mkdir('tests/navigation/artifacts', {recursive: true});

async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function reach(page, target, key = 'Tab') {
  for (let count = 0; count < 100; count++) {
    if (await target.evaluate((node) => node === document.activeElement)) {
      await expect(target).toBeInViewport({ratio: 1});
      return;
    }
    await page.keyboard.press(key);
  }
  throw new Error(`Keyboard could not reach ${await target.textContent()}`);
}
async function openLink(page, name, path, {scope = page, reverse = false} = {}) {
  const changed = new URL(page.url()).pathname !== new URL(path, page.url()).pathname;
  // Long editors repeat the same return link in their header and footer.
  const target = scope.getByRole('link', {name, exact: true}).first();
  await expect(target).toHaveAttribute('href', path);
  await reach(page, target, reverse ? 'Shift+Tab' : 'Tab');
  expect(await target.evaluate((node) => node.matches(':focus-visible'))).toBe(true);
  if (await target.evaluate((node) => Boolean(node.closest('nav')))) {
    const outline = await target.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        width: Number.parseFloat(style.outlineWidth),
        offset: Number.parseFloat(style.outlineOffset),
        padding: Number.parseFloat(style.paddingInlineStart),
      };
    });
    expect(outline.width).toBeGreaterThanOrEqual(2);
    expect(outline.offset).toBeLessThan(0);
    expect(outline.padding).toBeGreaterThan(Math.abs(outline.offset));
    if (name === 'Clients') {
      await page.screenshot({
        path: `tests/navigation/artifacts/focused-navigation-${page.viewportSize().width}.png`,
        animations: 'disabled',
      });
    }
  }
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${appURL}${path}`);
  if (changed) {
    await expect(page.getByRole('main')).toBeFocused();
  } else {
    await expect(target).toBeFocused();
  }
  await expect(page.getByRole('status').filter({hasText: /Loading|Opening/})).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function primary(page, name, path) {
  const nav = page.getByRole('navigation', {name: 'Coaching', exact: true});
  await openLink(page, name, path, {scope: nav, reverse: true});
  await expect(nav.locator('.active')).toHaveCount(1);
  await expect(nav.getByRole('link', {name, exact: true})).toHaveClass(/\bactive\b/);
}
async function accountMenu(page, name, path) {
  await reach(page, page.getByRole('button', {name: 'Your account', exact: true}), 'Shift+Tab');
  await page.keyboard.press('Enter');
  const item = page.getByRole('menuitem', {name, exact: true});
  await expect(item).toBeVisible();
  await reach(page, item, 'ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${appURL}${path}`);
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('heading', {level: 1, name, exact: true})).toBeVisible();
  await expect(page.getByRole('status').filter({hasText: /Loading|Opening/})).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
}

try {
  for (const fixture of fixtures) {
    const {width, suffix, owner_email, trainer_email, invitation_token} = fixture;
    await send('post', '/v1/auth/otp', {email: owner_email, type: 'authentication'});
    const owner = await send('post', '/v1/auth/token', {
      email: owner_email,
      otp: '123456',
      role: 'coach',
      grant_type: 'otp',
    });
    await send('post', '/v1/auth/trainer-accept-invite', {email: trainer_email, invitation_token});
    const trainer = await send('post', '/v1/auth/trainer-accept-invite/verify', {
      email: trainer_email,
      invitation_token,
      otp: '123456',
    });
    for (const [role, tokens] of [
      ['owner', owner],
      ['trainer', trainer],
    ]) {
      const name = `Test ${role} client`;
      const email = `navigation-client-${role}-${suffix}@example.test`;
      const client = (await send('post', '/v1/coach/clients', {full_name: name, email}, tokens.access_token)).data;
      const clientInvite = {email, invitation_token: new URL(client.invite_url).pathname.split('/').at(-1)};
      await send('post', '/v1/auth/accept-invite', clientInvite);
      await send('post', `/v1/auth/invites/${clientInvite.invitation_token}/accept`, {...clientInvite, otp: '123456'});
      const context = await browser.newContext({baseURL: appURL, viewport: {width, height: 900}});
      context.setDefaultTimeout(15000);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto('/login');
        await page.evaluate(async (tokens) => {
          const {saveSession} = await import('/src/api/session.ts');
          saveSession(tokens);
        }, tokens);
        await page.goto('/');
        await expect(page.getByRole('heading', {level: 1, name: 'Clients', exact: true})).toBeVisible();

        for (const [label, path, title] of [
          ['Messages', '/messages', 'Messages'],
          ['Training', '/training-plans', 'Training plans'],
          ['Foods', '/foods', 'Food catalogue'],
          ['Clients', '/clients', 'Clients'],
        ]) {
          await primary(page, label, path);
          await expect(page.getByRole('heading', {level: 1, name: title, exact: true})).toBeVisible();
        }
        for (const [label, path] of [
          ['Your profile', '/settings/profile'],
          ['Business settings', '/settings/business'],
          ['Billing', '/billing'],
          ...(role === 'owner' ? [['Team', '/team']] : []),
        ]) {
          await accountMenu(page, label, path);
        }
        if (role === 'trainer') {
          await expect(
            page.getByText('The business owner manages payments and seat changes.', {exact: true}),
          ).toBeVisible();
          await reach(page, page.getByRole('button', {name: 'Your account', exact: true}), 'Shift+Tab');
          await page.keyboard.press('Enter');
          await expect(page.getByRole('menuitem', {name: 'Team', exact: true})).toHaveCount(0);
          await page.keyboard.press('Escape');
          await page.goto('/team');
          await expect(page.getByText('Owner access required', {exact: true})).toBeVisible();
          const denied = await api.get('/v1/coach/coaches', {
            headers: {authorization: `Bearer ${tokens.access_token}`},
          });
          expect(denied.status()).toBe(403);
        }

        for (const [parent, parentPath, label, path, back] of [
          ['Training', '/training-plans', 'Exercise library', '/training-exercises', 'Back to training plans'],
        ]) {
          await primary(page, parent, parentPath);
          await openLink(page, label, path);
          await expect(page.getByRole('heading', {level: 1, name: label, exact: true})).toBeVisible();
          await expect(
            page.getByRole('navigation', {name: 'Coaching'}).getByRole('link', {name: parent, exact: true}),
          ).toHaveClass(/\bactive\b/);
          await openLink(page, back, parentPath);
        }

        await primary(page, 'Clients', '/clients');
        const clientPath = `/clients/${client.id}`;
        await openLink(page, new RegExp(name), clientPath);
        await expect(page.getByRole('heading', {level: 1, name, exact: true})).toBeVisible();
        for (const [label, suffixPath, back] of [
          ['Client details', '/profile', 'Back to client'],
          ['Messages', '/conversation', 'Client details'],
          ['View training history', '/training-sessions', 'Back to client'],
          ['All training plans', '/training-plans?status=all', 'Back to client'],
          ['Assign training plan', '/training-plans/assign', 'Back to client'],
        ]) {
          await openLink(page, label, clientPath + suffixPath, {scope: page.getByRole('main')});
          const active = suffixPath === '/conversation' ? 'Messages' : 'Clients';
          const nav = page.getByRole('navigation', {name: 'Coaching'});
          await expect(nav.locator('.active')).toHaveCount(1);
          await expect(nav.getByRole('link', {name: active, exact: true})).toHaveClass(/\bactive\b/);
          await openLink(page, back, clientPath);
          await expect(page.getByRole('heading', {level: 1, name, exact: true})).toBeVisible();
        }
        await openLink(page, 'Back to clients', '/clients');
        await page.screenshot({path: `tests/navigation/artifacts/${role}-${width}.png`, animations: 'disabled'});
        await reach(page, page.getByRole('button', {name: 'Your account', exact: true}), 'Shift+Tab');
        await page.keyboard.press('Enter');
        await reach(page, page.getByRole('menuitem', {name: 'Sign out', exact: true}), 'ArrowDown');
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(`${appURL}/login`);
        expect(errors).toEqual([]);
        console.log(
          `Connected keyboard navigation, libraries, client tasks, account access and logout passed for ${role} at ${width}px.`,
        );
      } catch (error) {
        await page.screenshot({
          path: `tests/navigation/artifacts/failure-${role}-${width}.png`,
          animations: 'disabled',
        });
        console.log(
          await page.evaluate(() => {
            const node = document.activeElement;
            const box = node?.getBoundingClientRect();
            const nav = document.querySelector('nav');
            return {
              url: location.pathname,
              focused: node?.textContent?.slice(0, 80),
              box: box?.toJSON(),
              scrollY,
              navScroll: nav?.scrollLeft,
            };
          }),
        );
        throw error;
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await api.dispose();
}
