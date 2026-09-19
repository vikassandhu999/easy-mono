# Client app rebuild

Build `frontend/apps/clientapp` as one React application for browser, iOS, and Android. The original objective is preserved in `objective.txt`. Do not consult either v2 app's implementation or screens. The coachapp rewrite supplies engineering conventions and the installed shadcn React Aria primitives; client interactions are designed from backend behavior.

## Daily experience

When I open the app, I need to know what needs my attention and continue my next task without searching. Today prioritizes an unfinished workout, outstanding intake/check-ins, training guidance, and nutrition. It must distinguish a rest day, missing coverage, loading, and failed reads. Four primary destinations are Today, Training, Nutrition, and Messages; history and account remain reachable from their relevant destinations and the account entry.

Use 20px phone gutters, a bounded mobile screen on tablets and browsers, 16px inputs, 44px minimum targets, and 48px primary actions. Show exercise names and targets before secondary details. Prefer separated rows and whitespace to nested cards. Show a specific saved outcome beside the action. A safe-area-aware action footer must remain reachable with the keyboard open. shadcn Select, dialogs, sheets, and chat components retain their accessible APIs.

## Screen sequence

1. Native foundation and authentication: invitation preview/acceptance, email OTP, protected destination, session restoration, sign-out, safe return/deep links. Prove one authenticated read/write/reload workflow on both native platforms before expanding all screens.
2. Intake and check-ins: outstanding assignments, complete questions, recover account-scoped drafts, attach progress photos, submit, confirm saved response, return to Today.
3. Today and training: server coverage and active session, workout selection, frozen prescription, set recording/edit/removal, finish/discard, saved session and return. Freestyle follows the supported execution contract.
4. Nutrition: date-specific guidance, compact meal alternatives, portions and extras, revisioned slot save, server totals, saved day and return.
5. Messaging: coach thread, opaque cursor history, text and supported uploads, stable send identity/recovery, read state, return.
6. History/progress: session reader, nutrition day reader, completed responses, weight records and server-computed progress where exposed.
7. Account/preferences: supported profile fields, local preferences with explicit ownership, notification behavior only where delivery is supported.
8. Connected mobile and native audit, physical-device/human checklist, coherent verified commits.

The user clarified that this is a mobile-only app. Do not create desktop screen layouts; tablets and wide browser windows retain the mobile screen. Browser viewport checks at wider sizes only verify that the mobile screen remains usable.

Write a screen brief before each slice: situation, primary action, two interaction choices, selection rationale, entry/exit, empty/error/retry states, interruption recovery, and verification evidence. Complete one vertical slice before counting it as delivered.

## Cross-cutting design

React Query owns server state. Resource hooks own account-scoped keys and invalidation; mutations reject late completions from another session. Generated types and openapi-fetch remain the client boundary. React Hook Form handles inputs and basic field rules; the server owns business validation. Avoid a second schema system.

Follow opaque server cursors without deriving totals or counts from loaded rows. The backend needs focused client pagination changes identified in `workflows.md`. Shared cursor helpers and list UI are built before the second list.

Persist draft changes as they occur, isolated by authenticated account and resource. Clear account caches and drafts on explicit logout; stale async work cannot restore either. Native lifecycle handlers refresh active reads on resume. Writes remain deliberate: no general offline queue. A lost response requires a read-back or stable server idempotency key before retrying a creation.

## Offline policy

| Workflow | Reading | Writing/recovery |
| --- | --- | --- |
| Authentication/invitation | Explain connection requirement | No queued authentication; preserve challenge through restart, never persist OTP |
| Today/plans/history | Last successfully fetched, account-isolated data with stale indication | Refresh when connected; server remains authoritative |
| Workout | Persist prescription/session context needed to resume | Persist unsaved entries; submit deliberately; reconcile saved sets before retry |
| Intake/check-in | Preserve assignment snapshot with draft | Persist answers; uploads require connection; reconcile submission status |
| Nutrition | Cached selected day with saved timestamp | Persist slot draft and expected revision; conflict requires fresh server comparison |
| Messages | Cache loaded thread for the account | Retain composer/attachment intent; stable send identity if supported; no automatic queue |
| Account/weight | Cached profile/history | Keep unsaved input; server-confirmed save, no silent overwrite |

## Native foundation

Use Capacitor 8 with the repository-compatible dependency versions. Bundle the same Vite output into both native projects. Configure API origin explicitly for native builds and allow local HTTP only in development configurations. Keep native adapters feature-agnostic under `ui/` or `api/` according to the frontend import boundary.

Use App lifecycle/deep-link/back events and Keyboard behavior early. Preferences provides durable native storage; evaluate credential storage separately from drafts before production. Camera/photo permissions are requested when attaching a photo, with denial recovery. Notification delivery is an API gap, not an excuse to ask for permission on first launch.

Use a local scheme for simulator verification. Verified universal/app links require a real owned domain and signing configuration; record that separately. Native runtime tests must cover authentication, reload/restart, background/resume, keyboard, safe areas, back, deep links, and network failure. Browser checks do not prove those behaviors.

## Sources and contract decision

Read: root/frontend/backend instructions, `CONTEXT.md`, coach rewrite `plan.md`, `mobile-foundation.md`, `lists.md`, and training/diary ownership ADRs. Contract inventory comes from `backend/lib/easy_web/router.ex`, client controllers, and `EasyWeb.Types.*`.

The objective requests OpenApiSpex, but the checked-in backend has migrated client controllers to typed routes. Regenerating OpenAPI on 2026-09-19 produced 11 paths, all auth/webhook. The user selected the current typed-route pipeline and explicitly authorized reusing coachapp auth and engineering patterns. Auth retains OpenAPI generation.

Capacitor requirements checked against [official environment documentation](https://capacitorjs.com/docs/getting-started/environment-setup). The machine has Xcode 26.2 and iOS 26.3 simulators. Android command-line tools and Android Studio exist; no SDK packages were installed at initial inspection.
