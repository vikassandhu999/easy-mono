# Client check-in scheduling

When a client begins coaching, the coach needs to choose a progress form and its cadence so that regular updates become available without manual reassignment. This is a short desktop or mobile task. Prevent choosing an Intake, scheduling the wrong client, accidental duplicates after a lost response, and mistaking a stopped schedule for a completed submission.

Choose a client-scoped schedule list and a short creation worksheet over a calendar or setup wizard. Enter from Client Overview → Manage check-ins. Choose a Check-in form with server search and preview, enter the first date and repeat interval, then save. Optional repetition has a weekly default and a clear One time choice. The list shows the server's next due date and active flag. Edit dates and cadence in a dialog; stop or resume generation explicitly. Existing check-ins remain available when generation stops.

Use cursor pagination, server search and active/inactive filters. Do not calculate totals, capacity, next dates or completion state from downloaded schedules. Retain the legacy full-list response when no cursor is requested. The backend enforces schedule capacity and per-form uniqueness.

Only active clients can start a new schedule in this slice. A one-time schedule may become inactive as soon as its check-in is created; label this as scheduling stopped, never as an answered or completed check-in. Inactive schedules resume through the date editor so the coach can choose the next due date deliberately. Pause and updates retain history. Deletion and submission review are separate tasks.

Recover unknown creation through the client's saved schedule list, preserve drafts on errors, and protect navigation/session changes. The existing schedule update API has no revision precondition; submit only changed date/cadence fields and explicit active changes. Do not claim same-field concurrent-edit protection.

Verify the real API at 375px and 1280px, including form preview, all cadence choices, scheduling, editing, stopping/resuming, failure recovery, pagination, filters and session replacement. No old-app UX or handwritten code is used.

## Verification — 2026-09-11

The real API browser suite passes at 375px and 1280px. It covers required fields, searchable form selection beyond the first page, preview, unsaved navigation, lost creation responses, duplicate and capacity errors, all four repeat choices, update/stop failures, resuming with a deliberate date, and immediate one-time assignment generation. It verifies 20-row cursor pages, retry without losing loaded rows, server totals, search/status persistence after reload, and loaded pages and scroll restoration after returning from creation. A held update response followed by account replacement cannot restore the prior client's cache. Screenshots were inspected at both widths.

The existing Forms browser suite passes at both widths after promoting its preview to shared UI. App build, Biome, `just check-rm` and whitespace checks pass. Vite still reports the existing large-chunk warning. Backend `mix precommit` passes with 1,649 tests and zero failures; the 13 controller tests cover tenant/client scoping, pagination, filters, escaped search, invalid cursors and page limits.

The list endpoint adds `count` and `next_cursor`. Requests without a cursor retain their full list and original due-date order; cursor requests use the shared stable newest-first order. A tenant/client cursor index was applied to the isolated browser database. API schemas were regenerated through the same export/split/generation steps as `just gen-api`, using an isolated build after the development compiler lock stalled the normal command. Only generated schema output changed in coachapp-v2.

Graph MCP tools were unavailable, and the CLI graph lookup timed out. Discovery used bounded reads of the relevant backend contexts, schemas, controller, tests and new-app sources; no graph completeness claim is made. Browser checks do not substitute for a coach usability session or physical-device keyboard testing. Schedule updates retain the API's existing concurrency limitation described above.

## End-to-end audit — 2026-09-15

The schedule browser suite now follows an immediately due One time schedule through the real client app on port 1314. The client opens the generated form, encounters required-answer validation, retains an answer after a failed submission, retries successfully and sees the completed check-in in history. The coach opens submitted responses from the schedule list, reads the answer and marks it reviewed. Reload preserves the review in the coach app and shows Reviewed in the client app. The schedule remains Stopped: generation status is independent of answer and review status.

This journey passes with the coach at 375px and 1280px and the client at 375px, together with the existing cadence, cursor, search, capacity, recovery and session-isolation scenarios. The existing screens complete the task without an additional one-off assignment screen. No application or API changes were needed. Screenshots are in `frontend/apps/coachapp/tests/check-ins/artifacts/one-time-reviewed-*.png`.

Run `pnpm test:check-ins` from the coachapp directory with the API on 4000, coach app on 2022 and client app on 1314. The suite creates disposable accounts and forms in the development database; it submits and reviews their check-ins through the browser.

Coach build, scoped Biome, `just check-rm` and whitespace checks pass. Full backend `mix precommit` passes with 1,778 tests and zero failures. The existing Vite bundle-size warning remains. The reviewed-response screenshots were inspected at both coach widths.
