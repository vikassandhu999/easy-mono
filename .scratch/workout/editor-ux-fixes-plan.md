# Workout editor UX fixes implementation plan

> Execution: implement in this session with the executing-plans workflow. The user approved all findings in the preceding editor audit. Keep the current checkout, preserve staged changes, and do not commit.

**Goal:** Correct all editor findings from the 20 October browser audit.

**Architecture:** Keep workout data operations and scoped restoration in `workout-builder/model.ts`, serialized saving in `save-queue.ts`, and interaction state in the owning editor components. Reuse the existing generic `UndoToast`. Normalize Result values at the backend response boundary without changing the API contract or persisted schema.

**Stack:** Phoenix/Ecto, React, React Aria, TanStack Query, TypeScript, Playwright.

**Spec:** The audit in this conversation and `.scratch/workout/concept.md` U1–U14. Audit evidence is in `/tmp/easy-workout-editor-dembrandt-2026-10-20/`.

## Constraints

- Preserve cards, target chips, phone bottom sheets, each-side tags, explicit reorder controls and autosave.
- Preserve prescriptions from earlier dates and the existing stable UI identities.
- Keep changes uncommitted. Preserve staged files and screenshot artifacts.
- No new dependencies or schema migrations. Keep typed API shapes unchanged.
- Check the coach at 375px and 1280px, including enlarged text.

## Review focus

- Undo must preserve later name, instructions, side and unrelated exercise edits.
- An unmounted save queue must send the latest valid pending draft without sending an invalid draft or crossing sessions.
- Switching type with existing content must require an explicit decision and provide scoped recovery.
- Invalid fields must explain the fix locally; Retry is for save failures, not invalid input.
- Slow uploads, cancellation, long names and focused Undo must keep actions available.

## 1. Result serialization

Files: `backend/lib/easy_web/types/workouts.ex`, `backend/test/easy_web/controllers/workouts_test.exs`.

- [x] Add a controller regression that writes, reads and lists exact Win, Draw and Loss targets.
- [x] Observe the failure, then normalize enum target values to wire strings in the formatter.
- [x] Run the focused controller tests.

## 2. Content safety and saving

Files: `workout-builder/model.ts`, `save-queue.ts`, `cards-builder.tsx`, `workout-builder.tsx`, `ui/week-editor.tsx`, builder model tests.

- [x] Add tests for flushing a pending draft on dispose, splitting an exercise into a new card, and scoped restoration after round and target-mode changes.
- [x] Extend `actions.moveExerciseToGroup` with a new-card destination, preserving exercise identity and using a fresh card identity.
- [x] Add scoped round/target restoration that preserves unrelated current values.
- [x] Add explicit confirmation before discarding content on type conversion or differing per-round targets on mode collapse.
- [x] Provide Undo for type conversion, round reduction and target-mode collapse through the existing generic toast.
- [x] Reuse the toast for removals; constrain wrapping and pause expiry during focus or hover.
- [x] Flush a scheduled valid save during disposal; keep failed/invalid recovery explicit.

## 3. Validation and keyboard interaction

Files: `model.ts`, `save-queue.ts`, `parts.tsx`, `cards-builder.tsx`, `workout-builder.tsx`, builder tests.

- [x] Represent local validation separately from network failure in the save state.
- [x] Expose field-specific target problems; keep `problemsOf` as the first-problem summary.
- [x] Show errors beside name, target and video fields with ARIA associations.
- [x] Keep an invalid target editor open on Done and focus its bad input.
- [x] Restore target-chip focus on close and move focus into an opened target editor for keyboard use.
- [x] Clear the standalone Create form error on correction and mark its invalid field.

## 4. Layout and media feedback

Files: `workout-builder.tsx`, `cards-builder.tsx`, `parts.tsx`, `video-panel.tsx`, `index.css`, `api/library-media.ts`, `ui/button.tsx`.

- [x] Compact the empty instructions field and editor spacing while keeping labels visible.
- [x] Wrap names and controls safely at 200% text size. Keep per-round table scrolling scoped.
- [x] Pin picker search above its scrolling results.
- [x] Add the editor H1 and workout-specific document title.
- [x] Disable More rounds at 100, correct one-round wording, and use the shared pointer cursor.
- [x] Show precise video file errors before requesting an upload.
- [x] Report upload byte progress through the upload hook, support cancellation, and show uploading in the editor status.

## 5. Verification

- [x] Add browser regressions for the changed behaviour to the coach workout editor tests.
- [x] Run frontend lint, shared workout checks and retained app builds.
- [x] Run workout, workout-session, Exercises, list and visual hierarchy browser suites.
- [x] Recheck the audited editor flows, including conversion/recovery, type-specific fields, reordering, upload states, focus and reflow.
- [x] Run backend `mix precommit`, review the complete diff, and leave changes uncommitted.

## Verified results

- Backend `mix precommit`: 811 tests, 0 failures; Credo and typed-route checks passed. Exact Win, Draw and Loss targets now write, read and list correctly.
- Frontend lint, shared workout checks, coach build and client build passed. The final coach build includes the added model/save-queue regressions.
- Browser suites passed: editor, workout week, workout session, Exercises, lists, visual hierarchy, client Today, Nutrition week and workout UX recovery. Coach flows were checked at 375px and 1280px; client flows at 375px.
- Editor regressions cover conversion warnings and scoped Undo, round reduction, target collapse, split cards, immediate navigation saves, validation, focus, pinned picker search, long names, enlarged text, round limits and file errors.
- Upload checks cover progress, cancel, offline failure, and a delayed completion that preserves later metadata edits. Presign and storage PUT responses are simulated in the upload browser tests; workout saves use the real local API.
- One read-only review found two additional issues: slow upload completion could overwrite later edits, and type Undo could retain hidden invalid exercise targets. Both were reproduced and fixed; the final editor browser suite passes both regressions.
- The video panel owns media interaction state in its own module. Offline file uploads fail promptly instead of waiting indefinitely for reconnection.
- Changes remain uncommitted. Existing staged source and screenshot changes are preserved. New editor evidence stays in the ignored `tests/workout-builder/artifacts/` directory.
