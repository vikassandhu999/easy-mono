import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/foods/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `food-media-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Everyday Coaching', handle: `fmedia-${unique}`},
    guest.access_token,
  );
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
async function mediaFiles(page) {
  const files = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const drawing = canvas.getContext('2d');
    drawing.fillStyle = '#e3eee8';
    drawing.fillRect(0, 0, 640, 360);
    drawing.fillStyle = '#203c2b';
    drawing.font = '32px sans-serif';
    drawing.fillText('Oat porridge', 90, 170);
    drawing.font = '20px sans-serif';
    drawing.fillText('Browser test fixture', 220, 215);
    const png = canvas.toDataURL('image/png').split(',')[1];
    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, {mimeType: 'video/webm'});
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const done = new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    recorder.start();
    const timer = setInterval(() => drawing.fillRect(20, 20, 20, 20), 60);
    await new Promise((resolve) => setTimeout(resolve, 700));
    recorder.stop();
    await done;
    clearInterval(timer);
    for (const track of stream.getTracks()) {
      track.stop();
    }
    return {png, video: [...new Uint8Array(await new Blob(chunks, {type: 'video/webm'}).arrayBuffer())]};
  });
  return {
    photo: {name: 'porridge.png', mimeType: 'image/png', buffer: Buffer.from(files.png, 'base64')},
    video: {name: 'porridge.webm', mimeType: 'video/webm', buffer: Buffer.from(files.video)},
  };
}
async function loadedImage(locator) {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const source = (
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {
          name: 'Oat porridge media',
          calories_per_100g: 120,
          notes: 'Stir before serving.',
          serving_sizes: [{label: 'bowl', amount: 1, unit: 'bowl', weight_g: 200, is_default: true}],
        },
        token,
      )
    ).data;
    const endpoint = `/v1/coach/nutrition-foods/${source.id}`;
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (value) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(value);
    }, tokens);
    const files = await mediaFiles(page);
    await page.goto(`/nutrition-foods/${source.id}`);
    const input = page.getByLabel('Choose photo or video', {exact: true});
    const save = page.getByRole('button', {name: 'Save food', exact: true});
    const media = page.getByRole('region', {name: 'Food media', exact: true});
    const dialog = page.getByRole('dialog');
    await input.setInputFiles({name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>')});
    await expect(media.getByRole('alert')).toContainText('Choose a JPG');
    await input.setInputFiles({name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(16 * 1024 * 1024)});
    await expect(media.getByRole('alert')).toContainText('15 MB');
    await input.setInputFiles(files.photo);
    await expect(media.getByText('Upload finished.', {exact: true})).toBeVisible();
    await loadedImage(media.getByRole('img', {name: 'Food photo or video', exact: true}));
    expect((await send('get', endpoint, undefined, token)).data.media).toBeNull();
    await page.getByRole('link', {name: 'Back to foods', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await save.click();
    await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
    const photo = (await send('get', endpoint, undefined, token)).data.media;
    expect((await api.get(photo.url)).status()).toBe(200);
    expect(await (await api.get(photo.url)).body()).toEqual(files.photo.buffer);
    await page.reload();
    await loadedImage(media.getByRole('img', {name: 'Food photo or video', exact: true}));
    await page.route('**/easy-dev-public/**', (route) =>
      route.request().method() === 'PUT' ? route.fulfill({status: 503, body: ''}) : route.continue(),
    );
    await input.setInputFiles(files.video);
    await expect(media.getByRole('alert')).toContainText('photo or video is unchanged');
    await expect(media.getByRole('img')).toHaveAttribute('src', photo.url);
    await expect(save).toBeDisabled();
    await page.unroute('**/easy-dev-public/**');
    await media.getByRole('button', {name: 'Retry upload', exact: true}).click();
    await expect.poll(() => media.locator('video').evaluate((element) => element.readyState)).toBeGreaterThan(0);
    await media.locator('video').evaluate(async (element) => {
      await element.play();
      element.pause();
    });
    await page.route(`**${endpoint}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect((await send('get', endpoint, undefined, token)).data.media.id).toBe(photo.id);
    await expect(media.locator('video')).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await save.click();
    await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
    const video = (await send('get', endpoint, undefined, token)).data.media;
    expect(await (await api.get(video.url)).body()).toEqual(files.video.buffer);
    await media.scrollIntoViewIfNeeded();
    await page.screenshot({path: `tests/foods/artifacts/media-${width}.png`});
    // Metadata-only saves leave the existing attachment identity untouched.
    await page.getByText('Brand, allergens and other details', {exact: true}).click();
    await page.getByLabel('Notes', {exact: true}).fill('Let it cool before serving.');
    await save.click();
    await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
    expect((await send('get', endpoint, undefined, token)).data.media.id).toBe(video.id);
    // Both selection flows disclose media on demand, keeping closed rows light.
    await page.goto('/nutrition-recipes/new');
    await page.getByRole('button', {name: 'Add ingredients', exact: true}).click();
    await page.getByLabel('Search foods', {exact: true}).fill(source.name);
    await expect(dialog.getByText('1 food', {exact: true})).toBeVisible();
    await expect(dialog.getByText('View video', {exact: true})).toBeVisible();
    await expect(dialog.locator('video')).toHaveCount(0);
    await dialog.getByText('View video', {exact: true}).click();
    await expect.poll(() => dialog.locator('video').evaluate((element) => element.readyState)).toBeGreaterThan(0);
    await dialog.getByRole('button', {name: `Select ${source.name}`, exact: true}).click();
    await dialog.getByRole('button', {name: 'Add 1 ingredient', exact: true}).click();
    await expect(page.getByRole('list', {name: 'Recipe ingredients', exact: true})).toContainText(source.name);
    await page.goto('/nutrition-plans/new');
    await page.getByRole('button', {name: 'Add meal', exact: true}).click();
    await page.getByRole('button', {name: 'Add foods or recipes', exact: true}).click();
    await page.getByLabel('Search foods', {exact: true}).fill(source.name);
    await expect(dialog.getByText('1 food', {exact: true})).toBeVisible();
    await expect(dialog.getByText('View video', {exact: true})).toBeVisible();
    await expect(dialog.locator('video')).toHaveCount(0);
    await dialog.getByText('View video', {exact: true}).click();
    await expect.poll(() => dialog.locator('video').evaluate((element) => element.readyState)).toBeGreaterThan(0);
    await page.screenshot({path: `tests/foods/artifacts/media-picker-${width}.png`});
    await dialog.getByRole('button', {name: `Select ${source.name}`, exact: true}).click();
    await dialog.getByRole('button', {name: 'Add 1 item', exact: true}).click();
    // Copies retain the file; removing a copy's media cannot change the original.
    await page.goto(`/nutrition-foods/${source.id}/manage`);
    await page.getByRole('button', {name: 'Copy food', exact: true}).click();
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(page.getByLabel('Food name', {exact: true})).toHaveValue(source.name);
    const copyId = page.url().split('/').at(-1);
    expect(copyId).not.toBe(source.id);
    expect((await send('get', `/v1/coach/nutrition-foods/${copyId}`, undefined, token)).data.media.id).toBe(video.id);
    await page.getByRole('button', {name: 'Remove photo or video', exact: true}).click();
    await expect(media.locator('video')).toHaveCount(0);
    await page.getByRole('button', {name: 'Undo media removal', exact: true}).click();
    await expect(media.locator('video')).toBeVisible();
    await page.getByRole('button', {name: 'Remove photo or video', exact: true}).click();
    await save.click();
    await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
    expect((await send('get', `/v1/coach/nutrition-foods/${copyId}`, undefined, token)).data.media).toBeNull();
    expect((await send('get', endpoint, undefined, token)).data.media.id).toBe(video.id);
    // A new food retains uploaded media even when the create response is lost.
    await page.goto('/nutrition-foods/new');
    await page.getByLabel('Food name', {exact: true}).fill('Food media recovered after reconnect');
    await input.setInputFiles(files.photo);
    await expect(media.getByText('Upload finished.', {exact: true})).toBeVisible();
    await page.route('**/v1/coach/nutrition-foods', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      return route.abort('connectionfailed');
    });
    await save.click();
    await expect(page.getByRole('button', {name: 'Check saved foods', exact: true})).toBeVisible();
    await page.unroute('**/v1/coach/nutrition-foods');
    await page.getByRole('button', {name: 'Check saved foods', exact: true}).click();
    await dialog.getByRole('button', {name: 'Open saved food', exact: true}).click();
    await loadedImage(media.getByRole('img', {name: 'Food photo or video', exact: true}));
    expect(
      (await send('get', `/v1/coach/nutrition-foods/${page.url().split('/').at(-1)}`, undefined, token)).data.media
        .kind,
    ).toBe('image');
    // Shared catalog foods show media while exposing no upload or removal controls.
    const shared = (await send('get', endpoint, undefined, token)).data;
    await page.route(`**${endpoint}`, (route) => route.fulfill({json: {data: {...shared, source: 'system'}}}));
    await page.goto(`/nutrition-foods/${source.id}`);
    await expect(media.locator('video')).toBeVisible();
    await expect(media.getByRole('button', {name: 'Remove photo or video', exact: true})).toHaveCount(0);
    await expect(input).toHaveCount(0);
    await page.unroute(`**${endpoint}`);
    // A failed media read can recover without changing the saved food.
    await page.route(video.url, (route) => route.fulfill({status: 404, body: ''}));
    await page.goto(`/nutrition-foods/${source.id}`);
    await expect(media.getByText('Food photo or video is unavailable.', {exact: true})).toBeVisible();
    await page.unroute(video.url);
    await media.getByRole('button', {name: 'Retry media', exact: true}).click();
    await expect.poll(() => media.locator('video').evaluate((element) => element.readyState)).toBeGreaterThan(0);
    // Cancel even after storage has accepted the object: it never enters the draft.
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    await page.route('**/easy-dev-public/**', async (route) => {
      if (route.request().method() !== 'PUT') {
        return route.continue();
      }
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      held.resolve();
      await release.promise;
      try {
        await route.fulfill({response});
      } catch {
        /* The aborted browser request no longer needs the response. */
      }
    });
    await input.setInputFiles(files.photo);
    await held.promise;
    await expect(page.getByRole('button', {name: 'Manage food', exact: true})).toBeDisabled();
    await media.getByRole('button', {name: 'Cancel upload', exact: true}).click();
    await expect(media.getByText('Upload cancelled. Your photo or video is unchanged.', {exact: true})).toBeVisible();
    release.resolve();
    await page.unroute('**/easy-dev-public/**');
    await expect(save).toBeDisabled();
    expect((await send('get', endpoint, undefined, token)).data.media.id).toBe(video.id);
    // An account change during upload cannot attach old-account media afterward.
    const heldAgain = Promise.withResolvers();
    const releaseAgain = Promise.withResolvers();
    await page.route('**/easy-dev-public/**', async (route) => {
      if (route.request().method() !== 'PUT') {
        return route.continue();
      }
      const response = await route.fetch();
      heldAgain.resolve();
      await releaseAgain.promise;
      try {
        await route.fulfill({response});
      } catch {
        /* Session replacement aborts the upload. */
      }
    });
    await input.setInputFiles(files.photo);
    await heldAgain.promise;
    const other = await account(`other-${unique}`);
    await page.evaluate(async (value) => {
      const {clearSession, saveSession} = await import('/src/api/session.ts');
      clearSession();
      saveSession(value);
    }, other);
    releaseAgain.resolve();
    await page.goto('/');
    await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(async (id) => {
        const {queryClient} = await import('/src/api/query-client.ts');
        return queryClient
          .getQueryCache()
          .getAll()
          .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
      }, source.id),
    ).toBe(false);
    expect((await send('get', endpoint, undefined, token)).data.media.id).toBe(video.id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Real food media upload, playback, reuse, copy/removal, cancellation and session guards passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
