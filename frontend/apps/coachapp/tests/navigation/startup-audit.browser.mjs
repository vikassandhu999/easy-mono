import {readFile, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname, resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {chromium, expect} from '@playwright/test';

// Serve the actual production bundle with compression, without touching dev servers.
const root = resolve('dist');
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const candidate = resolve(root, `.${pathname}`);
  const file =
    candidate.startsWith(`${root}/`) &&
    (await stat(candidate)
      .then((value) => value.isFile())
      .catch(() => false))
      ? candidate
      : resolve(root, 'index.html');
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'};
  const bytes = gzipSync(await readFile(file));
  response.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'content-encoding': 'gzip',
    'content-length': bytes.length,
  });
  response.end(bytes);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch();
try {
  for (const width of [375, 1280]) {
    const samples = [];
    for (let index = 0; index < 3; index++) {
      const context = await browser.newContext({viewport: {width, height: 900}});
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', {cacheDisabled: true});
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: 200_000,
        uploadThroughput: 100_000,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
      await page.goto(`http://127.0.0.1:${server.address().port}/login`);
      const email = page.getByLabel('Email', {exact: true});
      await expect(email).toBeVisible();
      await email.fill('startup@example.test');
      samples.push(
        await page.evaluate(() => ({
          usableMs: Math.round(performance.now()),
          scripts: performance
            .getEntriesByType('resource')
            .filter((entry) => entry.initiatorType === 'script')
            .map((entry) => ({
              name: new URL(entry.name).pathname,
              bytes: entry.encodedBodySize,
              endMs: Math.round(entry.responseEnd),
            })),
        })),
      );
      await context.close();
    }
    console.log(JSON.stringify({width, samples}));
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
