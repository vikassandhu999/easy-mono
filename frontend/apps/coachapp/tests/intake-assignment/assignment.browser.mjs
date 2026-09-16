import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

execFileSync('rtk', ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./fixtures.exs', import.meta.url))], {
  cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)),
  stdio: 'pipe',
});
const fixtures = JSON.parse(await readFile(new URL('./artifacts/fixtures.json', import.meta.url), 'utf8'));
const api = await request.newContext({baseURL: 'http://localhost:44000'});
const browser = await chromium.launch();
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
try {
  for (const fixture of fixtures) {
    const {width, clients, owner_email: email} = fixture;
    await send('post', '/v1/auth/otp', {email, type: 'authentication'});
    const tokens = await send('post', '/v1/auth/token', {email, otp: '123456', grant_type: 'otp', role: 'coach'});
    const token = tokens.access_token;
    const forms = [];
    for (let index = 0; index < 45; index++) {
      const form = (
        await send(
          'post',
          '/v1/coach/form-templates',
          {
            name:
              index === 42 ? `Test ${'LongIntakeName'.repeat(12)}` : `Test intake ${String(index).padStart(2, '0')}`,
            purpose: index === 44 ? 'check_in' : 'intake',
            sections: [
              {
                title: 'Your goals',
                questions: [{id: 'goal', type: 'text', label: 'What would you like to achieve?', required: true}],
              },
            ],
          },
          token,
        )
      ).data;
      if (index === 43) {
        await send(
          'patch',
          `/v1/coach/form-templates/${form.id}`,
          {status: 'archived', expected_revision: form.revision},
          token,
        );
      }
      forms.push(form);
    }
    const context = await browser.newContext({baseURL: 'http://localhost:22022', viewport: {width, height: 900}});
    await context.addInitScript(() => {
      delete window.IntersectionObserver;
    });
    const page = await context.newPage();
    context.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const routeFor = (person, template = '') =>
      `/clients/${person.id}/intake/assign${template ? `?template=${template}` : ''}`;
    const intakePath = (person) => `/v1/coach/clients/${person.id}/intake`;
    const assignPath = (person) => `/v1/coach/clients/${person.id}/form-assignments`;
    const assign = page.getByRole('button', {name: 'Assign intake', exact: true});
    const existing = page.getByRole('heading', {name: 'Intake already assigned', exact: true});
    try {
      await page.goto('/login');
      await page.evaluate(async (value) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(value);
      }, tokens);
      await page.goto(`/clients/${clients.normal.id}`);
      await page.route('**/v1/coach/form-templates?*', (route) => route.fulfill({status: 503, json: {}}));
      await page.getByRole('link', {name: 'Assign intake', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
      await page.unroute('**/v1/coach/form-templates?*');
      await page.getByRole('button', {name: 'Try again', exact: true}).click();
      await expect(page.getByRole('status').getByText('43 intake forms', {exact: true})).toBeVisible();
      const rows = page.getByRole('list', {name: 'intake forms', exact: true}).getByRole('listitem');
      await expect(rows).toHaveCount(20);
      await page.route('**/v1/coach/form-templates?*', (route) =>
        new URL(route.request().url()).searchParams.get('cursor') !== 'start'
          ? route.fulfill({status: 503, json: {}})
          : route.continue(),
      );
      await page.getByRole('button', {name: 'Load more', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
      await expect(rows).toHaveCount(20);
      await page.unroute('**/v1/coach/form-templates?*');
      await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
      await expect(rows).toHaveCount(40);
      await page.getByRole('button', {name: 'Load more', exact: true}).click();
      await expect(rows).toHaveCount(43);
      await page.getByLabel('Search intake forms', {exact: true}).fill('No such intake');
      await expect(page.getByRole('heading', {name: 'No matching intake forms', exact: true})).toBeVisible();
      await page.getByLabel('Search intake forms', {exact: true}).fill(forms[0].name);
      await expect(rows).toHaveCount(1);
      await rows.getByRole('link').click();
      await expect(page.getByRole('heading', {name: forms[0].name, exact: true})).toBeFocused();
      await page.getByRole('button', {name: 'Preview form', exact: true}).click();
      await expect(page.getByRole('dialog').getByLabel('What would you like to achieve?', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Close preview', exact: true}).click();
      await page.route(`**/v1/coach/form-templates/${forms[0].id}`, (route) => route.fulfill({status: 503, json: {}}));
      await page.reload();
      await expect(page.getByRole('heading', {name: 'Intake form unavailable', exact: true})).toBeFocused();
      await page.unroute(`**/v1/coach/form-templates/${forms[0].id}`);
      await page.getByRole('button', {name: 'Retry form', exact: true}).click();
      await expect(assign).toBeEnabled();
      await page.getByRole('link', {name: 'Choose another intake', exact: true}).click();
      await expect(page.getByLabel('Search intake forms', {exact: true})).toHaveValue(forms[0].name);
      await rows.getByRole('link').click();
      await assign.click();
      await expect(page).toHaveURL(`http://localhost:22022/clients/${clients.normal.id}`);
      const saved = (await send('get', intakePath(clients.normal), undefined, token)).data;
      expect(saved.form_template.id).toBe(forms[0].id);
      // The actual client accepts and opens the assigned intake through the client API.
      await send('post', '/v1/auth/accept-invite', {
        email: clients.normal.email,
        invitation_token: clients.normal.invitation_token,
      });
      const clientTokens = await send('post', '/v1/auth/accept-invite/verify', {
        email: clients.normal.email,
        invitation_token: clients.normal.invitation_token,
        otp: '123456',
      });
      const assignments = await send('get', '/v1/client/form-assignments', undefined, clientTokens.access_token);
      expect(assignments.data.some((item) => item.id === saved.id && item.form_template.id === forms[0].id)).toBe(true);

      const clientContext = await browser.newContext({
        baseURL: 'http://localhost:1314',
        viewport: {width: 375, height: 900},
      });
      try {
        // Exercise the real client app against the isolated fixture API; responses are not mocked.
        await clientContext.route('**/v1/**', async (route) => {
          const url = new URL(route.request().url());
          const response = await route.fetch({url: `http://localhost:44000${url.pathname}${url.search}`});
          await route.fulfill({response});
        });
        const clientPage = await clientContext.newPage();
        clientPage.on('pageerror', (error) => errors.push(error.message));
        await clientPage.goto('/login');
        await clientPage.evaluate(async (value) => {
          const {setTokens} = await import('/src/api/authStorage.ts');
          setTokens(value);
        }, clientTokens);
        await clientPage.goto('/');
        await clientPage.getByRole('button', {name: 'Fill intake form', exact: true}).click();
        await clientPage
          .getByRole('textbox', {name: /What would you like to achieve/})
          .fill('Build a consistent training routine.');
        await clientPage.getByRole('button', {name: 'Submit intake', exact: true}).click();
        await expect(clientPage).toHaveURL('http://localhost:1314/check-ins');
        await page.reload();
        await expect(page.getByRole('region', {name: 'Submitted answers', exact: true})).toContainText(
          'Build a consistent training routine.',
        );
        await page.getByRole('button', {name: 'Mark intake reviewed', exact: true}).click();
        await expect(page.getByText('Review saved', {exact: true})).toBeVisible();
      } finally {
        await clientContext.close();
      }

      // An archived or wrong-purpose URL cannot assign a form.
      for (const form of forms.slice(43)) {
        await page.goto(routeFor(clients.failed, form.id));
        await expect(
          page.getByText('This form is no longer available as an intake. Choose an active Intake form.', {exact: true}),
        ).toBeVisible();
        await expect(assign).toHaveCount(0);
      }
      await page.goto(routeFor(clients.inactive, forms[0].id));
      await expect(page.getByRole('link', {name: 'Open client details', exact: true})).toBeVisible();
      await expect(assign).toHaveCount(0);
      await send('post', assignPath(clients.existing), {form_template_id: forms[1].id}, token);
      await page.goto(routeFor(clients.existing, forms[0].id));
      await expect(existing).toBeVisible();
      await expect(existing).toBeFocused();
      await expect(assign).toHaveCount(0);

      // Failure keeps the choice. A saved-result read is required before retry.
      await page.goto(routeFor(clients.failed, forms[42].id));
      await page.route(`**${assignPath(clients.failed)}`, (route) => route.fulfill({status: 503, json: {}}));
      await assign.click();
      await expect(page.getByRole('button', {name: 'Check saved intake', exact: true})).toBeVisible();
      await expect(assign).toBeDisabled();
      await expect(page.getByRole('alert')).toContainText('could not be confirmed');
      await page.route(`**${intakePath(clients.failed)}`, (route) => route.fulfill({status: 503, json: {}}));
      await page.getByRole('button', {name: 'Check saved intake', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Retry client intake', exact: true})).toBeVisible();
      await page.unroute(`**${intakePath(clients.failed)}`);
      await page.getByRole('button', {name: 'Retry client intake', exact: true}).click();
      await expect(assign).toBeEnabled();
      await page.unroute(`**${assignPath(clients.failed)}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: `tests/intake-assignment/artifacts/selected-${width}.png`, animations: 'disabled'});
      await assign.click();
      await expect(page).toHaveURL(`http://localhost:22022/clients/${clients.failed.id}`);

      // A successful POST with a lost response is discovered without another POST.
      await page.goto(routeFor(clients.lost, forms[2].id));
      let posts = 0;
      await page.route(`**${assignPath(clients.lost)}`, async (route) => {
        posts++;
        expect((await route.fetch()).status()).toBe(201);
        return route.abort('connectionfailed');
      });
      await assign.click();
      await expect(existing).toBeVisible();
      await expect(existing).toBeFocused();
      expect(posts).toBe(1);
      await page.getByRole('link', {name: 'Open client intake', exact: true}).click();
      await expect(page.getByRole('heading', {name: forms[2].name, exact: true})).toBeVisible();

      // Another coach assigns a different intake while this preview is open.
      await page.goto(routeFor(clients.conflict, forms[0].id));
      await expect(assign).toBeEnabled();
      await send('post', assignPath(clients.conflict), {form_template_id: forms[3].id}, token);
      await assign.click();
      await expect(existing).toBeVisible();
      await expect(existing).toBeFocused();
      await expect(page.getByText(forms[3].name, {exact: true})).toBeVisible();
      expect((await send('get', assignPath(clients.conflict), undefined, token)).data).toHaveLength(1);

      // A completion after logout cannot redirect or refill the former account's cache.
      await page.goto(routeFor(clients.late, forms[0].id));
      let release;
      let held;
      const started = new Promise((resolve) => {
        held = resolve;
      });
      const wait = new Promise((resolve) => {
        release = resolve;
      });
      await page.route(`**${assignPath(clients.late)}`, async (route) => {
        const response = await route.fetch();
        held();
        await wait;
        await route.fulfill({response});
      });
      await assign.click();
      await started;
      await page.evaluate(async () => {
        const {clearSession} = await import('/src/api/session.ts');
        clearSession();
      });
      await expect(page).toHaveURL(/\/login/);
      release();
      await page.unrouteAll({behavior: 'wait'});
      await expect(page).toHaveURL(/\/login/);
      expect(
        await page.evaluate(async () => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient.getQueryCache().getAll().length;
        }),
      ).toBe(0);
      expect(errors).toEqual([]);
      console.log(
        `Intake assignment choices, three pages, preview, recovery, client access, conflicts and session isolation passed at ${width}px.`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await api.dispose();
}
