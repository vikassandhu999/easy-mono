# Training worksheet

When preparing a repeatable training programme, a coach needs to choose movements, prescribe a session, create variations, and place sessions in the week. Coaches may work on a phone between sessions or at a desktop. The costly mistakes are losing a prescription, changing the original while making a variation, and overwriting another coach's changes.

Entry is Training navigation and a searchable cursor library. Create template opens an unsaved worksheet directly. Add exercises creates Workout A with three empty working sets per movement. The plan name, optional description, and workout names remain editable context. No request is sent until Save plan.

The user rejected separate Workouts, Schedule and Review screens and approved a continuous worksheet. Workouts are collapsible sections with movement and assigned-day summaries. The week stays above them. Selecting a day assigns a workout or rest; the same workout can appear on several days.

## Prescribing and varying sessions

Plan titles lead the hierarchy, followed by bold workout titles, semibold exercise names, and smaller muted field labels. Extra space between exercises groups each name with its fields; secondary set actions use quieter text. Uniform working sets share one editable prescription: sets, reps, optional load/unit, and rest. Vary sets & add details reveals individual rows and all supported targets. Warm-ups, drop sets and differing targets stay explicit. Matching-set edits preserve exceptions and extra instructions. Repeat last set copies the full set; Warm-up prepends a warm-up. No saved counts or business selections are calculated in the browser.

The exercise picker retains an ordered selection across server searches. Coaches can inspect instructions and equipment, reorder or remove selections, then add them once. Its selection tray and action stay outside scrolling results. Adding movements does not open a sequence of set-entry dialogs.

Create a variation copies a workout into independent draft identities. Exercises can also be duplicated or replaced. Replacement explicitly offers keeping targets and instructions or resetting to three empty sets. Replacing a saved movement preserves its workout-element identity. Local workout, exercise and set removals have Undo. Undo restores removed content without replacing subsequent edits; restoring a workout preserves days explicitly reassigned afterward.

Client view hides controls in the same worksheet and shows current draft targets, including zero values and instructions. It does not assign changes to clients. Validation opens the workout and individual fields needing attention, including collapsed sections and client view.

## Saving and recovery

One Save plan action coordinates the existing metadata and atomic prescription writes. These remain separate API transactions. A successful metadata response supplies the revision for the prescription write. If the latter fails, retry retains the successful revision instead of repeating creation or a metadata write.

A lost creation response offers an in-place Check training plans dialog. It searches matching templates using the shared cursor list, reads the selected template, and allows an active empty template to be used for the current draft. The worksheet stays intact and the next explicit save uses that template's identity. A populated or inactive template cannot be adopted through this recovery flow. While creation is unconfirmed, the submitted worksheet stays fixed and Save plan is disabled. Closing recovery keeps that protection. After a successful lookup, Create a separate template explicitly restores editing; recovering an empty template restores the same draft without another creation request. Both choices focus the plan name. Back navigation remains available with the unsaved-changes confirmation.

Failed saves retain the draft. Revision conflicts require explicitly loading the latest saved version. Block accidental navigation with unsaved changes. Browser reload warns before losing the in-memory draft. Previously assigned client plans remain independent copies.

Persisted counts and filtering stay on the server. Local array operations only render, edit or serialize the worksheet. Exercise pagination uses the shared cursor list, abort signals, retry and keyboard-accessible loading fallback. The earlier backend pagination addition retains no-cursor compatibility.

Outside this slice: custom exercise library management, editing assigned client prescriptions, archive/delete flows, automatic draft persistence, and API transaction changes.

## Verification

Real API browser suites use the isolated `easy_coachapp_auth_dev` database and local mail delivery at 375px and 1280px:

- `templates.browser.mjs`: creation, required fields, 43 exercises across cursor pages, page failure and keyboard retry, server search, every set field including zero values, ordering, saved identity preservation, metadata editing, failed and lost saves, revision conflicts, scheduled workout removal, saved-template assignment, 45-template library traversal, return scroll, and account-switch response isolation.
- `compact-sets.browser.mjs`: direct shared targets without a write, count validation in advanced batch entry, exceptions, matching updates, retained notes/RPE, repeated sets, warm-ups, removal, compact mobile height, and save/reload.
- `workspace.browser.mjs`: movement-first creation, selection order across completed server searches, a short mobile dialog viewport, independent variations, keeping/resetting replacement targets, replacing persisted movements, Undo with subsequent edits, client view, hidden-field validation, partial-save retry without duplicate creation, and lost-creation recovery without leaving the draft.

These run with `test:templates`. Screenshots are in ignored `tests/training/artifacts/`. Browser checks cover layout and interaction, not a target-coach usability session or physical-device keyboard testing.

The coach build, Biome and repository shape checks are required finish gates. Vite retains its existing bundle-size warning. No backend changes were needed for the worksheet iteration. The preceding pagination work passed backend `mix precommit` with 1,635 tests and its exercise controller suite with 26 tests; its generated schemas are already in the working tree.

Code graph access timed out (`cbm`: broker request timed out). Structural evidence came from targeted source reads and reference searches. No legacy app components, layouts or styles were consulted or copied. The existing coachapp-v2 change is its previously generated API schema. No commit or deployment was requested.


## Creation recovery audit, 2026-09-16

The original browser probe reproduced an enabled Save plan immediately after an uncertain creation. The corrected template suite verifies disabled editing/save, failed lookup with separate creation disabled, empty lookup, return to the protected draft, leave/cancel, and explicit retry with retained values and focus. The worksheet suite loses the response to a real creation, recovers that saved identity, and saves the full prescription with exactly one creation request. Both pass at 375px/1280px.

Compact sets, shared targets and client personalization regressions also pass at both widths. Template/worksheet suites use the existing isolated API/app: the normal database includes shared exercises, so its search/paging totals differ from these fixtures' exact-count assumptions. The initial normal template run passed the changed recovery flow before reaching that unrelated count assertion. Personalization passes against the normal API/app. Broader long-content, saved-result focus and builder route-state checks remain in the route audit.
