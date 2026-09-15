# Coach app rebuild

Build one complete coaching task at a time. The first deliverable is authentication in `frontend/apps/coachapp`, using the Phoenix API and shadcn's React Aria base. Write the application code from scratch. Do not consult coachapp-v2 code, screens or references. Use the backend contract for behavior and this plan for UX decisions.

## Product loop

The whole-app objective and remaining tasks are tracked in [the completion ledger](completion.md). Complete and verify each task without consulting the old app.

1. Pick a coach, a situation, and an outcome. Write: "When ___, I need to ___, so that ___." Record the device, frequency, information needed, and the costly mistake to prevent.
2. Write a short screen brief before layout: entry, primary decision, action, successful exit, empty/loading/error states, and recovery after interruption. Identify what belongs on another screen.
3. Explore two interaction approaches with realistic content. Choose based on the task, including keyboard and mobile behavior. Review the interaction before expanding scope.
4. Build that vertical slice against the real API. Keep behavior beside its screen. Add a shared component only when it has a clear job; promote feature components when another real use demonstrates the same needs.
5. Exercise the complete task at 375px and 1280px, including a failed request and recovery. Review with a target coach: can they finish unaided, what did they misunderstand, and where did they backtrack? Record results before choosing the next slice.

Count completed coaching outcomes, avoidable mistakes, and requests for help. Set timing targets after observing the first usable version. A component count or number of finished screens is not a product success metric.

## Suggested sequence

- Authentication and a minimal signed-in destination.
- Invite a client and provide their intake. Selected by the product owner; see [the slice brief](invite-client.md). Use the business's default intake, with a preview before sending, then support returning to and resending the invitation. The client can accept and open their intake. Full onboarding includes plans, which are outside this slice.
- The client context that task actually needs.
- Adjacent actions exposed by using that slice, such as changing a prescription.
- Navigation and reusable patterns derived from the completed slices.

Avoid a speculative dashboard, a large component kit, a complete sidebar, or parallel builds of unfinished screens. Backend vocabulary remains the contract; frontend layout and component choices are open for reconsideration.

## Auth design

Use email OTP, matching the backend. Include login, signup/email confirmation, resend, change email, trainer invitation preview/acceptance, business registration, persisted sessions, refresh, route protection, and local logout. No password or social-login flows are exposed by the auth contract.

Use generated API types and React Hook Form's basic field rules. The backend validates business constraints and returns field errors. Do not add Zod or maintain a parallel schema layer. Validate persisted session and challenge data with small boundary checks.

Keep public auth calls independent of stored credentials. Store one validated session record under an app-specific key. Share token refresh within a tab and serialize refresh between tabs. Preserve sessions on transport failures, throttling, and server errors. Clear credentials and query data on invalid sessions and explicit logout. Late requests must not restore a logged-out session.

An unfinished signup must resume business setup. Guest sessions attempt coach promotion before offering registration, so a business created before an interrupted refresh does not get created again. Coach sessions validate through the profile endpoint. An invitation must not silently replace a signed-in account.

Use explicit routes and a single OTP screen with a validated challenge in session storage, so reload works without putting email addresses or OTPs in the URL. Keep a single ordinary OTP input with paste and one-time-code autocomplete. Use labelled controls, visible focus, inline errors, pending actions, and an explicit resend action with cooldown. Do not show the development OTP in shipped UI.

Install only shadcn primitives needed by auth. Use neutral tokens and a compact form surface. The signed-in destination identifies the account and supports logout; it makes no commitments about the future coaching workspace.

## Implementation and verification

- [x] Session and API foundation: `src/api/session.ts`, `client.ts`, `auth.ts`, `keys.ts`, `query-client.ts`, generated `schema.ts`. Test refresh sharing, rejected versus temporarily unavailable sessions, logout during refresh, and corrupt storage in `tests/auth/session.test.ts`.
- [x] Auth routes and forms: `src/auth/`, `src/router.tsx`, `src/routes.ts`, minimal `src/app-shell.tsx`, and the necessary `src/ui/` primitives. Browser scenarios in `tests/auth/auth.browser.mjs` cover login, signup/setup, invitations, invalid OTP recovery, resend, reload, guards, and logout.
- [x] Workspace integration: strict TypeScript, Tailwind, app-owned shadcn aliases, API generation, environment example, build/check scripts, and dev-server proxy.
- [x] Verify typecheck, behavior checks, production build, and browser scenarios at both widths. Run successful login/signup against the local Phoenix server with local-only mail delivery; simulate network and expiry failures at the browser boundary.

Verification: app build and Biome passed. Real API browser scenarios passed at 375px and 1280px, including invitations, interrupted setup, refresh failures, concurrent refresh, and logout during pending verification. Backend `mix precommit` passed with 1,617 tests and zero failures. The browser API uses the isolated `easy_coachapp_auth_dev` database and local mail delivery.

Implementation stays in this working tree to preserve the user's initialized app. Deployment is outside this slice.

## Client invitation slice

Implemented the [approved invitation flow](invite-client.md): Clients entry, default intake preview, email invitation, persistent client detail, acceptance status, shareable link, and resend. The server resolves the preview through `GET /v1/coach/form-templates/default-intake`, using the same selection rule as client invitation creation. Generated API types were refreshed in both coach apps; coachapp-v2 has no handwritten changes.

Verification on 2026-09-09: coach and client builds passed, and the existing coach auth browser suites passed. Real API invitation scenarios passed at 375px and 1280px using the isolated database and local mail delivery. They cover failed preview and send, required fields, resend failure/recovery, reload, list navigation, clipboard failure, client acceptance, and opening the intake from the client app. The client app's OTP label was connected to its input after this flow exposed the missing association.

Independent review found a late invitation response could repopulate a different coach's cache and navigate to the prior client after an account switch. A real API regression reproduced the issue before the fix and passed afterward; the reviewer independently verified the fix. Invitation and resend mutations capture session identity and reject stale completions. Backend `mix precommit` passed 1,619 tests with zero failures. The client build reports vendor CSS minification and bundle-size warnings; its typecheck and checks pass.

This is browser verification, not a target-coach usability review. That review remains part of choosing the next slice. Full onboarding includes plans; this slice completes invitation and intake access only. No commit or deployment was requested.

## Client overview slice

The client-detail route now continues through accepted, intake-pending, submitted, and reviewed states. The coach can read grouped snapshot answers and persist an intake review. See [the overview brief](client-overview.md) for scope and checks. Plan preparation is the next onboarding task; this screen does not imply that reviewing intake completes onboarding.

## Forms slice

The user selected Forms listing and creation as the next slice. The new `/forms` entry leads to a dedicated editor for Intake and Check-in forms, section/question ordering, required answers, choices, preview, and reopening saved forms. Active Intake forms can become the default used by future invitations. See [the Forms brief](forms.md) for boundaries and verification. The user requested direct execution without Superpowers during this slice.

## Shared list foundation

Before adding screens, the user requested reusable infinite scrolling and server-owned counts and business selections. Forms and Clients use the [shared list foundation](lists.md), including cursor queries, server filtering and totals, failure recovery, and return navigation. App guidance records the rule for future screens.

## Training-plan assignment slice

The user selected assigning an existing training plan from Client Overview. The [assignment brief](assign-training-plan.md) records the list, full prescription preview, required start date and optional end date, saved Client Plan, stale-template recovery, and verification. Training lists reuse cursor pagination and server counts. Assignment creates an independent client copy and preserves the backend's overlap constraints. Training-template creation and editing are implemented in the following slice.

## Training template editor slice

Training navigation opens a searchable template library. Creation starts with a workout worksheet: select exercises, edit shared set targets, create independent variations, and assign days in the same view. Metadata is editable in place. One Save plan action coordinates the existing metadata and prescription writes, retaining successful revisions for recovery. See [the template editor brief](training-templates.md) for recovery and verification.

## Nutrition plan creation and assignment

The user selected nutrition next. Nutrition navigation opens the template library and a worksheet for daily targets, meal choices, food/recipe portions and day variations. Client Overview links to template selection, full preview and dated assignment. The server resolves meal nutrients, list totals and client coverage. See [the nutrition slice](nutrition-plans.md) for scope and verification.

## Personalize assigned training

Continue from Client Overview into the assigned plan's worksheet. The route identifies the client, checks ownership, and saves the independent copy through the existing revisioned API. Template and client editing share one worksheet; route loading stays separate. See [the personalization brief](personalize-training.md) for scope and verification. Assigned nutrition personalization follows below.

## Personalize assigned nutrition

Client Overview opens current and upcoming nutrition copies in the shared meal worksheet. The screen identifies the client, preserves compact day variations and optional guidance, and saves targets and meals through the revisioned API. Client coverage refreshes after writes, and the reusable template stays independent. See [the nutrition personalization brief](personalize-nutrition.md) for recovery and verified scenarios. The next adjacent task is creating library foods and recipes when a plan needs an item that is missing.

## Food library

Nutrition plans links to the searchable Food library. Coaches can create foods, enter nutrition per 100 g, select supported allergen and dietary tags, and edit custom foods through the revisioned API. The meal picker uses the same food queries and reflects saved library changes. Shared system foods remain read-only. See [the food library plan](foods.md). Recipe creation follows below.

## Recipe library

Nutrition links to a searchable Recipe library and a single recipe worksheet. Coaches select several ingredients, edit gram or serving quantities, set recipe servings, and optionally add preparation notes and finished weight. Saved nutrition comes from the backend for the whole recipe; the meal builder resolves serving nutrition. See [the recipe slice](recipes.md) for recovery and verification. Exercise authoring follows below.

## Exercise library

Training links to a searchable Exercise library. Coaches create and edit movement names, instructions and optional equipment, muscles and classifications. Shared exercises are read-only; custom exercise changes refresh the training picker and plan queries. The editor sends only changed fields through the existing API and preserves unexposed media and tracking data. See [the exercise brief](exercises.md) for recovery, checks and the API's concurrency limitation.

## Client check-in scheduling

Client Overview → Manage check-ins opens a client-scoped schedule list. Choose and preview a Check-in form, set the first due date and repetition, then save. Existing schedules support cadence/date edits, stopping and deliberate resumption. Server search, totals and cursor pagination include inactive history. See [the scheduling brief](check-in-schedules.md) for recovery, compatibility and verification. Reviewing client check-in submissions is the next adjacent task.

## Check-in review and history

Check-ins navigation opens the review list across visible clients. Client Overview and schedules link to response history. Saved question snapshots, review timestamps and photo access stay on a dedicated reading page. Search, review filters, counts and cursors are server-owned. See [the review brief](check-in-review.md) for mobile/desktop verification.

## Client activity history

Client Overview links to [training history](training-history.md), with session states, recorded sets, frozen prescriptions and cursor pagination, and [nutrition history](nutrition-history.md), with a day reader, logged totals, recorded portions and meal guidance. Both preserve server-owned values, client scope and recovery. [Client weight progress](weight-progress.md) adds the server-owned trend and cursor history.

## Conversations

Messages opens the server-filtered inbox, and Client Overview links to the client thread. shadcn Message, Bubble, Attachment and Message Scroller provide the conversation UI. See [the conversations brief](conversations.md) for verified history, sending and recovery flows and the remaining full-app work.

## Client profile and access

Client Overview → Client details provides contact, coaching services, engagement dates and weight goal editing. Access actions have separate confirmations, with expired-date recovery and pending invitation revocation. The roster filters status and stage on the server. See [the client management brief](client-management.md). Team-backed coach reassignment remains with Team; the Daily Workbench is the next coaching task.

## Daily Workbench

Workbench connects six server-owned queues to the completed task screens. Mobile uses a compact shadcn queue selector; desktop keeps the six choices visible. Native priority keysets, literal search, service filtering and counts stay in the backend. Snooze and task return navigation complete the session loop. See [the Workbench brief](workbench.md) for scope and verification.

## Profile and business settings

The account menu opens personal profile editing and owner-only business settings. Each page has one save action, changed-field patches and draft recovery. Business defaults include the weight unit and a server-validated time zone for future client invitations. Trainers can read business settings and edit their own profile. See [the settings brief](settings.md) for permission, failure-recovery and account-isolation verification. Team management follows.

## Sources

- `backend/lib/easy_web/controllers/auth_controller.ex`: public auth operations.
- `backend/lib/easy/identity/session_factory.ex`: guest/coach scope and membership checks.
- `backend/lib/easy_web/router.ex`: protected business and coach routes.
- [shadcn React Aria base](https://ui.shadcn.com/docs/changelog/2026-07-react-aria).
- [React Aria forms](https://react-aria.adobe.com/forms).

## Team and client reassignment

The account menu opens Team for owners. Search names or email, filter by status, and open a coach to manage their invitation or access and see their assigned clients. Client details provides Change coach with active candidates and a named confirmation. Deactivation transfers clients to the owner and revokes sessions; reactivation restores eligibility without moving clients back. See [the team brief](team.md) for recovery, concurrent writes and mobile/desktop verification. Billing verification is complete, including interrupted provider work and the invitation capacity link; see the billing brief for the operator recovery path.

## Coaching page and applications

The account menu opens Coaching page for authoring, preview, publication and anonymous applications. Applications in the main navigation provides the server-filtered inbox, original answers, review notes/status and enrollment through the client invitation flow. The mobile and desktop journeys cover paging, concurrent edits, lost responses, intake preview and capacity recovery. The authoring and visitor audit also covers all layouts, long copy, ordering, refresh failures, stale forms and receipt recovery after an address change. See [the acquisition brief](acquisition.md) for verification. Forms lifecycle management follows as part of completing library actions.

## Form lifecycle management

Saved form editors now link to a dedicated management page with server usage counts, archive/restore, unused deletion and explicit/automatic intake selection. The Forms list has server-owned Active/Archived/All filters. Revision checks protect concurrent maintenance and authoring; archived forms leave new selections while existing assignments and recurring schedules continue. See [the management brief](form-management.md) for mobile/desktop recovery checks and backend verification.

## Intake follow-up

Onboarding clients now show intake and invitation context before activity sections. Outstanding intake has a reminder action and a compact follow-up dialog for due date/priority; dismiss and reopen explain their consequences. Status-checked writes and row locks protect concurrent client submission, and mutations refresh Workbench and client reads. See [the follow-up brief](intake-follow-up.md) for recipient/uncertain-delivery behavior and real API/browser verification.

## Exercise copying and deletion

Saved exercise editors offer an independent copy with a name confirmation and a quieter removal section. The server blocks deletion through the prescription foreign key; logged history survives. Interrupted copies require explicit saved-result review, while deletion can confirm absence by reading the same resource. See [the management brief](exercise-management.md) for normal and isolated mobile/desktop verification. Media editing follows.

## Exercise demonstrations

The exercise editor supports a photo/video demonstration and reference-photo removal with Undo. Uploading prepares the file; Save exercise applies the draft. The picker loads media when details open, and workout authoring and plan previews have an on-demand movement reader. Real storage/playback, interruption recovery and training regressions pass at both widths; see [the media brief](exercise-media.md). The next library task is food and recipe copying/deletion and completing their editable fields.


## Food and recipe management

Saved food and recipe editors open usage management with server-counted categories, cursor search and links to dependent recipes and plans. Coaches can create independent copies or delete unused items with recovery for interrupted writes. Trainer visibility and deletion protection are enforced by the API. See [the management brief](nutrition-library-management.md). Serving-size authoring and recipe dietary fields now follow below; food media authoring follows below.


## Serving sizes and recipe tags

Food editing groups a named serving with its amount, unit and total weight, plus a default choice and reversible removal. Recipe editing exposes manual allergen and dietary declarations through the shared food tag controls. Referenced servings stay protected by the API; recipe writes refresh food usage. See [the detail-authoring brief](nutrition-library-details.md) for browser verification. Food media follows below.


## Food media

Food editing now supports public photo/video uploads with draft replacement/removal and interrupted-write recovery. Both nutrition pickers load media on demand. Exercise and food uploads share the same validation, retry and cancellation controls. See [the food media brief](food-media.md) for real-storage verification. The next gap is plan lifecycle management: copying, archiving/restoring and deleting templates, followed by client coverage edits.

## Training and nutrition template management

Saved template editors now open a dedicated management page for independent copying, archive/restore and confirmed deletion. Both libraries use server-owned Active/Archived/All cursor filters. Revision checks protect newer edits; interrupted operations recover without automatically repeating copies. Assigned client plans survive source-template maintenance. See [the management brief](plan-management.md) for verification. Client-plan coverage is next.

## Client plan dates and lifecycle

Client overview and assigned builders now open client-scoped management. All assigned plans keeps ended and archived plans reachable through server cursor search. Dates, archive/restore and deletion protect revisions, overlaps, independent templates and recorded activity. Local-day lifecycle labels respect client and business timezones. See [the client-plan management brief](client-plan-management.md) for mobile/desktop and backend verification. The next pass checks all prescription/menu fields and remaining application tasks.

## Shared training targets

Uniform working sets can receive duration, distance, effort and notes in one local edit. Batch additions accept the same targets; matching-set updates preserve individual extras. The prescription field audit and real API regressions cover save/reopen, validation, cancellation, failed-save recovery, zero and cleared values at both widths. See [the field audit](prescription-fields.md). Nutrition menu editing is next.

## Nutrition portions and day-menu removal

Meal items support server-provided portion choices and typed fractional quantities. Coaches can remove a day menu, choose replacement weekday assignments and Undo without reverting later edits. Shared meals remain intact. See [the menu-editing brief](menu-editing.md). Remaining menu ordering and full application journeys follow.

## Nutrition menu order

Arrange menus provides a compact drill-down view for day-menu, alternative and food ordering. Meal times keep the server's fixed order. Cancel, Apply order, keyboard focus, preview and persistence are verified at both widths; see [the ordering brief](menu-order.md). The remaining client/form tasks and full application audit follow.
