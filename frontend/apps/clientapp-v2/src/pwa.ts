import {Capacitor} from '@capacitor/core';
import {registerSW} from 'virtual:pwa-register';

/**
 * Register the PWA service worker only when running on the web.
 *
 * Update flow (industry-standard vite-plugin-pwa + Workbox pattern):
 *
 * 1. `registerType: 'autoUpdate'` (in vite.config) + `workbox.skipWaiting`
 *    + `workbox.clientsClaim` make a new SW take over active clients as
 *    soon as it installs — no need to close every tab.
 * 2. `onNeedRefresh` fires when vite-plugin-pwa detects a waiting SW with
 *    new precached assets. We immediately call `updateSW(true)`, which
 *    tells the waiting SW to activate and reloads the window so the user
 *    lands on the new build.
 * 3. `onRegisteredSW` wires up a periodic `registration.update()` poll so
 *    long-lived tabs (left open for hours/days) pick up new deployments
 *    without a manual refresh.
 *
 * On native (Capacitor iOS/Android), the WebView loads assets from the
 * bundled dist/ directory — a service worker there would cause stale
 * cache issues and conflicts with native app updates, so we skip SW
 * registration entirely.
 */

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function registerPWA() {
  if (Capacitor.isNativePlatform()) {
    return;
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // A new SW has installed and is waiting. Activate it and reload so
      // the user sees the new build immediately.
      updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Poll for updates periodically so long-lived tabs stay fresh.
      setInterval(() => {
        // `registration.update()` asks the browser to re-fetch the SW
        // script and compare bytes. If it changed, the install lifecycle
        // starts and onNeedRefresh will fire. We intentionally don't
        // await — any error (offline, network blip) is non-fatal.
        registration.update().catch(() => {
          // noop — next interval will retry
        });
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });
}
