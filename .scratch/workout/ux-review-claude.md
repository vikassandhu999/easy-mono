# Workout UX review (Claude, 20 Oct 2026)

Reviewed the running apps on `c9e25559`, using the seeded `today-*` accounts. Coach screens were checked at 1280px and 375px, and client screens at 375px. Screenshots are in the session scratchpad (`ux/`).

**dembrandt stages run:** 3 (layout), 4 (components and interaction), 5 (polish), and 6 (accessibility; spot checks only, no full screen-reader pass). Stages 1–2 (brand and tokens) were skipped because both apps already have settled design systems.

**Settled decisions respected:**
- U1–U14 and V1–V7
- phone Training week uses Mon–Sun tabs (the user's sibling instruction)
- pickers are bottom sheets on phones
- ADR 0015's three slot states
- actual values are never filled from targets

**Reference design:** the client logger prototype the user settled (`clientapp/src/today-prototype/workout-logger.tsx`). It logs sets as a compact table: a header row `Set | metric | metric | ✓`, then one short row per set. Production moved away from it.

## Blockers

### 1. Logger: each set is a tall card, not a row (client and coach)

**Stages:** 3 (ui-density, repeated-component-alignment) and 4 (operational-expert-tool-ui).

On the client, each slot takes about 260px at 375px wide, so a 3-round per-side exercise fills three screens. On the coach screen at 1280px, each slot is about 130px. Every card repeats the same four things:
- the full heading ("Bulgarian split squat set 2 left")
- the full target line, which is identical on every row when targets are `same_for_all`
- a text status ("Unrecorded")
- the field labels ("Reps", "Weight (kg)")

A person mid-set cannot scan their progress. This contradicts the settled prototype.

**Fix:** use the prototype layout in both apps.
- **Exercise header:** shown once, with the code (A1), name, "Each side · 3 rounds", the target summary, and the Swap action.
- **Table header:** `Set | <metric labels> | (action)`, shown once.
- **Rows:**
  - A row is about 48px high, labelled `1`, `1 L`, `1 R`, and so on.
  - Inputs show the target as a **placeholder**, never as a value (ADR 0015).
  - The action is a ✓ tick button. Skip is a secondary icon or text action on the same row.
  - Per-round targets appear only on rows whose target differs from the summary.
- **Accessibility:** inputs keep their accessible names ("Set 1 left reps") through `aria-label`, while the visible labels move into the table header.

### 2. Recorded, skipped and unrecorded rows look alike

**Stages:** 4 (status-colors-and-errors) and 6 (WCAG 1.4.1: colour or shape must not be the only cue, but some visible cue is needed).

The state is a plain black word at the bottom of the card ("Done", "Skipped", "Unrecorded"), in the same style as the other text.

On a skipped row:
- the inputs stay empty and editable
- a black primary "Done" button stays
- a "Remove" button sits next to it, without saying what it removes (it removes the skip)

ADR 0015's main promise is that skipped, recorded and not recorded are three clearly different states, and the screen does not make them different.

**Fix:**
- **Recorded:** the row shows its values in read state, with a ✓ in the success colour, and offers "Edit".
- **Skipped:** the row is muted with a "Skipped" chip, and offers "Undo skip", which records it instead.
- **Unrecorded:** inputs and ✓ only, with no status word.
- Rename "Remove" to "Undo skip" on skipped rows and "Clear" on recorded rows.

## Major

### 3. Every row has a primary button

**Stage:** 3 (visual-emphasis-and-hierarchy).

Each slot has a black (coach) or purple (client) filled "Done" button: 7 primary buttons, plus "Finish workout", which uses the same style. The single real primary action, Finish, does not stand out.

**Fix:** make the row ✓ a secondary or outlined icon button that fills on success. Keep one filled CTA, "Finish workout", in the sticky footer.

### 4. Activity actions are scattered and one is disabled without a reason

**Stage:** 4 (gestalt-ui-organisation, nielsen #1 and #9).

"Swap" is plain text in the header. "Edit rounds and rest", "Copy targets", "Complete activity" and "Skip activity" are a row of mixed buttons under the overall result. Once a set is recorded, "Skip activity" turns grey with no explanation.

**Fix:**
- Put the exercise actions in the exercise header, next to Swap: `Swap · Edit plan · Complete`.
- Hide "Skip activity" once work is recorded, or show the reason ("Recorded sets can't be skipped").
- Show "Copy targets" only after a swap, next to the "Instead of <original>" line.

### 5. "Overall result" is inconsistent and its save button is odd

**Stages:** 4 (form-design) and 5.
- It is collapsed for strength exercises and expanded for the run.
- Its disabled full-width "Save overall result" button looks like a broken divider.
- On the coach screen it sits between the sets and the activity actions.

**Fix:**
- Collapsed by default for every kind. Expanded when it has values, or for activity kinds with no sets.
- Save when an input loses focus, with the same per-field saved state as the sets, so there is no separate Save button.
- If an explicit button stays, it is a normal secondary button that appears only when a value has changed.

### 6. Today is not marked on the coach Training week

**Stage:** 3 (ui-context-and-scope).

The "Record session" and "Start session" buttons appear only in Tuesday's column, and nothing says Tuesday is today. That holds on desktop (no column highlight) and on the phone (the Tue tab looks like any other selected tab).

**Fix:**
- Add a "Today" label and a subtle column tint on desktop.
- Add a dot or "Today" under the phone tab, matching the client day strip, which already has a dot.

### 7. Week session buttons look like separate cards

**Stage:** 3 (gestalt proximity and common region).

"Record session" and "Start session" sit between the workout chips as their own white boxes, so they read as list items, not as actions on the chip above.

**Fix:**
- Put the action inside the chip card, in its bottom row.
- Keep both labels: "Start session" for coach-led occurrences, "Record session" for others.
- An occurrence with a log shows "Open session", or "In progress" when it is active.

### 8. Repetitive "Also …" lines on the week

**Stage:** 5 (nielsen #8: aesthetic and minimalist design).

Every chip in a daily schedule says "Also Mon · Tue · Wed · Thu · Fri · Sat · Sun" minus the current day. That is 28 near-identical lines.

**Fix:** a schedule on all 7 days says "Every day". On 5 or 6 days, keep the list.

### 9. The coach finish dialog speaks to the client and mislabels its button

**Stages:** 4 (form-design) and 5 (user-flows).
- The title is "Finish workout", but the button says "Save workout".
- The coach is entering the client's answers (ADR 0012), yet the questions read as if the coach is answering about themselves.
- Unrecorded sets are not mentioned, though the prototype warned about them.

**Fix:**
- Make the button "Finish workout".
- On the coach screen, add one line: "Enter Alex's answers, or leave them blank."
- Add a muted line, "4 sets not recorded. They stay empty.", with no extra choice (ADR 0015: finishing never invents results).

### 10. Session header shows the raw date and a stale device notice

**Stage:** 5.
- "2026-10-20 · In progress" uses the ISO format.
- "Changes are kept on this device." shows even when nothing is pending; later it becomes "All changes saved." in another spot.
- The workout instructions ("Warm up for 5 minutes first.") float unlabelled with an odd indent.

**Fix:**
- Format the date as "Tue 20 Oct · In progress".
- Show one save-status line in one place, only when there is something to say: saving, not saved, or saved just now.
- Label the instructions "Coach's instructions", in the same style as the client app's coloured note.

### 11. Client Today blames the client for a session the coach is recording

**Stage:** 5 (nielsen #2: match with the real world).

While Sam records Lower A, three other workout cards say "Finish your workout in progress first." The client did not start it and cannot finish it from those cards.

**Fix:** when the active log was recorded by the coach, say "Sam is recording Lower A. You can start this after it's finished."

### 12. Exercise editor: grouping and layout

**Stages:** 3 (gestalt, form-design) and 4.
- **Field order:** Equipment and Muscles come after the Metrics section, so the exercise's description is split around the "what the client records" section.
- **Width:** at 1280px every control, including the Kind select, spans about 1,000px.
- **Action placement:** Archive and Delete sit above "Save exercise".
- **Repeated labels:** every metric row repeats "Metric 1" / "Metric 1 label".

**Fix:**
- Order: name, kind, instructions, equipment, muscles, goals, places; then "What the client records" (metrics); then demonstrations.
- Cap the form at about 720px.
- Move Archive and Delete under a "Manage" heading after Save.
- Give the metric rows one header ("Metric | Label shown to the client") with per-row accessible names.

## Minor

13. **Builder:**
    - The "Each side" checkbox and the "each side" tag both appear on the same row. Keep the checkbox and drop the duplicate tag.
    - "Rest None between rounds" should read "No rest between rounds".
    - Show "5000 m" as "5 km".
14. **"1 rounds" and "1 exercises":** pluralise correctly on the coach session screen and on the client Today card.
15. **"Refresh" buttons:** the exercise library, the exercise picker and Recent sessions have manual "Refresh" text buttons. React Query refetches on focus, so these add noise. Remove them.
16. **Recent sessions empty state:** it says "0 sessions" and also "No sessions recorded yet." Keep only the sentence.
17. **Exercise library rows:** three lines each, ending with "Shared · Read-only" on most. Fold the ownership into a small tag ("Shared") on the metrics line.

## Suggested order

1–3 first: they are one change in each logger (row layout plus states plus emphasis), built on `@easy/workouts/session`. Then 4–5 in the same files, 6–8 on the week, then 9–12. The minor items fit in alongside.

## Implementation status (20 Oct 2026)

| # | Status |
|---|---|
| 1–3 | Done in both loggers. Each set is one row (`Set` / inputs / Skip ✓) under one header. Targets are faint placeholders and are never stored. Recorded rows show a filled ✓ with Clear, and Save appears after an edit. Skipped rows show a dashed chip with Undo skip. The per-row ✓ is outlined, so Finish is the only filled CTA. |
| 4 | Done. On the coach screen, the actions sit in the exercise header. On the phone they sit in the activity footer, because the client header has no room. Skip activity is hidden once work is recorded, and "Copy original targets" appears only after a swap. |
| 5 | Done. Overall result opens when it holds values, and its Save appears only after a change. Autosave on blur was not added; the explicit Save keeps the existing recovery flow. |
| 6–8 | Done. Today's column is outlined and labelled "Today", and the phone tab has a dot plus `aria-current`. The session action sits inside its card, and a schedule on all 7 days reads "Every day". |
| 9 | Done. The button reads "Finish workout", the dialog counts sets not recorded, and the coach dialog says to enter the client's answers. |
| 10 | Done. Dates read "Tue 20 Oct". The save bar shows only while saving, after a failure, or on a blocked retry. Coach instructions are labelled "Instructions for the client". |
| 11 | Done. "Sam is recording Lower A. You can start this after it's finished." |
| 12 | Done. The form is capped at about 768px. Fields run name → kind → instructions → equipment → muscles → goals → places, then "What the client records" with one header row, then demonstrations. Save comes before "Manage exercise". |
| 13 | Partly done. Rest summaries read "No rest" and "Client-chosen rest", and distances read in km. The "each side" tag stays, because U9 settles the tag. |
| 14 | Done ("1 round", "1 exercise"). |
| 15–16 | Deferred. "Refresh" and the count line come from the shared `InfiniteList`, which every coach list and the list browser suite use. |
| 17 | Done. Ownership is a small tag next to the name. |

Gates: `lint:ci`, `@easy/workouts` check (48 tests), both app builds, `test:today`, `test:workout`, `test:workout-session`, `test:exercises`, `test:visual-hierarchy`, and the workout UX suite all pass.
