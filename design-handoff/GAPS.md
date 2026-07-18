# GAPS.md — pre-resolved "stop and ask" moments

UI-CONTRACT §2 says: not covered → stop and ask. These are the asks, answered up front. Anything NOT listed here that has no §2 mapping is still a stop-and-ask.

## Resolved

**1. Dashboard glance bar (24 Active clients / 3 Pending invites)**
`Surface` with two stat blocks (`Typography` number + label), `Separator` orientation=vertical between. No custom stat component, no Card-per-number.

**2. Priority queue rows with left color stripe (DB)**
`ListBox` items inside a `Card`. The colored stripe is the row's status severity — express it with the status `Chip` (danger/warning/accent) instead of a border stripe. Do not add a 3px colored left border; that's the prototype's shorthand, not a token pattern.

**3. Setup progress strip (DB)**
`Surface` + `Chip` per step + `Button` (primary) + `CloseButton`. Steps are static labels, not Tabs. Mobile: collapses to one row + chevron → navigates to the next incomplete step.

**4. Seat-usage meter (IN header, ST Billing)**
HeroUI `Progress` if the app already uses it; otherwise `Meter` from `@heroui/react` v3. Label + value as `Typography`. Never a hand-styled div bar.

**5. Macro meters + energy line (NB) and macro ratio bar (RE)**
Same answer as 4 — `Progress`/`Meter`, warning color when over target. The kcal headline is `Typography`. The P/C/F ratio bar in the recipe form is three `Progress` segments or one stacked Meter — if neither reads well, ship without the bar (numbers carry the info) rather than hand-rolling.

**6. Serving-size / image-URL inline adders (FO/FE, ED)**
Inline `Surface` row with `FormTextField`s + small Buttons, exactly like the app's `editable-row.tsx` pattern. Not a dialog, not a sheet.

**7. Set rows + set editor (TB)**
Set rows are `ListBox` items (tap target = row). The set editor is the **existing** set-editor from `training-plans/plan-builder/*` — reuse it, don't rebuild. Segmented controls in it are `ToggleButtonGroup`; unit chips (kg/lbs/bw, m/km/mi) are `ToggleButtonGroup` too.

**8. Weekday chips (NB days, TB scheduling)**
`ToggleButtonGroup` with single-char/three-char `ToggleButton`s (44px min targets on mobile). Exclusivity rules live in the handler, not the component.

**9. Slot tag on meal cards (NB)**
`Chip` that opens a `Dropdown` (desktop) / `KeyboardSheet` list (mobile) of the 7 slots.

**10. Add-meal / add-question palettes (NB, FB)**
These are pickers → responsive overlay rule: `Popover` (desktop) / `KeyboardSheet` (mobile) wrapping one shared content component. Preset lists are `ListBox` with `Header` per category.

**11. Drag handles (FB questions, NB meals)**
The prototype shows grip icons but implements **menu-based reordering (Move up / Move down)**. Ship menu-based reorder; do NOT add a DnD library. Drop the grip icon if it doesn't do anything.

**12. Mobile phone status bar / bottom nav in frames**
Prototype chrome only — never port. The app shell (`app-shell.tsx`) owns navigation.

**13. Invite success card with link + WhatsApp share (IN)**
`Card` + `Chip` + `Snippet`-style copy row: use HeroUI `Snippet` if present in v3.2.1, else `Surface` + mono `Typography` + copy `Button` with `toast('Link copied')`. WhatsApp share is a plain `Button` with `lucide` icon opening the wa.me URL.

**14. Numbered instruction steps + check-style cues (EP)**
Plain `Typography` list markup; number/check adornments via `Chip` size=sm or lucide `check`. No custom list component.

**15. Activity feed (ST Billing)**
`ListBox` (non-interactive items) with lucide icon per event kind. Not a Table, not a Timeline component.

**16. Program-sheet grid variant (TB "tbg" view)**
The prototype contains a desktop spreadsheet-like grid variant. It's a `Table` (desktop only). On mobile this variant doesn't exist — mobile always gets the card/list builder. Only port the grid if/when the ticket asks for it; the card builder is the primary deliverable.

## Still open — genuinely stop and ask
- Client detail screen (linked from CL/DB but not designed).
- Messages/inbox (rail links to it; no design).
- Check-in review flow (DB "Review" target; no design).
- Landing-page editor (quick action; out of scope).
