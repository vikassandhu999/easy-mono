# INTERACTIONS.md — what happens when, per screen

The prototype's logic class encodes real behavior. This is the distilled "what happens when" — the part markup and screenshots can't show. Data structures shown are **shape only**; wire to RTK Query hooks.

## Conventions used everywhere
- Enter in any inline-rename/small input commits by blurring (`Enter → blur → commit`).
- ⋯ menus close when another opens; clicks inside panels don't bubble to the row toggle (stopPropagation).
- Delete of anything non-trivial goes through an `AlertDialog` confirm with a specific noun (`Delete "{day}"?`, `Deactivate {name}?`) — never window.confirm.
- Builder edits are autosaved in place (prototype mutates state directly; app = optimistic mutation + `toast` on failure). Forms with a `Save changes` button are explicit-save.
- List → detail navigation is the whole row (chevron is decoration, not the target).

## DB — Dashboard
- Setup strip: shows next incomplete step; `Continue setup` deep-links to it; `×` dismisses the strip (persist dismissal).
- Queue rows are ranked; each row's single action navigates (Renew → billing for that client, Assign → plan assignment, Review → lead/check-in, Nudge → message compose).
- `View all clients` → CL. Conversation rows → the thread. Quick actions → respective create flows.

## CL — Clients
- Filter chips are exclusive (one active); search composes with the active filter; sort toggles by `Last active`.
- Row → client detail. `Invite client` → IN.

## IN — Invite client
- Validation: name required AND (email OR phone) — mirrors the seat model.
- Submit → success state replaces the form in place (`sent` flag): invite-link card + `Copy` / `Share via WhatsApp` / `View client` / `Invite another` (resets to blank form).
- Seat meter reflects active + invited against plan limit; block submit when full (point to ST Billing).

## EX / FO / RC lists (+ NP / TR / FM)
- `Create …` swaps the list for the create form in place on mobile; desktop navigates to the create page (`creating` flag per module).
- Search filters as-you-type. Status tabs (NP/TR/FM) are exclusive.

## Create/edit forms (ED, FE, RE, NE, TE, form create)
- **Serving sizes** (foods/recipes): `+ Add serving size` opens inline row `Unit* / Amount / Weight (g)`; save validates unit non-empty (`Enter a serving unit`); rows removable with ×. Amount defaults to 1, weight to 0.
- **Images** (exercise/food): `Add image URL` opens inline url input; validates non-empty (`Paste an image URL`); thumbnails removable.
- **Recipe ingredients**: `+ Add ingredient` opens a food picker (search, rows show `per 100 g` macros); picking adds an expanded row with `Amount / Unit / Weight (g)`; weight drives the live macro line per row and the recipe totals + P/C/F ratio bar; rows reorder (up/down) and remove; totals recompute live.
- Cancel returns without saving; Save = mutation → toast → back to detail/list.

## NB — Nutrition plan builder (day-first)
- **Days**: tabs switch; `+ Day` appends `Day {n}` and selects it; ⋯ menu → Rename (inline input) / Delete (confirm: `Its meals stay in the plan` — meals persist, only the day's order list is dropped; can't delete last day).
- **Weekday chips**: toggling a weekday on one day removes it from any other day (a weekday belongs to exactly one day).
- **Energy header**: kcal + macro meters computed live from the day's meals; meter turns warning-colored when over target; collapsible (`Show/Hide macros`).
- **Meals** are plan-level entities; a day holds an ordered list of meal ids. A meal on >1 day shows `Used in {n} places` (amber border) + warning note that edits apply everywhere.
- Meal card: header tap expands/collapses; slot tag opens slot menu (Breakfast / Morning snack / Lunch / Afternoon snack / Dinner / Evening snack / Anytime); ⋯ → Rename / Move up / Move down / Remove from this day (meal survives in plan).
- **Items**: tap an item → amount sheet in edit mode (grams field, live save, `Remove from meal`); × removes directly.
- **Add food or recipe** → picker sheet: Foods/Recipes tabs, search, multi-select with check circles, `Create food "{q}"` inline when no exact match (creates 0-macro food and selects it), confirm `Add {n} items` → **amount sheet runs once per selected item in sequence** (queue): serving-preset chips ⊕ count, or grams override (grams clears preset); live kcal/macro preview; skip via close advances the queue.
- **Swaps**: per-meal `Client can swap with` list — add from other meals (menu shows each meal's kcal), remove with ×. The meal itself is the default; no default-chip management.
- **Add meal** panel: `Create a new meal` (adds `New meal`, opens it in rename mode) or `Reuse an existing meal` (meals not on this day, sub `On {days} · {slot}`).

## TB — Training plan builder
- **Workouts**: tabs (+ count); `+ Workout` creates `New workout` in rename mode; ⋯ → Rename / Delete (delete also clears it from the schedule).
- **Weekday scheduling**: chips under the active workout toggle assignment; a day holds at most one workout; label `Scheduled: Mon, Thu` / `Not scheduled yet`. Day-first variant: Mon–Sun tabs with the workout name or `Rest`; assign menu = Rest / existing workouts (with usage) / `New workout for this day`.
- Workout used on >1 day → `Used on {days}` + `edits apply to all of them` note.
- **Exercises**: added via multi-select picker (search, `Create exercise "{q}"` inline → weight_reps default); reorder up/down; remove ×; new exercise starts with 1 default set.
- **Sets**: `+ Add set` duplicates the previous set (or default) and immediately opens the set editor on it. Tapping a set row opens the editor; last remaining set is not removable.
- **Set editor** is tracking-aware: fields shown depend on exercise tracking type (see COPY.md labels); type seg Working/Warm-up/Drop; unit chips kg/lbs/bw and m/km/mi; edits apply live; `Done` closes. Summary strings recompute (`Working · 8 × 80kg · RPE 8`).

## FM / FB — Forms
- FM behaves like NP/TR lists.
- FB header: name input + type seg; live summary `{n} questions · {m} required · {k} sections`; `Preview` opens read-only client view; `Save form` = explicit save.
- **Sections**: title is an inline input; ⋯ → Move up / Move down / Delete (only when >1 section); `Add section` appends `New section`.
- **Questions**: collapsed row = drag handle, type icon, label (ph `Untitled question`), type chip, REQ badge, ⋮ menu (Move up/down, Duplicate — copies options and opens the copy, Remove). Expanded = label input, answer-type dropdown (9 types), Required toggle, and an Options editor only for Select/Multi-select (add/edit/remove option rows).
- **Add question** opens a two-part palette: blank types grid + `Common questions` presets grouped by category; picking either appends and expands the new question. Select presets start with one empty option.

## ST — Settings
- Tabs Profile / Team / Billing / Account (desktop rail, mobile single scroll with underline tabs). Switching tabs cancels any inline edit/invite in progress.
- **Profile**: row `Edit` → inline input + Save/Cancel (Enter commits). Trimmed value saved; empty shows `—`.
- **Team**: `Invite trainer` → responsive overlay (First/Last/Email*; email required); new member appears as `Invited`. Invited rows: `Resend` / `Revoke` (removes). Active non-owner rows: `Deactivate` → AlertDialog → status `Deactivated`, clients reassigned to owner (copy says so). Owner row has no actions.
- **Billing**: `Add seats` → responsive overlay with − / + stepper (min 1) and live monthly cost; confirm bumps limit+paid and prepends an activity event. `Cancel subscription` → AlertDialog → status `Cancels at period end` + activity event; only offered while active/past-due. Activity feed is append-only, icon per event kind.
- **Account**: static rows + `Log out` (destructive styling).

## Not in the prototype (don't invent)
Client detail, Messages/threads, check-in review flow, landing-page editor. If a DB/CL action targets one of these, navigate to the existing app screen.
