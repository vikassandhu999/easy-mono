# Push Notifications v1 — Clientapp Android (register, receive, deep-link) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client on the Android app receives push notifications for coach chat messages (sender name + preview), tapping one opens the right screen, and tokens are registered on login / removed on logout.

**Architecture:** `@capacitor/push-notifications` plugin + `google-services.json` in the existing Capacitor Android project (the gradle template already applies the google-services plugin when the file exists — `frontend/apps/clientapp-v2/android/app/build.gradle:48`). A `usePushNotifications()` hook mounted in the authenticated `AppShell` (next to `useChatRealtime()`) requests permission, registers with FCM, POSTs the token via the generated RTK client, and routes notification taps by `data.type`. Logout DELETEs the token before clearing auth.

**Tech Stack:** React 19 + Vite, Capacitor 8, RTK Query generated client (`src/api/generated.ts`), react-router.

**Spec:** `docs/superpowers/specs/2026-07-11-push-notifications-design.md` (covers Linear COA-129). **Depends on:** the backend plan (`2026-07-11-push-backend.md`) being merged — the generated hooks `useRegisterPushTokenMutation` / `useUnregisterPushTokenMutation` must already exist in `frontend/apps/clientapp-v2/src/api/generated.ts`.

## Global Constraints

- Never hand-edit `src/api/generated.ts`; regenerate with `just gen-api` if hooks are missing.
- Web build must never attempt push registration — guard every native call on `Capacitor.isNativePlatform()` (same pattern as `src/pwa.ts`).
- Declining permission or a failed registration changes nothing else about the app — all push failures are silent (retried next login).
- Frontend lint/format is Biome, run from `frontend/`. Verify with `pnpm -C frontend build:clientapp-v2` (there is no FE test suite).
- Notification tap routing by `data.type`: `chat_message` → `ROUTES.MESSAGES` (`/messages`), `checkin_due` → `ROUTES.CHECKINS` (`/check-ins`), unknown → `ROUTES.TRAINING` (`/`, home).
- Human prerequisite for end-to-end verification (not for writing the code): Firebase project with an Android app registered under package id `app.coacheasy.client`, and its `google-services.json`.

---

### Task 1: Push hook — permission, FCM registration, token POST, tap routing

**Files:**
- Modify: `frontend/apps/clientapp-v2/package.json` (add `@capacitor/push-notifications`)
- Create: `frontend/apps/clientapp-v2/src/push/use-push-notifications.ts`
- Modify: `frontend/apps/clientapp-v2/src/@components/app-shell.tsx` (mount the hook next to `useChatRealtime()`, line 87)

**Interfaces:**
- Consumes: `useRegisterPushTokenMutation` from `@/api/generated` (backend plan Task 2); `ROUTES` from `@/@config/routes`; `Capacitor.isNativePlatform()`.
- Produces: `usePushNotifications()` hook (mounted once in AppShell); `getStoredPushToken()` / `clearStoredPushToken()` exported for the logout flow (Task 2). Token stored under localStorage key `clientapp.pushToken`.

- [ ] **Step 1: Install the plugin and sync the Android project**

```bash
pnpm -C frontend --filter clientapp-v2 add @capacitor/push-notifications
cd frontend/apps/clientapp-v2 && npx cap sync android
```

Expected: dependency added at `^8.x` (matching the other `@capacitor/*` deps); `cap sync` reports the new plugin under "Found N Capacitor plugins".

- [ ] **Step 2: Write the hook**

Create `frontend/apps/clientapp-v2/src/push/use-push-notifications.ts`:

```ts
import {Capacitor} from '@capacitor/core';
import {PushNotifications} from '@capacitor/push-notifications';
import {useEffect} from 'react';
import {useNavigate} from 'react-router';
import {ROUTES} from '@/@config/routes';
import {useRegisterPushTokenMutation} from '@/api/generated';

const PUSH_TOKEN_STORAGE_KEY = 'clientapp.pushToken';

export const getStoredPushToken = () => localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

export const clearStoredPushToken = () => localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);

/**
 * Native-only push setup, mounted once in the authenticated AppShell:
 * ask permission → register with FCM → POST the token to the backend →
 * route notification taps by payload type. Every failure is silent —
 * push is best-effort and must never affect the rest of the app.
 */
export function usePushNotifications() {
  const navigate = useNavigate();
  const [registerPushToken] = useRegisterPushTokenMutation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    PushNotifications.addListener('registration', ({value}) => {
      localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, value);
      registerPushToken({pushTokenCreateRequest: {token: value, platform: 'android'}});
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const type = action.notification.data?.type;
      if (type === 'chat_message') {
        navigate(ROUTES.MESSAGES);
      } else if (type === 'checkin_due') {
        navigate(ROUTES.CHECKINS);
      } else {
        navigate(ROUTES.TRAINING);
      }
    });

    const register = async () => {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted') {
        return;
      }
      await PushNotifications.register();
    };

    register().catch(() => {
      // Silent: registration failures are retried on next login.
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [navigate, registerPushToken]);
}
```

Notes for the implementer:
- Check the exact mutation arg key in `src/api/generated.ts` — codegen derives it from the request schema name, so it should be `{pushTokenCreateRequest: {token, platform}}`; adjust to what codegen actually emitted if it differs.
- The RTK mutation trigger's returned promise never rejects unless `.unwrap()`ed — no `.catch` needed on it.
- `removeAllListeners()` is safe here: this hook is the only push listener registrar and mounts exactly once (AppShell).
- The `chat_message` payload carries `conversation_id`, but the client has exactly one conversation — navigating to `ROUTES.MESSAGES` is the correct deep-link.

- [ ] **Step 3: Mount the hook in AppShell**

In `frontend/apps/clientapp-v2/src/@components/app-shell.tsx`, next to `useChatRealtime()` (line 87):

```ts
import {usePushNotifications} from '@/push/use-push-notifications';
```

```ts
  useChatRealtime();
  usePushNotifications();
```

(AppShell only renders authenticated screens, so mounting here = "on login". Re-registering on every app open is intentional — it heals lost tokens and re-points shared-device tokens to the current account.)

- [ ] **Step 4: Verify the build**

Run: `pnpm -C frontend build:clientapp-v2`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/apps/clientapp-v2/package.json frontend/pnpm-lock.yaml frontend/apps/clientapp-v2/src/push/use-push-notifications.ts frontend/apps/clientapp-v2/src/@components/app-shell.tsx frontend/apps/clientapp-v2/android
git commit -m "feat(clientapp): register FCM push token on login, route notification taps"
```

---

### Task 2: Unregister on logout

**Files:**
- Modify: `frontend/apps/clientapp-v2/src/settings/settings.tsx` (`handleLogout`, line 174)

**Interfaces:**
- Consumes: `getStoredPushToken` / `clearStoredPushToken` (Task 1); `useUnregisterPushTokenMutation` from `@/api/generated`.
- Produces: logout deletes the device token server-side before clearing auth, so the next user of the device gets no leaked notifications.

- [ ] **Step 1: Wire unregistration into `handleLogout`**

In `frontend/apps/clientapp-v2/src/settings/settings.tsx`, add imports:

```ts
import {useUnregisterPushTokenMutation} from '@/api/generated';
import {clearStoredPushToken, getStoredPushToken} from '@/push/use-push-notifications';
```

Inside the `Settings` component, add the mutation hook next to the existing ones (line ~171):

```ts
  const [unregisterPushToken] = useUnregisterPushTokenMutation();
```

Replace `handleLogout` (line 174):

```ts
  const handleLogout = useCallback(async () => {
    const pushToken = getStoredPushToken();
    if (pushToken) {
      // Must happen before clearTokens() — the DELETE needs the auth header.
      await unregisterPushToken({token: pushToken})
        .unwrap()
        .catch(() => {
          // Best-effort: a dead backend row is cleaned up by FCM 404 handling.
        });
      clearStoredPushToken();
    }
    clearTokens();
    disconnectSocket();
    store.dispatch(api.util.resetApiState());
    navigate('/login');
  }, [navigate, unregisterPushToken]);
```

(On web builds `getStoredPushToken()` is always null — Task 1 only stores it on native — so logout is unchanged there. Check the generated arg name: the path param should be `{token: string}`.)

- [ ] **Step 2: Verify the build**

Run: `pnpm -C frontend build:clientapp-v2`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/apps/clientapp-v2/src/settings/settings.tsx
git commit -m "feat(clientapp): unregister push token on logout"
```

---

### Task 3: End-to-end verification on Android (manual)

**Files:**
- Create: `frontend/apps/clientapp-v2/android/app/google-services.json` (from the Firebase console — human-provided; it contains only public client config and is safe to commit)

**Interfaces:**
- Consumes: everything above + the backend running with `FIREBASE_SERVICE_ACCOUNT_JSON` set (real sends) — the dev log adapter can only verify payloads, not delivery.

- [ ] **Step 1: Place `google-services.json`**

Copy the file downloaded from Firebase (Android app, package `app.coacheasy.client`) to `frontend/apps/clientapp-v2/android/app/google-services.json`. The gradle build picks it up automatically (`android/app/build.gradle:48` applies the plugin conditionally; `com.google.gms:google-services:4.4.4` classpath is already declared in `android/build.gradle:11`).

- [ ] **Step 2: Build and run on an emulator/device with Play services**

```bash
cd frontend/apps/clientapp-v2
pnpm build && npx cap sync android && npx cap run android
```

- [ ] **Step 3: Walk the acceptance checklist**

Backend running locally with `FIREBASE_SERVICE_ACCOUNT_JSON` exported (this overrides nothing in dev except adding credentials — dev still uses the log adapter, so for real delivery run with the adapter line in `backend/config/dev.exs` temporarily commented out, or point the app at staging).

1. Fresh login (dev OTP `123456`) → grant notification permission → a `push_tokens` row for the client's user appears (`psql`: `select platform, user_id from push_tokens;`).
2. Coach sends a chat message (coachapp or curl) with the client app **backgrounded** → tray notification shows coach name + message preview; tapping it opens the Messages screen.
3. Same with the app **foregrounded** → no tray notification (Capacitor plugin default; verify, don't build suppression).
4. Log out → the `push_tokens` row is gone; further coach messages produce no notification on the device.
5. Web build (`pnpm dev:clientapp-v2` in a browser) → no permission prompt, no registration call (network tab), app fully functional.
6. Decline permission on a fresh install → app works exactly as before, no errors surfaced.

- [ ] **Step 4: Commit**

```bash
git add frontend/apps/clientapp-v2/android/app/google-services.json
git commit -m "chore(clientapp): add Firebase Android config for push"
```
