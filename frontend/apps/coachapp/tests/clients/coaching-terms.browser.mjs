import {mkdir, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const fixtures = JSON.parse(
  await readFile(
    process.env.COACHING_FIXTURES || resolve('../../../.scratch/coaching-terms/browser-fixtures.json'),
    'utf8',
  ),
);
const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
const artifacts = 'tests/clients/artifacts/coaching-terms';
await mkdir(artifacts, {recursive: true});
const errors = [];
async function call(method, path, body, token) {
  const response = await api.fetch(path, {
    method,
    ...(body ? {data: body} : {}),
    headers: token ? {authorization: `Bearer ${token}`} : {},
  });
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
function dateAfter(date, days) {
  return new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
}
async function fitAndCapture(page, name, width) {
  await expect(page.getByRole('status').filter({hasText: /^Loading /})).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `${artifacts}/${name}-${width}.png`, fullPage: true});
}
try {
  for (const width of [375, 1280]) {
    const fixture = fixtures[String(width)];
    const {clients, coach_email} = fixture;
    const unique = `${Date.now()}-${width}`;
    await call('POST', '/v1/auth/otp', {email: coach_email, type: 'authentication'});
    const tokens = await call('POST', '/v1/auth/token', {
      email: coach_email,
      otp: '123456',
      grant_type: 'otp',
      role: 'coach',
    });
    const get = (path) => call('GET', path, null, tokens.access_token);
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (value) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(value);
    }, tokens);
    await page.goto('/clients');
    await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    await expect(page.getByText('2 of 3 seats used · Invitations are free', {exact: true})).toBeVisible();
    const roster = await get('/v1/coach/clients');
    const labels = {
      active: 'Active',
      ending_soon: 'Ending soon',
      joined: 'Joined',
      invited: 'Invited',
      ended: 'Ended',
    };
    for (const [state, label] of Object.entries(labels)) {
      const response = page.waitForResponse(
        (response) =>
          response.url().includes('/v1/coach/clients?') &&
          new URL(response.url()).searchParams.get('state') === state &&
          response.ok(),
      );
      await chooseOption(selectTrigger(page, 'Coaching'), `${label} (${roster.summary[state]})`);
      const filtered = await (await response).json();
      expect(filtered.data.every((person) => person.state === state)).toBe(true);
    }
    await chooseOption(selectTrigger(page, 'Coaching'), 'All clients');
    const active = (await get(`/v1/coach/clients/${clients.active.id}`)).data;
    const searched = page.waitForResponse(
      (response) =>
        response.url().includes('/v1/coach/clients?') &&
        new URL(response.url()).searchParams.get('q') === active.full_name &&
        response.ok(),
    );
    await page.getByLabel('Search clients', {exact: true}).fill(active.full_name);
    expect((await (await searched).json()).count).toBe(1);
    await expect(page.getByRole('link', {name: new RegExp(active.preferred_name || active.full_name)})).toBeVisible();
    await fitAndCapture(page, 'roster', width);
    await page.goto(`/clients/${active.id}/profile`);
    await expect(page.getByLabel('Full name', {exact: true})).toHaveValue(active.full_name);
    await page.getByLabel('Preferred name', {exact: true}).fill('Coach calls me Alex');
    await page.getByLabel('Phone', {exact: true}).fill('+1 555 0100');
    await page.getByLabel('Coaching notes', {exact: true}).fill('Coaching term browser verification');
    await chooseOption(selectTrigger(page, 'Unit system'), 'Imperial (lb)');
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Client details saved.', {exact: true})).toBeVisible();
    const saved = (await get(`/v1/coach/clients/${active.id}`)).data;
    expect(saved.preferred_name).toBe('Coach calls me Alex');
    expect(saved.unit_system).toBe('imperial');
    expect(saved.phone).toBe('+1 555 0100');
    await page.reload();
    await expect(page.getByLabel('Preferred name', {exact: true})).toHaveValue('Coach calls me Alex');
    await expect(page.getByText('Services', {exact: true})).toHaveCount(0);
    await expect(page.getByText('Coaching stage', {exact: true})).toHaveCount(0);
    await fitAndCapture(page, 'profile', width);
    await page.getByRole('link', {name: 'Back to client', exact: true}).first().click();
    await expect(page.getByRole('heading', {name: 'Coach calls me Alex', exact: true})).toBeVisible();
    const future = dateAfter(saved.local_date, 30);
    await page.getByLabel('Coaching ends', {exact: true}).fill(future);
    await page.getByRole('button', {name: 'Save end date', exact: true}).click();
    await expect(page.getByText('Coaching end date saved.', {exact: true})).toBeVisible();
    expect((await get(`/v1/coach/clients/${active.id}`)).data.current_term.ends_on).toBe(future);
    const movedEnd = dateAfter(saved.local_date, 7);
    await page.getByLabel('Coaching ends', {exact: true}).fill(movedEnd);
    await page.getByRole('button', {name: 'Save end date', exact: true}).click();
    await expect(page.getByText('Ends in 7 days', {exact: true})).toBeVisible();
    expect((await get(`/v1/coach/clients/${active.id}`)).data.current_term.ends_on).toBe(movedEnd);
    await page.getByRole('button', {name: 'Clear end date', exact: true}).click();
    await expect(page.getByLabel('Coaching ends', {exact: true})).toHaveValue('');
    await page.getByRole('button', {name: 'End coaching', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'End coaching', exact: true}).click();
    await expect(page.getByText('Ends today', {exact: true})).toBeVisible();
    const endingToday = (await get(`/v1/coach/clients/${active.id}`)).data;
    expect(endingToday.state).toBe('ending_soon');
    expect(endingToday.current_term.ends_on).toBe(endingToday.local_date);
    expect((await get('/v1/businesses/me')).data.seats.used).toBe(2);
    await expect(page.getByRole('button', {name: 'Start coaching', exact: true})).toHaveCount(0);
    await fitAndCapture(page, 'ends-today', width);
    await page.getByRole('button', {name: 'Clear end date', exact: true}).click();
    await expect(page.getByLabel('Coaching ends', {exact: true})).toHaveValue('');

    await page.goto(`/clients/${clients.joined.id}`);
    await expect(page.getByRole('button', {name: 'Start coaching', exact: true})).toBeEnabled();
    await fitAndCapture(page, 'joined', width);
    const ended = (await get(`/v1/coach/clients/${clients.ended.id}`)).data;
    await page.goto(`/clients/${ended.id}`);
    await expect(page.getByText('Term history', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Start coaching', exact: true})).toBeEnabled();
    await fitAndCapture(page, 'ended', width);
    await page.getByRole('button', {name: 'Start coaching', exact: true}).click();
    await expect(page.getByLabel('Coaching ends', {exact: true})).toBeVisible();
    const restarted = (await get(`/v1/coach/clients/${ended.id}`)).data;
    expect(restarted.terms.length).toBe(ended.terms.length + 1);
    expect(restarted.current_term.id).not.toBe(ended.terms[0].id);
    expect((await get('/v1/businesses/me')).data.seats).toEqual({limit: 3, used: 3});
    await fitAndCapture(page, 'restarted', width);
    await page.goto(`/clients/${clients.joined.id}`);
    await expect(page.getByText('No free seat', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Start coaching', exact: true})).toBeDisabled();

    await page.goto('/clients/invite');
    const inviteEmail = `terms-client-${unique}@example.test`;
    await page.getByLabel('Full name', {exact: true}).fill('New Client Full Name');
    await page.getByLabel('Preferred name', {exact: true}).fill('New Client');
    await page.getByLabel('Email', {exact: true}).fill(inviteEmail);
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'New Client', exact: true})).toBeVisible();
    const clientId = new URL(page.url()).pathname.split('/').at(-1);
    const original = await page.getByLabel('Invitation link', {exact: true}).inputValue();
    await page.getByRole('button', {name: 'Resend invitation', exact: true}).click();
    await expect(page.getByLabel('Invitation link', {exact: true})).not.toHaveValue(original);
    const inviteURL = await page.getByLabel('Invitation link', {exact: true}).inputValue();
    const token = new URL(inviteURL).pathname.split('/').at(-1);
    await fitAndCapture(page, 'invited-full-capacity', width);
    const clientContext = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width: 375, height: 812},
    });
    const clientPage = await clientContext.newPage();
    clientPage.on('pageerror', (error) => errors.push(error.message));
    await clientPage.goto(`/invite/${token}`);
    await expect(clientPage.getByLabel('Email', {exact: true})).toHaveValue(inviteEmail);
    await clientPage.getByRole('button', {name: 'Continue with email', exact: true}).click();
    await clientPage.getByLabel('Verification code', {exact: true}).fill('123456');
    const accepted = clientPage.waitForResponse(
      (response) => new URL(response.url()).pathname === `/v1/auth/invites/${token}/accept`,
    );
    await clientPage.getByRole('button', {name: 'Verify and continue', exact: true}).click();
    const acceptedResponse = await accepted;
    expect(acceptedResponse.status()).toBe(200);
    expect(acceptedResponse.request().postDataJSON()).toEqual({email: inviteEmail, otp: '123456'});
    await expect(clientPage.getByRole('heading', {name: 'Coaching starts soon', exact: true})).toBeVisible();
    await clientPage.reload();
    await expect(clientPage.getByRole('heading', {name: 'Coaching starts soon', exact: true})).toBeVisible();
    await fitAndCapture(clientPage, `full-seat-acceptance-from-${width}`, 375);
    await clientContext.close();
    await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
    await expect(page.getByText('No free seat', {exact: true})).toBeVisible();
    expect((await get(`/v1/coach/clients/${clientId}`)).data.state).toBe('joined');

    await page.goto('/team/invite');
    const teamEmail = `terms-coach-${unique}@example.test`;
    await page.getByLabel('Email', {exact: true}).fill(teamEmail);
    await page.getByLabel('Full name', {exact: true}).fill('Taylor Coach Full Name');
    await page.getByLabel('Preferred name', {exact: true}).fill('Taylor');
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Taylor', exact: true})).toBeVisible();
    const coachId = new URL(page.url()).pathname.split('/').at(-1);
    await page.getByRole('button', {name: 'Resend invitation', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Resend invitation', exact: true}).click();
    await expect(page.getByText('Invitation resent.', {exact: true})).toBeVisible();
    const coachURL = await page.getByLabel('Invitation link', {exact: true}).inputValue();
    const coachToken = new URL(coachURL).searchParams.get('token');
    expect(coachToken).toBeTruthy();
    await fitAndCapture(page, 'team-invited', width);
    const teamContext = await browser.newContext({baseURL, viewport: {width, height: 900}});
    const teamPage = await teamContext.newPage();
    teamPage.on('pageerror', (error) => errors.push(error.message));
    const coachInvitation = new URL(coachURL);
    await teamPage.goto(`${coachInvitation.pathname}${coachInvitation.search}`);
    await expect(teamPage.getByLabel('Email', {exact: true})).toHaveValue(teamEmail);
    await teamPage.getByRole('button', {name: 'Continue with email', exact: true}).click();
    await teamPage.getByLabel('Verification code', {exact: true}).fill('123456');
    await teamPage.getByRole('button', {name: 'Verify and continue', exact: true}).click();
    await expect(teamPage.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    await fitAndCapture(teamPage, 'team-accepted', width);
    await teamContext.close();
    await page.reload();
    await expect(page.getByRole('button', {name: 'Remove coach', exact: true})).toBeVisible();
    await page.goto(`/clients/${clients.joined.id}/coach`);
    await page.getByRole('button', {name: 'Choose Taylor', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Assign coach', exact: true}).click();
    await expect(page.getByText('Coach assignment saved.', {exact: true})).toBeVisible();
    expect((await get(`/v1/coach/clients/${clients.joined.id}`)).data.coach_id).toBe(coachId);
    await page.goto(`/team/${coachId}`);
    await page.getByRole('button', {name: 'Remove coach', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Remove coach', exact: true}).click();
    await expect(page.getByText('Coach removed. Their clients are assigned to you.', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: /Reactivate/})).toHaveCount(0);
    expect((await get(`/v1/coach/clients/${clients.joined.id}`)).data.coach_id).toBe(active.coach_id);
    await fitAndCapture(page, 'team-removed', width);
    await page.getByRole('link', {name: 'Invite again', exact: true}).click();
    await page.getByLabel('Email', {exact: true}).fill(teamEmail);
    await page.getByLabel('Full name', {exact: true}).fill('Taylor Coach Full Name');
    await page.getByLabel('Preferred name', {exact: true}).fill('Taylor');
    await page.getByRole('button', {name: 'Send invitation', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Taylor', exact: true})).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/team/${coachId}`);
    const reinvited = (await get(`/v1/coach/coaches/${coachId}`)).data;
    expect(reinvited.state).toBe('invited');
    expect(reinvited.removed_on).not.toBeNull();
    const reinviteURL = await page.getByLabel('Invitation link', {exact: true}).inputValue();
    expect(new URL(reinviteURL).searchParams.get('token')).not.toBe(coachToken);
    await fitAndCapture(page, 'team-reinvited', width);
    const returningContext = await browser.newContext({baseURL, viewport: {width, height: 900}});
    const returningPage = await returningContext.newPage();
    returningPage.on('pageerror', (error) => errors.push(error.message));
    const returningInvitation = new URL(reinviteURL);
    await returningPage.goto(`${returningInvitation.pathname}${returningInvitation.search}`);
    await expect(returningPage.getByLabel('Email', {exact: true})).toHaveValue(teamEmail);
    await returningPage.getByRole('button', {name: 'Continue with email', exact: true}).click();
    await returningPage.getByLabel('Verification code', {exact: true}).fill('123456');
    await returningPage.getByRole('button', {name: 'Verify and continue', exact: true}).click();
    await expect(returningPage.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    await returningContext.close();
    const returnedCoach = (await get(`/v1/coach/coaches/${coachId}`)).data;
    expect(returnedCoach.id).toBe(coachId);
    expect(returnedCoach.state).toBe('active');
    expect(returnedCoach.removed_on).toBeNull();
    expect(returnedCoach.invite_url).toBeNull();
    await page.reload();
    await expect(page.getByRole('button', {name: 'Remove coach', exact: true})).toBeVisible();
    await fitAndCapture(page, 'team-returned', width);

    await page.goto('/settings/business');
    await expect(page.getByText('3 of 3 seats used', {exact: true})).toBeVisible();
    const handle = `terms-verified-${unique}`;
    await page.getByLabel('Business handle', {exact: true}).fill('invalid_handle');
    await expect(
      page.getByText('Use 3–40 lowercase letters or numbers, separated by single hyphens.', {exact: true}),
    ).toBeVisible();
    await page.getByLabel('Business handle', {exact: true}).fill('admin');
    await expect(page.getByText('This handle is unavailable', {exact: true})).toBeVisible();
    await page.getByLabel('Business handle', {exact: true}).fill(handle);
    await expect(page.getByText('Handle available', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Business settings are saved.', {exact: true})).toBeVisible();
    expect((await get('/v1/businesses/me')).data.handle).toBe(handle);
    await page.reload();
    await expect(page.getByLabel('Business handle', {exact: true})).toHaveValue(handle);
    await expect(selectTrigger(page, 'Default time zone')).toBeEnabled();
    await expect(page.getByText('Loading time zones…', {exact: true})).toHaveCount(0);
    await fitAndCapture(page, 'business', width);
    console.log(`Real API coaching terms, profile, invitations, team and business: ${width}px passed.`);
    await context.close();
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
