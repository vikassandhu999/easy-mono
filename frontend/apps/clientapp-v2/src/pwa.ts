import {Capacitor} from '@capacitor/core';
import {registerSW} from 'virtual:pwa-register';

/**
 * Register the PWA service worker only when running on the web.
 * Uses vite-plugin-pwa's virtual module for proper auto-update lifecycle
 * (skipWaiting + clientsClaim coordination).
 *
 * On native (Capacitor iOS/Android), the WebView loads assets from the bundled
 * dist/ directory — a service worker there would cause stale cache issues and
 * conflicts with native app updates.
 */
export function registerPWA() {
  if (Capacitor.isNativePlatform()) {
    return;
  }

  registerSW({immediate: true});
}
