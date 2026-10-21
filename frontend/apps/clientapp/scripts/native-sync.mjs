import {execFileSync} from 'node:child_process';
import {loadEnv} from 'vite';

const env = {...loadEnv('native', process.cwd(), 'VITE_'), ...process.env};
if (!env.VITE_API_BASE_URL) {
  throw new Error('Set VITE_API_BASE_URL to the Phoenix API origin before syncing a native build.');
}
const api = new URL(env.VITE_API_BASE_URL);
const local = ['localhost', '127.0.0.1', '10.0.2.2'].includes(api.hostname);
if (api.protocol !== 'https:' && !(api.protocol === 'http:' && local)) {
  throw new Error('Use HTTPS for the native API, or a localhost/emulator HTTP origin for development.');
}
execFileSync('rtk', ['proxy', 'pnpm', 'build'], {stdio: 'inherit', env});
execFileSync('rtk', ['proxy', 'pnpm', 'exec', 'cap', 'sync'], {stdio: 'inherit', env});
