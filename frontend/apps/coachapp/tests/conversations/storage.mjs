import {expect} from '@playwright/test';

// Discover storage through the real signing response so the suite works with
// the configured storage service. Only the requested first PUT is simulated.
export async function observeChatUploads(page, clientId, {failFirst = false} = {}) {
  const uploads = [];
  await page.route(`**/v1/coach/clients/${clientId}/uploads`, async (route) => {
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    const {data} = await response.json();
    await page.route(data.upload_url, async (storage) => {
      if (failFirst) {
        failFirst = false;
        return storage.fulfill({status: 503, body: ''});
      }
      uploads.push(storage.request().postDataBuffer());
      return storage.continue();
    });
    return route.fulfill({response});
  });
  return uploads;
}

export async function expectStoredMedia(page, media, bytes) {
  const url = await media.getAttribute('src');
  const response = await page.request.get(url);
  expect(response.ok()).toBe(true);
  expect(await response.body()).toEqual(bytes);
}

export async function createVideo(page) {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const paint = canvas.getContext('2d');
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, {mimeType: 'video/webm'});
    const chunks = [];
    recorder.ondataavailable = ({data}) => chunks.push(data);
    const stopped = new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    recorder.start();
    const animation = setInterval(() => {
      paint.fillStyle = '#206050';
      paint.fillRect(0, 0, canvas.width, canvas.height);
      paint.fillStyle = '#ffffff';
      paint.fillText('Test coaching video', 15, 45);
    }, 100);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    recorder.stop();
    await stopped;
    clearInterval(animation);
    for (const track of stream.getTracks()) {
      track.stop();
    }
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  return Buffer.from(bytes);
}
