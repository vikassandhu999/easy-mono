# Assign a missing client intake

When an existing client has no intake, the coach needs to choose the right questions and make them available in the client app. Enter from Client overview → No intake assigned → Assign intake. This is an occasional phone or desktop task; assigning the wrong form or creating a second intake is the costly mistake.

Use a dedicated client-scoped page with a searchable active Intake list, then the selected form's name, server question count and preview before Assign intake. A default-only action was considered, but would hide the existing ability to select the appropriate intake. Keep search and selection in the URL so reload and returning to choices retain context. There are no local question edits or extra scheduling fields in this task.

The server supplies purpose/status filters, cursor pages, counts and the complete selected form. Read the client's current intake before enabling assignment. An existing intake leads back to its review/follow-up; an inactive client leads back to their profile. Do not replace or reopen an existing intake through this screen. New invitations keep their automatic default-intake behavior; one-time check-ins remain in scheduling.

Handle client/intake/form read failures explicitly and preserve the selected form after rejected writes. Unknown write outcomes require checking the client's saved intake before an explicit retry; an existing result is opened without another POST. The backend serializes intake creation and rejects a second intake. Session changes and unmounted screens must not receive a late navigation or stale cache write.

Verify at 375px/1280px: empty-state entry, three pages and server counts, remote search, retained page failure/retry, preview, reload/return, archived and wrong-purpose form rejection, existing/inactive-client guards, failed and lost writes, failed saved-result lookup/retry, concurrent assignment, actual client access, and account isolation. Use disposable isolated fixtures for the otherwise unusual missing-intake state.

## Verification, 2026-09-16

Implemented `/clients/:id/intake/assign` and the missing-intake entry in Client overview. Pending and active clients can receive their first intake; inactive clients have a link to their details. Search and selected form survive reload and returning to choices. Form preview uses the shared shadcn controls; counts and purpose/status filtering stay server-owned. The generic intake reader no longer labels every assignment as automatically included.

`test:intake-assignment` passes at 375px/1280px against the isolated API and current coachapp. It covers cold list/form failures, three cursor pages, next-page retention/retry, empty search, selected-form focus, preview, reload/return, archived/wrong-purpose selections, inactive/existing clients, failed assignment and lookup, lost responses with one POST, concurrent assignment of a different form, and logout during a held real response with no stale cache or browser error. The actual client accepts, opens and submits the selected intake in clientapp; the coach reads and marks those answers reviewed. Clientapp uses real isolated API responses through browser request forwarding.

Two focused regressions were found and fixed: a mutation error handler threw a second session error after logout, and existing-intake focus ran before client details mounted. Their browser assertions pass. Independent API review confirmed the existing request/response and session invalidation; no public JSON or generated schema change was needed.

Existing client invitation/acceptance/review/recovery and intake follow-up suites pass at both widths. Scoped Biome, repository checks, app production build and full backend precommit pass (1,779 tests, zero failures). Evidence: `/tmp/coachapp-assign-intake-final-browser.log`, `/tmp/coachapp-assign-intake-{clients,follow-up}.log`, `/tmp/coachapp-assign-intake-verified-build.log`, `/tmp/coachapp-assign-intake-final-precommit.log`. Reviewed screenshots are in `tests/intake-assignment/artifacts/selected-{375,1280}.png` and archived under `/tmp/coachapp-intake-assignment-audit-2026-09-16`.

Fixtures are fresh isolated businesses and deliberately missing-intake clients; their records remain in the disposable database. Normal API4000, coach2022 and client1314 remain available. The existing bundle-size warning and physical-device/target-coach usability limits remain part of the whole-app audit.
