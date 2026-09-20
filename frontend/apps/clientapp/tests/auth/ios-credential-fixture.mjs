import {execFileSync, spawnSync} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';

const device = process.env.IOS_DEVICE || '516E4F05-967E-46C9-BCB8-9A8DCFFC5854';
const fixture = JSON.parse(await readFile(new URL('../../ios/App/ClientUITests/fixture.json', import.meta.url)));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:1315/invite/${fixture.formToken}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('clientapp.auth.v1')));
  expect(saved.accountId).toBeTruthy();
  // Require the migrated refresh token to obtain and persist a fresh access session.
  const session = JSON.stringify({...saved, expiresAt: 1});
  const container = execFileSync(
    'rtk',
    ['proxy', 'xcrun', 'simctl', 'get_app_container', device, 'com.easy.client', 'data'],
    {encoding: 'utf8'},
  ).trim();
  const stopped = spawnSync('rtk', ['proxy', 'xcrun', 'simctl', 'terminate', device, 'com.easy.client']);
  if (stopped.status !== 0 && stopped.status !== 3) {
    throw new Error('Could not stop the task app before seeding its legacy credentials.');
  }
  // Populate the actual pre-migration Preferences format without logging credentials.
  execFileSync(
    'rtk',
    [
      'proxy',
      'python3',
      '-c',
      `
import json,sys,plistlib,pathlib
payload=json.load(sys.stdin)
p=pathlib.Path(payload['container'])/'Library/Preferences/com.easy.client.plist'
data=plistlib.loads(p.read_bytes())
data['CapacitorStorage.clientapp.auth.v1']=payload['session']
data.pop('CapacitorStorage.clientapp.credentials.v1',None)
p.write_bytes(plistlib.dumps(data))
`,
    ],
    {input: JSON.stringify({container, session})},
  );
  execFileSync('rtk', [
    'proxy',
    'xcrun',
    'simctl',
    'spawn',
    device,
    'launchctl',
    'stop',
    'com.apple.cfprefsd.xpc.daemon',
  ]);
  await writeFile(
    new URL('../../ios/App/ClientUITests/fixture.json', import.meta.url),
    JSON.stringify({...fixture, credentialMigration: true}),
  );
  console.log('Seeded a real authenticated legacy session in the task iPhone simulator.');
} finally {
  await browser.close();
}
