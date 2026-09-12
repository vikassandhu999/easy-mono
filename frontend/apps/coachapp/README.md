# Coach app

The coach app supports email authentication, inviting clients with the business's default intake, and reviewing their submitted answers. The signed-in Clients page leads to an invitation form with an intake preview. Each client's overview follows acceptance, pending intake, submission, and saved review. Product screens follow the [rebuild plan](../../../.scratch/coachapp-rebuild/plan.md).

Application code is written from scratch. shadcn supplies React Aria primitives in `src/ui/`. API types are generated from the Phoenix contract. Forms use React Hook Form field rules and server validation; there is no Zod dependency or parallel API schema layer.

## Create forms

Open Forms in the app navigation to search existing Intake and Check-in forms or create one. The editor supports sections, question reordering, required answers, choices, and an interactive preview. Saved forms reopen for editing. An active Intake can be selected as the default for future invitations. Purpose stays fixed after creation; client assignment and recurring schedules are separate tasks.

Run `rtk pnpm -C frontend/apps/coachapp test:forms` from the repository root with the isolated API below running. The suite creates disposable accounts and verifies creation, editing, stable question IDs, section order, preview, failed requests and retries, default-intake invitation integration, unsaved navigation, and stale saves after an account change at 375px and 1280px. An empty-list response is a fixture because the real API supplies a built-in weekly check-in. Screenshots are written to ignored `tests/forms/artifacts/`. See [the Forms brief](../../../.scratch/coachapp-rebuild/forms.md).

## Assign training plans

Open a client and choose Assign training plan. Search active training templates, preview their workouts and weekly schedule, and choose a start date and optional end date. Assignment creates a separate Client Plan and returns to the overview, where its dates, lifecycle, and workouts remain available. Date overlaps are rejected. If a template changes while being reviewed, refresh the preview before assigning it. A lost assignment response includes a link to check the client's saved plans.

Run `rtk pnpm -C frontend/apps/coachapp test:training` from the repository root with the isolated browser API and coach app running. The suite covers the real assignment flow, server search and cursor pages, recovery, client access, and pending-write navigation/account changes at 375px and 1280px. Screenshots go to ignored `tests/training/artifacts/`. See [the assignment brief](../../../.scratch/coachapp-rebuild/assign-training-plan.md). Templates can be created and edited from Training in the app navigation.

## Build training templates

Open Training and create a template to start a worksheet. Add exercises first; the worksheet creates Workout A with three empty sets per movement. The name and optional description stay editable in place. Selected exercises remain in an ordered tray across server searches.

Plan titles lead the hierarchy, followed by bold workout titles, semibold exercise names, and smaller muted field labels. Extra space between exercises groups each name with its fields; secondary set actions use quieter text. Uniform sets share one editable prescription for sets, reps, load and rest. Vary sets & add details opens individual rows, warm-ups, drop sets and advanced targets. Collapsible workouts keep their movements and assigned days visible. Create a variation makes an independent copy; Replace movement explicitly offers keeping or resetting targets. Removed workouts, exercises and sets have Undo.

The week stays in the worksheet: choose a day, then a workout or rest. Client view hides editing controls while showing the current draft. Save plan saves metadata and prescription through the existing revision-checked API. If metadata succeeds but the prescription fails, retry uses the saved revision. Unknown creation outcomes offer an in-place check for the created empty template, preserving the worksheet and avoiding duplicate creation when it is found. Failed saves retain the draft, stale revisions require explicit recovery, and navigation warns about unsaved changes. Drafts are not stored across reloads. Previously assigned client plans remain independent copies.

Exercise search uses the shared cursor list with server-owned filtering and totals. Run `rtk pnpm -C frontend/apps/coachapp test:templates` with the isolated API and coach app running. The real API suites cover the worksheet, compact set editing, selection order, replacement, Undo, partial-save recovery, creation through assignment, pagination, validation, conflicts, lost responses, and session changes at 375px and 1280px. See [the template editor brief](../../../.scratch/coachapp-rebuild/training-templates.md).

## Personalize assigned training

Open a client's assigned plan and choose Personalize plan. The worksheet identifies the client and plan dates, then lets you adjust workouts, exercises, set targets and weekday scheduling. Save client plan updates that independent copy and returns to the client's overview. The reusable template keeps its prescription.

Template and client editing share one worksheet and resource save hook. Route loading checks that the plan belongs to the client before opening the editor. Failed and partial saves retain the draft, stale revisions require explicit recovery, and unsaved navigation asks before discarding changes. Changing assignment dates is a separate task.

Run `rtk pnpm -C frontend/apps/coachapp test:client-training` with the isolated API and coach app running. See [the personalization brief](../../../.scratch/coachapp-rebuild/personalize-training.md).

## Create and assign nutrition plans

Open Nutrition to create a reusable plan with optional daily calorie and macro targets. Start with the Everyday menu, add meals and food or recipe portions, and offer alternatives within a meal time. Create day variation copies its meals independently; assign menus to weekdays when needed. Preview meals resolves nutrition on the server before anything is saved. Unknown nutrient values remain explicit.

Save retains the successful metadata revision if the menu write fails. A lost creation response offers an in-place check for the empty template, preserving the worksheet. Conflicting revisions require loading the saved version; unsaved navigation prompts before discarding changes. Client Overview offers Assign nutrition plan with a complete preview, start date and optional end date. The server checks the reviewed revision, rejects overlapping coverage, and returns independent current/upcoming client plans.

Run `rtk pnpm -C frontend/apps/coachapp test:nutrition` with the isolated API running. The two real API browser suites cover creation, foods and recipes, portions, meal alternatives, independent day variations, server preview, persistence, cursor paging/search/retry, partial and lost-write recovery, validation, assignment and account isolation at 375px and 1280px. Creating library foods and recipes is a separate task. See [the slice brief](../../../.scratch/coachapp-rebuild/nutrition-plans.md).

## Personalize assigned nutrition

Open a client's current or upcoming nutrition plan and choose Personalize nutrition plan. The worksheet identifies the client and dates, then lets you change daily targets, meals, portions and day variations. Preview meals resolves nutrients on the server. Save client plan updates that copy and returns to refreshed client coverage with a saved message.

The template and assigned-copy screens share one worksheet. Route loading checks ownership before editing, and archived plans are unavailable. Partial saves retain the successful revision and draft; conflicts or uncertain saves offer loading the saved version. Navigation protects unsaved edits. Assignment dates stay outside this worksheet.

Run `rtk pnpm -C frontend/apps/coachapp test:client-nutrition` with the isolated browser API and coach app running. It covers current/upcoming copies, server preview, template independence, save recovery and session isolation at 375px and 1280px. See [the personalization brief](../../../.scratch/coachapp-rebuild/personalize-nutrition.md).

## Food library

Open Nutrition, then Food library. Search foods or create a food with nutrition per 100 g. Unknown values stay blank, and zero stays explicit. Optional details contain brand, category, supported allergen and dietary-tag checkboxes, and notes. Custom foods can be edited; shared system foods are read-only. Serving sizes and media survive edits even though this form does not edit them.

The meal picker uses the same food resource hook. Food updates invalidate nutrition queries because recipes and meals resolve library nutrients. Revision conflicts retain edits and offer loading the saved version. Interrupted creation offers checking saved foods before a separate create. Search, loaded pages and return position use the shared list foundation.

Run `rtk pnpm -C frontend/apps/coachapp test:foods` with the isolated API and coach app running. The browser flow covers creation, nullable nutrients, tags, editing, conflicts, lost responses, server paging/search/retry, return position, meal-plan integration and session isolation at 375px and 1280px. See [the food library plan](../../../.scratch/coachapp-rebuild/foods.md).

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

Full onboarding includes the client's plans. Training templates, training-plan assignment, and Forms are available. See the [overview brief](../../../.scratch/coachapp-rebuild/client-overview.md).

## Contract and session decisions

Run `rtk just gen-api` at the repository root to regenerate the API types. The generator includes this app alongside the other apps. Auth error responses use `error_code`, `error_message`, and `error_detail`; the client reads the backend's actual error payload.

The session has an app-specific storage key. Logout removes credentials and query data, retaining a token-free revision so late sign-in responses cannot restore a signed-out session. The backend exposes no logout/revocation endpoint, so this is local logout. Public verification never silently replaces an intervening session.

Refresh is shared within a tab and uses Web Locks between tabs when available. A transport error preserves credentials. The API uses 403 for both invalid authentication and insufficient permissions, so protected requests refresh and retry once; a continuing permission error is shown without clearing the account.

## Lists

Forms, Clients, training plans, and the exercise picker share cursor pagination, server search and totals, a keyboard-accessible Load more fallback, and retry that preserves loaded rows. URL filters survive reload; loaded pages and scroll position survive returning from the form editor while cached. Question counts and intake selection come from the API. See the [list contract and verification notes](../../../.scratch/coachapp-rebuild/lists.md).

Run `pnpm test:lists` with the coach app and isolated browser API running. The scenarios exercise real API pagination and request failure recovery at 375px and 1280px.

## Recipe library

Nutrition → Recipe library supports cursor search, creation and revisioned editing. Add ingredients together, edit quantities beside each name, and remove with Undo. Preparation notes and finished weight are optional. Nutrition comes from the API for the whole saved recipe; unsaved edits hide those totals until saved. Existing recipe tags are preserved. Recipes can then be selected in meal plans.

Run `rtk pnpm -C frontend/apps/coachapp test:recipes` from the repository root with the coach app and isolated browser API running. The suite checks the full recipe task, request recovery, pagination, food-update invalidation, meal reuse and session isolation at 375px and 1280px. See [the recipe brief](../../../.scratch/coachapp-rebuild/recipes.md).

## Exercise library

Training → Exercise library provides server search, cursor pagination, creation and editing. Names and coaching instructions stay visible; equipment, muscles and classifications are optional. Existing media and tracking data survive edits. Shared system exercises are read-only.

Run `rtk pnpm -C frontend/apps/coachapp test:exercises` from the repository root with the coach app and isolated browser API running. The suite seeds equipment and muscle vocabulary in `easy_coachapp_auth_dev`, then exercises authoring, recovery, list navigation, training-plan reuse and session isolation at 375px and 1280px. Exercise updates send only changed fields; the existing API does not provide same-field concurrent-edit protection. See [the exercise brief](../../../.scratch/coachapp-rebuild/exercises.md).

## Client check-in scheduling

Client Overview → Manage check-ins supports selecting and previewing a form, choosing its first due date and repetition, editing future dates, and stopping or resuming generation. Scheduling starts with active clients. Stopping preserves existing check-ins and answers. Dates, capacity, counts and filtered results come from the API; inactive history uses cursor pagination. Submission review is a separate screen.

Run `rtk pnpm -C frontend/apps/coachapp test:check-ins` from the repository root with the coach app and isolated browser API running. The suite checks scheduling, lost-response recovery, duplicate and capacity errors, preview, pagination, filtering and session isolation at 375px and 1280px. See [the scheduling brief](../../../.scratch/coachapp-rebuild/check-in-schedules.md).

## Check-in review

Check-ins opens responses needing review across visible clients. Client Overview → View responses opens that client's history. Read saved question snapshots and answers, load progress photos, and mark a response reviewed. Reviewed responses remain available through the status filter. Search, totals and cursor pagination come from the API; list position survives opening a response and returning.

Run `rtk pnpm -C frontend/apps/coachapp test:reviews` with the app and isolated browser API running. It covers the review task and the shared intake-answer regression at 375px and 1280px. See [the review brief](../../../.scratch/coachapp-rebuild/check-in-review.md). The remaining whole-app work is tracked in [the completion ledger](../../../.scratch/coachapp-rebuild/completion.md).

## Client activity history

Client Overview links to training and nutrition history. Training history supports server search, date/state filters and cursor pages, with recorded sets and the frozen prescription on a session page. Nutrition history opens one date at a time, with logged totals beside targets, recorded portions and notes, and expandable meal guidance. Unknown nutrition and unrecorded food remain explicit.

Run `rtk pnpm -C frontend/apps/coachapp test:training-history` and `rtk pnpm -C frontend/apps/coachapp test:nutrition-history` with the app and isolated API running. Both verify real client writes, coach reads, history after plan edits, request recovery and account isolation at 375px and 1280px. Nutrition tests accept `COACHAPP_API_URL` and `COACHAPP_URL` for alternate ports. See the [training brief](../../../.scratch/coachapp-rebuild/training-history.md) and [nutrition brief](../../../.scratch/coachapp-rebuild/nutrition-history.md).

## Client weight progress

Client Overview → View weight progress shows a 90-day trend, first/latest readings, change and goal. Choose dates and a trend unit to review another range. The API selects daily chart points, converts units, and supplies the summary independently of cursor pages. Measurement history preserves every reading's original unit, date, source and note.

Run `rtk pnpm -C frontend/apps/coachapp test:weight-progress` with the app and isolated API running. It verifies real measurements and form answers, mixed units, date filters, pagination, recovery and account isolation at 375px and 1280px. Set `COACHAPP_API_URL` and `COACHAPP_URL` for alternate ports. See the [weight progress brief](../../../.scratch/coachapp-rebuild/weight-progress.md).
