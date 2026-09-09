# Coach app

The rewrite's first slice is email authentication: signup and confirmation, login, trainer invitations, business setup, refresh, route protection, and local logout. The signed-in page identifies the account and provides sign-out. Product screens follow the [rebuild plan](../../../.scratch/coachapp-rebuild/plan.md).

Application code is written from scratch. shadcn supplies React Aria primitives in `src/ui/`. API types are generated from the Phoenix contract. Forms use React Hook Form field rules and server validation; there is no Zod dependency or parallel API schema layer.

## Run

From the repository root:

```sh
rtk just coach
```

Open http://localhost:2022. Vite proxies `/v1` to the local API on port 4000. For a deployed build, set `VITE_API_BASE_URL` to the Phoenix origin, or configure a same-origin API proxy. The host must serve `index.html` for app routes. The API's `frontend_url` controls invitation destinations and must point to the intended coach app when switching traffic.

## Test authentication locally

Start an API instance for browser tests from `backend/`, with port 4000 available:

```sh
rtk proxy mix run --no-start --no-halt ../frontend/apps/coachapp/tests/auth/dev-api.exs
```

This script creates/migrates `easy_coachapp_auth_dev`, disables background sweepers, and uses local email delivery. It uses the configured local Postgres credentials. Start the app, then run from `frontend/`:

```sh
rtk pnpm -C apps/coachapp build
rtk pnpm -C apps/coachapp test:browser
```

Browser tests create disposable accounts in that database. They exercise the real Phoenix API and inject transport failures for recovery checks. The concurrency regression uses a Vite module import, so run the browser suite against the development server. Screenshots and invitation fixtures are written to ignored `tests/auth/artifacts/`. Development OTP is `123456`; the app does not display or hardcode it.

Verified flows include wrong-code recovery, resend/change-email, unconfirmed signup recovery, business creation followed by failed scope upgrade, concurrent refresh, corrupted access tokens, rejected refresh sessions, permission errors, logout during refresh/verification, and invitation acceptance/expiry/revocation. Mobile is 375px; desktop is 1280px.

## Contract and session decisions

Run `rtk just gen-api` at the repository root to regenerate the API types. The generator includes this app alongside the other apps. Auth error responses use `error_code`, `error_message`, and `error_detail`; the client reads the backend's actual error payload.

The session has an app-specific storage key. Logout removes credentials and query data, retaining a token-free revision so late sign-in responses cannot restore a signed-out session. The backend exposes no logout/revocation endpoint, so this is local logout. Public verification never silently replaces an intervening session.

Refresh is shared within a tab and uses Web Locks between tabs when available. A transport error preserves credentials. The API uses 403 for both invalid authentication and insufficient permissions, so protected requests refresh and retry once; a continuing permission error is shown without clearing the account.
