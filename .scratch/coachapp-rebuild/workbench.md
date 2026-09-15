# Daily Workbench

When a coach starts a work session, they need to see which clients need attention and finish a useful action without opening every client. This is a frequent phone and desktop task. The costly mistakes are acting on stale status, overlooking a date or second required service, and losing the task list after completing an action.

Use six plainly named queues: Check-in reviews, Replies, Getting started, Plans, Ending soon and Missed check-ins. Phones use a compact shadcn select; desktop keeps all six queue choices visible. Each choice shows its server count; no total is computed across overlapping queues. One queue is open at a time, with search and a server-side service filter for Plans. The API determines membership, priority order and all reasons. The coach sees the client name, the complete reason and date, and an action with a concrete verb.

A dashboard with six simultaneous preview lists was considered. A single selected queue gives the coach a complete list, preserves attention on one type of task, and avoids six competing loaders and truncated previews on phones. Default to Check-in reviews without automatically moving the coach when a count changes. Empty states explain that this queue has no matching tasks and keep all other queues available.

Review opens the saved check-in, Reply opens the shadcn conversation, plan actions open the existing assignment flows, and Update engagement opens Client details. Getting started opens the client's invitation/intake. Missed check-ins opens a conversation. Ending soon and Missed check-ins support an explicit snooze-until date with server validation and retry. A return link preserves the Workbench queue/search/service across the task.

Lists use opaque keysets with each queue's existing native priority order, server search, counts and shared infinite-list recovery. Refresh and mutations update queue membership/counts; no downloaded-record filtering, sorting or business selection is used. API dates remain authoritative. Background failures retain loaded tasks and label them as stale. Late requests cannot restore data after account replacement.

Verify all six populated/empty/error flows, service filtering, cursor paging and deleted anchors, search beyond the first page, snooze validation/failure/retry, task completion and return navigation, queue invalidation and account isolation at 375px and 1280px. Backend tests prove tenant/trainer scope and server priority order. Browser fixtures use isolated local data; the normal dev services stay available separately.

## Verification

Real API flows passed at 375px and 1280px on 2026-09-13: all six populated queues, two real cursor pages per queue, unique rows and server totals, server service/search filters, check-in review and reply completion, nutrition assignment with filter-preserving return, engagement renewal, independent queue snoozes, failed/lost snooze response retries, empty and fetch-error recovery, retained rows after refresh failure, and account replacement during a held queue response. Screenshots were reviewed for both layouts. Client-management browser regression also passed after the shared return and action-style changes.

API generation and full backend precommit passed with 1,687 tests. The backend tests cover native order, deleted anchors, literal search, invalid/mixed cursors and tenant/trainer visibility. Coachapp build, scoped Biome and repository shape checks passed. The existing Vite bundle-size warning remains.

Source inspection and computed browser styles revealed that direct `buttonVariants` links retained conflicting transparent/outline border classes. The shared variant function now merges its classes and explicitly colors outline text, matching the Button component. The browser checks confirm visible action borders. This corrects a shared primitive rather than introducing Workbench-specific link styling.

Normal development services were also repaired and checked: coachapp on 2022 proxies this project's Phoenix API on 4100, using the normal development database with pending migrations applied. Ports 4000 and 4001 belong to other projects and were left running. Development email falls back to the local mailbox without a Resend key. Browser test data stays on the separate 44000 API and isolated database.

Intake reminder/dismissal/priority controls remain in the intake task ledger. Getting started currently opens the existing invitation/intake overview. Full device and target-coach usability checks remain in the final application audit. No commit or deployment was made.

## Current route audit — 2026-09-15

The full Workbench browser journey passes at 375px and 1280px against normal API 4000 and coach app 2022. This supersedes the earlier development-port note. Intake follow-up now includes reminders, due date/priority, dismiss/reopen and concurrent-submission recovery; its regression also passes at both widths.

A valid long intake title exposed document overflow. Task reasons now use wrap-anywhere, so line breaks also participate in intrinsic width calculation. The pre-fix document-width probe fails, while the fixed row retains the complete title and date at both widths. See the [Tailwind overflow-wrap reference](https://tailwindcss.com/docs/overflow-wrap).

The snooze API accepts expired dates, and both snoozable queues currently use UTC today. The editor now requires today or a later date, preventing a success message for a snooze that immediately expires. The pre-fix journey reports success through yesterday while leaving the task visible. The fixed journey shows a field error, keeps focus on the date and sends no request; valid dates still complete normally. No public API behavior was changed.

The extended suite also proves a failed counts request leaves queue tasks usable and Refresh workbench recovers it. All six queue journeys, cursor/search/count behavior, task completion and return, lost-response retries and session isolation pass. Coach build, scoped Biome, repository rules and full backend precommit pass (1,778 tests, zero failures). The existing bundle-size warning remains; fixture accounts and their referenced test records remain in the development database.
