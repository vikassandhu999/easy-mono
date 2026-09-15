# Coach app route audit — 2026-09-15

Inventory comes from the current router, not the navigation. Earlier slice evidence remains in completion.md; pending rows below require a current route audit. Tests use separate disposable accounts and only mutate their own records. No handwritten coachapp-v2 files are consulted.

| Route | Role | Viewport | States covered in this audit | Result | Findings |
| --- | --- | --- | --- | --- | --- |
| /login | Public | 375 / 1280 | Code request/retry, validation, keyboard focus/ring, pending name/disabled/geometry, safe returns, separate tabs | Passed listed states | NAV-01, A11Y-01, A11Y-02 |
| /signup | Public | 375 / 1280 | Keyboard creation, empty and partial validation, route focus, signup/setup and recovery regressions | Passed listed states | NAV-01, A11Y-02 |
| /verify | Public | 375 / 1280 | OTP validation/retry/resend, long email, keyboard focus, real confirmation link and used-link fallback | Passed listed states; expired-link UI case remains | NAV-01, A11Y-02, LAYOUT-01 |
| /accept-invite | Public / signed-in guard | 375 / 1280 | Missing, revoked, expired, accepted, reload, invalid OTP, account guard | Passed existing flow; full state sweep at each width pending |  |
| /coaching/:slug | Public | 375 / 1280 | Published/offline views, contact and hidden-field validation focus, lost submission/reload, stale-page retry with retained answers, updated selection and focused receipts after address changes | Passed listed states | APPLICATIONS-02 |
| / | Coach | 375 / 1280 | Post-login, sessions, roster status/stage filters, cursor pages, search/return, observer-free loading and offline recovery | Passed listed states | NAV-01 |
| /workbench | Coach | 375 / 1280 | Six queues, cursor pages/counts/search, task completion/return, summary failure, retained refresh, snooze validation/recovery, long titles and account isolation | Passed listed states | WB-01, WB-02 |
| /team | Owner / trainer denied | 375 / 1280 | Cursor pages, search/status, refresh failures, retained rows, return/reload and permissions | Passed listed states | |
| /billing | Coach / owner restrictions where applicable | 375 / 1280 | Capacity, owner/trainer controls, seat-form entry and range errors, confirmation/checkout/lost-write focus, reload, cancellation and session isolation | Passed listed states | BILLING-01 |
| /coaching-page | Coach / owner restrictions where applicable | 375 / 1280 | Draft/preview/publication, copy-link failure/retry, offline error focus and retry, retained live status after failure, focused offline result and refresh recovery | Passed listed states | PUBLISHING-01, PUBLISHING-02 |
| /applications | Coach / owner restrictions where applicable | 375 / 1280 | 46 rows, server search/status/counts, keyboard paging/retry, empty status/search, visible row focus and opening/return navigation | Passed listed states | APPLICATIONS-03 |
| /applications/:id | Coach / owner restrictions where applicable | 375 / 1280 | Frozen answers, review recovery/revisions, stale-error focus, failed saved-review reload and keyboard recovery, retained notes and account isolation | Passed listed states | APPLICATIONS-01 |
| /applications/:id/enroll | Coach / owner restrictions where applicable | 375 / 1280 | Intake preview/retry, field and stale-error focus, retained contacts, lost enrollment recovery, successful View client handoff, seat-limit billing link and account isolation | Passed listed states | APPLICATIONS-01 |
| /coaching-page/edit | Coach / owner restrictions where applicable | 375 / 1280 | All layouts, long copy, failed images, row limits/order/removal, closed-section validation focus, saved/dirty feedback, stale save and failed reload recovery, trainer edits and session isolation | Passed listed states | PUBLISHING-01, PUBLISHING-02 |
| /team/invite | Owner | 375 / 1280 | Field validation/focus, dirty/pending navigation, uncertain send, lookup/empty retry, saved-member recovery, filter return and account replacement | Passed listed states | TEAM-01 |
| /team/:id | Owner / trainer denied | 375 / 1280 | Expired/pending/active/inactive, resend/revoke, concurrent acceptance, deactivate/reactivate, client transfer and return | Passed listed states | |
| /clients/:id/coach | Owner / trainer denied | 375 / 1280 | Active-coach search, current/disabled choices, confirmation, failed assignment/retry and resulting visibility | Passed listed states | |
| /settings/profile | Owner / trainer | 375 / 1280 | Saved profile/header, changed fields, failed-save error and keyboard retry, focused saved result, draft retention and unsaved navigation | Passed listed states | SETTINGS-01 |
| /settings/business | Owner / trainer read-only | 375 / 1280 | Preferences, required-name and server time-zone focus, load/save/refresh failure, lost response, focused save/discard, trainer read-only view and late-account isolation | Passed listed states | SETTINGS-01 |
| /clients/invite | Coach | 375 / 1280 | Intake loading/error/preview, validation, send/retry, dirty and pending navigation, reload warning, lost-response lookup, session isolation | Passed listed states | INV-01 |
| /clients/:id | Coach | 375 / 1280 | Invitation lifecycle, intake review, reminder uncertainty, due date/priority, dismiss/reopen, concurrent submission, refresh and account isolation | Passed listed states | |
| /clients/:id/profile | Coach | 375 / 1280 | Contact/services/stage/dates/goal, ownership, changed fields, save/lost response, dirty navigation, lifecycle, invalid ID and account changes | Passed profile/lifecycle suite | |
| /messages | Coach | 375 / 1280 | Server search/status totals, cursor pages, empty/loading/error/retry, return filters and live updates | Passed listed states | CHAT-01 |
| /clients/:clientId/conversation | Coach | 375 / 1280 | Cursor history/anchors, live read/handled conflicts, draft/uncertain-send recovery, response sharing, reconnect, photo/audio/video real storage and retries, account isolation | Passed listed states | CHAT-01 |
| /clients/:clientId/training-sessions | Coach | 375 / 1280 | Real session states, cursor pages/counts/search, date validation/focus, retained refresh/next-page recovery, saved list position and long plan names | Passed listed states | HISTORY-01 |
| /clients/:clientId/training-sessions/:id | Coach | 375 / 1280 | Recorded units/sets, frozen prescription after library edits, empty work, missing/failed/retried detail, retained refresh, long saved plan names | Passed listed states | HISTORY-01 |
| /clients/:clientId/nutrition-history | Coach | 375 / 1280 | Real recorded totals, missing/zero nutrients, frozen guidance, long meal names, date validation/focus/reload, client timezone, retained refresh and account isolation | Passed listed states | HISTORY-02 |
| /clients/:clientId/weight-progress | Coach | 375 / 1280 | Server trend/totals, mixed units, form provenance, cursor pages, empty/single/constant trend, dates, retry and account isolation | Passed listed states |  |
| /clients/:id/check-ins | Coach | 375 / 1280 | Real edit/stop/resume, long names/confirmation, server search/counts/cursor pages, recovery and account isolation | Passed listed states | CHECKIN-01, CHECKIN-02 |
| /clients/:id/check-ins/new | Coach | 375 / 1280 | Form search/preview, long names, validation/draft protection, keyboard saved-result lookup/retry, empty-lookup focus restoration, uncertain leave warning, duplicate/capacity errors, real client-app answer/review | Passed listed states | CHECKIN-01, CHECKIN-02 |
| /check-ins | Coach | 375 / 1280 | Server search/status/counts, cursor pages and recovery | Passed listed states | |
| /check-ins/responses/:id | Coach | 375 / 1280 | Frozen answers, review/retry, persisted review and account isolation, actual photo signing/storage recovery and decoding | Passed listed states | PHOTO-01 |
| /clients/:clientId/check-in-responses | Coach | 375 / 1280 | Client-scoped history, server search/counts/cursor pages, navigation and recovery | Passed listed states | |
| /clients/:clientId/check-in-responses/:id | Coach | 375 / 1280 | Client-scoped frozen answers, review/retry and persisted review, actual photo signing/storage recovery and decoding | Passed listed states | PHOTO-01 |
| /clients/:id/training-plans/assign | Coach | 375 / 1280 | Three template pages, totals/search, paging retry, return position, empty and unavailable templates | Passed listed states | |
| /clients/:id/training-plans/assign/:templateId | Coach | 375 / 1280 | Prescription preview, date validation/overlap focus, stale and failed refresh keyboard recovery, retained dates, focused updated preview, lost writes and independent client access | Passed listed states | ASSIGN-01 |
| /training-plans | Coach | 375 / 1280 | Template creation/editing, exercise cursor pages, compact sets, shared targets, variations, replacement/Undo, hidden validation and interrupted-save recovery, lifecycle/status filters, three cursor pages and return navigation | Passed listed states | |
| /training-exercises | Coach / owner restrictions where applicable | 375 / 1280 | Server paging/search, retry, return position and training reuse | Passed existing suites; expanded audit pending | |
| /training-exercises/new | Coach / owner restrictions where applicable | 375 / 1280 | Authoring, reference selection, validation, interrupted creation and session isolation | Passed existing suites; expanded audit pending | |
| /training-exercises/:id | Coach / owner restrictions where applicable | 375 / 1280 | Editing, shared read-only view, copy/delete constraints, recovery and real photo/video media | Passed existing suites; expanded audit pending | |
| /training-plans/new | Coach | 375 / 1280 | Template creation/editing, exercise cursor pages, compact sets, shared targets, variations, replacement/Undo, hidden validation and interrupted-save recovery | Passed existing suites; expanded audit pending | |
| /clients/:clientId/training-plans | Coach | 375 / 1280 | Client personalization, independent copy, recovery and route ownership, lifecycle/status filters, three cursor pages and return navigation | Passed listed states | |
| /clients/:clientId/training-plans/:id/manage | Coach | 375 / 1280 | Dates, overlap/stale error focus, retained drafts, saved-date reload, archive/restore conflict, deletion preserves recorded history, session isolation | Passed listed states | PLAN-01 |
| /training-plans/:id/manage | Coach | 375 / 1280 | Independent copy, archive/restore/delete, stale/lost-write recovery, assigned-copy survival, error focus and keyboard recovery, failed reads and account isolation | Passed listed states | PLAN-01 |
| /training-plans/:id | Coach | 375 / 1280 | Template creation/editing, exercise cursor pages, compact sets, shared targets, variations, replacement/Undo, hidden validation and interrupted-save recovery | Passed existing suites; expanded audit pending | |
| /clients/:clientId/training-plans/:id/edit | Coach | 375 / 1280 | Client personalization, independent copy, recovery and route ownership | Passed existing suites; expanded audit pending | |
| /nutrition-plans | Coach | 375 / 1280 | Creation/editing, meals/alternatives/day menus, portions, server nutrition, validation/Undo, ordering, preview and interrupted-save recovery, lifecycle/status filters, three cursor pages and return navigation | Passed listed states | |
| /nutrition-foods | Coach / owner restrictions where applicable | 375 / 1280 | Server paging/search, retry and return position | Passed existing suites; expanded audit pending | |
| /nutrition-recipes | Coach / owner restrictions where applicable | 375 / 1280 | Server paging/search, retry and return position | Passed existing suites; expanded audit pending | |
| /nutrition-recipes/new | Coach / owner restrictions where applicable | 375 / 1280 | Batch ingredients, portions, Undo, saved server totals and uncertain creation | Passed existing suites; expanded audit pending | |
| /nutrition-recipes/:id | Coach / owner restrictions where applicable | 375 / 1280 | Revision conflicts, failed reads/writes, food invalidation, meal reuse and session isolation | Passed existing suites; expanded audit pending | |
| /nutrition-foods/new | Coach / owner restrictions where applicable | 375 / 1280 | Authoring, unknown/zero nutrition, interrupted creation and meal reuse | Passed existing suites; expanded audit pending | |
| /nutrition-foods/:id | Coach / owner restrictions where applicable | 375 / 1280 | Revision conflicts, preserved serving sizes, shared read-only view and real media recovery | Passed existing suites; expanded audit pending | |
| /nutrition-foods/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Server usage pages, copy/delete, reference constraints and interrupted writes, copy-recovery focus and deliberate keyboard retry | Passed existing suites; expanded audit pending | LIBRARY-01 |
| /nutrition-recipes/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Server usage pages, copy/delete, reference constraints and interrupted writes, copy-recovery focus and deliberate keyboard retry | Passed existing suites; expanded audit pending | LIBRARY-01 |
| /nutrition-plans/new | Coach | 375 / 1280 | Creation/editing, meals/alternatives/day menus, portions, server nutrition, validation/Undo, ordering, preview and interrupted-save recovery | Passed existing suites; expanded audit pending | |
| /clients/:clientId/nutrition-plans | Coach | 375 / 1280 | Client nutrition editing, independent copies, variations, preview, coverage and recovery, lifecycle/status filters, three cursor pages and return navigation | Passed listed states | |
| /clients/:clientId/nutrition-plans/:id/manage | Coach | 375 / 1280 | Dates, overlap/stale error focus, retained drafts, saved-date reload, archive/restore conflict, deletion preserves recorded history, session isolation | Passed listed states | PLAN-01 |
| /nutrition-plans/:id/manage | Coach | 375 / 1280 | Independent copy, archive/restore/delete, stale/lost-write recovery, assigned-copy survival, error focus and keyboard recovery, failed reads and account isolation | Passed listed states | PLAN-01 |
| /nutrition-plans/:id | Coach | 375 / 1280 | Creation/editing, meals/alternatives/day menus, portions, server nutrition, validation/Undo, ordering, preview and interrupted-save recovery | Passed existing suites; expanded audit pending | |
| /clients/:clientId/nutrition-plans/:id/edit | Coach | 375 / 1280 | Client nutrition editing, independent copies, variations, preview, coverage and recovery | Passed existing suites; expanded audit pending | |
| /clients/:id/nutrition-plans/assign | Coach | 375 / 1280 | Search, keyboard selection and visible row focus through full nutrition suite | Keyboard selection passed; expanded list audit pending | ASSIGN-02 |
| /clients/:id/nutrition-plans/assign/:templateId | Coach | 375 / 1280 | Meal preview, date/overlap focus, stale and failed refresh, retained dates, focused updated prescription, lost-write lookup and independent client copy | Passed listed states | ASSIGN-01 |
| /forms | Coach | 375 / 1280 | Deep links, cursor pages, server totals/search/status/purpose, retry, search races, offline and observer-free loading, return scroll | Passed listed states | NAV-01 |
| /forms/new | Coach | 375 / 1280 | Create, sections/questions/order, required/choice validation, preview, failed save, saved-result lookup and retained draft | Passed listed states | NAV-01, FORM-01 |
| /forms/:id | Coach | 375 / 1280 | Saved-record deep link, reload, edits, purpose lock, default intake, stale revisions, dirty navigation and account isolation | Passed listed states | NAV-01 |
| /forms/:id/manage | Coach | 375 / 1280 | Archive/restore, unused deletion, usage links/counts, defaults/fallbacks, conflicts, interrupted writes and account isolation | Passed management suite | |
| /register-business | Guest | 375 / 1280 | Keyboard creation, validation, failed promotion/retry, reload, main focus, requested destination | Passed listed states | NAV-01, A11Y-02 |
| * | Public | 375 / 1280 | Unknown address, main focus, keyboard return to account | Passed | A11Y-02 |

## Findings

- TEAM-01 — After a lost invitation response, Send invitation remained available and retried the create endpoint, which rotates an existing pending invitation link. Classification: behavioral. Fixed in team/invite-coach.tsx and api/team.ts. The real lost-response probe fails against the prior screen and passes afterward at both widths. Check Team retains the submitted identity, uses server search/counts and opens the saved member without another send. An empty lookup permits a deliberate retry. Field errors and recovery receive focus; pending navigation cannot discard the in-flight attempt.

- WB-01 — A long unbroken intake title widened Workbench beyond the viewport. Classification: objective visual defect. Fixed in workbench/workbench-task.tsx with wrapping that also allows intrinsic layout width to shrink. The pre-fix probe fails document-width checks; the same long-title fixture passes at 375px/1280px afterward. Screenshots: tests/workbench/artifacts/getting-started-{375,1280}.png.
- WB-02 — Snoozing through yesterday reported success while leaving the task visible. Classification: behavioral. The backend permits expired snoozes and evaluates both snoozable queues against UTC today; the snooze editor now requires today or later. The pre-fix browser captured success through yesterday with the task still present. The corrected flow shows a field message, keeps date focus and sends no PUT, then completes a valid snooze. The public API remains unchanged.

- FORM-01 — Create form allowed another POST after the first creation succeeded but its response was lost. Classification: behavioral. Fixed in forms/form-editor.tsx and api/forms.ts. The pre-fix real-create probe finds Save enabled after the lost response; afterward the draft is retained and locked for saved-result review. Server search, question counts, nested preview and opening the saved form pass at both widths. A subsequent edit persists to the same form, with the server count remaining one. Screenshots: tests/forms/artifacts/creation-recovery-{375,1280}.png.

- INV-01 — Invite client discarded entered details on navigation and offered a blind retry after an unconfirmed send. Classification: behavioral. Fixed in clients/invite-client.tsx and api/clients.ts. The pre-fix Cancel probe fails because it reaches the roster without a warning. The same journey now passes, together with dismissed reload, held-request navigation, failed lookup/retry and real saved-client recovery after a lost response, at 375px and 1280px. Search and counts come from the API; no downloaded-client filtering is used. Screenshots: tests/clients/artifacts/invitation-recovery-{375,1280}.png.

- NAV-01 — Protected deep links lose their destination during sign-in. Source: Gate redirects to /login and Verify returns to /. Reproduction: tests/auth/deep-links.browser.mjs exercises a saved form URL through login, reload and Change email. Classification: behavioral. Status: fixed in src/auth/return-to.ts, auth screens, router.tsx and app-shell.tsx. The pre-fix browser probe reached / instead of the saved form; the same journey now passes at 375px and 1280px, including reload, email change, separate tabs, session expiry, explicit logout and business setup.

- A11Y-01 — Auth submit buttons had an empty accessible name while pending. Classification: accessibility. Fixed in src/ui/submit-button.tsx by keeping a text action label independent of the spinner. The held-request probe fails before the change and passes afterward at both widths; disabled behavior, request count and geometry are unchanged.
- A11Y-02 — Auth routes and the account shell after profile loading left keyboard focus on the body. Classification: accessibility. Fixed in src/auth/auth-layout.tsx and src/app-shell.tsx. The main region receives focus when a new screen or its initial data becomes available; unchanged background data does not retrigger it. Before/after probes cover login, verify, setup, the signed-in destination and unknown routes.
- LAYOUT-01 — Long verification emails expanded document width beyond the viewport. Classification: objective visual defect. Fixed by allowing long words to wrap in AuthLayout. The same long-address probe fails before the change and passes afterward at 375px/1280px. Current screenshots: tests/auth/artifacts/verify-long-email-375.png and verify-long-email-1280.png.

## Calendar ownership

Client time zones are stamped from the business at invitation. Neither coach Client.update nor ClientProfile.update exposes a time zone; current client self-edit changesets cannot change it. Business settings remain the supported editing surface. Calendar fallback, local-date boundaries and new-invitation inheritance are covered by backend/test/easy/local_calendar_test.exs and backend/test/easy/clients/read_boundary_test.exs. Both backend suites pass (34 tests, zero failures), and the full settings browser regression passes at both widths. No disconnected client-specific preference was added.

## Scope and evidence limits

Graph MCP tools are unavailable and cbm search returned backend_timeout. Discovery uses scoped current-source reads; no graph coverage claim is made.
Automated browser coverage does not prove physical-device media compatibility or replace a target-coach usability session. Those limits remain explicit in the completion ledger.
Fixture forms are deleted by the browser suite. Disposable account/business records remain because the public API has no account-deletion operation in this flow.

## Verification for NAV-01

- Real API auth, invitation and deep-link browser suites pass; the latter covers both required viewports.
- Settings browser regression passes at 375px and 1280px on the isolated API/app.
- Coach build, scoped Biome, return-address unit tests, just check-rm and whitespace checks pass.
- Full backend mix precommit passes: 1,778 tests, zero failures. The existing Vite bundle-size warning remains.
- Invitation fixtures now use the configured development database, with AUTH_TEST_DATABASE for an isolated run. The prior hardcoded isolated database could disagree with the browser/API defaults.
- Fixture form deletion succeeds in the deep-link suite. Generated auth/settings screenshots and fixture manifests remain ignored local evidence.

The full route audit remains open. Partial rows above record exactly what this checkpoint proves; unverified rows are the next worklist.

## Verification for auth accessibility

The complete pnpm test:browser command passes, including the new accessibility journey, existing auth recovery, team invitations and deep links. The settings suite also passes at both widths after the shared shell focus change. Coach build, scoped Biome, just check-rm and whitespace checks pass. Full backend precommit passes 1,778 tests with zero failures. The existing Vite bundle-size warning remains.

The pre-fix probe recorded 14 failures across both widths (pending action name, route/readiness focus and long-email overflow). The unchanged probes pass after the shared fixes. The extended journey adds real keyboard signup, validation, confirmation-token consumption, keyboard sign-out and recovery from a used link. Disposable accounts/businesses remain; this flow creates no client or form records.

## Verification for invitation recovery

The client profile/lifecycle, existing invitation/acceptance/intake and focused recovery suites pass at both widths. The recovery suite deletes its created clients; earlier regression suites retain their disposable account fixtures as before. Coach build, scoped Biome, repository rules and whitespace checks pass. Full backend precommit passes 1,778 tests with zero failures. The existing Vite bundle-size warning remains. Full route coverage remains open.

## Verification for form creation recovery

Full Forms authoring/recovery and lifecycle/management suites pass at both widths against normal API 4000 and coach app 2022. The focused lost-creation suite deletes its created forms and verifies nested preview focus, draft retention, saved-record editing and a server count of one. Invitation recovery also passes after adding focus to its re-enabled email field. Roster cursor lists and intake follow-up regressions pass at both widths. Build, Biome, repository rules and full backend precommit pass (1,778 tests, zero failures); the existing bundle-size warning remains. Remaining route rows retain their unverified state.

## Workbench and Team audit verification

Workbench passes at 375px/1280px with all six real queues, two cursor pages per queue, server counts/search, completed review/reply/assignment/engagement tasks, summary failure/recovery, retained queue rows, independent snoozes and account isolation. Long-title and expired-date probes fail before their respective fixes and pass afterward. Team's current suite passes both widths on the isolated API/app, including permissions, stale acceptance, invitation/access recovery and client reassignment; unconfirmed invitation creation remains explicitly pending.

Coach build, scoped Biome, repository rules and full backend precommit pass (1,778 tests, zero failures). Workbench runs against normal API 4000/app 2022; Team uses isolated API 44000/app 22022 and its own fixture database. Fixtures remain in disposable test accounts, as in the existing suites. Full application coverage remains open.

## Team invitation recovery verification

The focused suite passes at 375px/1280px on normal API 4000/app 2022, including real owner-email rejection, pending navigation, lost response, failed lookup/retry, retained details, unchanged sent time, exactly one invite request for saved-member recovery, reload/filter return and normal creation after an empty lookup. The full Team regression passes on isolated API 44000/app 22022, including roles and account replacement.

The pre-fix control uses the committed screen source and fails because Send invitation remains enabled after a real successful creation whose response was lost. The corrected test also checks focus and dialog bounds. Screenshots are tests/team/artifacts/invitation-recovery-{375,1280}.png. Focused fixtures are revoked on completion; the interrupted harness fixture was separately found by its exact test email and revoked. Disposable accounts and the pre-existing lifecycle suite's fixtures remain.

Coach build, scoped Biome, repository checks and full backend precommit pass (1,778 tests, zero failures). The existing bundle-size warning remains. The full application audit stays open.


## Conversation storage verification

CHAT-01 is a test coverage defect: the previous suite intercepted a fixed fake-storage address. Against the normal API, a real upload reached Ready to send while the test incorrectly expected Upload failed. The corrected helper obtains the signed destination from the real API, injects only the selected failed request, and lets successful storage operations continue. The full suite passes at both widths, including byte-for-byte photo/audio/video downloads, audio/video playback and a real-storage read retry. No production code change was required.

Current evidence: tests/conversations/artifacts/video-{375,1280}.png and the complete conversation test output. Existing timestamp-dependent screenshots were inspected without changing their tracked baselines. Build, Biome, repository rules and backend precommit pass (1,778 tests, zero failures). Disposable conversation fixtures and storage objects remain in their own test businesses. Deployed storage, physical-device/Safari media and target-coach usability remain unverified; other route rows retain their current coverage limits.


## Client history and progress verification

HISTORY-01 — A long unbroken saved training-plan name overflowed the original-prescription text and widened the history list. Both failures were reproduced against the real saved record. Wrapping now constrains the text’s intrinsic width in the session detail and list. The expanded training-history suite passes at 375px/1280px, including reopening the frozen prescription after template/library edits and returning to the filtered list.

HISTORY-02 — A long unbroken meal-option name widened expanded nutrition guidance. The real-data probe fails before the wrapping change and passes at both widths afterward. Recorded intake, server totals, frozen guidance, date navigation/validation, failure recovery and account isolation remain covered by the complete nutrition-history suite. These are objective layout fixes; persisted data and the public API are unchanged. RM-228 now names both history regressions.

Weight progress also passes its current real-API suite at both widths: server chart/totals, mixed units, form provenance, cursor history, dates, recovery and account isolation. Build, scoped Biome, repository rules and full backend precommit pass (1,778 tests, zero failures). The existing bundle-size warning remains. Screenshots: tests/training/artifacts/history-{session,list}-{375,1280}.png and tests/nutrition/artifacts/history-{375,1280}.png. Existing disposable-account fixtures remain; these suites do not delete their historical records.


## Check-in audit in progress

After the history checkpoint, the current schedule and response-review suites both pass at 375px/1280px against normal API 4000/app 2022. Scheduling includes real client-app submission and persisted coach review; the response suite repeats client overview/intake review as well. Logs: /tmp/coachapp-check-ins-current.log and /tmp/coachapp-reviews-current.log. Timestamp-dependent screenshots are archived in /tmp/coachapp-check-in-audit-2026-09-15 before restoring tracked baselines. The next pass expands edge-state coverage; these rows do not claim that pass is complete.


## Scheduling recovery verification

CHECKIN-01 — Returning from an empty saved-schedule lookup left keyboard focus outside the draft. The test failed with First due date inactive; the retry now re-enables the draft before focusing that field. The form/date choices are retained and a deliberate save succeeds. Leaving an unconfirmed attempt now explains that a previously saved schedule remains on the server.

CHECKIN-02 — Long form names overflowed authoring, saved-result lookup and the stop confirmation. Source-local wrapping fixes pass the same real-data probes. List, edit and resume flows remain usable with that long name. The full scheduling suite passes both widths, including failed lookup/retry and focus containment after the result loads. Screenshot: tests/check-ins/artifacts/saved-recovery-{375,1280}.png. The earlier full-page screenshot suggested focus had escaped; an explicit focus-containment assertion passes at both widths, so no dialog primitive change was made.

Build, Biome, repository rules and full backend precommit pass. Precommit first exposed a users_email_index collision in retained test fixtures; UUID-based factory emails fix the runtime-restart collision without deleting stored records. Client-controller tests pass 81 tests and full precommit passes 1,778 tests. The response reader’s expanded audit remains the next step.


## Response photo verification

PHOTO-01 — A successful download-URL response followed by a failed storage GET left a broken image without an error message. The real-upload/submission probe fails before the change. SubmissionPhoto now presents a delivery error; Reload photos refreshes the signed response and resets the failed image, including when the URL is unchanged.

The full review suite passes at both widths with actual client uploads, submitted attachment IDs, metadata failure/retry, storage failure/reload, image decoding and byte-for-byte downloads. The same saved photo opens in the conversation preview. Client intake also uses real uploaded/submitted photos; the invitation/intake regression passes at both widths. Build, scoped Biome, repository rules and full backend precommit pass (1,778 tests, zero failures). Evidence: tests/check-ins/artifacts/photo-response-{375,1280}.png. Disposable records/media remain, and deployed storage and physical-device coverage remain outside this local test.


## Plan audit in progress

After the response-photo checkpoint, the complete training-template command (authoring, compact sets, shared targets and worksheet), training assignment, full nutrition-builder command (authoring, recovery, menu editing and ordering), and both client-personalization suites pass at 375px/1280px. Training templates and assignment use isolated API 44000/app 22022; nutrition and personalization use normal API 4000/app 2022. No production change was needed for these current regression runs.

Logs: /tmp/coachapp-training-templates-current.log, /tmp/coachapp-training-assign-current.log, /tmp/coachapp-nutrition-plans-current.log, /tmp/coachapp-client-training-current.log and /tmp/coachapp-client-nutrition-current.log. The next pass covers plan lifecycle/management and remaining UX states; current rows are deliberately limited to the existing suites. Timestamp-dependent nutrition screenshots are archived in /tmp/coachapp-plan-audit-2026-09-15 before restoring their tracked baselines.


## Plan management verification

PLAN-01 — Server-side date validation ran while inputs were disabled, so the intended field focus was lost. Stale-plan and confirmation errors also left focus away from recovery. Client plan management now waits for pending state to finish before focusing the invalid date or root error. When a dialog is open, focus stays in that dialog; rejected actions focus their error and Tab reaches Close and review. FormError accepts opt-in ref/tabIndex props, used only by the plan-management screens; existing callers keep their previous markup and behavior.

The corrected pre-fix control restores the committed client-plan screen temporarily and fails because Start date is inactive after the real overlap rejection. A separate template-confirmation probe fails because its stale error is inactive. The first harness expected a root overlap alert, but the server correctly returns a Start date field error; that harness result is not evidence of an application defect. Both complete lifecycle suites now pass at 375px/1280px against normal API 4000/app 2022, including independent copies, frozen history after deletion, date/revision conflicts, three cursor pages, interrupted writes and account replacement.

Build, scoped Biome, repository rules and full backend precommit pass (1,778 tests, zero failures). Focus-state screenshots are tests/plans/artifacts/{date-error,template-error}-{training,nutrition}-{375,1280}.png. Timestamp-dependent tracked screenshots are archived locally before restoring their baselines. Fixture records remain in disposable businesses. The ledger also restores the intended Backend/Frontend placement of RM-230/RM-231 and indexes them alongside the new RM-232 focus rule.

## Library regression checkpoint, 2026-09-15

Existing exercise, food and recipe authoring, exercise management, nutrition-library management and both media suites passed at 375px and 1280px. Authoring covers cursor/search/return, draft recovery, plan reuse and session isolation; management covers independent copies, server usage and deletion constraints. Media suites use real local storage and check image/video delivery, playback, replacement/removal and recovery. Exercise authoring uses the isolated API/app because its reference seed targets that database; the initial normal-server attempt stopped at missing fixture equipment. Food/recipe authoring and media use the normal API/app. No product defect or production-code change resulted from this checkpoint.

Evidence: `/tmp/coachapp-exercises-isolated-current.log`, `/tmp/coachapp-foods-current.log`, `/tmp/coachapp-recipes-current.log`, `/tmp/coachapp-exercise-management-current.log`, `/tmp/coachapp-nutrition-library-current.log`, `/tmp/coachapp-exercise-media-current.log`, `/tmp/coachapp-food-media-current.log`. Backend precommit passed: 1,778 tests, zero failures. Additional keyboard/route-state coverage, physical-device media and target-coach usability remain open. Disposable fixture businesses and media remain in the local test environments.

LIBRARY-01 — Food and recipe copy confirmations lost the useful keyboard position when Create a separate copy removed the recovery panel. The original food probe failed to focus Create copy. `src/nutrition-library/library-action.tsx` now mounts the action before focusing it. The expanded suite passes both resources at 375px/1280px: returning issues no request, Enter creates exactly one independent saved copy, and temporary copies are deleted. The exercise retry probe passes unchanged, restoring its retained name field. Logs: `/tmp/coachapp-library-retry-focus-before.log`, `/tmp/coachapp-library-copy-keyboard-final.log`, `/tmp/coachapp-exercise-copy-keyboard-final.log`. Screenshots are archived in `/tmp/coachapp-library-copy-focus-2026-09-15`. App build, scoped Biome, repository checks and backend precommit pass (1,778 tests).

## Billing and acquisition checkpoint, 2026-09-15

BILLING-01 — Add seats replaced its trigger without moving focus to the quantity, and invalid quantities disabled Review seat change without explaining the range. The original keyboard-entry probe failed. The quantity now receives focus on mount, marks invalid input and describes the whole-number range. Billing action errors receive focus after pending work finishes; modal errors keep the next Tab on Keep current plan, checkout-loader errors lead to Open payment checkout, and lost writes focus the recovery error. The full billing suite passes at 375px/1280px, including real local API state and the fake payment provider; no real charge. Logs: `/tmp/coachapp-billing-keyboard-before.log`, `/tmp/coachapp-billing-keyboard-final.log`. App build, scoped Biome, repository checks and backend precommit pass (1,778 tests).

All three acquisition suites also pass at both widths against the isolated API/app: publication and anonymous application, inbox/review/enrollment, and authoring/layout/recovery. Evidence: `/tmp/coachapp-acquisition-current.log`. Dedicated keyboard validation/recovery checks remain open for these routes. Billing screenshots for this checkpoint are archived under `/tmp/coachapp-billing-acquisition-audit-2026-09-15`. Disposable fixture businesses remain in local test databases. Physical-device/target-coach validation and live-provider checkout are not established by these runs.

APPLICATIONS-01 — A stale review displayed its error without moving keyboard focus to the recovery path. Review and enrollment now focus errors after pending fields re-enable. Review reload failures stay in the dialog, before Keep editing and Load review; successful reload focuses its confirmation. Enrollment restores field-error focus, retains contact edits through stale refresh, directs unconfirmed requests to Check enrollment and focuses the enrolled result before View client. Seat-capacity errors lead to the billing link without discarding the draft. The enrolled-result focus depends on the client ID, so background refreshes of the same client do not move focus.

The original stale-review probe failed; the expanded applications suite passes at 375px/1280px, including field-validation responses, failed review reload, real lost enrollment recovery to one client, server paging/search, trainer access and session isolation. Evidence: `/tmp/coachapp-applications-focus-before.log`, `/tmp/coachapp-applications-keyboard-final.log`; screenshots archived under `/tmp/coachapp-applications-keyboard-2026-09-15`. App build, scoped Biome, repository checks and backend precommit pass (1,778 tests). The public page and coaching-page editor still need their dedicated keyboard audit.

APPLICATIONS-02 — Missing contact details marked Email invalid without focusing it. The public form now waits for pending work to finish before focusing validation or recovery. Hidden Instagram errors open their section. Form-level messages share one focused summary without dropping program/answer errors. Stale-page reload failures focus their retry path; a successful update clears obsolete errors, keeps valid answers and focuses program selection. Both the dialog confirmation and the standalone receipt focus the completed result.

The original contact-validation probe failed; the expanded acquisition suite passes at 375px/1280px, including server field-error mapping, actual response loss with one application, failed receipt lookup, offline/address-change recovery, refreshed choices and successful focus transitions. Logs: `/tmp/coachapp-public-application-focus-before.log`, `/tmp/coachapp-public-application-focus-final.log`; screenshots archived under `/tmp/coachapp-public-application-keyboard-2026-09-15`. App build, Biome, repository checks and backend precommit pass (1,778 tests). The coaching-page editor and publish/offline actions remain in the keyboard audit.

PUBLISHING-01 — The editor left invalid fields inside collapsed sections, and save/reload/offline errors did not guide keyboard recovery. The original required-fit-point probe failed. The editor now opens ancestor details and focuses the first invalid control after validation, or focuses its combined form-level errors. Reload and offline dialogs keep error recovery inside the dialog; saving/loading/offlining announces the result with focus. Clipboard success retains the button focus and clears the preceding copy error. The full acquisition suite passes at 375px/1280px, and an offline failure is checked against the still-public API page before retry. Layout, long-content, ordering, trainer and session-isolation regressions also pass.

PUBLISHING-02 — Adding a program kept Draft saved visible despite an unsaved change. The original add-row probe failed. Saved feedback now depends on the actual dirty state, including field-array changes. The expanded suite adds then removes a program before continuing to publish. RM-233 records the rule. Evidence: `/tmp/coachapp-publishing-keyboard-before.log`, `/tmp/coachapp-publishing-dirty-notice-before.log`, `/tmp/coachapp-publishing-keyboard-final.log`, `/tmp/coachapp-publishing-layout-regression.log`. Screenshots archived under `/tmp/coachapp-publishing-audit-2026-09-15`. App build, Biome, repository checks and backend precommit pass (1,778 tests). Remaining route rows retain their recorded limits.

SETTINGS-01 — Saved settings left focus without a useful result handoff, and server validation needed to wait for controls to re-enable. The original profile-result probe failed. Shared settings actions now read the form state and existing field references, focusing root errors or the first invalid field, including shadcn selects. Save/discard results receive focus, while dirty forms hide saved notices. The expanded settings suite passes at 375px/1280px, including real server time-zone rejection, lost responses, trainer permissions and account replacement.

Evidence: `/tmp/coachapp-settings-focus-before.log`, `/tmp/coachapp-settings-focus-final.log`; screenshots archived under `/tmp/coachapp-settings-keyboard-2026-09-15`. One intermediate run ended with a request-context cleanup error that obscured its original failure; it did not recur in the diagnostic or final run. The harness now reports the original scenario error and aligns assertions with its existing 15-second browser timeout. Build, Biome, repository checks and backend precommit pass (1,778 tests).


APPLICATIONS-03 — Keyboard navigation reached the application row, but its outward focus outline was clipped by the list container. The screenshot exposed this after navigation assertions passed. The row now draws its focus outline inside its bounds. A computed-style probe failed with the original +4px offset; the same probe and full prospects suite pass at 375px/1280px after the local class change. Keyboard checks cover initial-load retry, retained paging/retry focus, refresh retry, status selection/empty results, search and opening the applicant. No shared list behavior changed.

Evidence: `/tmp/coachapp-inbox-focus-before.log`, `/tmp/coachapp-inbox-focus-after.log`; screenshots archived under `/tmp/coachapp-inbox-keyboard-2026-09-15`. Build, scoped Biome, repository checks and backend precommit pass (1,778 tests). Physical-device and target-coach review remain outside this local Chromium evidence.


ASSIGN-01 — Training preview refresh errors lacked a keyboard handoff; nutrition server date errors tried focusing disabled fields. Training refresh errors now precede the retry action and receive focus after the request finishes. Nutrition waits for submission to finish before focusing the invalid date. Both successful refreshes focus the updated prescription. Nutrition shows Check client plans for uncertain saves; stale templates lead directly to Refresh preview. The original training-refresh and nutrition-overlap probes fail. Their full assignment suites pass at 375px/1280px, including retained dates, stale revisions and real client-copy access. A real nutrition assignment with its response replaced by 503 is discoverable through Check client plans, with one write and three server-counted plans.

ASSIGN-02 — The nutrition selection row's outward focus outline was clipped by its list. The keyboard probe fails before the local inward-outline class and passes afterward at both widths, with a screenshot of actual keyboard focus.

Evidence: `/tmp/coachapp-assignment-focus-before.log`, `/tmp/coachapp-assignment-focus-after.log`, `/tmp/coachapp-nutrition-assignment-before.log`, `/tmp/coachapp-nutrition-choice-before.log`, `/tmp/coachapp-nutrition-assignment-final.log`. Screenshots are archived under `/tmp/coachapp-assignment-audit-2026-09-15`. Build, scoped Biome, repository checks and backend precommit pass (1,778 tests). Nutrition selection still needs its expanded list-state audit; target-coach and physical-device review remain outside this Chromium evidence.
