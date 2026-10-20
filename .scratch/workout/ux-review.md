# Workout UX review

Review date: 20 October 2026. Scope: retained coach app at 1280px and 375px; retained client app at 375px.

## Method and boundaries

Applied [Dembrandt](../../.agents/skills/dembrandt/SKILL.md) stages 3–6, with the status and error rules from stage 2. Brand and token design in stages 1–2 were retained because the app design systems are settled. The product contract includes U1–U14, ADR 0015, and the explicit instruction that Training must match Nutrition. For phone week layout, that sibling-screen instruction supersedes V7: [Nutrition NU8](../nutrition/concept.md) specifies one day at a time with Mon–Sun tabs, as recorded in the [workout verification report](verification-report.md). U12 requires centered exercise pickers on desktop and bottom sheets on phones. The original review applied these decisions incorrectly; W1, B2 and C3 are reverted below.

Baseline Playwright journeys covered exercise creation; a superset with per-side and per-round targets; scheduling, undo and saved history; client start, record, skip, swap, overall result with a partial interval, finish and reopen; coach recording and client-session review. A separate review script uses `today-coach@example.test` and `today-client@example.test`, OTP `123456`, and captures failed-save recovery and picker keyboard behavior. Screenshots are local artifacts under [ux-review/](ux-review/).

Impact: **High** blocks a core action or hides recovery; **Major** causes repeated work or a material layout/accessibility problem; **Minor** affects secondary clarity.

## Exercise library and editor

### E1 — Major — Maintenance actions occupy the phone save bar

The fixed bar contains Archive, Delete and Save. It takes two rows and covers more of the form than the save action needs. Delete stays beside the routine save action throughout editing.

Rules: [visual-emphasis-and-hierarchy](../../.agents/skills/visual-emphasis-and-hierarchy/SKILL.md), “Destructive actions … visually separated from constructive actions”; [sticky-and-fixed-elements](../../.agents/skills/sticky-and-fixed-elements/SKILL.md), limit fixed layers and their occupied space; [gestalt-ui-organisation](../../.agents/skills/gestalt-ui-organisation/SKILL.md), group actions by purpose.

Fix: keep Save in the mobile bar and put Archive/Delete at the end of the editor content. Keep delete confirmation and archive behavior.

Before: [375px](ux-review/before/exercise-editor-375.png), [1280px](ux-review/before/exercise-editor-1280.png).

After (fixed): [375px](ux-review/after/exercise-editor-375.png), [1280px](ux-review/after/exercise-editor-1280.png). Save occupies one row; maintenance actions stay in the form.

The library retains visible search/filter labels, read-only and archived text, empty guidance, and list recovery. No library behavior change is needed.

## Workout builder

### B1 — Major — The autosave bar covers the app header when scrolled

The builder bar is sticky at `top: 0` above the app header. Opening a picker after scrolling shows the bar occupying the header region.

Rules: [sticky-and-fixed-elements](../../.agents/skills/sticky-and-fixed-elements/SKILL.md), coordinate sticky layers; [nielsen-usability-heuristics](../../.agents/skills/nielsen-usability-heuristics/SKILL.md), consistency and visible context.

Fix: position the bar below the real app-header height, including the safe area.

Before: [375px](ux-review/before/builder-picker-375.png).

After (fixed): [375px scrolled](ux-review/after/builder-scrolled-375.png), [1280px scrolled](ux-review/after/builder-scrolled-1280.png). The save bar stays below the app header.

### B2 — Reverted: conflicts with user decision

The original Major finding incorrectly treated the phone exercise-picker sheet as a violation. [Workout U12](concept.md) says: “The exercise picker is a centered modal (a bottom sheet on a phone) with search”. Centered-modal placement applies to desktop only.

Correction: restore the builder's phone bottom sheet and the existing responsive Dialog behavior for coach-session and workout-selection pickers. Desktop remains centered. Focus containment, Escape, search and focus return are still verified under [modal-and-overlay-patterns](../../.agents/skills/modal-and-overlay-patterns/SKILL.md) and [wcag-accessibility](../../.agents/skills/wcag-accessibility/SKILL.md).

Before review: [375px](ux-review/before/builder-picker-375.png), [1280px](ux-review/before/builder-picker-1280.png).

After correction: [375px sheet](ux-review/after/builder-picker-375.png), [1280px modal](ux-review/after/builder-picker-1280.png), [coach-session sheet](ux-review/after/coach-session-picker-375.png), [coach-session desktop modal](ux-review/after/coach-session-picker-1280.png).

### B3 — Major — Per-round target buttons lack useful names out of context

Repeated controls are named only by values such as `Any` or `1:30`. Assistive-technology button navigation cannot identify the exercise, metric or round from those names.

Rules: [wcag-accessibility](../../.agents/skills/wcag-accessibility/SKILL.md), meaningful control names; [repeated-component-alignment](../../.agents/skills/repeated-component-alignment/SKILL.md), consistent control slots; [operational-expert-tool-ui](../../.agents/skills/operational-expert-tool-ui/SKILL.md), efficient keyboard operation.

Fix: keep the compact visible value and add exercise, round, metric and value to its accessible name.

Before: [375px](ux-review/before/workout-week-builder-superset-375.png), [1280px](ux-review/before/workout-week-builder-superset-1280.png). Accessible names also require DOM assertions; a screenshot alone cannot prove this fix.

After (fixed): [375px](ux-review/after/workout-week-builder-superset-375.png), [1280px](ux-review/after/workout-week-builder-superset-1280.png). The browser test also asserts the literal accessible name `Pull-up round 1 Reps: 6`.

## Client training week and Recent sessions

### W1 — Reverted: conflicts with user decision

The original High finding incorrectly treated the phone day tabs as a violation. The explicit user instruction is to match the Nutrition sibling. [Nutrition NU8](../nutrition/concept.md) says: “below that it shows one day at a time with Mon–Sun tabs”. The [prior verification report](verification-report.md) records: “Mobile Training uses the shared Nutrition day tabs, following the explicit sibling-screen instruction.” This supersedes V7's earlier list-of-days wording.

Correction: restore the shared Mon–Sun tabs below 1280px, with one visible day panel; retain seven columns at 1280px. Training now initially selects today's weekday using the server's `today` date. Changing tabs still works normally and selection survives query refreshes while the screen stays open. Nutrition's initial-day behavior is unchanged.

This addresses access to today's session within the agreed tab design. [Tab-navigation](../../.agents/skills/tab-navigation/SKILL.md), [responsive-paradigms](../../.agents/skills/responsive-paradigms/SKILL.md), and [user-flows-and-guided-paths](../../.agents/skills/user-flows-and-guided-paths/SKILL.md) apply within that decision.

Before review: [375px](ux-review/before/training-week-375.png), [1280px](ux-review/before/training-week-1280.png).

After correction: [375px, today selected](ux-review/after/training-week-375.png), [1280px](ux-review/after/training-week-1280.png). Browser checks assert the selected weekday, one visible panel and arrow-key navigation.

Recent sessions retains recorder, date, state, explicit pagination, and an active-session entry independent of the loaded page.

## Coach session recording

### S1 — High — Failed-save recovery is below every activity

A failed set save disables further changes, but the error and Retry saving control sit at the bottom of the session. At the first set, the visible page shows disabled controls without a visible reason or recovery action.

Rules: [notifications-and-recovery](../../.agents/skills/notifications-and-recovery/SKILL.md), persistent errors with an available retry; [status-colors-and-errors](../../.agents/skills/status-colors-and-errors/SKILL.md), state what failed and how to recover; [nielsen-usability-heuristics](../../.agents/skills/nielsen-usability-heuristics/SKILL.md), visible system status; [loading-states-and-perceived-performance](../../.agents/skills/loading-states-and-perceived-performance/SKILL.md), show progress where the user is working.

Fix: place save status and recovery before the activities in a sticky region below the app header. Show Saving while a command runs. Keep the stored command and existing retry logic.

Before: [375px viewport](ux-review/before/coach-375-recovery.png), [1280px viewport](ux-review/before/coach-1280-recovery.png).

After (fixed): [375px at the first set](ux-review/after/coach-375-recovery.png), [375px scrolled](ux-review/after/coach-375-recovery-scrolled.png), [1280px](ux-review/after/coach-1280-recovery.png), [Saving](ux-review/after/coach-375-saving.png). The same stored action retries successfully.

### S2 — Major — Every metric repeats the exercise and set name

The legend already identifies the exercise, round and side, but each metric label repeats the full string. On phones this creates multiple lines per label; on desktop it slows scanning. Inputs of different label lengths also sit at different heights.

Rules: [ui-density](../../.agents/skills/ui-density/SKILL.md), cut repeated words before reducing type; [form-design](../../.agents/skills/form-design/SKILL.md), visible and useful labels; [repeated-component-alignment](../../.agents/skills/repeated-component-alignment/SKILL.md), align repeated input slots; [operational-expert-tool-ui](../../.agents/skills/operational-expert-tool-ui/SKILL.md), efficient repeated entry.

Fix: show only the metric and unit at each input, keep the full context in the accessible name and fieldset legend, and align inputs at the bottom of their label rows.

Before: [375px](ux-review/before/coach-session-375.png), [1280px](ux-review/before/coach-session-1280.png).

After (fixed): [375px](ux-review/after/coach-session-375.png), [1280px](ux-review/after/coach-session-1280.png). Visible labels are short; existing full-context input selectors still pass.

### S3 — Major — Desktop overall-result fields appear after Save

The metric grid carries set-row placement into the overall-result form. At desktop width, CSS puts the Save overall result action to the left of the input fields, reversing the intended reading order.

Rules: [gestalt-ui-organisation](../../.agents/skills/gestalt-ui-organisation/SKILL.md), align related controls; [form-design](../../.agents/skills/form-design/SKILL.md), input before submit; [operational-expert-tool-ui](../../.agents/skills/operational-expert-tool-ui/SKILL.md), workflow linearity.

Fix: apply set-row placement only to detail measurements. Overall results keep their fields above Save.

Before: [1280px, Run overall result](ux-review/before/coach-session-1280.png).

After (fixed): [1280px](ux-review/after/coach-session-1280.png). The review test asserts that Save starts below the measurement inputs.

## Client Today and workout logger

### C1 — High — Failed-save recovery is below all sets

The same placement problem as S1 occurs on the phone logger. The first set is disabled after a failed save while Retry saving is several screens below it.

Rules and fix: S1, with the sticky recovery region at the top of the standalone client screen.

Before: [375px viewport](ux-review/before/client-375-recovery.png).

After (fixed): [First set](ux-review/after/client-375-recovery.png), [scrolled](ux-review/after/client-375-recovery-scrolled.png), [Saving](ux-review/after/client-375-saving.png). One error and Retry remain visible; retry preserves the input.

### C2 — Major — Repeated labels consume most of each set

The same duplication as S2 makes each per-side set much taller. Keep short visible metric labels and the complete accessible context.

Rules and fix: S2, using the existing client Field primitive.

Before: [375px](ux-review/before/client-session-375.png).

After (fixed): [375px](ux-review/after/client-session-375.png). Inputs align, keep 48px height, and retain their full accessible names.

### C3 — Reverted: conflicts with user decision

The original Major finding incorrectly applied desktop modal placement to the phone swap picker. [Workout U12](concept.md) explicitly specifies “a bottom sheet on a phone”.

Correction: restore the existing client BottomSheet for Swap and Add activity, and remove the unused centered-placement option. Search, keyboard focus containment, Escape and focus return remain verified. Finish, confirmation and plan sheets retain their existing behavior.

Before review: [375px](ux-review/before/client-picker-375.png).

After correction: [375px bottom sheet](ux-review/after/client-picker-375.png).

Today retains workout state and feedback, active-work resume, and return focus after completion.

## Verification and limits

Eight findings remain fixed. W1, B2 and C3 are marked “Reverted: conflicts with user decision”; they are withdrawn findings, not deferred fixes. No remaining finding is deferred. The app design tokens and domain behavior remain in place. No backend change was needed.

Browser checks do not prove physical iOS/Android behavior or a complete WCAG audit with assistive technology. The review covers rendered layouts, labels, focus, keyboard operation, status text and tested failure recovery. No backend or new product feature is planned.

## Journey screenshots

The links below supplement the finding screenshots with the exercised flow states. Client captures are 375px only. Prototype and unrelated nutrition images are excluded.

| Flow | Before | After |
|---|---|---|
| Create exercise | [375px](ux-review/before/exercises-exercise-editor-375.png), [1280px](ux-review/before/exercises-exercise-editor-1280.png) | [375px](ux-review/after/exercises-exercise-editor-375.png), [1280px](ux-review/after/exercises-exercise-editor-1280.png) |
| Schedule workout | [375px](ux-review/before/workout-week-schedule-dialog-375.png), [1280px](ux-review/before/workout-week-schedule-dialog-1280.png) | [375px](ux-review/after/workout-week-schedule-dialog-375.png), [1280px](ux-review/after/workout-week-schedule-dialog-1280.png) |
| Client preview, record/skip/swap, overall plus interval, finish, reopen | [Preview](ux-review/before/today-workout-preview.png), [recorded work](ux-review/before/today-workout-active.png), [optional finish](ux-review/before/today-workout-finish-optional.png), [completed](ux-review/before/today-workout-completed.png) | [Preview](ux-review/after/today-workout-preview.png), [recorded work](ux-review/after/today-workout-active.png), [optional finish](ux-review/after/today-workout-finish-optional.png), [completed](ux-review/after/today-workout-completed.png) |
| Coach start and record | [375px](ux-review/before/workout-session-coach-active-375.png), [1280px](ux-review/before/workout-session-coach-active-1280.png) | [375px](ux-review/after/workout-session-coach-active-375.png), [1280px](ux-review/after/workout-session-coach-active-1280.png) |
| View client session | [375px](ux-review/before/coach-session-375.png), [1280px](ux-review/before/coach-session-1280.png) | [375px](ux-review/after/coach-session-375.png), [1280px](ux-review/after/coach-session-1280.png) |

Exercise library: [before 375px](ux-review/before/exercise-library-375.png), [after 375px](ux-review/after/exercise-library-375.png), [before 1280px](ux-review/before/exercise-library-1280.png), [after 1280px](ux-review/after/exercise-library-1280.png). Today: [before](ux-review/before/today-375.png), [after](ux-review/after/today-375.png).

## Gate results

| Command | Result |
|---|---|
| `rtk pnpm -C frontend lint:ci` | Pass: Biome and design lint |
| `rtk pnpm -C frontend/packages/workouts check` | Pass: 43 tests |
| `rtk pnpm -C frontend/apps/coachapp build` | Pass: typecheck, checks, production build |
| `rtk pnpm -C frontend/apps/clientapp build` | Pass: typecheck, checks, production build |
| `rtk pnpm -C frontend/apps/coachapp test:visual-hierarchy` | Pass: 12 screen/viewport combinations |
| `rtk pnpm -C frontend/apps/coachapp test:exercises` | Pass: 375px and 1280px |
| `rtk pnpm -C frontend/apps/coachapp test:workout` | Pass: 375px and 1280px |
| `rtk pnpm -C frontend/apps/coachapp test:workout-session` | Pass: 375px and 1280px |
| `rtk pnpm -C frontend/apps/clientapp test:today` | Pass: 375px |

Additional review check: `rtk pnpm -C frontend/apps/coachapp exec node tests/workout-ux/workout-ux.browser.mjs` passed. It uses the seeded accounts after `test:today`, checks 375px client and 1280px/375px coach, and saves [machine-readable results](ux-review/after/ux-results.json). Checks include phone sheet bounds, desktop modal bounds, today-selected week tabs, Tab containment, Escape/focus return, input alignment and touch height, app-header separation, overall-input order, delayed-save feedback, failed-save visibility while scrolling, and successful retry. No browser page errors were recorded.

The original coach-session baseline failed at the phone Open check. The corrected flow retains day tabs, opens on the server-provided current day, and verifies session entry through the complete coach-session test. The workout-week test now waits for the tab strip, checks today is initially selected, verifies arrow-key navigation and one visible day panel, and retains the full-context per-round target-name check. The client Today screenshot helper waits for saving to end; the coach-session test removes stale failure screenshots on a successful rerun.

`rtk mix precommit` was not required: backend files did not change. Both builds report the existing large-chunk advisory and exit successfully. Physical-device checks and a full assistive-technology accessibility audit remain outside the verified browser evidence.

## Changed files

The table records the full remaining review changes. Files restored to their pre-review contents by the correction are listed separately below.

| File | Change |
|---|---|
| [frontend/apps/clientapp/src/today/parts.tsx](../../frontend/apps/clientapp/src/today/parts.tsx) | Updated |
| [frontend/apps/clientapp/src/today/workout-logger.tsx](../../frontend/apps/clientapp/src/today/workout-logger.tsx) | Updated |
| [frontend/apps/clientapp/tests/today/today.browser.mjs](../../frontend/apps/clientapp/tests/today/today.browser.mjs) | Updated |
| [frontend/apps/coachapp/src/exercises/exercise-editor.tsx](../../frontend/apps/coachapp/src/exercises/exercise-editor.tsx) | Updated |
| [frontend/apps/coachapp/src/index.css](../../frontend/apps/coachapp/src/index.css) | Updated |
| [frontend/apps/coachapp/src/ui/week-columns.tsx](../../frontend/apps/coachapp/src/ui/week-columns.tsx) | Updated |
| [frontend/apps/coachapp/src/workout-builder/cards-builder.tsx](../../frontend/apps/coachapp/src/workout-builder/cards-builder.tsx) | Updated |
| [frontend/apps/coachapp/src/workout-builder/workout-builder.tsx](../../frontend/apps/coachapp/src/workout-builder/workout-builder.tsx) | Updated |
| [frontend/apps/coachapp/src/workout-session/workout-session.tsx](../../frontend/apps/coachapp/src/workout-session/workout-session.tsx) | Updated |
| [frontend/apps/coachapp/src/workout-week/workout-week.tsx](../../frontend/apps/coachapp/src/workout-week/workout-week.tsx) | Updated |
| [frontend/apps/coachapp/tests/workout-session/workout-session.browser.mjs](../../frontend/apps/coachapp/tests/workout-session/workout-session.browser.mjs) | Updated |
| [frontend/apps/coachapp/tests/workout-week/workout-week.browser.mjs](../../frontend/apps/coachapp/tests/workout-week/workout-week.browser.mjs) | Updated |
| [.scratch/workout/ux-review.md](../../.scratch/workout/ux-review.md) | Added |
| [frontend/apps/coachapp/tests/workout-ux/workout-ux.browser.mjs](../../frontend/apps/coachapp/tests/workout-ux/workout-ux.browser.mjs) | Added |

Files restored to pre-review contents:

| File | Result |
|---|---|
| [frontend/apps/clientapp/src/ui/bottom-sheet.tsx](../../frontend/apps/clientapp/src/ui/bottom-sheet.tsx) | Restored by correction |
| [frontend/apps/coachapp/src/ui/dialog.tsx](../../frontend/apps/coachapp/src/ui/dialog.tsx) | Restored by correction |
| [frontend/apps/coachapp/src/ui/week-editor.tsx](../../frontend/apps/coachapp/src/ui/week-editor.tsx) | Restored by correction |
| [frontend/apps/coachapp/src/workout-builder/parts.tsx](../../frontend/apps/coachapp/src/workout-builder/parts.tsx) | Restored by correction |
| [frontend/apps/coachapp/src/workout-builder/workout-builder.css](../../frontend/apps/coachapp/src/workout-builder/workout-builder.css) | Restored by correction |
| [frontend/apps/coachapp/src/workout-week/parts.tsx](../../frontend/apps/coachapp/src/workout-week/parts.tsx) | Restored by correction |

<details>
<summary>Screenshot and result artifacts (84 files)</summary>

- Updated: `frontend/apps/coachapp/tests/exercises/artifacts/exercise-editor-1280.png`
- Updated: `frontend/apps/coachapp/tests/exercises/artifacts/exercise-editor-375.png`
- Updated: `frontend/apps/coachapp/tests/exercises/artifacts/restored-library-1280.png`
- Updated: `frontend/apps/coachapp/tests/exercises/artifacts/results.json`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/client-recorded-session-1280.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/client-recorded-session-375.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/client-same-session-1280.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/client-same-session-375.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/coach-active-1280.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/coach-active-375.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/coach-completed-recent-1280.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/coach-completed-recent-375.png`
- Deleted: `frontend/apps/coachapp/tests/workout-session/artifacts/failure-client.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/recent-paginated-1280.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/recent-paginated-375.png`
- Updated: `frontend/apps/coachapp/tests/workout-session/artifacts/results.json`
- Added: `.scratch/workout/ux-review/after/builder-picker-1280.png`
- Added: `.scratch/workout/ux-review/after/builder-picker-375.png`
- Added: `.scratch/workout/ux-review/after/builder-scrolled-1280.png`
- Added: `.scratch/workout/ux-review/after/builder-scrolled-375.png`
- Added: `.scratch/workout/ux-review/after/client-375-recovery-scrolled.png`
- Added: `.scratch/workout/ux-review/after/client-375-recovery.png`
- Added: `.scratch/workout/ux-review/after/client-375-saving.png`
- Added: `.scratch/workout/ux-review/after/client-picker-375.png`
- Added: `.scratch/workout/ux-review/after/client-session-375.png`
- Added: `.scratch/workout/ux-review/after/coach-1280-recovery-scrolled.png`
- Added: `.scratch/workout/ux-review/after/coach-1280-recovery.png`
- Added: `.scratch/workout/ux-review/after/coach-1280-saving.png`
- Added: `.scratch/workout/ux-review/after/coach-375-recovery-scrolled.png`
- Added: `.scratch/workout/ux-review/after/coach-375-recovery.png`
- Added: `.scratch/workout/ux-review/after/coach-375-saving.png`
- Added: `.scratch/workout/ux-review/after/coach-session-1280.png`
- Added: `.scratch/workout/ux-review/after/coach-session-375.png`
- Added: `.scratch/workout/ux-review/after/coach-session-picker-1280.png`
- Added: `.scratch/workout/ux-review/after/coach-session-picker-375.png`
- Added: `.scratch/workout/ux-review/after/exercise-editor-1280.png`
- Added: `.scratch/workout/ux-review/after/exercise-editor-375.png`
- Added: `.scratch/workout/ux-review/after/exercise-library-1280.png`
- Added: `.scratch/workout/ux-review/after/exercise-library-375.png`
- Added: `.scratch/workout/ux-review/after/exercises-exercise-editor-1280.png`
- Added: `.scratch/workout/ux-review/after/exercises-exercise-editor-375.png`
- Added: `.scratch/workout/ux-review/after/today-375.png`
- Added: `.scratch/workout/ux-review/after/today-workout-active.png`
- Added: `.scratch/workout/ux-review/after/today-workout-completed.png`
- Added: `.scratch/workout/ux-review/after/today-workout-finish-optional.png`
- Added: `.scratch/workout/ux-review/after/today-workout-preview.png`
- Added: `.scratch/workout/ux-review/after/training-week-1280.png`
- Added: `.scratch/workout/ux-review/after/training-week-375.png`
- Added: `.scratch/workout/ux-review/after/ux-results.json`
- Added: `.scratch/workout/ux-review/after/workout-session-coach-active-1280.png`
- Added: `.scratch/workout/ux-review/after/workout-session-coach-active-375.png`
- Added: `.scratch/workout/ux-review/after/workout-week-builder-superset-1280.png`
- Added: `.scratch/workout/ux-review/after/workout-week-builder-superset-375.png`
- Added: `.scratch/workout/ux-review/after/workout-week-schedule-dialog-1280.png`
- Added: `.scratch/workout/ux-review/after/workout-week-schedule-dialog-375.png`
- Added: `.scratch/workout/ux-review/before/builder-picker-1280.png`
- Added: `.scratch/workout/ux-review/before/builder-picker-375.png`
- Added: `.scratch/workout/ux-review/before/client-375-recovery.png`
- Added: `.scratch/workout/ux-review/before/client-picker-375.png`
- Added: `.scratch/workout/ux-review/before/client-session-375.png`
- Added: `.scratch/workout/ux-review/before/coach-1280-recovery.png`
- Added: `.scratch/workout/ux-review/before/coach-375-recovery.png`
- Added: `.scratch/workout/ux-review/before/coach-session-1280.png`
- Added: `.scratch/workout/ux-review/before/coach-session-375.png`
- Added: `.scratch/workout/ux-review/before/exercise-editor-1280.png`
- Added: `.scratch/workout/ux-review/before/exercise-editor-375.png`
- Added: `.scratch/workout/ux-review/before/exercise-library-1280.png`
- Added: `.scratch/workout/ux-review/before/exercise-library-375.png`
- Added: `.scratch/workout/ux-review/before/exercises-exercise-editor-1280.png`
- Added: `.scratch/workout/ux-review/before/exercises-exercise-editor-375.png`
- Added: `.scratch/workout/ux-review/before/today-375.png`
- Added: `.scratch/workout/ux-review/before/today-workout-active.png`
- Added: `.scratch/workout/ux-review/before/today-workout-completed.png`
- Added: `.scratch/workout/ux-review/before/today-workout-finish-optional.png`
- Added: `.scratch/workout/ux-review/before/today-workout-preview.png`
- Added: `.scratch/workout/ux-review/before/training-week-1280.png`
- Added: `.scratch/workout/ux-review/before/training-week-375.png`
- Added: `.scratch/workout/ux-review/before/ux-results.json`
- Added: `.scratch/workout/ux-review/before/workout-session-coach-active-1280.png`
- Added: `.scratch/workout/ux-review/before/workout-session-coach-active-375.png`
- Added: `.scratch/workout/ux-review/before/workout-week-builder-superset-1280.png`
- Added: `.scratch/workout/ux-review/before/workout-week-builder-superset-375.png`
- Added: `.scratch/workout/ux-review/before/workout-week-schedule-dialog-1280.png`
- Added: `.scratch/workout/ux-review/before/workout-week-schedule-dialog-375.png`

</details>
