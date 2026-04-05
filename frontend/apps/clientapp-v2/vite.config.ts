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
      // Manual registration so we can skip on native Capacitor
      registerType: 'autoUpdate',
      injectRegister: false,

      // Workbox config
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't precache source maps
        globIgnores: ['**/*.map'],
        // Network-first for API calls, cache-first for assets
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
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },

      // PWA manifest
      manifest: {
        name: 'CoachEasy',
        short_name: 'CoachEasy',
        description: 'Track your nutrition and workouts with your coach',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
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

      // Dev options — disable in dev by default, enable with VITE_PWA_DEV=true
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
