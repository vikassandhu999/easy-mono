import {execFileSync} from 'node:child_process';
import {mkdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

execFileSync('rtk', ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./fixtures.exs', import.meta.url))], {
  cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)),
  stdio: 'pipe',
});
const fixtures = JSON.parse(await readFile(new URL('./artifacts/fixtures.json', import.meta.url), 'utf8'));
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://127.0.0.1:44000'});
const browser = await chromium.launch({channel: 'chromium'});
await mkdir('tests/team/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function login(email) {
  await send('post', '/v1/auth/otp', {email, type: 'authentication'});
  return send('post', '/v1/auth/token', {email, otp: '123456', role: 'coach', grant_type: 'otp'});
}
async function accept(member) {
  await send('post', '/v1/auth/trainer-accept-invite', {
    email: member.email,
    invitation_token: member.invitation_token,
  });
  return send('post', '/v1/auth/trainer-accept-invite/verify', {
    email: member.email,
    invitation_token: member.invitation_token,
    otp: '123456',
  });
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
  await page.screenshot({path: `tests/team/artifacts/${name}-${width}.png`, fullPage: true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function denied(path, token) {
  const response = await api.get(path, {headers: {authorization: `Bearer ${token}`}});
  expect([401, 403, 404]).toContain(response.status());
}
try {
  for (const fixture of fixtures) {
    const {width, suffix, owner_email, owner_id, members, clients} = fixture;
    const owner = await login(owner_email);
    const foreignFixture = fixtures.find((item) => item.width !== width);
    const foreign = await login(foreignFixture.owner_email);
    const jamie = members.find((member) => member.name === 'Jamie');
    const casey = members.find((member) => member.name === 'Casey');
    const drew = members.find((member) => member.name === 'Drew');
    const _historic = members.find((member) => member.name === 'Historic');
    const avery = members.find((member) => member.name === 'Avery');
    const jamieTokens = await accept(jamie);
    const caseyTokens = await accept(casey);
    await accept(drew);
    await send('post', `/v1/coach/team/${drew.id}/deactivate`, undefined, owner.access_token);
    for (const person of clients) {
      const body = {email: person.email, invitation_token: person.invitation_token};
      await send('post', '/v1/auth/accept-invite', body);
      await send('post', '/v1/auth/accept-invite/verify', {...body, otp: '123456'});
    }
    const alex = clients[0];
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
    let initialFailure = true;
    let pageFailure = true;
    await page.route('**/v1/coach/team?*', async (route) => {
      const url = new URL(route.request().url());
      if (initialFailure || (pageFailure && url.searchParams.get('cursor') !== 'start')) {
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      } else {
        url.searchParams.set('limit', '3');
        await route.continue({url: url.href});
      }
    });
    await page.getByRole('button', {name: 'Your account', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Team', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    initialFailure = false;
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByText('12 team members', {exact: true})).toBeVisible();
    const rows = page.locator('ul[aria-label="team members"] > li');
    await expect(rows).toHaveCount(3);
    await page.keyboard.press('End');
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(3);
    pageFailure = false;
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    while ((await rows.count()) < 12) {
      const before = await rows.count();
      await page.keyboard.press('End');
      await expect.poll(() => rows.count()).toBeGreaterThan(before);
    }
    await expect(rows).toHaveCount(12);
    const links = await rows.locator('a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    expect(new Set(links).size).toBe(12);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/v1/coach/team?') && response.status() === 200),
      page.getByRole('button', {name: 'Refresh team members', exact: true}).click(),
    ]);
    await expect(page.getByText('12 team members', {exact: true})).toBeVisible();
    await capture(page, 'team', width);
    initialFailure = true;
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/v1/coach/team?') && response.status() === 503),
      page.getByRole('button', {name: 'Refresh team members', exact: true}).click(),
    ]);
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeEnabled();
    await expect(rows).toHaveCount(12);
    initialFailure = false;
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toHaveCount(0);
    await page.getByLabel('Search team', {exact: true}).fill('Historic');
    await expect(rows).toHaveCount(1);
    await expect(page).toHaveURL(/search=Historic/);
    await page.reload();
    await expect(rows).toHaveCount(1);
    await rows.getByRole('link').click();
    await expect(page.getByText('Invitation expired', {exact: true})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Historic Morgan', exact: true})).toBeVisible();
    await capture(page, 'expired-invitation', width);
    await page.getByRole('link', {name: 'Back to team', exact: true}).click();
    await expect(page.getByLabel('Search team', {exact: true})).toHaveValue('Historic');
    await page.getByLabel('Search team', {exact: true}).fill('');
    await chooseOption(selectTrigger(page, 'Status'), 'Active');
    await page.getByRole('listbox', {includeHidden: true}).waitFor({state: 'detached'});
    await expect(page.getByText('3 team members', {exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Status'), 'Everyone');
    await page.getByRole('listbox', {includeHidden: true}).waitFor({state: 'detached'});
    await page.getByRole('link', {name: 'Invite coach', exact: true}).click();
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByLabel('Email', {exact: true})).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Email', {exact: true}).fill(`morgan-${suffix}@example.test`);
    await page.getByLabel('First name', {exact: true}).fill('Morgan');
    await page.getByLabel('Last name', {exact: true}).fill('Vale');
    await page.getByRole('link', {name: 'Cancel', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await page.route('**/v1/coach/team/invite', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Email', {exact: true})).toHaveValue(`morgan-${suffix}@example.test`);
    await page.unroute('**/v1/coach/team/invite');
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Morgan Vale', exact: true})).toBeVisible();
    const invitedId = new URL(page.url()).pathname.split('/').at(-1);
    await capture(page, 'invited-coach', width);
    await page.getByRole('button', {name: 'Resend invitation', exact: true}).click();
    await page.route(`**/v1/coach/team/${invitedId}/resend-invite`, async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
    });
    await page.getByRole('dialog').getByRole('button', {name: 'Resend invitation', exact: true}).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await page.unroute(`**/v1/coach/team/${invitedId}/resend-invite`);
    await page.getByRole('dialog').getByRole('button', {name: 'Resend invitation', exact: true}).click();
    await expect(page.getByText('Invitation resent.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await page.route(`**/v1/coach/team/${invitedId}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      } else {
        await route.continue();
      }
    });
    await page.getByRole('dialog').getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Team', exact: true})).toBeVisible();
    await expect(page.getByText('Invitation revoked.', {exact: true})).toBeVisible();
    await page.unroute(`**/v1/coach/team/${invitedId}`);
    await page.goto(`/team/${avery.id}`);
    await page.getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await accept(avery);
    await page.getByRole('dialog').getByRole('button', {name: 'Revoke invitation', exact: true}).click();
    await expect(
      page.getByText("This coach's status has changed. Close this dialog to see their available actions.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('dialog').getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Deactivate coach', exact: true})).toBeVisible();

    await page.goto(`/clients/${alex.id}/profile`);
    await expect(page.getByText('Taylor Reed', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Change coach', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Change coach', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Choose Drew Morgan', exact: true})).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Current coach: Taylor Reed', exact: true})).toBeDisabled();
    await page.getByLabel('Search coaches', {exact: true}).fill('Jamie');
    await expect(page.getByText('1 active coach', {exact: true})).toBeVisible();
    await capture(page, 'choose-coach', width);
    await page.getByRole('button', {name: 'Choose Jamie Morgan', exact: true}).click();
    await page.route(`**/v1/coach/clients/${alex.id}/reassign`, (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.getByRole('button', {name: 'Assign coach', exact: true}).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await page.unroute(`**/v1/coach/clients/${alex.id}/reassign`);
    await page.getByRole('button', {name: 'Assign coach', exact: true}).click();
    await expect(page.getByText('Coach assignment saved.', {exact: true})).toBeVisible();
    await expect(page.getByText('Jamie Morgan', {exact: true})).toBeVisible();
    expect(
      (await send('get', `/v1/coach/clients/${alex.id}`, undefined, jamieTokens.access_token)).data.assigned_coach_id,
    ).toBe(jamie.id);
    await denied(`/v1/coach/clients/${alex.id}`, caseyTokens.access_token);
    await page.goto(`/team/${jamie.id}`);
    await expect(page.getByText('1 assigned client', {exact: true})).toBeVisible();
    await capture(page, 'active-coach', width);
    await page.getByRole('link', {name: /Alex Lane/}).click();
    await expect(page.getByRole('link', {name: 'Back to Jamie Morgan', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to Jamie Morgan', exact: true}).click();
    await page.getByRole('button', {name: 'Deactivate coach', exact: true}).click();
    let apply = false;
    await page.route(`**/v1/coach/team/${jamie.id}/deactivate`, async (route) => {
      if (apply) {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
      }
      await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
    });
    await page.getByRole('dialog').getByRole('button', {name: 'Deactivate coach', exact: true}).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    apply = true;
    await page.getByRole('dialog').getByRole('button', {name: 'Deactivate coach', exact: true}).click();
    await expect(page.getByText('Coach deactivated. Their clients are assigned to you.', {exact: true})).toBeVisible();
    await expect(page.getByText('0 assigned clients', {exact: true})).toBeVisible();
    expect(
      (await send('get', `/v1/coach/clients/${alex.id}`, undefined, owner.access_token)).data.assigned_coach_id,
    ).toBe(owner_id);
    await denied('/v1/coach/me', jamieTokens.access_token);
    await page.unroute(`**/v1/coach/team/${jamie.id}/deactivate`);
    await capture(page, 'inactive-coach', width);
    await page.getByRole('button', {name: 'Reactivate coach', exact: true}).click();
    await page.route(`**/v1/coach/team/${jamie.id}/reactivate`, async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
    });
    await page.getByRole('dialog').getByRole('button', {name: 'Reactivate coach', exact: true}).click();
    await expect(page.getByText('Coach reactivated. You can assign clients to them.', {exact: true})).toBeVisible();
    await page.unroute(`**/v1/coach/team/${jamie.id}/reactivate`);
    const renewedJamie = await login(jamie.email);
    await denied(`/v1/coach/clients/${alex.id}`, renewedJamie.access_token);
    await page.goto(`/team/${owner_id}`);
    await expect(page.getByText('2 assigned clients', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Deactivate coach', exact: true})).toHaveCount(0);
    await session(page, caseyTokens);
    await expect(page.getByText('Owner access required', {exact: true})).toBeVisible();
    await page.goto(`/clients/${alex.id}/coach`);
    await expect(page.getByText('Owner access required', {exact: true})).toBeVisible();
    await session(page, owner);
    await page.goto('/team/invite');
    await page.getByLabel('Email', {exact: true}).fill(`late-${suffix}@example.test`);
    await page.getByLabel('First name', {exact: true}).fill('Late invitation');
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    let received;
    const started = new Promise((resolve) => {
      received = resolve;
    });
    await page.route('**/v1/coach/team/invite', async (route) => {
      const response = await route.fetch();
      received();
      await held;
      await route.fulfill({response});
    });
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await started;
    await session(page, foreign);
    release();
    await expect(page.locator('.app-business')).toHaveText(`Team Coaching ${foreignFixture.width}`);
    await expect(page.getByLabel('Email', {exact: true})).toHaveValue('');
    await expect(page).toHaveURL(/\/team\/invite$/);
    await page.unroute('**/v1/coach/team/invite');
    await page.getByRole('link', {name: 'Back to team', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Team', exact: true})).toBeVisible();
    await expect(page.getByText('Late invitation', {exact: true})).toHaveCount(0);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Team ${width}: cursor/search/status, invitations, stale acceptance, access recovery, client reassignment, permissions and late response isolation passed.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
