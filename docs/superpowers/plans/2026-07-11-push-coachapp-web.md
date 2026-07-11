# Push Notifications v1 — Coachapp Web Push (register, receive, click-to-focus) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A coach opts into browser notifications via a settings toggle, receives client chat messages as web push (tab unfocused or closed) with client name + preview, and clicking one focuses/opens the app at that conversation. Logout removes the token.

**Architecture:** Switch vite-plugin-pwa from the default `generateSW` to `injectManifest` with a custom `src/sw.ts` that reproduces the current Workbox behavior (precache, SPA navigation fallback, runtime caching, skipWaiting/clientsClaim) and adds plain `push` + `notificationclick` handlers — **no Firebase SDK inside the worker**. Page-side, the `firebase` npm package's `getToken(messaging, {vapidKey, serviceWorkerRegistration})` reuses the existing PWA service-worker registration; the token is POSTed via the generated RTK client.

**Tech Stack:** React 19 + Vite, vite-plugin-pwa `^1.2.0` (`injectManifest`), Workbox 7 modules, `firebase` (messaging only, page-side), HeroUI, RTK Query generated client.

**Spec:** `docs/superpowers/specs/2026-07-11-push-notifications-design.md` (covers Linear COA-130). **Depends on:** the backend plan (`2026-07-11-push-backend.md`) being merged — `useRegisterPushTokenMutation` / `useUnregisterPushTokenMutation` must exist in `frontend/apps/coachapp-v2/src/api/generated.ts`.

## Global Constraints

- The `generateSW` → `injectManifest` switch MUST preserve the existing auto-update behavior: `skipWaiting` + `clientsClaim` semantics and the hourly `registration.update()` poll in `src/pwa.ts` (`src/pwa.ts` itself needs no changes).
- The browser permission request must come from an explicit user gesture (the settings toggle) — never automatically.
- Firebase web config + VAPID public key are public values; they live in FE env (`VITE_FIREBASE_*`). No secrets in the frontend.
- Declining permission leaves the app fully functional; all push failures are silent.
- Never hand-edit `src/api/generated.ts`. Verify with `pnpm -C frontend build:coachapp-v2`; lint/format is Biome from `frontend/`.
- Service workers only exist in production builds (no `devOptions` today — keep it that way); verify SW behavior with `pnpm build` + `vite preview`.
- Human prerequisite for end-to-end verification: Firebase Web app registered in the console + a Web Push (VAPID) key pair.

---

### Task 1: `injectManifest` switch — custom service worker with push handlers

**Files:**
- Modify: `frontend/apps/coachapp-v2/package.json` (add Workbox dev deps)
- Modify: `frontend/apps/coachapp-v2/vite.config.ts` (VitePWA options, ~line 19)
- Create: `frontend/apps/coachapp-v2/src/sw.ts`
- Modify: `frontend/apps/coachapp-v2/tsconfig.app.json` (add `"WebWorker"` to `compilerOptions.lib`)

**Interfaces:**
- Consumes: the push payload sent by `Easy.Push` — FCM webpush delivers `{notification: {title, body}, data: {type, conversation_id}}` via `event.data.json()`.
- Produces: a service worker that precaches the app, shows notifications on `push`, and on `notificationclick` focuses an existing same-origin tab (or opens one) at `/messages/:conversation_id`. The registration flow in `src/pwa.ts` and its update semantics are unchanged.

- [ ] **Step 1: Add Workbox module dev deps**

```bash
pnpm -C frontend --filter coachapp-v2 add -D workbox-core@^7.4.0 workbox-precaching@^7.4.0 workbox-routing@^7.4.0 workbox-strategies@^7.4.0 workbox-expiration@^7.4.0
```

- [ ] **Step 2: Write the custom service worker**

Create `frontend/apps/coachapp-v2/src/sw.ts`:

```ts
/// <reference lib="webworker" />
import {clientsClaim} from 'workbox-core';
import {ExpirationPlugin} from 'workbox-expiration';
import {cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute} from 'workbox-precaching';
import {NavigationRoute, registerRoute} from 'workbox-routing';
import {CacheFirst, NetworkOnly} from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// ── Precache + update semantics (identical to the previous generateSW config) ──
self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigation fallback; never capture API requests.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {denylist: [/^\/v1\//]}));

// API calls are network-only.
registerRoute(({url}) => /\/v1\//.test(url.pathname), new NetworkOnly());

// Images are cache-first with the same expiration as before.
registerRoute(
  ({url}) => /\.(?:png|jpg|jpeg|svg|gif|webp)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60})],
  }),
);

// ── Web push (raw FCM webpush payload — no Firebase SDK in the worker) ──
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  const payload = event.data.json();
  const title = payload.notification?.title ?? 'CoachEasy';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.notification?.body ?? '',
      data: payload.data ?? {},
      icon: '/icons/icon-192x192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const url =
    data.type === 'chat_message' && data.conversation_id ? `/messages/${data.conversation_id}` : '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        // Full navigation (reload) is acceptable in v1; keeps the worker free
        // of app-router coupling.
        await existing.navigate(url);
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
```

- [ ] **Step 3: Switch the VitePWA strategy**

In `frontend/apps/coachapp-v2/vite.config.ts`, replace the `VitePWA({...})` options: add `strategies`/`srcDir`/`filename`, replace the whole `workbox: {...}` block with `injectManifest` (its runtime-caching/navigation behavior moved into `src/sw.ts`), and keep `registerType`, `injectRegister`, and `manifest` exactly as they are:

```ts
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/*.map'],
      },

      manifest: {
        // ... unchanged — keep the existing manifest object verbatim ...
      },
    }),
```

- [ ] **Step 4: Type the worker**

In `frontend/apps/coachapp-v2/tsconfig.app.json`, add `"WebWorker"` to the `compilerOptions.lib` array (create the `lib` entry with the current defaults plus `"WebWorker"` if it doesn't exist, e.g. `"lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"]`).

- [ ] **Step 5: Verify the build and the SW output**

Run: `pnpm -C frontend build:coachapp-v2 && grep -c "notificationclick" frontend/apps/coachapp-v2/dist/sw.js`
Expected: build succeeds; grep count ≥ 1 (custom worker shipped, with the precache manifest injected).

- [ ] **Step 6: Verify auto-update still works (manual)**

```bash
cd frontend/apps/coachapp-v2 && pnpm exec vite preview
```

1. Open the preview URL, confirm the SW activates (DevTools → Application → Service Workers).
2. Change any visible string in the app, `pnpm build` again, reload the preview tab → the new build appears (the `onNeedRefresh` → `updateSW(true)` reload flow from `src/pwa.ts` still fires).

- [ ] **Step 7: Commit**

```bash
git add frontend/apps/coachapp-v2/package.json frontend/pnpm-lock.yaml frontend/apps/coachapp-v2/vite.config.ts frontend/apps/coachapp-v2/src/sw.ts frontend/apps/coachapp-v2/tsconfig.app.json
git commit -m "feat(coachapp): custom injectManifest service worker with push handlers"
```

---

### Task 2: Page-side FCM token — settings toggle, registration, logout cleanup

**Files:**
- Modify: `frontend/apps/coachapp-v2/package.json` (add `firebase`)
- Create: `frontend/apps/coachapp-v2/src/push/push.ts`
- Modify: `frontend/apps/coachapp-v2/src/settings/settings.tsx` (new `NotificationsSection` + logout, lines ~170–290)
- Modify: `frontend/apps/coachapp-v2/.env.example`

**Interfaces:**
- Consumes: `useRegisterPushTokenMutation` / `useUnregisterPushTokenMutation` from `@/api/generated`; the SW registration from Task 1 (via `navigator.serviceWorker.ready`); `VITE_FIREBASE_*` env vars.
- Produces: `enablePush() :: Promise<string | null>` (permission → FCM token, stored under localStorage key `coachapp.pushToken`), `disablePush()`, `getStoredPushToken()`, `clearStoredPushToken()`, `pushSupported()`; a "Browser notifications" toggle in Settings; logout that unregisters the token first.

- [ ] **Step 1: Install firebase and add env vars**

```bash
pnpm -C frontend --filter coachapp-v2 add firebase
```

Append to `frontend/apps/coachapp-v2/.env.example`:

```bash
# Firebase web push (public values, from the Firebase console web app)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

- [ ] **Step 2: Write the page-side push module**

Create `frontend/apps/coachapp-v2/src/push/push.ts`:

```ts
import {getApps, initializeApp} from 'firebase/app';
import {deleteToken, getMessaging, getToken, isSupported} from 'firebase/messaging';

const PUSH_TOKEN_STORAGE_KEY = 'coachapp.pushToken';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = () => getApps()[0] ?? initializeApp(firebaseConfig);

export const getStoredPushToken = () => localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

export const clearStoredPushToken = () => localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);

export async function pushSupported(): Promise<boolean> {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY) && (await isSupported());
}

/**
 * Must be called from an explicit user gesture (the settings toggle) — this
 * triggers the browser permission prompt. Returns the FCM token, or null if
 * permission was declined.
 */
export async function enablePush(): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(firebaseApp()), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  return token;
}

export async function disablePush(): Promise<void> {
  try {
    await deleteToken(getMessaging(firebaseApp()));
  } catch {
    // Best-effort — the backend row is removed by the caller regardless.
  }
  clearStoredPushToken();
}
```

- [ ] **Step 3: Add the settings toggle and logout cleanup**

In `frontend/apps/coachapp-v2/src/settings/settings.tsx`:

1. Add imports (`Switch` from HeroUI joins the existing import; check the `Switch` prop names against another HeroUI v3 usage in the app if the ones below don't compile):

```ts
import {Avatar, Button, Separator, Switch, Typography} from '@heroui/react';
import {useCallback, useEffect, useState} from 'react';
import {useRegisterPushTokenMutation, useUnregisterPushTokenMutation} from '@/api/generated';
import {clearStoredPushToken, disablePush, enablePush, getStoredPushToken, pushSupported} from '@/push/push';
```

2. Add a `NotificationsSection` component next to `AccountSection` (~line 170):

```tsx
function NotificationsSection() {
  const [registerPushToken] = useRegisterPushTokenMutation();
  const [unregisterPushToken] = useUnregisterPushTokenMutation();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(
    () => Boolean(getStoredPushToken()) && Notification.permission === 'granted',
  );

  useEffect(() => {
    pushSupported().then(setSupported);
  }, []);

  const handleChange = useCallback(
    async (next: boolean) => {
      setBusy(true);
      try {
        if (next) {
          const token = await enablePush();
          if (token) {
            await registerPushToken({pushTokenCreateRequest: {token, platform: 'web'}}).unwrap();
            setEnabled(true);
          }
        } else {
          const token = getStoredPushToken();
          if (token) {
            await unregisterPushToken({token})
              .unwrap()
              .catch(() => {});
          }
          await disablePush();
          setEnabled(false);
        }
      } catch {
        // Silent — push is best-effort and must never break settings.
      } finally {
        setBusy(false);
      }
    },
    [registerPushToken, unregisterPushToken],
  );

  if (!supported) {
    return null;
  }

  return (
    <section className="py-4">
      <SectionHeading title="Notifications" />
      <div className="flex items-center justify-between gap-3 py-2">
        <div>
          <Typography type="body-sm">Browser notifications</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            Get notified when a client messages you, even when this tab is in the background.
          </Typography>
        </div>
        <Switch
          isDisabled={busy}
          isSelected={enabled}
          onValueChange={handleChange}
        />
      </div>
    </section>
  );
}
```

3. Render it in the main `Settings` component between `<AccountSection ... />` and the logout block:

```tsx
          <AccountSection email={profile.email} />
          <NotificationsSection />
```

4. Replace `handleLogout` (line ~223) so the token is removed server-side before auth is cleared:

```ts
  const [unregisterPushToken] = useUnregisterPushTokenMutation();

  const handleLogout = useCallback(async () => {
    const pushToken = getStoredPushToken();
    if (pushToken) {
      // Before clearTokens() — the DELETE needs the auth header.
      await unregisterPushToken({token: pushToken})
        .unwrap()
        .catch(() => {});
      clearStoredPushToken();
    }
    clearTokens();
    disconnectSocket();
    store.dispatch(coachApi.util.resetApiState());
    navigate('/login', {replace: true});
  }, [navigate, unregisterPushToken]);
```

(Check the exact generated arg keys in `src/api/generated.ts` — expected `{pushTokenCreateRequest: {token, platform}}` and `{token}`.)

- [ ] **Step 4: Verify the build**

Run: `pnpm -C frontend build:coachapp-v2`
Expected: build succeeds, no TypeScript errors. With no `VITE_FIREBASE_*` env set, the app still builds and the Notifications section simply doesn't render (`pushSupported()` is false).

- [ ] **Step 5: Commit**

```bash
git add frontend/apps/coachapp-v2/package.json frontend/pnpm-lock.yaml frontend/apps/coachapp-v2/src/push/push.ts frontend/apps/coachapp-v2/src/settings/settings.tsx frontend/apps/coachapp-v2/.env.example
git commit -m "feat(coachapp): web push opt-in toggle, FCM token registration, logout cleanup"
```

---

### Task 3: End-to-end verification in Chrome (manual)

**Interfaces:**
- Consumes: everything above + backend sending real pushes (`FIREBASE_SERVICE_ACCOUNT_JSON` set and the dev `adapter: :log` line temporarily disabled, or a staging backend) + `VITE_FIREBASE_*` values in `frontend/apps/coachapp-v2/.env`.

- [ ] **Step 1: Build and serve**

```bash
cd frontend/apps/coachapp-v2 && pnpm build && pnpm exec vite preview
```

(Web push needs the real SW, so preview — not `pnpm dev`.)

- [ ] **Step 2: Walk the acceptance checklist**

1. Log in as a coach (dev OTP `123456`) → Settings → toggle "Browser notifications" on → Chrome permission prompt appears (only after the toggle gesture) → a `push_tokens` row with `platform = 'web'` appears.
2. Client sends a chat message (clientapp or curl) with the coachapp tab **unfocused** → Chrome notification shows client name + preview.
3. Click the notification → the existing coachapp tab is focused and lands on `/messages/<conversation_id>` — no duplicate tab.
4. Close the coachapp tab entirely, send another client message → notification still arrives; clicking opens a new tab at the conversation.
5. Toggle off → row deleted, no further notifications.
6. Toggle on again, then Log out → row deleted, no further notifications in that browser.
7. Decline the permission prompt in a fresh profile → toggle stays off, app fully functional.
