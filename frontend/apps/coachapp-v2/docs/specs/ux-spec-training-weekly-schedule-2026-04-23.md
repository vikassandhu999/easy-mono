# UX Spec: Weekly Schedule

> **⚠️ Status (2026-06-20): The weekly-schedule editing UI described here has been removed from coachapp-v2.** It was implemented by the now-deleted `weekly-overview` component (and the interactive plan builder it belonged to); the training-plan detail view is now read-only, with no in-app workout/exercise editing. Removed as dead code — still in git history. This document is retained as the design of record.

**Date:** 2026-04-23
**Scope:** The Weekly Schedule section on the training plan builder. The seven-row list that shows which workout runs on which day.
**Principle:** Seven identical rows. Anchored by day name. Actions out of sight until needed.

---

## What's Wrong Today

Looking at the current implementation:

1. **Five different row states visually compete.** Assigned day, empty day, rest day, assigned-but-empty workout, each has its own text arrangement. No consistent row template — each row reparsed on every scan.

2. **Day labels are the weakest element on the screen, when they should be the strongest.** Coaches scan "what happens on Tuesday?" — the `Mon`/`Tue`/`Wed` text is small, gray, and easy to skip past. The workout name is what visually dominates, but it's not the anchor.

3. **Every empty day shows two buttons and three options.** "Assign workout" and "New workout" and "Mark rest day" — three affordances, on three separate lines, five days in a row. Seventeen interactive elements on a screen showing no data.

4. **Broken workouts render the same as real ones.** Thursday's "Pull Day — 0 exercises" looks identical in weight to Friday's "Pull Day — 4 exercises." The coach doesn't see at a glance that Thursday is incomplete work.

5. **"Mark rest day" is inconsistent in placement.** It's inline-left when the day is empty, then becomes "Clear" (far right) once marked. Same concept, two layouts.

6. **The × icon on workout cards is ambiguous.** Does it unassign this day, or delete the workout entirely? Nothing tells you.

7. **Visual rhythm is off.** Each row is boxed with its own background and border. Seven boxes stacked reads as a form, not a schedule — too much structure for what's really a list.

---

## The Redesign

### One row template, always

Every day uses the same three-column grid:

```
  [day]     [content]                    [actions]
  60px      flexible                     auto
```

The row height is constant (`56px`). Day name is always left-aligned. Content sits in the middle. Actions on the right. Whether the day is empty, assigned, or rest, the shape doesn't change.

### The day name is the anchor

`Mon`, `Tue`, `Wed` — weight 500, size 13px, color `--color-text-primary`. Rest days get the same treatment but slightly muted (`--color-text-tertiary`) because they're a "nothing to do here" state.

Three-letter abbreviations, not full names. Saves horizontal space without losing clarity. No "Monday" — coaches scan, they don't read.

### Content column tells the truth

**Assigned day with exercises:**
```
Pull Day
4 exercises
```
Workout name (14px, weight 500) + exercise count subtitle (12px, `--color-text-tertiary`).

**Assigned day, empty workout:**
```
Pull Day
No exercises yet
```
Same structure, but the subtitle uses `--color-text-warning` (amber). Visual nudge: this day is assigned but incomplete. Coach knows at a glance.

**Empty day:**
```
—
```
Single em-dash. That's it. No "No workout assigned" text. The em-dash communicates "nothing here" more cleanly than three words.

**Rest day:**
```
Rest day
```
Italicized, muted. The entire row gets a slightly different background tint (`--color-background-secondary`) so rest days are instantly distinguishable from empty-workday days.

### Actions collapse to the right

Each row shows at most two controls:

- **Empty day:** `+` button (icon on mobile, `+ Add workout` text on desktop). No overflow menu — all actions live inside the picker that `+` opens.
- **Assigned day:** `⋯` overflow menu only. The workout card itself is tappable to open and edit.
- **Rest day:** `⋯` overflow menu only.

The overflow menu (`⋯`) opens a popover on desktop, bottom sheet on mobile:

**Assigned day menu:**
- Edit workout
- Duplicate workout
- Copy to another day…
- Unassign from this day
- Mark as rest day
- Delete workout (destructive, separated)

**Rest day menu:**
- Clear rest day
- Copy to another day…

Empty days don't get an overflow menu — their actions are all "do something with this day," which is exactly what the `+` picker is for.

### Section header shows the state

Above the schedule, a compact header line:

```
WEEKLY SCHEDULE                    3 workouts · 1 rest day · 3 empty
```

Left: section title (unchanged). Right: a tiny computed summary. Tells the coach the shape of the week at a glance without them counting rows.

### Visual rhythm

- **One outer container** with a single border + 12px radius wrapping all seven rows — not seven boxed rows.
- **0.5px dividers** between rows using `--color-border-tertiary`. Matches the rest of the app's list patterns.
- **Rest day background** is `--color-background-secondary`, a subtle tint that makes the day read as "no action needed" without being alarming.
- **No drop shadows, no cards-within-cards.** The schedule is a table-like list, not a grid of cards.

---

## The "×" Problem

Current UI shows a close button on each workout card. Unclear whether it unassigns the day or deletes the workout.

**Replace with overflow menu.** "Unassign from this day" and "Delete workout" are different actions, shown separately, with the destructive one visually separated (red text, below a divider). The coach sees both options and knows which is which.

---

## Mobile Layout (the primary case)

The mobile viewport (≥360px working width) is the primary case to design for. Sketching the layout at 380px reveals the grid needs adjustment — the desktop-tested button widths don't fit.

### The grid at mobile

```
[day 40px] [content 1fr] [actions auto]
   40px    ~230px          36-80px
```

Gap 10px between columns. Row padding 12px horizontal, 12px vertical. Total row height: **56px**.

### Why 56px, not 64px

I originally spec'd 64px for "thumb-friendly spacing." Seven rows × 64px = 448px, which eats half the viewport on an iPhone SE before the user scrolls to see the schedule below other plan sections. 56px is still a comfortable tap target — the entire row is the hit area on assigned days — and preserves ~100px of vertical budget for everything else on the page.

### Actions column — mobile-specific

The desktop spec showed a `[+ Add workout]` text button on empty days. At 380px that button plus the `⋯` menu plus a 60px day column crushes the content column to ~120px. Long workout names ("Upper Body Strength Day") truncate ungracefully.

**Fix:** on mobile, the primary add action collapses to an icon button:

- **Empty day:** `[+]` button only (36×36px, filled `--color-background-info`, white `+` glyph). No overflow menu on empty days — all empty-day actions collapse into the picker that `+` opens:
  - Assign existing workout
  - Create new workout
  - Mark as rest day
  - Copy from another day…

  One tap opens the sheet; the coach picks what to do with the day. Simpler than two separate affordances (primary + overflow) for a row that has nothing on it.

- **Assigned day:** `⋯` overflow menu only (36×36px, tappable). No primary action button — the row itself is the primary action (see below).

- **Rest day:** `⋯` overflow menu only. Same as assigned day.

### Row-tap behavior

On mobile, tapping the row does different things based on state:

- **Assigned day (workout present):** tap anywhere on the row (except the `⋯` menu) → opens the workout detail page. This is the primary coach intent on an assigned day — edit the workout. The `⋯` menu handles secondary actions (duplicate, copy, unassign, delete).

- **Empty day:** tap opens the picker (same as tapping `+`). The whole row is a tap target, making it easy to hit with a thumb anywhere on a narrow phone.

- **Rest day:** tap does nothing. To change state, use the `⋯` menu (Clear rest / Copy to another day).

### Day column

40px wide. Fits `Mon` / `Tue` / `Wed` (three letters, 13px weight 500) comfortably with right-padding. Center-aligned text for visual stability across abbreviations of different glyph widths.

### Content column

Takes all remaining space (~230px on 380px viewport, more on wider phones).

- **Workout name:** `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` so "Upper Body Strength Day" becomes "Upper Body Strengt…" rather than wrapping or overflowing.
- **Subtitle:** same truncation rules. Count lines don't usually wrap, but belt-and-suspenders.
- **Empty state (em-dash):** 16px, centered vertically, no wrap risk.

### The overflow menu is a bottom sheet

On mobile, tapping `⋯` opens a bottom sheet (not a popover). Full width, 48px row height per option, destructive action (Delete workout) separated by divider with red text.

```
┌─────────────────────────────────────┐
│                                     │
│  Monday · Pull Day                  │
│                                     │
│  ○ Edit workout                     │
│  ○ Duplicate workout                │
│  ○ Copy to another day…             │
│  ○ Unassign from this day           │
│  ─────────────────────────────      │
│  ○ Delete workout          (red)    │
│                                     │
│                       [Cancel]      │
└─────────────────────────────────────┘
```

The sheet header shows the day and workout context so the coach knows which they're acting on (the `⋯` on Monday and Thursday would otherwise look identical in isolation).

### Section summary wraps on narrow screens

On mobile the summary goes on its own line below the title:

```
WEEKLY SCHEDULE
3 workouts · 1 rest · 3 empty
```

On desktop (>640px) it sits on the right of the title line.

---

## Desktop Layout

At ≥640px, the layout adjusts:

- Day column grows to 60px (more breathing room)
- "+ Add workout" on empty days becomes a text button (as originally specced), not icon-only — desktop has the horizontal space
- Row height stays at 56px (tap targets aren't the concern on desktop; visual density is)
- Overflow menu becomes a popover anchored to the `⋯` button, not a bottom sheet
- Hover state on assigned-day rows: subtle background shift (`--color-background-secondary`) indicating the row is tappable

The core layout is the same. Only the action button treatment and the menu presentation change.

---

## Interactions

### Adding a workout to an empty day

Tap `+` (mobile) or `+ Add workout` (desktop) → opens a picker sheet. Four choices:

- **Assign existing workout** — shows the coach's library, picks one, assigns to this day
- **Create new workout** — creates a fresh workout assigned to this day, opens the workout editor
- **Mark as rest day** — changes the day to rest state
- **Copy from another day** — duplicates another day's workout assignment onto this day

Tapping the row itself (outside the `+` button) opens the same picker on mobile. The entire row is the empty-day tap target.

### Marking rest day

From an empty day: tap `+` / row → picker sheet → "Mark as rest day."
From an assigned day: via `⋯` menu → "Mark as rest day" (confirms first — "Unassign Pull Day and mark Tuesday as rest?")

The row transforms in place:

- Background shifts to `--color-background-secondary`
- Content becomes "Rest day" (italic, muted)
- Day label mutes slightly
- Only `⋯` menu remains on the right

### Unassigning

Via `⋯` menu → "Unassign from this day." The row collapses back to the empty state (em-dash, `+` button). The workout itself is not deleted — it still exists in the coach's library and on any other day it was assigned to.

Confirmation: none needed. Unassigning is reversible in one tap (add it back). Keep friction low.

### Opening a workout to edit

On mobile: tap anywhere on an assigned-day row (except the `⋯` menu) → opens the workout detail page.
On desktop: the row gets a hover background; click anywhere on the row → opens the workout detail page. The `⋯` menu doesn't open the workout, it opens the context menu.

### Deleting a workout

Via `⋯` menu → "Delete workout" (red, below divider). Confirmation dialog: "Delete Pull Day? This will remove it from every day it's assigned to."

This is the destructive action. All references to the workout disappear. Confirmation mandatory because it can't be undone in one tap.

### Copy to another day

Via `⋯` menu → "Copy to another day…" opens a day picker (Mon-Sun checklist). Select target days, confirm. The same workout appears on all selected days — same PlanItem pattern from the training plan redesign spec.

---

## Copy Reference

All user-facing text in the schedule:

| Element | Text |
|---------|------|
| Section title | `Weekly schedule` |
| Empty day content | `—` (em-dash) |
| Assigned day, exercises present | `{Workout name}` / `{N} exercises` |
| Assigned day, empty workout | `{Workout name}` / `No exercises yet` |
| Rest day content | `Rest day` |
| Primary empty-day action (mobile) | `+` icon only |
| Primary empty-day action (desktop) | `+ Add workout` |
| Overflow menu trigger | `⋯` |
| Empty-day picker options | `Assign existing workout…` / `Create new workout` / `Mark as rest day` / `Copy from another day…` |
| Assigned-day menu options | `Edit workout` / `Duplicate workout` / `Copy to another day…` / `Unassign from this day` / `Mark as rest day` / `Delete workout` |
| Rest-day menu options | `Clear rest day` / `Copy to another day…` |
| Section summary | `{N} workouts · {M} rest day · {K} empty` |
| Assigned → rest confirmation | `Unassign {workout} and mark {day} as rest?` |

Nothing else. No helper text, no tooltips, no "Tap to assign" prompts.

---

## What's Removed

- Inline "Assign workout" text button on empty days
- Inline "New workout" text button on empty days
- Inline "Mark rest day" text action on empty days
- The "×" close button on workout cards (replaced by overflow menu)
- "No workout assigned" copy (replaced by em-dash)
- "Clear" button on the right of rest days (moved into overflow menu)
- Per-row containers/boxes (replaced by single outer container with dividers)

---

## Implementation Checklist

### Frontend — structure

1. Replace the current per-row layout with a single container + row grid template
2. Grid: `grid-template-columns: 40px 1fr auto` (mobile) → `60px 1fr auto` (desktop ≥640px)
3. Row height: `56px` fixed on both viewports
4. Unify day label styling (13px, weight 500, `--color-text-primary` for active, `--color-text-tertiary` for rest)
5. Implement the three content states (assigned with exercises, assigned empty, rest, empty)
6. Add the warning color (`--color-text-warning`) on the "No exercises yet" subtitle
7. Text truncation: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` on workout name and subtitle

### Frontend — actions

8. Empty-day action: `+` icon button (36×36px) on mobile; `+ Add workout` text button on desktop (≥640px)
9. Assigned-day and rest-day: only `⋯` overflow menu (36×36px)
10. Remove the `×` close button from existing workout cards — all destructive/remove actions go through the menu
11. Empty-day tap target: entire row taps into the picker (no separate overflow menu needed)
12. Assigned-day tap target: entire row taps to open workout detail (except `⋯` button area)
13. Build the overflow menu: popover on desktop, bottom sheet on mobile
14. Bottom sheet header shows day and workout context ("Monday · Pull Day")
15. Destructive action (Delete workout) separated by divider, red text

### Frontend — visual

16. Single outer container, 12px border-radius, single border
17. 0.5px dividers between rows using `--color-border-tertiary`
18. Rest-day rows: `--color-background-secondary` background tint
19. Hover state on assigned-day rows (desktop only): subtle background shift to indicate tappability
20. Section header with summary: inline on desktop, stacked on mobile (<640px)

### Backend

No changes. This is purely a frontend redesign over existing data.