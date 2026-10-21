import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: process.env.API_URL ?? 'http://localhost:4000'});
const browser = await chromium.launch();
const artifacts = 'tests/workout-builder/artifacts';
await mkdir(artifacts, {recursive: true});
const errors = [];
const results = [];
let activePage;

async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}

async function journey(width) {
  const unique = `${Date.now()}-${width}`;
  const email = `editor-fixes-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Editor checks', handle: `editor-fixes-${unique}`},
    guest.access_token,
  );
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  const token = tokens.access_token;
  const exercise = (name, metrics) =>
    send('post', '/v1/coach/exercises', {name, kind: 'movement', metrics: metrics.map((key) => ({key}))}, token).then(
      (result) => result.data,
    );
  const bench = await exercise('Editor bench', ['reps', 'weight']);
  const game = await exercise('Editor game', ['result', 'score']);
  const longName = `Long ${'x'.repeat(185)}`;
  await exercise(longName, ['reps']);
  const workout = (
    await send(
      'post',
      '/v1/coach/workouts',
      {
        name: 'Editor verification',
        type: 'prescribed',
        groups: [
          {
            name: 'Main lift',
            rounds: 3,
            exercises: [
              {
                exercise_id: bench.id,
                targets_mode: 'per_round',
                targets: [6, 7, 9].map((value) => ({reps: {mode: 'exact', value}, rest: {mode: 'none'}})),
              },
              {
                exercise_id: game.id,
                targets: [{result: {mode: 'exact', value: 'win'}, rest: {mode: 'exact', value_s: 90}}],
              },
            ],
          },
        ],
      },
      token,
    )
  ).data;
  const context = await browser.newContext({
    baseURL: process.env.COACH_URL ?? 'http://localhost:2022',
    viewport: {width, height: 900},
    locale: 'en-US',
  });
  const page = await context.newPage();
  activePage = page;
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  page.on('dialog', (dialog) => dialog.accept());
  const button = (name, scope = page) => scope.getByRole('button', {name, exact: true});
  const saved = () => expect(page.getByText('All changes saved', {exact: true})).toBeVisible();
  const current = () => send('get', `/v1/coach/workouts/${workout.id}`, undefined, token).then((result) => result.data);
  const editor = () => page.locator('[id^="target-editor-"][role="group"]');
  const targetTable = () => page.getByRole('table', {name: 'Targets for Editor bench by round', exact: true});
  const shot = async (name, fullPage = true) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
    await page.screenshot({path: `${artifacts}/${name}-${width}.png`, fullPage});
  };
  await page.goto('/login');
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
  await page.goto(`/workouts/${workout.id}`);
  await saved();
  await expect(page.getByRole('heading', {level: 1, name: 'Edit workout', exact: true})).toBeAttached();
  await expect(page).toHaveTitle('Editor verification · Workout editor · CoachEasy');

  // A round reduction can be undone without overwriting later instructions.
  await button('Fewer rounds').click();
  await page
    .getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})
    .fill('Keep these instructions.');
  await button('Undo').click();
  await saved();
  expect((await current()).groups[0].exercises[0].targets.map((row) => row.reps.value)).toEqual([6, 7, 9]);
  expect((await current()).description).toBe('Keep these instructions.');

  // Collapsing different values requires a decision and offers Undo.
  await targetTable().getByRole('button', {name: 'Editor bench round 1 Reps: 6', exact: true}).click();
  await button('Same for all 3 rounds', editor()).click();
  const confirm = page.getByRole('dialog', {name: 'Use the first round for every round?', exact: true});
  await button('Keep per-round targets', confirm).click();
  expect((await current()).groups[0].exercises[0].targets).toHaveLength(3);
  await button('Same for all 3 rounds', editor()).click();
  await button('Use first round', confirm).click();
  await saved();
  await button('Done', editor()).click();
  await expect(button('Reps 6')).toBeFocused();
  await button('Undo').click();
  await saved();
  await expect(targetTable()).toBeVisible();

  // Invalid values are local field errors rather than failed-save retries.
  await targetTable().getByRole('button', {name: 'Editor bench round 1 Reps: 6', exact: true}).click();
  await button('Range', editor()).click();
  await editor().getByLabel(/^From/).fill('10');
  await editor().getByLabel(/^To/).fill('5');
  await button('Done', editor()).click();
  await expect(editor().getByLabel(/^To/)).toBeFocused();
  await expect(editor().getByLabel(/^To/)).toHaveAttribute('aria-invalid', 'true');
  await expect(editor().getByRole('alert')).toContainText('Enter a valid Reps range');
  await expect(button('Retry')).toHaveCount(0);
  await editor().getByLabel(/^From/).fill('5');
  await editor().getByLabel(/^To/).fill('10');
  await button('Done', editor()).click();
  await saved();
  await expect(targetTable().getByRole('button', {name: 'Editor bench round 1 Reps: 5–10', exact: true})).toBeFocused();

  // Splitting preserves targets; all three result values still save and load.
  await button('Reorder').click();
  await page.getByRole('combobox', {name: 'Letter for Editor game', exact: true}).selectOption('new');
  await button('Done reordering').click();
  await saved();
  expect((await current()).groups).toHaveLength(2);
  for (const outcome of ['draw', 'loss', 'win']) {
    await page.getByRole('button', {name: /^Result /}).click();
    await editor().getByRole('combobox').selectOption(outcome);
    await button('Done', editor()).click();
    await saved();
    expect((await current()).groups[1].exercises[0].targets[0].result).toEqual({mode: 'exact', value: outcome});
  }

  // Content conversion is explicit, recoverable, and leaves unrelated edits intact.
  await button('Open session').click();
  const conversion = page.getByRole('dialog', {name: 'Switch to open session?', exact: true});
  await button('Keep current type', conversion).click();
  expect((await current()).type).toBe('prescribed');
  await button('Open session').click();
  await button('Switch workout type', conversion).click();
  await saved();
  expect((await current()).groups).toHaveLength(0);
  await page
    .getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})
    .fill('Later conversion instructions.');
  await button('Undo').click();
  await saved();
  expect((await current()).groups).toHaveLength(2);
  expect((await current()).description).toBe('Later conversion instructions.');

  await button('Video').click();
  await button('Switch workout type', page.getByRole('dialog')).click();
  await page.getByLabel('Video URL', {exact: true}).fill('https://example.test/new-video');
  await saved();
  await button('Undo').click();
  await expect(page.getByRole('dialog')).toContainText('The previous workout content will be restored.');
  await button('Keep current type', page.getByRole('dialog')).click();
  await expect(page.getByLabel('Video URL', {exact: true})).toHaveValue('https://example.test/new-video');
  await button('Undo').click();
  await button('Switch workout type', page.getByRole('dialog')).click();
  await saved();
  expect((await current()).groups).toHaveLength(2);

  // The last keystroke is sent even when the coach immediately leaves.
  await page
    .getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})
    .fill('Saved while leaving.');
  await page.getByRole('link', {name: 'Workout library', exact: true}).click();
  await expect.poll(async () => (await current()).description).toBe('Saved while leaving.');
  await page.goto(`/workouts/${workout.id}`);
  await saved();

  // Search stays in view while results scroll, and the picker returns focus.
  await button('Add exercise').click();
  const picker = page.getByRole('dialog');
  const resultsRegion = picker.getByRole('region', {name: 'Exercise results', exact: true});
  await expect(resultsRegion.getByRole('list')).toBeVisible();
  await resultsRegion.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect(picker.getByLabel('Search exercises', {exact: true})).toBeInViewport();
  await picker.getByLabel('Search exercises', {exact: true}).fill(longName);
  await picker.getByRole('button').filter({hasText: longName}).click();
  await saved();
  await shot('long-name');
  await button(`Remove ${longName}`).click();
  await expect(button('Undo')).toBeInViewport();
  await button('Undo').focus();
  await page.clock.install();
  await page.clock.fastForward(9000);
  await expect(button('Undo')).toBeVisible();
  await button('Undo').click();
  await saved();
  await expect(button(`Remove ${longName}`)).toBeVisible();
  await shot('restored-long-name');
  await button('Reorder').click();
  await shot('long-name-reorder');
  await button('Done reordering').click();

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await shot('enlarged-text', false);
  if (width === 375) {
    expect((await page.locator('output').first().boundingBox()).width).toBeGreaterThan(150);
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.goto('/workouts/new');
  await button('Create workout').click();
  await expect(page.getByRole('alert')).toHaveText('Enter a workout name.');
  await page.getByLabel('Workout name', {exact: true}).fill('Corrected name');
  await expect(page.getByRole('alert')).toHaveCount(0);

  const roundsWorkout = (
    await send(
      'post',
      '/v1/coach/workouts',
      {
        name: 'Round limits',
        groups: [{rounds: 100, exercises: [{exercise_id: bench.id, targets: [{rest: {mode: 'none'}}]}]}],
      },
      token,
    )
  ).data;
  await page.goto(`/workouts/${roundsWorkout.id}`);
  await saved();
  await expect(button('More rounds')).toBeDisabled();
  await send(
    'patch',
    `/v1/coach/workouts/${roundsWorkout.id}`,
    {groups: [{rounds: 1, exercises: [{exercise_id: bench.id, targets: [{rest: {mode: 'none'}}]}]}]},
    token,
  );
  await page.reload();
  await saved();
  await expect(button('Fewer rounds')).toBeDisabled();
  await button('Reps Any').click();
  await expect(editor().getByRole('heading')).toHaveText('Reps — Editor bench · 1 round');
  await button('Done', editor()).click();
  await button('Remove A').click();
  await button('Undo').click();
  await saved();
  await expect(button('Reorder')).toBeFocused();

  // Use a separate empty workout for media; only the upload service is simulated.
  const video = (await send('post', '/v1/coach/workouts', {name: 'Upload verification', groups: []}, token)).data;
  await page.goto(`/workouts/${video.id}`);
  await button('Video').click();
  await expect(page.getByLabel('Video URL', {exact: true})).toHaveAttribute('aria-invalid', 'true');
  await page
    .getByLabel('Choose workout video', {exact: true})
    .setInputFiles({name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('text')});
  await expect(page.getByText('Choose an MP4 or WebM video.', {exact: true})).toBeVisible();
  await page
    .getByLabel('Choose workout video', {exact: true})
    .setInputFiles({name: 'empty.webm', mimeType: 'video/webm', buffer: Buffer.alloc(0)});
  await expect(page.getByText('Choose a file between 1 byte and 50 MB.', {exact: true})).toBeVisible();
  const uploadPath = '**/v1/coach/library-media/uploads';
  const putPath = '**/editor-upload';
  await page.route(uploadPath, (route) =>
    route.fulfill({
      status: 201,
      json: {
        data: {
          id: crypto.randomUUID(),
          kind: 'video',
          url: 'https://example.test/editor.webm',
          content_type: 'video/webm',
          byte_size: 4,
          upload_url: 'http://localhost:2022/editor-upload',
          upload_headers: {},
        },
      },
    }),
  );
  await page.route(putPath, () => {
    // Keep the transfer pending until the user cancels it.
  });
  await page
    .getByLabel('Choose workout video', {exact: true})
    .setInputFiles({name: 'audit.webm', mimeType: 'video/webm', buffer: Buffer.from('test')});
  await expect(button('Uploading…')).toBeDisabled();
  await expect(page.getByRole('progressbar', {name: 'Video upload progress', exact: true})).toBeVisible();
  await expect(page.getByText('All changes saved', {exact: true})).toHaveCount(0);
  await button('Cancel upload').click();
  await expect(button('Upload a video')).toBeEnabled();
  await page.unroute(putPath);
  await context.setOffline(true);
  await page
    .getByLabel('Choose workout video', {exact: true})
    .setInputFiles({name: 'offline.webm', mimeType: 'video/webm', buffer: Buffer.from('test')});
  await expect(button('Upload a video')).toBeEnabled();
  await expect(page.getByRole('progressbar', {name: 'Video upload progress', exact: true})).toHaveCount(0);
  await context.setOffline(false);
  await page.getByLabel('Video URL', {exact: true}).fill('https://example.test/current-video');
  await saved();
  let releaseUpload;
  const heldUpload = new Promise((resolve) => {
    releaseUpload = resolve;
  });
  await page.route(putPath, async (route) => {
    await heldUpload;
    await route.fulfill({status: 200, body: ''});
  });
  await page
    .getByLabel('Choose workout video', {exact: true})
    .setInputFiles({name: 'audit.webm', mimeType: 'video/webm', buffer: Buffer.from('test')});
  await expect(button('Uploading…')).toBeDisabled();
  await page.getByLabel('Workout name', {exact: true}).fill('Changed during upload');
  await page
    .getByRole('textbox', {name: 'Instructions for the client (optional)', exact: true})
    .fill('Keep this edit during upload.');
  await expect
    .poll(async () => (await send('get', `/v1/coach/workouts/${video.id}`, undefined, token)).data.description)
    .toBe('Keep this edit during upload.');
  releaseUpload();
  await expect(page.getByLabel('Video URL', {exact: true})).toHaveValue('https://example.test/editor.webm');
  await saved();
  const uploaded = (await send('get', `/v1/coach/workouts/${video.id}`, undefined, token)).data;
  expect(uploaded.name).toBe('Changed during upload');
  expect(uploaded.description).toBe('Keep this edit during upload.');
  await shot('uploaded-video');

  await button('Exercises').click();
  await button('Switch workout type', page.getByRole('dialog')).click();
  await saved();
  await button('Add exercise').click();
  await page.getByRole('dialog').getByLabel('Search exercises', {exact: true}).fill('Editor bench');
  await page.getByRole('dialog').getByRole('button').filter({hasText: 'Editor bench'}).click();
  await saved();
  await button('Reps Any').click();
  await button('Exact', editor()).click();
  await expect(editor().getByLabel(/^Value/)).toHaveValue('');
  await button('Undo').click();
  await button('Switch workout type', page.getByRole('dialog')).click();
  await saved();
  const restoredVideo = (await send('get', `/v1/coach/workouts/${video.id}`, undefined, token)).data;
  expect(restoredVideo.type).toBe('video');
  expect(restoredVideo.groups).toEqual([]);
  expect(restoredVideo.video.url).toBe('https://example.test/editor.webm');
  results.push({
    width,
    passed: true,
    conversionUndo: true,
    roundUndo: true,
    split: true,
    validation: true,
    resultTargets: true,
    leaveSave: true,
    focus: true,
    longNames: true,
    enlargedText: true,
    uploadCancellation: true,
  });
  await context.close();
}

try {
  for (const width of [375, 1280]) {
    await journey(width);
  }
  expect(errors).toEqual([]);
  await writeFile(`${artifacts}/results.json`, `${JSON.stringify({results, errors}, null, 2)}\n`);
  console.log(
    'Workout editor recovery, validation, Result targets, reordering, keyboard, reflow and upload states passed at 375px and 1280px.',
  );
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await writeFile(`${artifacts}/failure.txt`, await activePage.locator('body').ariaSnapshot());
    await activePage.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
  }
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
