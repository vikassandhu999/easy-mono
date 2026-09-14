import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/exercises/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `exercise-media-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `emedia-${unique}`}, guest.access_token);
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
    drawing.fillText('Movement demonstration', 90, 170);
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
    photo: {name: 'movement.png', mimeType: 'image/png', buffer: Buffer.from(files.png, 'base64')},
    video: {name: 'movement.webm', mimeType: 'video/webm', buffer: Buffer.from(files.video)},
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
        '/v1/coach/training-exercises',
        {name: 'Goblet demonstration', instructions: 'Keep your whole foot on the floor.'},
        token,
      )
    ).data;
    const endpoint = `/v1/coach/training-exercises/${source.id}`;
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
    await page.goto(`/training-exercises/${source.id}`);
    const input = page.getByLabel('Choose demonstration', {exact: true});
    const save = page.getByRole('button', {name: 'Save exercise', exact: true});
    const demo = page.getByRole('region', {name: 'Exercise demonstration', exact: true});
    await input.setInputFiles({name: 'unsupported.mov', mimeType: 'video/quicktime', buffer: Buffer.from('test')});
    await expect(demo.getByRole('alert')).toContainText('Choose a JPG');
    await input.setInputFiles({name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(16 * 1024 * 1024)});
    await expect(demo.getByRole('alert')).toContainText('15 MB');
    await input.setInputFiles(files.photo);
    await expect(demo.getByText('Upload finished.', {exact: true})).toBeVisible();
    await loadedImage(demo.getByRole('img', {name: 'Exercise demonstration', exact: true}));
    expect((await send('get', endpoint, undefined, token)).data.media).toBeNull();
    await page.getByRole('link', {name: 'Back to exercises', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await save.click();
    await expect(page.getByText('Exercise saved.', {exact: true})).toBeVisible();
    const photo = (await send('get', endpoint, undefined, token)).data.media;
    const anonymous = await api.get(photo.url);
    expect(anonymous.status()).toBe(200);
    expect(await anonymous.body()).toEqual(files.photo.buffer);
    await page.reload();
    await loadedImage(demo.getByRole('img', {name: 'Exercise demonstration', exact: true}));
    // Failed PUT keeps the saved image; retry reuses the selected file.
    await page.route('**/easy-dev-public/**', (route) =>
      route.request().method() === 'PUT' ? route.fulfill({status: 503, body: ''}) : route.continue(),
    );
    await input.setInputFiles(files.video);
    await expect(demo.getByRole('alert')).toContainText('demonstration is unchanged');
    await expect(demo.getByRole('img')).toHaveAttribute('src', photo.url);
    await expect(save).toBeDisabled();
    await page.unroute('**/easy-dev-public/**');
    await demo.getByRole('button', {name: 'Retry upload', exact: true}).click();
    const video = demo.locator('video');
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate((element) => element.readyState)).toBeGreaterThan(0);
    await video.evaluate(async (element) => {
      await element.play();
      element.pause();
    });
    await page.route(`**${endpoint}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await save.click();
    await expect(page.getByRole('button', {name: 'Review saved version', exact: true})).toBeVisible();
    expect((await send('get', endpoint, undefined, token)).data.media.id).toBe(photo.id);
    await expect(video).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await save.click();
    await expect(page.getByText('Exercise saved.', {exact: true})).toBeVisible();
    const savedVideo = (await send('get', endpoint, undefined, token)).data.media;
    expect(savedVideo.kind).toBe('video');
    expect(await (await api.get(savedVideo.url)).body()).toEqual(files.video.buffer);
    // Media loading failure is recoverable without losing written cues.
    await page.route(savedVideo.url, (route) => route.fulfill({status: 503, body: ''}));
    await page.reload();
    await expect(demo.getByRole('button', {name: 'Retry media', exact: true})).toBeVisible();
    await expect(page.getByLabel('Coaching instructions', {exact: true})).toHaveValue(source.instructions);
    await page.unroute(savedVideo.url);
    await demo.getByRole('button', {name: 'Retry media', exact: true}).click();
    await expect.poll(() => video.evaluate((element) => element.readyState)).toBeGreaterThan(0);
    // Saved reference photos are editable and independent of the main demonstration.
    await send('patch', endpoint, {images: [photo.url]}, token);
    await page.reload();
    await loadedImage(demo.getByRole('img', {name: 'Reference photo 1', exact: true}));
    await demo.getByRole('button', {name: 'Remove reference photo 1', exact: true}).click();
    await expect(demo.getByRole('img')).toHaveCount(0);
    await demo.getByRole('button', {name: 'Undo removal', exact: true}).click();
    await loadedImage(demo.getByRole('img'));
    await expect(save).toBeDisabled();
    await video.evaluate(async (element) => {
      await element.play();
      element.pause();
    });
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.screenshot({path: `tests/exercises/artifacts/media-editor-${width}.png`, fullPage: true});
    await demo.evaluate((element) => {
      window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 130);
    });
    await page.screenshot({path: `tests/exercises/artifacts/media-controls-${width}.png`});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Copies reuse the media, and saved plans load details only when requested.
    await page.getByRole('button', {name: 'Copy exercise', exact: true}).click();
    await page.getByLabel('Name for the copy', {exact: true}).fill('Paused goblet demonstration');
    await page.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(page.getByLabel('Exercise name', {exact: true})).toHaveValue('Paused goblet demonstration');
    const copyId = page.url().split('/').at(-1);
    expect((await send('get', `/v1/coach/training-exercises/${copyId}`, undefined, token)).data.media.id).toBe(
      savedVideo.id,
    );
    await page.goto('/training-plans/new');
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('Demo plan');
    await page.getByRole('button', {name: 'Add exercises', exact: true}).click();
    await page.getByLabel('Search exercises', {exact: true}).fill('Paused goblet demonstration');
    const picker = page.getByRole('dialog', {name: 'Add exercises', exact: true});
    await expect(picker.getByRole('list', {name: 'exercises', exact: true}).locator(':scope > li')).toHaveCount(1);
    await expect(picker.locator('video')).toHaveCount(0);
    await picker.getByText('Exercise details', {exact: true}).click();
    await expect.poll(() => picker.locator('video').evaluate((element) => element.readyState)).toBeGreaterThan(0);
    await page.getByRole('button', {name: 'Select Paused goblet demonstration', exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 exercise', exact: true}).click();
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page).toHaveURL(/training-plans\/[0-9a-f-]+$/);
    const planId = page.url().split('/').at(-1);
    await page.getByRole('button', {name: 'View Paused goblet demonstration details', exact: true}).click();
    const reader = page.getByRole('dialog', {name: 'Paused goblet demonstration', exact: true});
    await expect.poll(() => reader.locator('video').evaluate((element) => element.readyState)).toBeGreaterThan(0);
    await expect(reader).toContainText(source.instructions);
    await page.screenshot({path: `tests/exercises/artifacts/media-plan-${width}.png`});
    await reader.getByRole('button', {name: 'Back to plan', exact: true}).click();
    const person = (
      await send(
        'post',
        '/v1/coach/clients/invite',
        {first_name: 'Alex', phone: `+1555${String(Date.now()).slice(-7)}`},
        token,
      )
    ).data;
    await page.goto(`/clients/${person.id}/training-plans/assign/${planId}`);
    await page.getByRole('button', {name: 'View Paused goblet demonstration details', exact: true}).click();
    await expect.poll(() => reader.locator('video').evaluate((element) => element.readyState)).toBeGreaterThan(0);
    await reader.getByRole('button', {name: 'Back to plan', exact: true}).click();
    // Clearing saves an explicit null/empty list, and leaves the copy intact.
    await page.goto(`/training-exercises/${source.id}`);
    await demo.getByRole('button', {name: 'Remove demonstration', exact: true}).click();
    await demo.getByRole('button', {name: 'Remove reference photo 1', exact: true}).click();
    await save.click();
    await expect(page.getByText('Exercise saved.', {exact: true})).toBeVisible();
    const cleared = (await send('get', endpoint, undefined, token)).data;
    expect(cleared.media).toBeNull();
    expect(cleared.images).toEqual([]);
    expect((await send('get', `/v1/coach/training-exercises/${copyId}`, undefined, token)).data.media.id).toBe(
      savedVideo.id,
    );
    // Abort a transfer after the object store accepts it: never attach its late result.
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    const released = Promise.withResolvers();
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
      } catch (error) {
        if (!route.request().failure()?.errorText.includes('ERR_ABORTED')) {
          throw error;
        }
      } finally {
        released.resolve();
      }
    });
    await input.setInputFiles(files.photo);
    await held.promise;
    await expect(save).toBeDisabled();
    await demo.getByRole('button', {name: 'Cancel upload', exact: true}).click();
    await expect(demo.getByText('Upload cancelled. Your demonstration is unchanged.', {exact: true})).toBeVisible();
    release.resolve();
    await released.promise;
    await page.unroute('**/easy-dev-public/**');
    await expect(save).toBeDisabled();
    await expect(demo.getByRole('img')).toHaveCount(0);
    expect((await send('get', endpoint, undefined, token)).data.media).toBeNull();
    // A session change during upload must not attach a file or fill the replacement cache.
    const switched = Promise.withResolvers();
    const finish = Promise.withResolvers();
    const finished = Promise.withResolvers();
    await page.route('**/easy-dev-public/**', async (route) => {
      if (route.request().method() !== 'PUT') {
        return route.continue();
      }
      const response = await route.fetch();
      switched.resolve();
      await finish.promise;
      try {
        await route.fulfill({response});
      } catch (error) {
        if (!route.request().failure()?.errorText.includes('ERR_ABORTED')) {
          throw error;
        }
      } finally {
        finished.resolve();
      }
    });
    await input.setInputFiles(files.photo);
    await switched.promise;
    const other = await account(`other-${unique}`);
    await page.evaluate(async (value) => {
      const {clearSession, saveSession} = await import('/src/api/session.ts');
      clearSession();
      saveSession(value);
    }, other);
    finish.resolve();
    await finished.promise;
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
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Real image/video upload, playback, replacement, clearing, plan reuse and interruption recovery passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
