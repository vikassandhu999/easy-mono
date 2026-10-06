# Slice 1 client review

Review date: 6 October 2026. Scope: the working-tree changes in `frontend/apps/clientapp`, excluding generated `src/api/schema.ts`. Backend and coach implementation were outside this review. The owner changed client files during the review. The results below include a scoped check of those fixes.

Spec verdict: pass for the reviewed client behavior after the fixes. Quality verdict: pass for the reviewed changes after the fixes. No confirmed issue remains open from this review. These verdicts do not establish live Phoenix or native-device behavior.

The review used `.scratch/core-domains/build/s1-foundation-training.md`, `decisions.md`, `training.md`, the frontend and client contracts, and the client rebuild plan. It used the code-review and natural-writing skills. No application source, database, branch, or commit was changed by the reviewer. This report is the only repository file written by the reviewer.

## Spec checks

Today reads expected occurrences. The earlier-date control lets the client choose an occurrence. Its start request includes `plan_revision_id`, `workout_id`, `schedule_entry_id`, and `occurrence_date`. Other plan workouts send the prescription IDs without an occurrence. Free workouts send neither pair. These paths follow M7: "The system does not guess."

Prescribed set requests retain `item_id` and `set_id`. Extra set requests omit `set_id`. The editor supports `done`, `failed`, and `skipped`, integer reps, negative load for assistance, RPE, RIR, time, and distance. Client unit preferences choose the initial load and distance units. Soreness was removed as required.

Drafts remain account-scoped. Set creates preserve `request_id` through an uncertain save. Query keys include the session owner; mutation handlers check that owner before changing cached data. No confirmed auth ownership defect was found in the reviewed changes.

## Findings resolved during review

1. Saved prescribed entries kept an obsolete session revision. At `src/training/session.tsx:235`, saving A at revision 1 left an edit entry at revision 2. Saving B advanced the session to revision 3. Selecting A and changing its reps then sent `expected_revision: 2`. The browser received 409. Retries retained that value. The owner now advances other unattempted entries after a confirmed set write. Active sessions also expose the revision comparison control. The scoped browser check saved A, saved B, then corrected A. The PATCH sent `expected_revision: 3` and changed A from 5 to 7 reps.

2. Opening a session without a local draft created a fresh operation for its first prescribed set, even when that set was saved. `src/training/workout-draft.ts:15` now checks saved rows and returns an edit operation. Before the fix, the browser sent another POST with the same `set_id` and a different `request_id`. The mocked server accepted two rows. Actual backend acceptance was outside this review. After the fix, the editor opened as a clean edit. Changing its reps sent PATCH, and the mocked session retained one row for that prescribed set.

3. Editable measurements used display rounding. At `src/training/recording.ts:72`, a saved `distance_m: "1.00"` with entered unit `km` became the editable value `"0"`. A note-only correction then sent `distance_value: 0`. This changed a recorded fact without a measurement edit. The owner removed display rounding from `setValues`. The same probe now retains `"0.001"` and sends `distance_value: 0.001` in km. Display text can still use rounding.

4. Successful prescribed saves appeared as unsent entries. The successful-save branch kept an edit entry, while `entryHasInput` counted all edit operations as unsent. The owner added a clean/dirty distinction at `src/training/workout-draft.ts:37` and `src/training/session.tsx:244`. After saving the prescribed sets and completing the session, the browser showed no "Unsent entries on this device" section. Unchanged saved edits also have their Save button disabled.

5. Recovery after a lost start response kept the completed attempt's retry identity. The recovered-active branch in `src/api/training.ts:139` did not clear the start draft. The owner now checks the owner and clears that resource before returning the recovered session. The scoped browser check aborted the first start response after mock persistence, recovered through GET active, completed that workout, and started another free workout. The two POST requests used different `request_id` values, and the second session was active.

## Verification

`rtk pnpm -C frontend/apps/clientapp check` passed after the fixes. It ran the discovered unit suites, including the training recording suite.

`rtk proxy node /tmp/s1-client-review-probe.mjs` passed after the fixes. This deterministic Playwright script used a 375 by 812 viewport against the running Vite app. Every `/v1/**` request was intercepted. The script checked the five cases above in one flow. Browser page errors were `[]`. Browser launch required sandbox escalation because macOS denied Chromium's Mach port registration inside the sandbox.

The browser check establishes client state, rendered controls, and outgoing request values with controlled responses. It does not establish backend validation, real offline shell reload, native storage, or the full live owner acceptance flow. Build and repository lint were left to the owner; the owner reported that the client build passed.
