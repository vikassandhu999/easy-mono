import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/*.map'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/v1\//,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-calls',
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },

      manifest: {
        name: 'CoachEasy Coach',
        short_name: 'CoachEasy',
        description: 'Manage your coaching business — clients, plans, and nutrition',
        theme_color: '#f5f5f5',
        background_color: '#f5f5f5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
