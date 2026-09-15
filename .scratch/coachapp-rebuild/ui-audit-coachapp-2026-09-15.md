# Coach app route audit — 2026-09-15

Inventory comes from the current router, not the navigation. Earlier slice evidence remains in completion.md; pending rows below require a current route audit. Tests use separate disposable accounts and only mutate their own records. No handwritten coachapp-v2 files are consulted.

| Route | Role | Viewport | States covered in this audit | Result | Findings |
| --- | --- | --- | --- | --- | --- |
| /login | Public | 375 / 1280 | Code request, validation, reload, email change, safe return addresses, separate tabs | Passed scoped auth flow; full keyboard/visual sweep pending | NAV-01 |
| /signup | Public | 375 / 1280 | Signup, reload, requested destination through setup; existing recovery regression | Passed scoped auth flow; full keyboard/visual sweep pending | NAV-01 |
| /verify | Public | 375 / 1280 | OTP failure/retry, resend, reload, code verification, late-session isolation | Passed OTP flow; magic-link route sweep pending | NAV-01 |
| /accept-invite | Public / signed-in guard | 375 / 1280 | Missing, revoked, expired, accepted, reload, invalid OTP, account guard | Passed existing flow; full state sweep at each width pending |  |
| /coaching/:slug | Public | 375 / 1280 | Pending | Unverified | |
| / | Coach | 375 / 1280 | Post-login, explicit logout, profile recovery, cross-tab session handling | Partial; roster audit pending | NAV-01 |
| /workbench | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /team | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /billing | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /coaching-page | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /applications | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /applications/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /applications/:id/enroll | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /coaching-page/edit | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /team/invite | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /team/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id/coach | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /settings/profile | Owner / trainer | 375 / 1280 | Saved profile/header, changed fields, failure/retry, draft retention, unsaved navigation | Passed settings regression; full keyboard sweep pending |  |
| /settings/business | Owner / trainer read-only | 375 / 1280 | Preferences, validation, load/save/refresh failures, lost response, discard, late-account isolation | Passed settings regression; full keyboard sweep pending |  |
| /clients/invite | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id/profile | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /messages | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/conversation | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/training-sessions | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/training-sessions/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/nutrition-history | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/weight-progress | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id/check-ins | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id/check-ins/new | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /check-ins | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /check-ins/responses/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/check-in-responses | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/check-in-responses/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id/training-plans/assign | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id/training-plans/assign/:templateId | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /training-plans | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /training-exercises | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /training-exercises/new | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /training-exercises/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /training-plans/new | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/training-plans | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/training-plans/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /training-plans/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /training-plans/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/training-plans/:id/edit | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-plans | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-foods | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-recipes | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-recipes/new | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-recipes/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-foods/new | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-foods/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-foods/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-recipes/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-plans/new | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/nutrition-plans | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/nutrition-plans/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-plans/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /nutrition-plans/:id | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:clientId/nutrition-plans/:id/edit | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id/nutrition-plans/assign | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /clients/:id/nutrition-plans/assign/:templateId | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /forms | Coach | 375 / 1280 | Deep-link login, retained search, expired-session recovery, separate tabs | Partial; full list audit pending | NAV-01 |
| /forms/new | Coach | 375 / 1280 | Entry after signup and business setup | Partial; editor audit pending | NAV-01 |
| /forms/:id | Coach | 375 / 1280 | Saved-record deep link, query/fragment retention, reload, logout | Partial; editor audit pending | NAV-01 |
| /forms/:id/manage | Coach / owner restrictions where applicable | 375 / 1280 | Pending | Unverified | |
| /register-business | Guest | 375 / 1280 | Create, failed promotion/retry, reload, return to requested screen | Passed scoped auth flow; full keyboard/visual sweep pending | NAV-01 |
| * | Public | 375 / 1280 | Pending | Unverified | |

## Findings

- NAV-01 — Protected deep links lose their destination during sign-in. Source: Gate redirects to /login and Verify returns to /. Reproduction: tests/auth/deep-links.browser.mjs exercises a saved form URL through login, reload and Change email. Classification: behavioral. Status: fixed in src/auth/return-to.ts, auth screens, router.tsx and app-shell.tsx. The pre-fix browser probe reached / instead of the saved form; the same journey now passes at 375px and 1280px, including reload, email change, separate tabs, session expiry, explicit logout and business setup.

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
