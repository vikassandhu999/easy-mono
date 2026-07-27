# GAPS.md — pre-resolved "stop and ask" moments

UI-CONTRACT §2 says: not covered → stop and ask. These are the asks, answered up front. Anything NOT listed here that has no §2 mapping is still a stop-and-ask.

## Resolved

**1. Dashboard glance bar (24 Active clients / 3 Pending invites)**
`Surface` with two stat blocks (`Typography` number + label), `Separator` orientation=vertical between. No custom stat component, no Card-per-number.

**2. Priority queue rows with left color stripe (DB)**
`ListBox` items inside a `Card`, and the stripe **is** built (reversed 2026-07-25 — both DB refs draw it at both widths, so dropping it was the drift, not the stripe). It's a 3px `w-0.75 self-stretch rounded-pill` span in the row's leading grid column, filled from the same tone map as the avatar tint and the status `Chip`: `bg-danger` / `bg-warning` / `bg-accent` / `bg-border`. Never a `border-left` and never a colour outside those tokens. Reference: `dashboard/components/priority-queue.tsx`.

**3. Setup progress strip (DB)**
`Surface` + `Chip` per step + `Button` (primary) + `CloseButton`. Steps are static labels, not Tabs. Mobile: collapses to one row + chevron → navigates to the next incomplete step.

**4. Seat-usage meter (IN header, ST Billing)**
`ProgressBar` — and it needs compound children or it renders empty:
`<ProgressBar value={n}><ProgressBar.Track><ProgressBar.Fill/></ProgressBar.Track></ProgressBar>`. Label + value as `Typography`. Never a hand-styled div bar.

**5. Macro meters + energy line (NB) and macro ratio bar (RE)**
Same answer as 4 — `Progress`/`Meter`, warning color when over target. The kcal headline is `Typography`. The P/C/F ratio bar in the recipe form is three `Progress` segments or one stacked Meter — if neither reads well, ship without the bar (numbers carry the info) rather than hand-rolling.

**6. Serving-size / image-URL inline adders (FO/FE, ED)**
Inline `Surface` row with `FormTextField`s + small Buttons, exactly like the app's `editable-row.tsx` pattern. Not a dialog, not a sheet.

**7. Set rows + set editor (TB)**
Set rows are `ListBox` items (tap target = row). The set editor is the **existing** set-editor from `training-plans/plan-builder/*` — reuse it, don't rebuild. Segmented controls in it are `ToggleButtonGroup`; unit chips (kg/lbs/bw, m/km/mi) are `ToggleButtonGroup` too.

**8. Weekday chips (NB days, TB scheduling)**
`ToggleButtonGroup` with single-char/three-char `ToggleButton`s (height comes from the theme's control block — never written at the call site). Exclusivity rules live in the handler, not the component.

**9. Slot tag on meal cards (NB)**
`Chip` that opens a `Dropdown` (desktop) / `KeyboardSheet` list (mobile) of the 7 slots.

**10. Add-meal / add-question palettes (NB, FB)**
These are pickers → responsive overlay rule: `Popover` (desktop) / `KeyboardSheet` (mobile) wrapping one shared content component. Preset lists are `ListBox` with `Header` per category.

**11. Drag handles (FB questions, NB meals)**
The prototype shows grip icons but implements **menu-based reordering (Move up / Move down)**. Ship menu-based reorder; do NOT add a DnD library. Drop the grip icon if it doesn't do anything.

**12. Mobile phone status bar / bottom nav in frames**
Prototype chrome only — never port. The app shell (`app-shell.tsx`) owns navigation.

**13. Invite success card with link + WhatsApp share (IN)**
`Card` + `Chip` + copy row: HeroUI 3.2.1 has NO `Snippet` — always the fallback: `Surface` + mono `Typography` + copy `Button` with `toast('Link copied')`. WhatsApp share is a plain `Button` with `lucide` icon opening the wa.me URL.

**14. Numbered instruction steps + check-style cues (EP)**
Plain `Typography` list markup; number/check adornments via `Chip` size=sm or lucide `check`. No custom list component.

**15. Activity feed (ST Billing)**
`ListBox` (non-interactive items) with lucide icon per event kind. Not a Table, not a Timeline component.

**16. Program-sheet grid variant (TB "tbg" view)**
The prototype contains a desktop spreadsheet-like grid variant. It's a `Table` (desktop only). On mobile this variant doesn't exist — mobile always gets the card/list builder. Only port the grid if/when the ticket asks for it; the card builder is the primary deliverable.

**17. `Questionnaire` form type (FB, FM) — DROPPED, user decision 2026-07-26**
The FB frame's `Type` control offers three segments, `Check-in · Intake · Questionnaire`, and `COPY.md` § FM/FB repeats it. **There is no questionnaire purpose and there will not be one.** `FormTemplate`'s enum is `[:intake, :check_in]` and the app ships two segments — that is correct, not a gap. Do not add the third segment, do not add the enum value, and do not re-raise this. The COPY.md lines that name it (`Intake, check-in, and questionnaire forms for your clients`, and both `Type` field lists) are stale prototype copy.

**18. `Draft` form state (FM) — DROPPED, user decision 2026-07-26**
The FM frame's filter row is `All · Active · Draft · Archived` and its row chips repeat `Draft`. **There is no draft state and there will not be one.** `FormTemplate`'s status enum is `[:active, :archived]`; a form is live the moment it exists and `Save form` is the only commit. Do not add the tab, the chip, or the enum value. Same call as #17, same date.

**19. `Source` as free text (FO/FD/FE) — RESOLVED read-only, user decision 2026-07-26**
COPY.md gave `Source` the placeholder `e.g. USDA`, which reads as free-text attribution. It isn't: `Food.source` is `Ecto.Enum [:system, :imported, :custom]` and it is **load-bearing** — `Foods.ensure_editable/1` uses it to refuse edits and deletes on system and imported foods. Making it free text would delete that guard. So `source` stays server-stamped provenance and the field renders read-only (`6b81098e`), and COPY.md's placeholder was the stale half. If attribution ("this came from USDA") is ever wanted, `Food` **already has an unused `brand` field** — use that, don't overload `source`.

**20. Training-builder API fields with no UI (TB) — DELIBERATELY UNBUILT, user decision 2026-07-26**
Three fields exist on the training API and the builder does not touch them:
`TrainingPlanWorkoutExercise.superset_group_id`, that element's `notes`, and
`TrainingWorkout.notes`. The TB reference draws no affordance for any of them,
so they stay unbuilt — this is a recorded decision, not an oversight, and it was
re-confirmed during the clean-room rebuild of the builder. Do NOT "restore" them
on finding the fields in `generated.ts`. Building supersets in particular is a
design task (grouping, numbering, and how a superset reads on the client's
screen), not a matter of surfacing a column.

## 20. NB palette rows follow the app overlay-spacing system, not the mockup (2026-07-27)
The add-meal/add-swap palette rows, labels and create-row now use the app-wide
overlay spacing system (RM-141: 16px gutter, vendor ListBox row register, one
text edge at 24px) instead of the mockup's per-panel insets (px-3/min-h-11/
rounded-control). Deliberate user ruling: app-wide consistency wins over
per-screen values. The `nb-reuse-*` / `create-meal-*` pairs were removed from
`manifests/NB.json` accordingly — do not re-add them without re-opening the
ruling.

## Still open — genuinely stop and ask
(none — everything listed here has since been designed and built: Client
Detail per `CLIENT-DETAIL.md`, messages/inbox, check-in review, landing-page
editor. A NEW need with no §2 mapping is still a stop-and-ask.)
