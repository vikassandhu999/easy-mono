import {fileURLToPath, URL} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';
import {offlineShell} from './scripts/offline-shell.ts';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.CLIENTAPP_API_PROXY || 'http://localhost:4000';
  return {
    plugins: [react(), tailwindcss(), offlineShell()],
    resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
    server: {
      host: true,
      port: 1315,
      strictPort: true,
      proxy: {
        '/v1': {target, changeOrigin: true},
        '/socket': {target, ws: true, changeOrigin: true},
      },
    },
  };
});
