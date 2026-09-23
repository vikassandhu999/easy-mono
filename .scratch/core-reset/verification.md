# Core reset verification — 2026-09-23

## Local checkpoints

Work remains on `codex/core-reset`. No push or deployment was performed. The user subsequently requested a local commit.

- `codex/checkpoint-main-2026-09-23`: `963f6f22c16299103d8220853dd65d0ffb460fe2`.
- `codex/checkpoint-rewrite-2026-09-23`: `833cf1db5a8a0ed20143ed43c9fb31d96bea25f0`, including the pre-reset working tree.
- Local database backup: `/tmp/easy-core-reset-20260923-before-removal.dump`.

## Scope and data

The counts and initial checks in this report describe the first reset; subsequent sections record the later scope updates.

Removed runtime screens, routes, models, jobs, client hooks, generated contract entries, tests, assets and documentation for the approved retired workflows. The Easy marketing homepage remains. Client invitations, training and nutrition programming/execution/history, and chat remain, together with billing, team and engagement management. Body-weight tracking was removed in the subsequent scope update recorded below.

Historical migrations remain to support upgrades. New migrations remove the retired tables and columns. The upgrade was first exercised against a clone of the actual local database, then applied locally. Core-table count comparisons preserved all checked records, including 211 weights and 1,977 messages. Old embedded questionnaire cards are converted to plain message text, while workout, meal and weight references remain supported.

Detailed evidence: `backend/QUALITY_AUDIT.md`, `/tmp/easy-backend-verification-20260923.txt`, `/tmp/easy-core-reset-upgrade-counts.json` and `/tmp/easy-core-reset-dashboard-upgrade-20260923.json`.

The ordinary preexisting `easy_test` database has an older migration baseline. Verification uses the isolated `_core_reset_20260923` partition; the old database was not reset. Browser tests use `easy_browser_dev` with local mail delivery.

## Completed checks

- Backend `mix precommit`: 1,512 tests, zero failures, clean warnings-as-errors compilation, format, strict Credo and 128 typed-route checks.
- Fresh database migration and existing local database upgrade.
- `just gen-api`: all four frontend contracts regenerated.
- Builds for coachapp, coachapp-v2, clientapp, clientapp-v2 and the Easy marketing website.
- Coach unit suites, changed-source Biome checks, `just check-rm` and frontend shape checks.
- Current coach sign-up/sign-in, invalid-code recovery, business creation recovery, session isolation and cross-tab logout.
- Current coach welcome tour at 375px/1280px: two retained previews, keyboard navigation, finish/skip/replay, reload and error recovery.
- Direct invitation, retry/reload/resend/copy, client acceptance and account-switch recovery at 375px/1280px; mobile controls and menu layouts at 375px/390px/768px/1280px.
- Current coach client-list pagination, search/filter, offline retry and manual loading at 375px/1280px.
- Current coach navigation at 375px/1280px, owner and trainer: core sections, libraries, client details/history/plan assignment, account access and logout.
- V2 coach navigation at 375px/1280px: Clients home, inbox, send/read chat, no retired controls or endpoints, no overflow or browser errors.
- Client Today at 375px/768px/1280px.
- Client chat history, retry and unread state.
- Current coach chat workspace at 375px/1280px: draft recovery, duplicate prevention, delayed-history retry and media retry. A regression now prevents Retry send before history has loaded.
- V2 client core navigation and a 21-day-old meal chat reference at 375px.
- Client workout/meal corrections and linked chat notes at 375px.
- Client weight history, pagination/retry and exact historical same-day record reading at 375px/768px/1280px.
- Marketing at 375px/1280px: homepage HTTP 200, no page errors or horizontal overflow; removed public coach URL HTTP 404. Production build contains only homepage, not-found and sitemap routes.
- Local backend smoke script: six checks passed, including the four retained coaching route families.
- Runtime source and generated-contract searches found no retired feature modules, routes or types. Ordinary nutrition intake, billing payment warnings and generic input forms remain meaningful core concepts.

## Local app state

Final client builds and embedded unit checks passed after the historical-record fixes. Coach `2022`, client `1315` and V2 client `1314` development servers were restored to the normal local API on `4000`; their homepages respond successfully. Temporary marketing and isolated browser API servers were stopped after verification.

The current coach chat reset suite covers inbox search, initial history, live arrivals, durable drafts, send recovery and stored photo attachments. The former dedicated coach cursor/read-state browser scenarios were not rerun; client history paging/retry/unread behavior and backend chat tests passed. Voice recording and video playback were not separately rerun for this reset.

## Limits

Physical-device/native suites were not rerun for this reset. Browser tests do not establish hardware camera, microphone or keyboard behavior. No remote deployment, provider email delivery or production database upgrade was performed. Existing bundle-size and V2 vendor CSS build warnings remain.

## Backend-first app cleanup

The subsequent user instruction removes `coachapp-v2` entirely and retains `clientapp-v2`. The completed backend removal was reconfirmed before deleting the app. Its original implementation remains in the existing local checkpoint.

- Deleted the complete old coach application, stopped its port 2021 server, and removed its package, lockfile, TypeScript, editor and generator references.
- Default coach commands now run `coachapp` on 2022. The marketing site’s development fallback points to that app.
- Retained `clientapp-v2`; removed its test dependency on the deleted coach package and kept its core client workflows/native runtime. Its standalone diary browser flow, build and unit checks passed. Removed four CSS rules for nonexistent vendor classes; no replacement styling was introduced.
- Migrated shared nutrition browser tests to production `coachapp` plus `clientapp-v2`: all 10 scenarios passed at 375px/1280px, covering creation, assignment, logging/corrections, conflict recovery and frozen history.
- API generation now targets three surviving coach/client apps; the generator test passed and 128-route consistency check passed.
- Workspace lockfile and installed dependencies refreshed offline. Repository/shape, retained HeroUI theme-selector and colour-utility checks passed. Final recursive workspace build passed for all four remaining apps and shared utilities, including embedded unit checks.

The earlier four-app verification above records the first reset checkpoint; this follow-up leaves one coach app, both client apps and the marketing site. No pushes or deployments were performed. The user subsequently requested a local commit.

## Migration and local preview readiness

Reverified for the user's manual testing request: all 14 migrations are applied to `easy_dev_refactoring`, with no pending changes. A new empty isolated database migrated to an identical final schema: 35 tables including migration history, 371 columns, 160 constraints and 139 indexes. All nine retired tables and removed fields are absent. The retained chat-reference constraint and both weight-history indexes are present. All 15 checked core counts remain unchanged, and all 211 historical weight IDs remain.

Audit evidence: `/tmp/easy-core-reset-migration-audit-20260923.json` and `/tmp/easy-core-reset-final-schema-20260923.json`. No migration rewrite or database reset was needed. Applied migration files remain as upgrade history.

The backend is running on `http://localhost:4000`, coachapp on `http://localhost:2022`, and retained clientapp-v2 on `http://localhost:1314`. Browser checks verified both login screens, no page errors, backend health from both origins, and the coach API proxy. Development OTP is `123456`. The servers are left running for manual testing.

## Body-weight feature removal

The next scope update removes body-weight logging, charts, goals and linked chat cards from the backend, coachapp, clientapp and clientapp-v2. Removed their runtime modules, routes, hooks, query keys, drafts, navigation, dedicated tests, assets and feature documentation. The marketing website remains and now describes workout and meal history. Default workout load units, performed-set loads and food quantities remain supported.

The new migration removes `weight_entries`, `clients.goal_weight_value` and `clients.goal_weight_unit`, and narrows chat record references to workouts and meals. Existing weight cards become plain messages without deleting conversation text or attachments. Applied migration history stays available for upgrades; the original implementation remains in the local checkpoint.

Database backup: `/tmp/easy-before-weight-removal-20260923.dump`. The clone upgrade, fresh chain and local development database have the same final schema: 15 applied migrations, 34 tables including migration history, 359 columns, 156 constraints and 136 indexes. The restored dump uses an equivalent representation for casts in existing PostgreSQL checks; only that representation was normalized for its comparison. The fresh and local schemas match exactly. All 33 retained tables pass count and content-checksum comparisons after accounting for the intended goal-field and chat-reference conversion. The migration deletes 211 weight entries. Evidence: `/tmp/easy-weight-removal-verification-20260923.json`.

Completed frontend and live checks:

- `just gen-api`: all three contracts regenerated, 121 typed routes.
- All four remaining app builds and embedded unit suites passed. Changed-source Biome, repository/shape, theme-selector, colour-utility and diff checks passed.
- Coach navigation for owner/trainer, client profile editing, chat recovery/media and settings passed at 375px and 1280px.
- Current client account/navigation/chat passed at 375px, 768px and 1280px, including draft reload, offline and failed-save handling, saved profile details and text sending.
- Retained clientapp-v2 navigation, settings and an older meal reference passed at 375px. Both client browser suites observed no weight endpoint requests.
- All seven deleted HTTP endpoints return 404. Backend health and all three app previews return 200.
- Marketing homepage passed at 375px/1280px with no browser errors, overflow or retired progress promises. Its temporary preview was stopped.
- Updated web bundles were copied into both client apps' iOS and Android shells. Stale ignored Android build output was removed. Device runtime tests were not rerun.

Coachapp remains on `http://localhost:2022`, clientapp-v2 on `http://localhost:1314`, clientapp on `http://localhost:1315`, and the backend on `http://localhost:4000`. The development OTP remains `123456`. No push or deployment was performed. The user subsequently requested a local commit.

A separate restored database exercised the actual removal migration with three synthetic weight cards. It preserved existing body text, used the saved title for an embed-only message, supplied a fallback when no title existed, and preserved message IDs, conversations and all 78 existing attachment rows. The final database constraint rejects weight references and accepts workout/meal references. Evidence: `/tmp/easy-weight-removal-embed-migration-20260923.json`.

A final bounded scan of backend runtime source, all three coach/client source trees and generated OpenAPI found no body-weight feature routes, modules, fields or UI references. Historical migration files, reset evidence and negative regression assertions remain intentionally.

Final backend gate passed: `MIX_TEST_PARTITION=_core_reset_20260923 mix precommit` completed with 1,441 tests and zero failures, warnings-as-errors compilation, formatting, strict Credo across 405 files, and 121 matching typed routes. Seed scripts also compile without being executed. Log: `/tmp/easy-weight-removal-precommit-20260923.log`.

## Local commit

The user requested a local commit of the complete trimmed application. All current source, migrations, generated contracts, tests, tooling and documentation belong to that checkpoint on `codex/core-reset`. The original checkpoint branches remain. Commit-time backend precommit passed with 1,441 tests and zero failures, clean compile/format/Credo, and 121 matching typed routes. Log: `/tmp/easy-commit-precommit-20260923.log`. Formatting made no backend changes. The frontend builds and browser checks above cover the unchanged application source. Nothing is pushed.
