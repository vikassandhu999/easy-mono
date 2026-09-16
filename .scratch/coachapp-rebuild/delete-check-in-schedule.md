# Remove an unused check-in schedule

When a coach creates a schedule by mistake, they need to remove it from the client's list without affecting forms already delivered. Enter from the client's check-in schedules; this is an occasional phone or desktop maintenance task.

Keep Edit/Resume and Preview as the main row actions. Add a quieter Delete schedule action with a dialog naming the form and its cadence/date. A separate management screen would add navigation for one action, while burying deletion under Resume would mislabel the task. Confirm that deletion is permanent and permitted only before the schedule generates any check-ins. Schedules with existing check-ins must be stopped, preserving client answers and history.

Use the existing DELETE contract. The server decides whether a schedule is unused; do not infer it from dates, active status or downloaded rows. Invalidate client schedule lists, form usage and Workbench after completion. A lost response permits an explicit retry of the same schedule ID; a 404 is reported as no longer available, without claiming the record was deleted. Keep errors in the confirmation, prevent dismissal while pending, and restore focus to a list notice after removal. Session changes must not populate old caches or navigate another account.

Verify at 375px/1280px: active and stopped unused deletion, cancel, long form names, list filters/server totals after removal, generated-check-in protection with Stop scheduling recovery, failed and lost requests, repeated absent deletion, pending modal controls and delayed-account isolation. Rerun the existing complete scheduling journey.

## Verification, 2026-09-16

Real API 4000 / coachapp 2022 scenarios pass at 375px and 1280px: cancel and restored row focus; active and stopped unused deletion; pending dismissal protection; wrapping long names; preserved search/status and server totals; retained completed client answers; generated-history protection with Stop scheduling recovery; failed DELETE retry; a lost successful response followed by explicit retry and 404; focused results; and a delayed response after logout with an empty cache and no browser errors. Both confirmation screenshots were reviewed. The existing complete scheduling suite also passes at both widths. Disposable fixture accounts, forms and protected history remain in the development database.

The first protected-history probe exposed a generic API error code. The fallback now returns `schedule_has_assignments`, retaining HTTP 422, its envelope and field details. A controller regression failed before the fix and now asserts the code and retained records. API contract review confirmed no generated schema change is required. Deletion racing simultaneous generation was not exercised by this suite.

Logs: `/tmp/coachapp-schedule-delete-browser-after.log`, `/tmp/coachapp-schedule-delete-regression.log`, `/tmp/coachapp-schedule-delete-contract-after.log`. App production build, scoped Biome, repository checks and full backend precommit pass (1,780 tests, zero failures); final gate logs are `/tmp/coachapp-schedule-delete-build-final.log` and `/tmp/coachapp-schedule-delete-precommit-final.log`. Reviewed screenshots are archived under `/tmp/coachapp-schedule-deletion-audit-2026-09-16`. The existing bundle-size warning remains.
