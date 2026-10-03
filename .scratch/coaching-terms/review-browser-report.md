# Coaching terms review browser verification

Verified on 2026-10-03 against Phoenix at `localhost:4000`, coachapp at `localhost:2022`, and clientapp at `localhost:1315`, after the development and test database reset. Coach flows ran at 375px and 1280px; client flows ran at 375px. Clientapp-v2 was not edited.

## Changes covered

Business setup requires the owner's full name, accepts a preferred name, prefills the account name when present, and maps server name errors to their fields. An account with an empty name can enter its coach name during setup. The saved coach profile contains the submitted names after reload. Browser business-create fixtures send explicit owner names.

A removed coach has an Invite again link to the invitation form. Reinviting creates a token on the same coach record, and acceptance clears removal and the invitation. The browser run found that the team formatter omitted the reinvitation URL for a linked account; the backend worker corrected it and the complete flow passed on rerun.

Ended client history sends no write requests, including conversation read acknowledgements. Attachment downloads use GET with Phoenix's `attachment_ids[]` query encoding. The mocked access scenario opens an attachment and checks that the complete ended journey sends zero writes; the connected scenario checks zero writes against Phoenix for both ended and joined accounts.

The coaching fixtures use `BusinessBilling.free_seats = 3` for capacity tests. Free-seat acceptance uses the billing default of 10. Business rows have no seat-limit field. Fixture names include the timestamp so fixture preparation can be repeated.

## Commands and results

Commands below use the stated working directory. Browser commands required approved execution outside the filesystem sandbox because macOS rejected Chromium's MachPort registration inside it.

* In `backend`, `rtk mix run priv/repo/dev_client_states.exs` and `rtk mix run /tmp/coaching-free-accept.exs`: passed. After the reinvitation formatter fix, both were rerun with output redirected to `/tmp/coaching-review-seed.log` and `/tmp/coaching-review-free-accept.log`.
* Server commands: `rtk mix phx.server` in `backend`, `rtk pnpm -C frontend/apps/coachapp dev`, and `rtk pnpm -C frontend/apps/clientapp dev` at the repository root. All started successfully.
* In `frontend/apps/coachapp`, `rtk proxy node tests/auth/owner-setup.browser.mjs`: passed at both widths. Covered signup-name prefill across reload, an account without a name, required input, both server name-length errors, creation, and persisted coach names. Screenshots wait for the handle availability result.
* In `frontend/apps/clientapp`, `rtk proxy node tests/coaching/connected.browser.mjs`: passed for ended, joined and active accounts. Covered deep links, read-only workout/message history, sign-out, and active profile persistence. This ran before the lifecycle scenario restarted the ended client.
* In `frontend/apps/clientapp`, `rtk proxy node tests/coaching/access.browser.mjs`: passed. Covered joined deep links, ended workout/meal/message/profile history, preserved drafts, hidden write controls, GET attachment reading, zero ended writes, and active controls.
* In `frontend/apps/clientapp`, `rtk proxy node tests/coaching/acceptance.browser.mjs`: passed, including a rerun using the final fresh fixture. OTP acceptance started a term automatically and retained active access after reload.
* In `frontend/apps/coachapp`, `rtk proxy node tests/clients/coaching-terms.browser.mjs`: passed at both widths after the formatter fix. Covered all state filters, search, profile persistence, set/move/clear/end dates, inclusive end-today seats, restarting a term, full-seat acceptance into joined state, coach invitation/resend/acceptance/removal/reinvitation, client reassignment, and handle validation/save/reload.
* At the repository root, `rtk pnpm -C frontend/apps/coachapp build`, `rtk pnpm -C frontend/apps/clientapp build`, and `rtk pnpm -C frontend lint:ci`: passed. Builds include app TypeScript checks and unit suites. Vite retained its bundle-size advisory.
* At the repository root, `rtk git diff --check`: passed. `rtk git diff --numstat -- frontend/apps/clientapp-v2` returned no changes.

An initial owner-setup harness assertion tried to inspect unavailable Playwright request metadata after a successful create. It was removed; the scenario instead verifies the saved coach profile through the UI. The first coach build caught an optional React Hook Form value in the name validator; the guard was corrected and the build passed.

## Visual evidence

Screenshots are in `frontend/apps/coachapp/tests/auth/artifacts/owner-setup`, `frontend/apps/coachapp/tests/clients/artifacts/coaching-terms`, and `frontend/apps/clientapp/tests/coaching/artifacts`.

Inspected owner setup at both widths, the saved owner profile, client joined/ended/free-acceptance screens, ended attachment history, coach end-today/ended/removed/returned screens, and desktop business settings. These captures contain loaded content with no clipped controls or horizontal overflow. The lifecycle capture helper waits for loading statuses to disappear.

Browser checks do not establish native-device behavior. No physical-device checks were performed in this review.
