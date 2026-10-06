# Slice 3: restored coverage and Trackers

Status: implemented and verified in the existing working tree on `codex/core-domains`. No branch or worktree was created. Nothing was committed or pushed. Existing slice-1 and slice-2 work was preserved. `frontend/apps/clientapp-v2` has no changes.

## Part 1: coverage restored first

The backend baseline passed with **672 tests**. Part 1 added **43 tests**, then passed the full precommit check with **715 tests, zero failures** before Tracker implementation began. No tests were removed. These tests found no production defect, so Part 1 changed no production code.

| Area | Added coverage |
| --- | --- |
| Controllers and contracts | Both plan domains: foreign-business and unassigned-coach denial, client isolation, assignment, validation response fields, missing resources, stale revisions, and cursor pages. Session and meal reads/writes have explicit boundary checks. |
| Libraries | Exercise, food, and recipe search, pagination, create/update/archive, tenant scope, validation, built-in protection, supported filters, food usage pages, and recipe template/client-plan usage. |
| Corrections | Completed-session set corrections and removal tombstones; meal corrections and removals; exact journal old/new values, actors, and request retries without extra sequences. |
| Concurrency | Separate database connections write a workout and meal for one client and receive distinct sequences. Competing publications in each domain produce one winner and one revision conflict. |
| Write gate | Today's coaching term and the requested path date must both be covered. History remains readable after coaching ends. |

The four new files and their test counts are listed in [s3-part1-report.md](s3-part1-report.md). The [Part 1 review](s3-part1-review.md) passed. Root independently confirmed the 715-test result with seed `946774`.

Current API limits affect exact coverage: exercises have no usage endpoint; recipes have no built-in model or implemented category filter; client exercise lists use offsets; meal removal removes diary entries rather than the meal header. Tests cover the current behavior. This slice did not add those unrelated features.

## Backend and API contract

Trackers now have library definitions, dated assignments, entries with ordered attachment links, and requests. SQL protects fixed kind/unit/scale, built-in definitions, assignment overlap, value shape, and tenant/client references. Used custom Trackers archive and restore. Unused custom Trackers can be deleted.

Tracker templates use the existing `templates` table and `Easy.Plans` template operations. Applying a template matches the client's list in one transaction. Timing changes end the old assignment and insert a new one. Tracker assignments do not use Plans, Plan Revisions, or E6.

The default weekly Sunday Reflection template is available for existing and new businesses. Both invite acceptance and coach-started coaching copy the default during the first-term transaction. Later terms do not copy it again. Business settings can explicitly apply a changed default to existing clients too.

The 17 curated built-ins include weight, waist, sleep, steps, water, four rating Trackers, Reflection, three progress-photo Trackers, Blood report, and three yes/no habits. Seeds use stable identities and remain repeatable.

Entry creation, correction, and removal use `Easy.RecordJournal`. Coach writes use `write_for_client`. Entry and attachment changes journal their old/new values and mutation actor. Exact retries do not allocate another sequence, including partial corrections and retries after later changes. `records` includes nondeleted Tracker entries. Only client routes record workouts and meals.

Private attachments reuse the existing service. PDF now has the same **15 MiB** limit as images, and attachments have optional `captured_on`. Photos accept images; reports accept ordered PDFs and images. Links must belong to the same client and business.

Due items, open requests, numeric metrics, photo comparisons, and event coverage are calculated. Daily/weekly reminders use the client's local day and coaching terms. Event coverage counts distinct completed workouts or shared meals while assigned. Request and entry timestamps retain microseconds to distinguish writes within one second.

The contract adds **39 typed routes**, for **165 total**. Both retained app schemas are generated. It includes library and entry cursor pages, templates/settings, assignments, entries, requests, Today, event prompts, metrics, and unit conversion factors. Details are in [s3-api-contract.md](s3-api-contract.md) and [s3-backend-report.md](s3-backend-report.md).

## Coach app

Trackers is available from the main navigation. The library supports search, filters, custom creation, name edits, archive/restore, and unused deletion. Templates support whole-list editing and client application. Business settings support default selection and an explicit apply-to-existing choice.

A client's Tracker page manages timing, removal, requests, cancellation, and coach recording. History includes numeric trends with unit selection, event coverage, latest/previous/first photo comparison, and ordered report view/download links. Coach entries show **Recorded by coach**.

Queries use generated types, shared key factories, and mutation-owned invalidation. Forms keep failed values. An uncertain record save retains the exact request body and request id. See [s3-coach-report.md](s3-coach-report.md).

## Client app

Today shows **To record** and **Your coach asked for**. **Add something else** opens the library without changing assignments. Forms support all six kinds and start with the client's unit system. Reports preserve file order, capture date, private upload tickets, and file data on the device.

Workouts show assigned Trackers after completion. Meals with pending Trackers remain in the meal logger. Reopening an event loads its remaining prompts without recording the event again. History includes trends, photo comparison, reports, coach labels, corrections, and removal.

Account-scoped drafts retain values, dates, units, file order, correction revisions, and exact pending requests. A lost response offers **Check Tracker save**. A confirmed conflict requires review before a new request is prepared. See [s3-client-report.md](s3-client-report.md).

## Choices where the documents were silent

1. Assignment dates are inclusive. A same-day replacement retains an empty old row with `ends_on = starts_on - 1`. The exclusion uses the equivalent half-open range so that empty rows are valid.
2. Weekdays are Monday `0` through Sunday `6`, matching the existing schedule convention. Weekly forms start at Sunday.
3. Custom rating scales are integers from 1 to N, with N between 2 and 10. Custom number units are required literal text.
4. Archiving or deleting a custom Tracker removes it from Tracker templates and increments their revisions. This prevents an invalid default from blocking coaching start. Restore does not add removed template items back. Archive retains assignment rows and entries.
5. Default changes require the business owner. Applying a null default to existing clients clears their lists. Without the explicit option, existing lists stay as they are.
6. Built-in conversion supports kg/lb, cm/in, and ml/US fluid ounce. Hours and steps use literal units. Custom units do not convert, even when named `kg`.
7. Metrics default to 30 local dates and permit up to 366. Numeric change compares with the last entry on or before the previous date, defaulting to the day before the selected range. Photo comparison uses the preceding entry or the first entry in full history.
8. An entry can hold up to 50 distinct attachments. The existing service validates submitted metadata and signs storage URLs; it does not inspect file contents. File capture date is chosen before client file selection and displayed with the selected files.
9. The original recorder stays on the entry. The journal identifies the actor of each later correction. Both client and coach entries can satisfy a reminder or request.
10. Converted correction inputs use 15 significant digits to remove binary floating-point noise while keeping fractional values. Unconverted values retain their numeric text.

## Defects corrected during Part 2

Review and browser checks found and corrected these cases:

- Same-day assignment ranges needed an explicit valid empty range.
- Library entry counts needed client/coach visibility scoping.
- Archive/delete needed to keep default templates usable.
- Reopening a corrected client entry lost its accepted values and revision. Confirmed correction drafts now use the server result.
- Coach photo/document Notes produced an invalid scalar value. Those kinds now send attachment values only.
- Converted `179` lb reopened as `178.99999999999997`. Input formatting now removes that noise.
- An identical partial PATCH retry could conflict with its accepted write. Omitted fields now retain their values, links, and attachment order; retries compare the supplied fields with the accepted journal snapshot.
- A completed assignment save could close a newly opened request form. Completion now closes only its own action.

The [frontend review](s3-frontend-review.md) and [backend review](s3-backend-review.md) have no open findings. Regression tests cover the material correction and retry defects.

## Final verification

All commands below passed against the final source and generated contract.

| Check | Result |
| --- | --- |
| `rtk mix precommit` in `backend/` | **752 tests, zero failures**, seed `998290`; compile, format, contract drift, and Credo passed |
| `rtk just gen-api` | Passed; **165 typed routes**, retained apps only |
| `rtk pnpm -C frontend/apps/coachapp build` | Passed: TypeScript, behavior checks, and Vite |
| `rtk pnpm -C frontend/apps/clientapp build` | Passed: TypeScript, behavior checks, and Vite |
| `rtk pnpm -C frontend lint:ci` | Passed: 458 files, Biome and design lint |
| Training `tests/training/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375 |
| Nutrition `tests/nutrition/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375 |
| Trackers `tests/trackers/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375 |
| Source whitespace check | Passed for backend, frontend, and `CONTEXT.md` |
| Branch and excluded app | `codex/core-domains`; no changes under `clientapp-v2` |

The final backend count is **672 baseline + 43 restored coverage tests + 37 Tracker tests = 752**. Dev/test migrations and dev seeds passed. Existing dev accounts were preserved. The backend check log is [s3-backend-precommit.log](s3-backend-precommit.log).

The Tracker browser flow accepts a new invite and verifies default Reflection; adds daily weight and a habit plus workout Energy; requests a Blood report; records 180 lb with an imperial client profile; recovers a lost response with one entry; answers the habit; completes a workout and records Energy; uploads a PDF and image in order; and records coach Waist. It checks kg/lb display, **1 of 1 workouts**, request closure, coach labels, and downloaded file bytes.

The same flow also verifies two successive corrections, Hunger after a meal with **1 of 1 meals**, Add something else without assignment, photo comparison, custom Tracker archive/restore/delete, template application, same-day timing changes, and default settings. Evidence is in [s3-screens](s3-screens/) and [results.json](s3-screens/results.json).

## Limits

No requested Tracker feature is deferred. Reviews, Focus, goals, imports, report parsing, occurrence exceptions, and native notifications remain out of scope.

Native devices and simulators were not tested. Coach record forms retain values, files, and uncertain request identity while the page remains open; a full reload does not restore that coach form. Client drafts and files do survive reload. The existing Vite large-chunk warnings remain; both builds exit successfully.

Phoenix runs on port 4000. The retained app servers use 2022 and 1315. Synthetic browser-test accounts remain for inspection. Early browser runs exposed selector mistakes and a test-handler race, which were corrected; a temporary 503 during a pending migration resolved after migration. The final flows pass.
