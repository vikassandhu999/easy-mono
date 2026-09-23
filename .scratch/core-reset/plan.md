# Core reset

Approved on 2026-09-23. Work stays on local `codex/core-reset`; nothing is pushed.

## Scope

Remove applications/prospects, public coach pages and their editor, all check-ins and Intake/forms, workbenches/attention queues, saved next steps and automated follow-ups, the combined activity feed, and body-weight progress and goals. Remove their screens, APIs, data structures, jobs, assets, tests, and obsolete documentation.

Keep the Easy marketing website. Keep client management and direct invitations, training and nutrition programming/execution/history, and chat including attachments and links to workout and meal records. Billing, team management, and engagement management remain.

The main checkpoint is `codex/checkpoint-main-2026-09-23`. The complete working-tree checkpoint is `codex/checkpoint-rewrite-2026-09-23` (`833cf1db5`). They retain the removed implementation. Applied migration history stays available so databases can be upgraded without discarding core records.

## Implementation

- [x] Backend: remove retired contexts, routes, contracts, scheduled processes and tests; detach client invitation and chat from forms; migrate feature tables/columns away while retaining core data.
- [x] Coach app: remove retired features, delete the superseded app entirely; use Clients as home, expose ordinary Messages, and simplify invitation/client/conversation flows.
- [x] Client apps: remove forms and their pending-work surfaces in both app generations; retain daily training, nutrition, and messaging.
- [x] Website: remove public coach pages and their API client; retain the Easy marketing page and remove promises about deleted features.
- [x] Repository: remove obsolete feature docs/assets and update mechanical checks and demo scripts.
- [x] Contract: regenerate OpenAPI and typed client routes; compile the three retained coach/client apps against the resulting API.
- [x] Verification: run backend precommit, frontend builds/checks, repository checks, and real-browser core journeys at coach 375/1280px and client 375px. Check the marketing homepage and removed public routes.

## Review focus

Direct invitations must work without an Intake. Chat messages, uploads, read state, and record references must survive without task state or forms. Core workout and meal history must survive the migration. Neither app generation may retain navigation or API calls to deleted features. The marketing homepage must remain available while coach public pages stop serving applications.

## Results

All implementation and verification steps above are complete. See [verification.md](verification.md) for commands, browser scope, data retention and remaining device/deployment limits.

## Follow-up scope

After reconfirming the backend removal, delete `frontend/apps/coachapp-v2` entirely. Retain `clientapp-v2` with its completed backend adaptations. Move the default coach commands, API generation and shared nutrition browser journeys to `coachapp`, remove obsolete tooling and repair documentation pointers. Keep the marketing website.

## Body-weight feature removal

The subsequent user instruction removes body-weight tracking entirely: logging, charts, goals, API routes, data tables/fields, and weight-linked chat cards. Existing chat text remains; its retired links are removed. Workout load and food quantities remain part of training and nutrition. Verify an existing-database upgrade, a fresh migration chain, regenerated contracts, app builds and browser navigation before leaving local previews running.
