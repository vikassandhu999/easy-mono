# Assign a training plan

When I have reviewed a client's intake, I need to choose an existing training plan and its dates so the client can begin their prescribed workouts. The user approved this slice after Forms and the shared list foundation. Phones are the primary layout; desktop keeps the same decisions and actions.

## Screen brief

Enter from Client Overview. Search active Training Templates using the shared cursor list and API total. Open a plan to read its description, ordered workouts, prescribed sets, and weekly schedule. Choose a required start date and optional inclusive end date, then assign a separate Client Plan. Success returns to Client Overview with the saved plan and server lifecycle. Assignment does not replace overlapping plans or establish that every onboarding task is complete.

A preview dialog inside the list was considered. Dedicated list and preview routes give the prescription room on a phone, allow direct links/reload, and retain the search and scroll position when choosing another plan. The preview has a mobile action footer and inline desktop actions. No new shadcn primitive is needed.

Empty search results suggest another name; an empty library explains that a saved training template is required. Creation/editing is the next slice. Loading, failed reads, retry, unavailable/archived templates, invalid dates, overlapping coverage, and changed template revisions have explicit recovery. Assignment sends the revision that was previewed; a stale response requires refreshing the preview. Transport failures ask the coach to check the client's plans because the write may have completed. Mutations do not retry automatically and account changes reject late completion.

## Contract

Training template and client-plan coach lists accept cursor=start and return next_cursor plus the server count. The offset contract remains for legacy consumers. Both paths reuse Easy.CursorPage and tenant-leading indexes; each page reapplies authorization. TrainingPlan.workout_count is formatted on the server. Assignment accepts an optional expected_revision for compatibility and checks it while holding the source template lock. The new app always supplies it.

Plan prescription arrays are rendered in server order. No browser filtering, sorting, or reducing computes persisted counts or plan selection. Assigned plans appear in their own cursor list on Client Overview, with lifecycle supplied by the API.

## Verification

Verified on 2026-09-10. `tests/training/assign.browser.mjs` passes at 375px and 1280px against the isolated browser API. It creates 45 real templates and an accepted client, then exercises three cursor pages, a failed next page with keyboard retry, server totals/search, saved search and scroll on return, preview loading failure, workout and set values including zero, required/reversed dates, stale revision refresh, assignment failure and retry, and persisted client access to the copied prescription. It also verifies overlap rejection and an upcoming assignment, a committed write with a lost response, retained rows after refresh failure, archived-template rejection, and an empty-library response fixture. Mobile regressions cover leaving and switching accounts while an assignment response is pending. Error focus and visibility are asserted after submission. Screenshots were inspected at both widths.

The existing Clients/intake suite and shared-list suite pass. Coach build, Biome, repository shape/rule checks, and diff checks pass. Backend `mix precommit` passes with 1,633 tests and zero failures, including controller coverage for cursor bounds, authorization, literal search, same-timestamp ordering, and stale revision rejection. `just gen-api` refreshed all three consumers; clientapp-v2 typecheck passes. The legacy coachapp-v2 typecheck still reports the React ref-type conflicts in question-type-meta.ts and meal-palette.tsx recorded by the preceding slice. Its handwritten code is unchanged.

The coach build retains its bundle-size warning (638 kB uncompressed JS). Browser checks do not replace target-coach usability review or physical-device testing. No production deployment or commit was performed.

Graph lookup was unavailable: cbm status and training-plan search timed out. The implementation and contract review used bounded router, controller, context, schema, and test source reads; no graph completeness claim is made.
