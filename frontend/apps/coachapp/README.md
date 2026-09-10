# Coach app

The coach app supports email authentication, inviting clients with the business's default intake, and reviewing their submitted answers. The signed-in Clients page leads to an invitation form with an intake preview. Each client's overview follows acceptance, pending intake, submission, and saved review. Product screens follow the [rebuild plan](../../../.scratch/coachapp-rebuild/plan.md).

Application code is written from scratch. shadcn supplies React Aria primitives in `src/ui/`. API types are generated from the Phoenix contract. Forms use React Hook Form field rules and server validation; there is no Zod dependency or parallel API schema layer.

## Create forms

Open Forms in the app navigation to search existing Intake and Check-in forms or create one. The editor supports sections, question reordering, required answers, choices, and an interactive preview. Saved forms reopen for editing. An active Intake can be selected as the default for future invitations. Purpose stays fixed after creation; client assignment and recurring schedules are separate tasks.

Run `rtk pnpm -C frontend/apps/coachapp test:forms` from the repository root with the isolated API below running. The suite creates disposable accounts and verifies creation, editing, stable question IDs, section order, preview, failed requests and retries, default-intake invitation integration, unsaved navigation, and stale saves after an account change at 375px and 1280px. An empty-list response is a fixture because the real API supplies a built-in weekly check-in. Screenshots are written to ignored `tests/forms/artifacts/`. See [the Forms brief](../../../.scratch/coachapp-rebuild/forms.md).

## Assign training plans

Open a client and choose Assign training plan. Search active training templates, preview their workouts and weekly schedule, and choose a start date and optional end date. Assignment creates a separate Client Plan and returns to the overview, where its dates, lifecycle, and workouts remain available. Date overlaps are rejected. If a template changes while being reviewed, refresh the preview before assigning it. A lost assignment response includes a link to check the client's saved plans.

Run `rtk pnpm -C frontend/apps/coachapp test:training` from the repository root with the isolated browser API and coach app running. The suite covers the real assignment flow, server search and cursor pages, recovery, client access, and pending-write navigation/account changes at 375px and 1280px. Screenshots go to ignored `tests/training/artifacts/`. See [the assignment brief](../../../.scratch/coachapp-rebuild/assign-training-plan.md). Template creation and editing are separate work.

## Mobile foundation

Clients, Invite client, and Invitation detail share the compact app shell, `PageHeader`, `Surface`, status badges, and control styles. Phone layouts use 20px gutters, 16px input text, and controls at least 44px tall. The invite action bar stays at the bottom on phones; desktop uses inline actions and two columns. Intake previews use a scrolling bottom sheet on phones and a centered dialog on desktop. See the [foundation decisions](../../../.scratch/coachapp-rebuild/mobile-foundation.md).

Download new primitives through shadcn from this app's directory, using its `components.json` React Aria preset. The dialog and account menu were installed with:

```sh
rtk pnpm dlx shadcn@latest add dialog dropdown-menu
```

Keep the generated component APIs and adapt their styles to the shared tokens. Check the generated utility import: `cn` is the existing local `src/ui/cn.ts` helper, not an npm dependency. Avoid overwriting already adapted primitives when the CLI prompts.

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

## Test client invitations

Use the same isolated API and coach app described above. Start the client app from the repository root:

```sh
rtk pnpm -C frontend/apps/clientapp-v2 dev
```

Then run:

```sh
rtk pnpm -C frontend/apps/coachapp test:clients
```

This suite creates disposable coaches and clients in `easy_coachapp_auth_dev` with local mail delivery. At 375px and 1280px it checks the default intake preview, field validation, request failures and recovery, invitation creation, reload, resend, clipboard failure, return from the client list, and acceptance through the client app. It opens the assigned intake through the client's home screen. A delayed-response regression checks that changing coach accounts cannot restore the previous account's client data or navigate to that client. Screenshots are in ignored `tests/clients/artifacts/`.

The same suite checks responsive layout at 375px, 390px, 768px, and 1280px, including touch targets, input text size, dialog scrolling and focus return, account-menu keyboard behavior, and field visibility above the action bar in a 480px-tall viewport. These are browser checks; physical-device keyboards and safe-area behavior still need device testing.

The preview endpoint resolves the same default as invitation creation: the selected active intake, the oldest active intake as a fallback, or a server-created standard Intake. Resending renews the invitation expiry and keeps its link. Email delivery is asynchronous; invitation creation does not confirm delivery to an inbox.

The overview also supports grouped intake answers and marking intake reviewed. It uses the saved question snapshot, preserving the questions the client actually answered even after a template edit. The suite submits through the real client API, tests false/zero/missing answers, exercises review failure and retry, and verifies persistence after reload. Supplemental response fixtures cover inactive/missing/dismissed intake, external review refresh, and photo-download recovery.

Full onboarding includes the client's plans. Training-plan assignment and Forms are available; training-template creation and editing remain separate work. See the [overview brief](../../../.scratch/coachapp-rebuild/client-overview.md).

## Contract and session decisions

Run `rtk just gen-api` at the repository root to regenerate the API types. The generator includes this app alongside the other apps. Auth error responses use `error_code`, `error_message`, and `error_detail`; the client reads the backend's actual error payload.

The session has an app-specific storage key. Logout removes credentials and query data, retaining a token-free revision so late sign-in responses cannot restore a signed-out session. The backend exposes no logout/revocation endpoint, so this is local logout. Public verification never silently replaces an intervening session.

Refresh is shared within a tab and uses Web Locks between tabs when available. A transport error preserves credentials. The API uses 403 for both invalid authentication and insufficient permissions, so protected requests refresh and retry once; a continuing permission error is shown without clearing the account.

## Lists

Forms, Clients, and training plans share cursor pagination, server search and totals, a keyboard-accessible Load more fallback, and retry that preserves loaded rows. URL filters survive reload; loaded pages and scroll position survive returning from the form editor while cached. Question counts and intake selection come from the API. See the [list contract and verification notes](../../../.scratch/coachapp-rebuild/lists.md).

Run `pnpm test:lists` with the coach app and isolated browser API running. The scenarios exercise real API pagination and request failure recovery at 375px and 1280px.
