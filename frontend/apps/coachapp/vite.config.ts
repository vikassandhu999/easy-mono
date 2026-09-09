import {fileURLToPath, URL} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
  server: {
    host: true,
    port: 2022,
    proxy: {'/v1': {target: 'http://localhost:4000', changeOrigin: true}},
  },
});
