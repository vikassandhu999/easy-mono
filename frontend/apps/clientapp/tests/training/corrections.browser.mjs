import assert from 'node:assert/strict';
import {chromium, expect} from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 375, height: 812}});
const page = await context.newPage();
const requests = [];
const errors = [];
let lostStart = true;
const starts = new Map();
page.on('pageerror', (e) => errors.push(e.message));
const target = (id) => ({
  id,
  kind: 'working',
  reps: {type: 'exact', value: 5},
  load: null,
  duration_s: null,
  distance: null,
  rpe: null,
  rir: null,
  tempo: null,
  rest_s: 60,
  notes: null,
});
const item = {
  id: 'item',
  exercise_id: 'exercise',
  exercise_name: 'Squat',
  notes: null,
  sets: [target('set-a'), target('set-b')],
};
let session = {
  id: 'session',
  client_id: 'account',
  local_date: '2026-10-06',
  timezone: 'Asia/Kolkata',
  state: 'active',
  revision: 1,
  started_at: '2026-10-06T00:00:00Z',
  ended_at: null,
  notes: null,
  plan_revision_id: 'revision',
  workout_id: 'workout',
  schedule_entry_id: null,
  occurrence_date: null,
  performed_sets: [],
  prescription: {
    id: 'workout',
    name: 'Lower body',
    notes: null,
    blocks: [{id: 'block', format: 'straight', rounds: null, rest_s: null, notes: null, items: [item]}],
  },
};
await context.addInitScript(() =>
  localStorage.setItem(
    'clientapp.auth.v1',
    JSON.stringify({
      id: 'auth',
      accountId: 'account',
      expiresAt: Date.now() + 86400000,
      tokens: {access_token: 'fake', refresh_token: 'fake', scope: 'client', expires_in: 86400, token_type: 'Bearer'},
    }),
  ),
);
await page.route('**/v1/**', async (route) => {
  const url = new URL(route.request().url());
  const path = url.pathname;
  const method = route.request().method();
  const respond = (data, status = 200) =>
    route.fulfill({status, contentType: 'application/json', body: JSON.stringify({data})});
  if (path === '/v1/client/me') {
    return respond({
      id: 'account',
      state: 'active',
      full_name: 'Review',
      preferred_name: null,
      local_date: '2026-10-06',
      unit_system: 'metric',
      timezone: 'Asia/Kolkata',
      terms: [],
    });
  }
  if (path === `/v1/client/training-sessions/${session.id}` && method === 'GET') {
    return respond(session);
  }
  if (path === '/v1/client/training-sessions/active') {
    return respond(session.state === 'active' ? session : null);
  }
  if (path === '/v1/client/training-sessions' && method === 'POST') {
    const body = route.request().postDataJSON();
    requests.push({method: 'START', body});
    if (starts.has(body.request_id)) {
      return respond(starts.get(body.request_id));
    }
    session = {
      ...session,
      id: `started-session-${starts.size + 1}`,
      prescription: null,
      revision: 1,
      state: 'active',
      ended_at: null,
      performed_sets: [],
      request_id: body.request_id,
    };
    starts.set(body.request_id, session);
    if (lostStart) {
      lostStart = false;
      return route.abort('connectionreset');
    }
    return respond(session, 201);
  }
  if (path === `/v1/client/training-sessions/${session.id}/complete`) {
    const body = route.request().postDataJSON();
    session = {
      ...session,
      state: 'completed',
      ended_at: '2026-10-06T01:00:00Z',
      revision: session.revision + 1,
      notes: body.notes || null,
    };
    if (session.request_id) {
      starts.set(session.request_id, session);
    }
    return respond(session);
  }
  if (path.endsWith('/performed-sets') && method === 'POST') {
    const body = route.request().postDataJSON();
    requests.push({method, body});
    const existing = session.performed_sets.find((s) => s.request_id === body.request_id);
    if (existing) {
      return respond(existing, 201);
    }
    if (body.expected_revision !== session.revision) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({error_message: 'Revision conflict'}),
      });
    }
    const row = {
      id: `saved-${requests.length}`,
      position: session.performed_sets.length,
      deleted_at: null,
      item_id: body.item_id ?? null,
      set_id: body.set_id ?? null,
      exercise_id: body.exercise_id ?? null,
      exercise_name: body.exercise_name ?? null,
      request_id: body.request_id,
      kind: body.kind,
      outcome: body.outcome,
      reps: body.reps,
      load_kg: body.load_value,
      entered_load_unit: body.load_unit,
      duration_s: body.duration_s,
      distance_m: body.distance_value === null ? null : body.distance_value * (body.distance_unit === 'km' ? 1000 : 1),
      entered_distance_unit: body.distance_unit,
      rpe: body.rpe,
      rir: body.rir,
      notes: body.notes,
    };
    session = {...session, revision: session.revision + 1, performed_sets: [...session.performed_sets, row]};
    return respond(row, 201);
  }
  if (path.startsWith('/v1/client/training-performed-sets/') && method === 'PATCH') {
    const body = route.request().postDataJSON();
    requests.push({method, body});
    if (body.expected_revision !== session.revision) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({error_message: 'Revision conflict'}),
      });
    }
    const id = path.split('/').at(-1);
    const row = {...session.performed_sets.find((s) => s.id === id), ...body};
    session = {
      ...session,
      revision: session.revision + 1,
      performed_sets: session.performed_sets.map((s) => (s.id === id ? row : s)),
    };
    return respond(row);
  }
  return respond([]);
});
try {
  await page.goto('http://localhost:1315/training/sessions/session');
  await expect(page.getByRole('button', {name: 'Save set', exact: true})).toBeEnabled();
  await page.getByLabel('Reps', {exact: true}).fill('5');
  await page.getByRole('button', {name: 'Save set', exact: true}).click();
  await expect(page.getByText('Set saved.', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: /^Set 2/}).click();
  await page.getByLabel('Reps', {exact: true}).fill('6');
  await page.getByRole('button', {name: 'Save set', exact: true}).click();
  await expect(page.getByText('Set saved.', {exact: true})).toBeVisible();
  assert.equal(session.revision, 3);
  await page.getByRole('button', {name: /^Set 1/}).click();
  await page.getByLabel('Reps', {exact: true}).fill('7');
  await page.getByRole('button', {name: 'Save set changes', exact: true}).click();
  await expect(page.getByText('Set saved.', {exact: true})).toBeVisible();
  assert.equal(requests.at(-1).body.expected_revision, 3);
  assert.equal(session.performed_sets.find((s) => s.set_id === 'set-a').reps, 7);
  console.log('FIX VERIFIED correction sends revision 3:', JSON.stringify(requests.at(-1)));
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.includes('.draft.training.')) {
        localStorage.removeItem(key);
      }
    }
  });
  await page.reload();
  await expect(page.getByRole('button', {name: 'Save set changes', exact: true})).toBeDisabled();
  await page.getByLabel('Reps', {exact: true}).fill('9');
  await page.getByRole('button', {name: 'Save set changes', exact: true}).click();
  await expect(page.getByText('Set saved.', {exact: true})).toBeVisible();
  assert.equal(session.performed_sets.filter((s) => s.set_id === 'set-a').length, 1);
  assert.equal(requests.at(-1).method, 'PATCH');
  console.log(
    'FIX VERIFIED prescribed reopen edits the saved row:',
    session.performed_sets.filter((s) => s.set_id === 'set-a').length,
  );
  const conversion = await page.evaluate(async () => {
    const {setValues, setMeasurements} = await import('/src/training/recording.ts');
    const set = {
      exercise_name: 'Walk',
      reps: null,
      load_kg: null,
      entered_load_unit: null,
      duration_s: null,
      distance_m: '1.00',
      entered_distance_unit: 'km',
      kind: 'working',
      outcome: 'done',
      rpe: null,
      rir: null,
      notes: null,
    };
    return {
      original: set.distance_m,
      values: setValues(set, undefined, 'kg'),
      body: setMeasurements({...setValues(set, undefined, 'kg'), notes: 'Corrected note'}),
    };
  });
  assert.equal(conversion.body.distance_value, 0.001);
  console.log('FIX VERIFIED note-only correction retains distance:', JSON.stringify(conversion));
  await page.getByRole('button', {name: 'Finish workout', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Finish and save workout', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Correct this workout', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Unsent entries on this device', exact: true})).toHaveCount(0);
  console.log('FIX VERIFIED saved prescribed set is not marked unsent');
  await page.goto('http://localhost:1315/training');
  await page.getByRole('button', {name: 'Start freestyle workout', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Finish workout', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Finish workout', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Finish and save workout', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Correct this workout', exact: true})).toBeVisible();
  await page.goto('http://localhost:1315/training');
  await page.getByRole('button', {name: 'Start freestyle workout', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Finish workout', exact: true})).toBeVisible();
  const startRequests = requests.filter((r) => r.method === 'START');
  assert.equal(startRequests.length, 2);
  assert.notEqual(startRequests[0].body.request_id, startRequests[1].body.request_id);
  assert.equal(session.state, 'active');
  console.log('FIX VERIFIED recovered start identity cleared for next workout:', JSON.stringify(startRequests));
  console.log('Browser errors:', JSON.stringify(errors));
} finally {
  await browser.close();
}
