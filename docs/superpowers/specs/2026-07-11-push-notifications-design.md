# Push Notifications — Design Spec

**Date:** 2026-07-11
**Status:** Approved
**Decision:** FCM everywhere — Firebase Cloud Messaging is the single delivery channel for both native Android (clientapp) and web push (coachapp). One backend sender path, no per-platform protocol code.

## Scope

- **Recipients:** clients on the native Android app, coaches on the web app.
- **v1 triggers:** chat messages (wired now), check-in reminders (payload defined now, trigger wired when the check-ins module is built).
- **Model:** fire-and-forget. The only persisted data is device tokens. No notification center, no read state, no delivery receipts.
- **Out of scope (deliberate):** iOS (design is iOS-ready; enabling it is Firebase-console APNs setup + `cap add ios`, zero backend change), clientapp web-PWA push, notification preferences/mute, presence-based suppression.

## Backend

### Data

`push_tokens` table:

| column | type | notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | references identity user | works for both coach and client |
| `token` | string, unique index | FCM registration token |
| `platform` | string enum: `android`, `web` | `ios` added later |
| timestamps | | |

Registering an already-known token upserts (updates `user_id` + `updated_at`) — tokens can migrate between accounts on shared devices.

### Context: `Easy.PushTokens`

Ctx-first per backend conventions:

- `register(ctx, %{token, platform})` — upsert.
- `unregister(ctx, token)` — delete own token; deleting an unknown token is a no-op success.
- `for_user(user_id)` — all tokens for fan-out (internal, called by the sender).

### Sender: `Easy.Push`

- `send(user_id, notification)` where `notification` is `%{title: String, body: String, data: %{String => String}}`.
- Fans out one FCM v1 `messages:send` call per token inside a supervised `Task` (fire-and-forget; the caller never waits or fails on push errors).
- **Auth:** FCM HTTP v1 OAuth using the existing `Req` + `Joken` deps — sign a service-account JWT (RS256), exchange it for an access token, cache in `:persistent_term` until ~5 min before expiry.
- **Dead tokens:** on FCM `UNREGISTERED` / HTTP 404, delete the token row. That is the only cleanup logic — no retries, no queue.
- **Message shape:** FCM `notification` block (title/body) + `data` block (deep-link payload). `webpush.fcm_options.link` set for web clicks.
- **Config:** `FIREBASE_SERVICE_ACCOUNT_JSON` env var (full JSON) + project id derived from it. Dev/test uses a log-only adapter selected by config, so local dev needs no Firebase credentials.

### API

- `POST /v1/push-tokens` — body `{token, platform}` → 201.
- `DELETE /v1/push-tokens/:token` → 204 (idempotent).
- OpenApiSpex schemas added; FE RTK Query clients regenerated (`just gen-api`). Restart `phx.server` after schema changes (dev spec cache).

### Triggers

**Chat (v1):** after successful message insert in `Easy.Chat`, call `Easy.Push.send(recipient_user_id, ...)`:

- `title`: sender display name
- `body`: message text truncated to 140 chars
- `data`: `{"type" => "chat_message", "conversation_id" => <conversation id>}`

Always send — no presence check. The Capacitor plugin does not display tray notifications while the app is foregrounded on Android, and an occasional redundant web notification for an in-app coach is acceptable in v1.

**Check-in reminder (defined only):**

- `title`: "Check-in due"
- `body`: coach-facing check-in name
- `data`: `{"type" => "checkin_due", "checkin_id" => <id>}`

The scheduled trigger ships with the check-ins module; this spec only fixes the payload contract so clients can implement tap-handling once.

## Clientapp (Capacitor Android)

- Add `@capacitor/push-notifications` + `google-services.json` (from Firebase console) to the Android project.
- On login (native platform only): request permission → `PushNotifications.register()` → `POST /v1/push-tokens` with `platform: "android"`.
- On logout: `DELETE /v1/push-tokens/:token`.
- `pushNotificationActionPerformed` handler routes by `data.type`: `chat_message` → chat conversation screen, `checkin_due` → check-ins screen (route exists once that module ships; until then fall back to home).
- Web build: no registration attempted (guard on `Capacitor.isNativePlatform()`).

## Coachapp (web push via FCM)

- Add `firebase` npm dep, page-side only: `getToken(messaging, {vapidKey, serviceWorkerRegistration})`, passing the **existing** vite-plugin-pwa registration. No separate `firebase-messaging-sw.js`.
- Switch vite-plugin-pwa strategy from `generateSW` to `injectManifest` with a custom `sw.ts`: Workbox precache (as before) + a plain `push` event handler (`self.registration.showNotification` from the push JSON) + `notificationclick` (focus or open the app at the conversation route from `data`). No Firebase SDK inside the SW.
- On login: request Notification permission (from an explicit user gesture, e.g. a settings toggle or one-time prompt) → get token → POST with `platform: "web"`. On logout: DELETE.
- Firebase web config object and VAPID public key live in FE env (`VITE_FIREBASE_*`) — both are public values.

## Error handling

- All send failures are logged and swallowed; a push failure must never fail the request that triggered it.
- Token registration failures on the FE are silent (retry next login) — push is best-effort.

## Testing

- **Backend:** context tests (register upsert, unregister idempotency); `Easy.Push` tests against `Req.Test` stubs (OAuth token fetch + caching, successful send, dead-token deletion on 404/UNREGISTERED); chat trigger test asserting the sender is invoked with the right payload.
- **Frontend:** manual — Android device/emulator with `google-services.json` for clientapp; Chrome for coachapp web push. Dev OTP `123456` for logins.

## Setup prerequisites (human, one-time)

1. Create Firebase project; add Android app (package id of clientapp) → download `google-services.json`.
2. Add Web app → copy web config + generate Web Push (VAPID) key pair.
3. Create a service account key JSON → `FIREBASE_SERVICE_ACCOUNT_JSON` secret on Fly + local `.env`.
