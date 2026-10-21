# Coach app

The coach app supports direct client invitations, client management, training and nutrition plans, food and exercise libraries, progress and chat. Clients is the signed-in home.

Application code is written from scratch. shadcn supplies React Aria primitives in `src/ui/`. API types are generated from the Phoenix contract. Forms use React Hook Form field rules and server validation; there is no Zod dependency or parallel API schema layer.

## Assign training plans

Open a client and choose Assign training plan. Search active training templates, preview their workouts and weekly schedule, and choose a start date and optional end date. Assignment creates a separate Client Plan and returns to the overview, where its dates, lifecycle, and workouts remain available. Date overlaps are rejected. If a template changes while being reviewed, refresh the preview before assigning it. A lost assignment response includes a link to check the client's saved plans.

Run `rtk pnpm -C frontend/apps/coachapp test:training` from the repository root with the isolated browser API and coach app running. The suite covers the real assignment flow, server search and cursor pages, recovery, client access, and pending-write navigation/account changes at 375px and 1280px. Screenshots go to ignored `tests/training/artifacts/`. Templates can be created and edited from Training in the app navigation.

## Build training templates

Open Training and create a template to start a worksheet. Add exercises first; the worksheet creates Workout A with three empty sets per movement. The name and optional description stay editable in place. Selected exercises remain in an ordered tray across server searches.

Plan titles lead the hierarchy, followed by bold workout titles, semibold exercise names, and smaller muted field labels. Extra space between exercises groups each name with its fields; secondary set actions use quieter text. Uniform sets share one editable prescription for sets, reps, load and rest. Duration, distance & effort opens shared extra targets and notes. Adding a batch of sets also accepts these fields. Vary sets & add details opens individual rows, warm-ups, drop sets and advanced targets. Collapsible workouts keep their movements and assigned days visible. Create a variation makes an independent copy; Replace movement explicitly offers keeping or resetting targets. Removed workouts, exercises and sets have Undo.

The week stays in the worksheet: choose a day, then a workout or rest. Client view hides editing controls while showing the current draft. Save plan saves metadata and prescription through the existing revision-checked API. If metadata succeeds but the prescription fails, retry uses the saved revision. Unknown creation outcomes offer an in-place check for the created empty template, preserving the worksheet and avoiding duplicate creation when it is found. Failed saves retain the draft, stale revisions require explicit recovery, and navigation warns about unsaved changes. Drafts are not stored across reloads. Previously assigned client plans remain independent copies.

Exercise search uses the shared cursor list with server-owned filtering and totals. Run `rtk pnpm -C frontend/apps/coachapp test:templates` with the isolated API and coach app running. The real API suites cover the worksheet, compact set editing, selection order, replacement, Undo, partial-save recovery, creation through assignment, pagination, validation, conflicts, lost responses, and session changes at 375px and 1280px.

Run `rtk pnpm -C frontend/apps/coachapp test:shared-targets` for shared duration, distance, effort and notes, cancellation, validation, failed-save recovery, zero/cleared targets and batch additions at both widths. It defaults to API 4000 and app 2022; `COACH_API_URL` and `COACH_APP_URL` override them.

## Personalize assigned training

Open a client's assigned plan and choose Personalize plan. The worksheet identifies the client and plan dates, then lets you adjust workouts, exercises, set targets and weekday scheduling. Save client plan updates that independent copy and returns to the client's overview. The reusable template keeps its prescription.

Template and client editing share one worksheet and resource save hook. Route loading checks that the plan belongs to the client before opening the editor. Failed and partial saves retain the draft, stale revisions require explicit recovery, and unsaved navigation asks before discarding changes. Changing assignment dates is a separate task.

Run `rtk pnpm -C frontend/apps/coachapp test:client-training` with the isolated API and coach app running.

## Create and assign nutrition plans

Open Nutrition to create a reusable plan with optional daily calorie and macro targets. Start with the Everyday menu, add meals and food or recipe portions, and offer alternatives within a meal time. Create day variation copies its meals independently; assign menus to weekdays when needed. Preview meals resolves nutrition on the server before anything is saved. Unknown nutrient values remain explicit.

Save retains the successful metadata revision if the menu write fails. A lost creation response offers an in-place check for the empty template, preserving the worksheet. Conflicting revisions require loading the saved version; unsaved navigation prompts before discarding changes. Client Overview offers Assign nutrition plan with a complete preview, start date and optional end date. The server checks the reviewed revision, rejects overlapping coverage, and returns independent current/upcoming client plans.

Run `rtk pnpm -C frontend/apps/coachapp test:nutrition` with the isolated API running. The two real API browser suites cover creation, foods and recipes, portions, meal alternatives, independent day variations, server preview, persistence, cursor paging/search/retry, partial and lost-write recovery, validation, assignment and account isolation at 375px and 1280px. Creating library foods and recipes is a separate task.

## Personalize assigned nutrition

Open a client's current or upcoming nutrition plan and choose Personalize nutrition plan. The worksheet identifies the client and dates, then lets you change daily targets, meals, portions and day variations. Preview meals resolves nutrients on the server. Save client plan updates that copy and returns to refreshed client coverage with a saved message.

The template and assigned-copy screens share one worksheet. Route loading checks ownership before editing, and archived plans are unavailable. Partial saves retain the successful revision and draft; conflicts or uncertain saves offer loading the saved version. Navigation protects unsaved edits. Assignment dates stay outside this worksheet.

Run `rtk pnpm -C frontend/apps/coachapp test:client-nutrition` with the isolated browser API and coach app running. It covers current/upcoming copies, server preview, template independence, save recovery and session isolation at 375px and 1280px.

## Food library

Open Nutrition, then Food library. Search foods or create a food with nutrition per 100 g. Unknown values stay blank, and zero stays explicit. Optional details contain brand, category, supported allergen and dietary-tag checkboxes, and notes. Custom foods can be edited; shared system foods are read-only. Serving sizes support names, amounts, units, weights, a default choice and removal with Undo. Referenced servings cannot be removed or renamed until their uses change. Photo/video uploads support preview, replacement, removal with Undo and recovery. Save food applies media changes; metadata-only saves preserve the existing attachment.

The meal picker uses the same food resource hook. Food updates invalidate nutrition queries because recipes and meals resolve library nutrients. Revision conflicts retain edits and offer loading the saved version. Interrupted creation offers checking saved foods before a separate create. Search, loaded pages and return position use the shared list foundation.

Run `rtk pnpm -C frontend/apps/coachapp test:foods` with the isolated API and coach app running. The browser flow covers creation, nullable nutrients, tags, editing, conflicts, lost responses, server paging/search/retry, return position, meal-plan integration and session isolation at 375px and 1280px.

## Mobile foundation

Clients, Invite client, and Invitation detail share the compact app shell, `PageHeader`, `Surface`, status badges, and control styles. Phone layouts use 20px gutters, 16px input text, and controls at least 44px tall. The invite action bar stays at the bottom on phones; desktop uses inline actions and two columns.

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

With the normal development API on 4000 and coach app on 2022, run from `frontend/`:

```sh
rtk pnpm -C apps/coachapp build
rtk pnpm -C apps/coachapp test:browser
```

Browser tests create disposable accounts in the API's development database. Invitation fixtures use the backend's configured database by default; set `AUTH_TEST_DATABASE` when targeting an isolated instance. They exercise the real Phoenix API and inject transport failures for recovery checks. The concurrency regression uses a Vite module import, so run the browser suite against the development server. Screenshots and invitation fixtures are written to ignored `tests/auth/artifacts/`. Development OTP is `123456`; the app does not display or hardcode it.

For an isolated run, `tests/auth/dev-api.exs` creates/migrates `easy_browser_dev` and uses local mail. Start it from `backend/` with `PORT=44000`, and start a second Vite instance on 22022 with `COACHAPP_API_PROXY=http://127.0.0.1:44000`. Run the auth suite with `COACH_APP_URL=http://localhost:22022`, `API_URL=http://127.0.0.1:44000` and `AUTH_TEST_DATABASE=easy_browser_dev` so its browser, API requests and fixtures all use that instance.

Verified flows include wrong-code recovery, resend/change-email, unconfirmed signup recovery, business creation followed by failed scope upgrade, concurrent refresh, corrupted access tokens, rejected refresh sessions, permission errors, logout during refresh/verification, and invitation acceptance/expiry/revocation. Mobile is 375px; desktop is 1280px.

Protected deep links keep their destination, filters and fragment through sign-in, email changes, reload and business setup. Return addresses are validated against protected app routes. Each tab retains its own destination; explicit logout starts a fresh sign-in. `test:deep-links` runs that journey independently and is included in `test:browser`.

`test:auth-accessibility` covers real Tab/Enter navigation, validation focus, pending action names and geometry, long email wrapping, confirmation-link use and recovery after reuse, account loading and the unknown-route return link at both widths. It creates disposable accounts through the UI and is included in `test:browser`. Auth content receives focus when its screen changes; background refreshes preserve field focus.

## Test client invitations

Use the normal API on 4000 and coach app on 2022. Start the client app from the repository root:

```sh
rtk pnpm -C frontend/apps/clientapp-v2 dev
```

Then run:

```sh
rtk pnpm -C frontend/apps/coachapp test:clients
```

This suite creates disposable coaches and clients in the configured development database. At 375px and 1280px it checks field validation, request failures and recovery, invitation creation, reload, resend, clipboard failure, return from the client list, and acceptance through the client app. A delayed-response regression checks that changing coach accounts cannot restore the previous account's client data or navigate to that client. Screenshots are in ignored `tests/clients/artifacts/`.

An unfinished invitation warns before navigation or reload. While sending, in-app navigation waits for the request. A lost response retains the details and offers **Check saved clients** with server search and totals; open the saved client or deliberately return to retry after reviewing the results. This does not confirm email delivery. `test:invitation-recovery` runs these recovery scenarios independently at both widths and removes the clients it creates.

The same suite checks responsive layout at 375px, 390px, 768px, and 1280px, including touch targets, input text size, dialog scrolling and focus return, account-menu keyboard behavior, and field visibility above the action bar in a 480px-tall viewport. These are browser checks; physical-device keyboards and safe-area behavior still need device testing.

Resending renews the invitation expiry and keeps its link. Email delivery is asynchronous; invitation creation does not confirm delivery to an inbox.


Client profiles link to independent assigned training and nutrition plans.

## Contract and session decisions

Run `rtk just gen-api` at the repository root to regenerate the API types. The generator includes this app alongside the other apps. Auth error responses use `error_code`, `error_message`, and `error_detail`; the client reads the backend's actual error payload.

The session has an app-specific storage key. Logout removes credentials and query data, retaining a token-free revision so late sign-in responses cannot restore a signed-out session. The backend exposes no logout/revocation endpoint, so this is local logout. Public verification never silently replaces an intervening session.

Refresh is shared within a tab and uses Web Locks between tabs when available. A transport error preserves credentials. The API uses 403 for both invalid authentication and insufficient permissions, so protected requests refresh and retry once; a continuing permission error is shown without clearing the account.

## Lists

Clients, training plans, and the exercise picker share cursor pagination, server search and totals, a keyboard-accessible Load more fallback, and retry that preserves loaded rows. URL filters survive reload; loaded pages and scroll position survive returning from an editor while cached.

Run `pnpm test:lists` with the coach app and isolated browser API running. The scenarios exercise real API pagination and request failure recovery at 375px and 1280px.

## Recipe library

Nutrition → Recipe library supports cursor search, creation and revisioned editing. Add ingredients together, edit quantities beside each name, and remove with Undo. Preparation notes and finished weight are optional. Nutrition comes from the API for the whole saved recipe; unsaved edits hide those totals until saved. Allergens and dietary tags are editable in a separate disclosure; they remain manual declarations when ingredients change. Recipes can then be selected in meal plans.

Run `rtk pnpm -C frontend/apps/coachapp test:recipes` from the repository root with the coach app and isolated browser API running. The suite checks the full recipe task, request recovery, pagination, food-update invalidation, meal reuse and session isolation at 375px and 1280px.

## Exercise library

Training → Exercise library provides server search, cursor pagination, creation and editing. Names and coaching instructions stay visible; equipment, muscles and classifications are optional. Existing media and tracking data survive edits. Shared system exercises are read-only.

Copy exercise creates an independent exercise from saved details. Remove from library opens a deletion confirmation; planned workouts block deletion and logged history is preserved. Both actions protect unsaved edits and recover interrupted requests. Run `rtk pnpm -C frontend/apps/coachapp test:exercise-management` with API 44000 and app 22022; `COACH_API_URL` and `COACH_APP_URL` select another local pair.

Demonstration supports public JPG/PNG/WebP photos and MP4/WebM videos. Upload, preview, replace or remove a file, then Save exercise to apply it; removing a reference photo has Undo. Workout authoring and assignment previews open movement details on demand. Run `rtk pnpm -C frontend/apps/coachapp test:exercise-media` with normal API 4000, app 2022 and local MinIO 9000. The suite verifies actual upload bytes, anonymous reads, playback, failure recovery and session isolation.

Run `rtk pnpm -C frontend/apps/coachapp test:exercises` from the repository root with the coach app and isolated browser API running. The suite seeds equipment and muscle vocabulary in `easy_browser_dev`, then exercises authoring, recovery, list navigation, training-plan reuse and session isolation at 375px and 1280px. Exercise updates send only changed fields; the existing API does not provide same-field concurrent-edit protection.

## Client activity history

Client Overview links to training and nutrition history. Training history supports server search, date/state filters and cursor pages, with recorded sets and the frozen prescription on a session page. Nutrition history opens one date at a time, with logged totals beside targets, recorded portions and notes, and expandable meal guidance. Unknown nutrition and unrecorded food remain explicit.

Run `rtk pnpm -C frontend/apps/coachapp test:training-history` and `rtk pnpm -C frontend/apps/coachapp test:nutrition-history` with the app and isolated API running. Both verify real client writes, coach reads, history after plan edits, request recovery and account isolation at 375px and 1280px. Nutrition tests accept `COACHAPP_API_URL` and `COACHAPP_URL` for alternate ports.

## Conversations

Messages opens a searchable inbox with server-owned All and Unread filters. Client Overview links directly to the client's thread. Threads use the shadcn React Aria Message, Bubble, Attachment and Message Scroller primitives, with older history prepended above the reading position and an explicit Jump to latest action.

Workout and meal references open their record details inside the thread. Record voice note supports microphone permission recovery, playback, re-recording and discard before adding audio to the message.

Text and media drafts survive failed requests. An uncertain send requires checking recent messages before clearing the draft or deliberately sending again. Read state is shared by the coaching team and updates other team tabs through the inbox channel.

Run `rtk pnpm -C frontend/apps/coachapp test:conversations` with the API on 4000, coach app on 2022 and the API’s configured storage service running. Set `COACHAPP_API_URL` and `COACHAPP_URL` for alternate ports. The suite creates disposable accounts and messages, checks inbox search and draft/send recovery, and transfers real photo bytes through signed storage URLs. It injects selected failures to verify retries; successful storage requests are not simulated. Screenshots are under `tests/conversations/artifacts/`.

The current suite uses Chromium at 375px and 1280px. See `tests/conversations/README.md` for its exact scope and limits.

## Client details and access

Open a client and choose Client details. Edit coaching contact details, services, engagement dates and coaching stage. Accepted clients retain ownership of their account names. Save changes sends only edited fields, keeps the draft after failures, and protects unsaved navigation. Deactivate/reactivate and pending invitation revocation use separate confirmations. Reactivation can extend or clear an expired engagement end date; seat checks remain on the server.

The Clients roster has server-backed status and stage filters and reports actual Active, Invited or Inactive status. Run `rtk pnpm -C frontend/apps/coachapp test:client-management` against the isolated API and Vite app. The suite covers editing and reloading, field clearing, validation and lost-response recovery, access changes, filters, unsaved navigation and account isolation at 375px and 1280px. Screenshots go to ignored `tests/clients/artifacts/`.

## Profile and business settings

The account menu opens Your profile and Business settings. Each coach can edit their own name and phone. The owner can update business details, workout load units and the time zone used for future client invitations. Trainers see business settings as readable information. Each form saves only changed fields, protects unsaved navigation and retains drafts after failed requests.

Run `rtk pnpm -C frontend/apps/coachapp test:settings` with the isolated API and app running; set `COACHAPP_API_URL` and `COACHAPP_URL` for alternate ports. The suite covers owner/trainer permissions, saved preferences, real validation, lost responses, refresh failures and cross-business account replacement at 375px and 1280px.

## Normal development ports

The normal Easy backend uses port 4000 and coachapp uses port 2022. If port 4000 is occupied, identify the conflicting process before starting Easy; keep this API address stable for the other apps.

```sh
rtk proxy env PORT=4000 APP_URL=http://localhost:4000 FRONTEND_URL=http://localhost:2022 just backend
```

Set `COACHAPP_API_PROXY=http://127.0.0.1:4000` in the app's ignored `.env.local`, then run `rtk just coach`. This forwards both HTTP API and WebSocket requests. `VITE_API_BASE_URL` remains the separate deployed/test API-origin override. Development email uses the local mailbox unless `RESEND_API_KEY` is configured. The normal database remains separate from the isolated browser-test database.

## Manage the team

Owners can open Team from the account menu to invite coaches, resend or revoke pending invitations, and deactivate or reactivate accepted coaches. Each member page shows their assigned clients. Client details → Change coach offers active team members with server-owned client counts. Deactivation transfers clients to the owner and revokes HTTP/socket access; reactivation requires a fresh login and leaves assignments with the owner.

An unconfirmed coach invitation retains the details and offers **Check Team** before retrying. Open the saved coach to inspect their invitation or access. Sending again replaces an earlier invitation link, so retry remains deliberate. `test:team-invitation-recovery` runs the focused real-API journey on normal API 4000/app 2022 by default, or uses `COACHAPP_API_URL` and `COACHAPP_URL`. It is also included in `test:team` and removes its pending invitations during cleanup.

Run `rtk proxy env COACHAPP_API_URL=http://127.0.0.1:44000 COACHAPP_URL=http://localhost:22022 pnpm -C frontend/apps/coachapp test:team` with the isolated services running. It verifies paging, search, access changes, invitation and assignment recovery, and account isolation at 375px and 1280px.

## Billing

The account menu opens Billing: client capacity, subscription status, monthly cost and recent activity. Owners review seat changes before payment and confirm cancellation separately. Trainers can read capacity. Saved checkout requests and provider references support resuming after reload; unknown cancellation outcomes retain a retry action and block additional seat purchases.

Use the isolated API with `tests/billing/dev-api.exs` in place of the auth dev entry point, explicitly binding the endpoint to port 44000. This configures a fake Razorpay boundary at 44002. Keep the normal backend on 4000. With the isolated app at 22022, run `rtk pnpm -C frontend/apps/coachapp test:billing`; the suite starts/stops the fake provider and verifies mobile/desktop flows without real charges. It defaults to those isolated ports. Screenshots and fixtures are under ignored `tests/billing/artifacts/`.


## Food and recipe management

Saved editors offer Manage food/recipe. See direct uses in recipes, plan templates and accessible client plans, search across cursor pages, then return from a linked editor to the same search. Copy creates an independent saved item; delete protects structural uses and retains logged nutrition. Interrupted writes have explicit recovery and account guards.

Run `rtk pnpm -C frontend/apps/coachapp test:nutrition-library-management` with API 44000 and app 22022, or set `COACH_API_URL` / `COACH_APP_URL`.


Serving-size and recipe-tag coverage runs in `test:foods` and `test:recipes`. The shared tag controls use the same supported vocabulary in both editors; explicit clearing, failed-save recovery and referenced portions are covered.


Food photo/video controls share their upload behavior with exercises. Ingredient and meal pickers load previews only when opened. Run `rtk pnpm -C frontend/apps/coachapp test:food-media` with API 4000, app 2022 and MinIO 9000; alternate API/app ports use `COACH_API_URL` / `COACH_APP_URL`.


## Template management

Saved training and nutrition editors offer Manage template for copying, archive/restore and confirmed deletion. Client copies remain independent. Both libraries support server-filtered Active/Archived/All views. Run `rtk pnpm -C frontend/apps/coachapp test:plan-management` against API 4000 and app 2022, or set `COACH_API_URL` / `COACH_APP_URL`.


## Assigned plan dates and lifecycle

Client overview links to All training/nutrition plans and Manage dates and access. Find previous plans, change their date range, archive/restore, or delete while retaining recorded activity. Run `rtk pnpm -C frontend/apps/coachapp test:client-plan-management` with API 4000 and app 2022, or set `COACH_API_URL` / `COACH_APP_URL`.

## Nutrition portions and day menus

Meal rows keep inline quantities and offer Change portion for available gram or serving choices. Remove day menu asks for replacement weekdays and keeps shared meals. Item and day-menu removal have Undo; weekday choices made after removal stay intact when undoing. Run `rtk pnpm -C frontend/apps/coachapp test:menu-editing` with API 4000 and app 2022, or set `COACH_API_URL` / `COACH_APP_URL`.

## Arrange nutrition menus

Arrange menus orders day menus, alternatives and foods without adding controls to each worksheet row. Meal times keep their fixed daily order. Apply order updates the draft; Save nutrition plan persists it. Run `rtk pnpm -C frontend/apps/coachapp test:menu-order` with API 4000 and app 2022, or set `COACH_API_URL` / `COACH_APP_URL`.
