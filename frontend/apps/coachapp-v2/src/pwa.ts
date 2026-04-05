import {registerSW} from 'virtual:pwa-register';

/**
 * Register the PWA service worker for the coach app.
 * Uses vite-plugin-pwa's virtual module for proper auto-update lifecycle
 * (skipWaiting + clientsClaim coordination).
 */
export function registerPWA() {
  registerSW({immediate: true});
}
