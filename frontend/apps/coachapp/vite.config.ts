import {fileURLToPath, URL} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.COACHAPP_API_PROXY || 'http://localhost:4000';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
    server: {
      host: true,
      port: 2022,
      proxy: {
        '/v1': {target: apiTarget, changeOrigin: true},
        '/socket': {target: apiTarget, ws: true, changeOrigin: true},
      },
    },
  };
});
