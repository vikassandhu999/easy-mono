# Nutrition Day-Types + Meal Options per Slot — Design

**Date:** 2026-07-06
**Status:** Approved for planning
**Scope:** Nutrition plan builder only. Training builder unchanged.

## Problem

Two pieces of real coach feedback:

1. The schedule's "Every day" / "Customize days" toggle confuses coaches. Root cause: the data model has no persisted "everyday day" — the UI infers a consensus by majority-voting 7 rows of schedule entries and labels disagreements "custom". Coaches can't see what actually varies or why ("Varies by day" with no explanation), and Everyday-mode edits silently overwrite 7 rows.
2. A slot holds exactly one meal, but real clients want sanctioned choices *within* a day: "Mondays I have either poha or oats for breakfast." Today their only outlet is ad-hoc replacement at log time, which the coach never authored.

Market research (Everfit, Trainerize, Nutrium, That Clean Life, Foodzilla, RP, MacroFactor): nobody ships an inferred-consensus model; day variety is done as named day-templates assigned to weekdays (Nutrium, MacroFactor); coach-authored options per slot barely exist — the nearest is Everfit's meal bank, whose lessons are: cap the option count (choice overload), settle macro display up front, and let logging follow the chosen plan so "which option" needs no separate bookkeeping.

## Decisions (settled with user)

- **Day-types model** replaces Everyday/Customize: a plan is 1..N named days; weekday-assignment UI appears only when N > 1.
- **Whole-meal options per slot** (not item-level swaps): a slot holds up to 3 complete meals.
- **First option is the default**: all macro totals, previews, and pre-selections use option position 0. No ranges, no averages.
- Nutrition only; training builder is fine as-is.

## 1. Data model (backend)

### New tables

**`nutrition_plan_days`** — the persisted day-type.
- `id`, `plan_id` (FK, delete cascades), `name` (string, e.g. "Everyday", "Training day"), `position` (integer, unique per plan).
- Every plan has ≥ 1 day. A fresh plan is created with one day named **"Everyday"** at position 0.
- Invariant: a plan's last day cannot be deleted (context-level guard, `:last_day` error).

**`nutrition_day_meals`** — replaces `nutrition_schedule_entries`; carries options.
- `id`, `plan_day_id` (FK, delete cascades), `meal_slot` (same 6-slot enum as today), `position` (integer), `nutrition_meal_id` (FK to the plan's meal library).
- Unique on `(plan_day_id, meal_slot, position)`.
- Position 0 = **default option**. Positions 1–2 = alternatives. **Max 3 options per slot** — changeset validation (`@max_options_per_slot 3`), not a DB constraint; easy to raise.
- Reordering options = changing the default.
- Empty slot (no rows) = nothing planned for that slot; legal, same as today.

**`nutrition_weekday_assignments`** — which day-type each weekday uses.
- `plan_id`, `day_of_week` (existing weekday enum, unique per plan), `plan_day_id` (FK).
- Exactly 7 rows per plan at all times. Created with the plan (all 7 → the Everyday day). Deleting a day reassigns its weekdays to the plan's position-0 day inside the same transaction.

### Unchanged

- `nutrition_plans`, `nutrition_meals` (the plan-scoped meal library), `nutrition_meal_items`. Day-meals reference library meals exactly as schedule entries did. `Meal.default_meal_slot` stays as the picker hint it already is.
- `copy_plan` / `assign_plan_to_client` deep-copy extends to days, day-meals, and assignments.

### Removed

- `nutrition_schedule_entries` table, `ScheduleEntry` schema, `set_schedule` / `set_day_schedule` context functions and their endpoints. Delete-then-use; no legacy pathway kept.

### MealLog change

- `nutrition_meal_logs` gains **`nutrition_meal_id`** (nullable FK, `on_delete: :nilify_all`): which option the client is eating on that date. Set by the first log action for the slot. Null on historical logs (there was only one meal) and after option deletion — reconciliation then falls back to `planned_snapshot`, which already freezes what was planned.
- Reconciliation stays keyed by `planned_item_index`, now against the *chosen* meal's item positions.

### Migration of existing data

One migration, data + DDL:
1. Create the three tables.
2. Per plan: group weekdays by identical (slot → meal_id) signature. One group → a single day "Everyday"; N groups → days named "Day 1".."Day N" (position by first weekday), assignments written accordingly. Weekdays with no entries join the largest group.
3. Each existing schedule entry becomes a `nutrition_day_meals` row at position 0.
4. Drop `nutrition_schedule_entries`.

No data loss; plans that were uniform become clean single-day plans automatically.

## 2. Coach builder UX (coachapp-v2)

`nutrition-schedule.tsx` (both modes, consensus logic, week-overview grid) is deleted and replaced by a **days section** in the plan builder:

- **Single day — the common case — shows zero scheduling chrome.** Six slot groups rendered directly; each slot lists its option meals. No toggle, no tabs, no grid. What the coach sees is literally what every day of the week is.
- Each slot: stacked meal rows (reusing the existing meal-row visual language). Row 1 carries a "Default" tag. Each row: meal name, calories, remove. "Add option" under the rows opens the existing meal picker (library meal); hidden once the slot has 3. Reorder via an up/down affordance on rows (moving a row to the top makes it default).
- **"Add day"** button at the section header. With ≥ 2 days: day tabs (name, inline-renamable) + a **weekday strip** — 7 chips (M T W T F S S). Chips of the active day are filled; tapping an unfilled chip reassigns that weekday to the active day. Every weekday always belongs to exactly one day, so there is no unassigned state to explain.
- Deleting a day: confirm dialog stating where its weekdays go ("Mon, Wed will use Everyday"). Last day: delete affordance not shown.
- Day macro totals (per-day summary line) sum **default options only**, with a one-line caption when any slot has alternatives: "Totals use default options."
- Meal library section (`meals-list.tsx`) unchanged — still where meals are authored; slots reference it.
- Mutations follow the existing autosave pattern: small endpoints per action (add/remove/reorder option, add/rename/delete day, assign weekday) rather than a bulk desired-state PUT — the bulk PUT existed to serve the consensus model and dies with it.

## 3. Client UX (clientapp-v2)

- `today` resolves date → weekday → assignment → day → slots with option meals (default flagged, options ordered).
- Slot card (`nutrition-today.tsx`) shows the **default option pre-selected**, rendered exactly as today. If the slot has alternatives, the card header gains an option switcher: current option name + a "2 options" affordance opening a bottom sheet listing each option with name and calories.
- Switching **before any logging**: local state only; free.
- First log action (check item, log meal, log day) pins `nutrition_meal_id` on the MealLog for that slot+date.
- Switching **after entries exist**: confirm sheet — "Switching clears what you've logged for this meal" — then deletes that slot's planned/replacement entries (unplanned extras survive) and re-pins. No cross-option reconciliation math.
- Log-meal / log-day endpoints accept the chosen `meal_id` (defaulting to the slot's default option when absent).
- History and coach review: no changes — logs already snapshot what was eaten.

## 4. API contract (OpenApiSpex — update spec and both apps)

- Plan response: `days: [{id, name, position, slots: {breakfast: [{meal…, position}], …}}]`, `weekday_assignments: {monday: day_id, …}`.
- New endpoints (coach): POST/PATCH/DELETE day; PUT weekday assignment; POST/DELETE/PATCH(reorder) slot option.
- Client `today` response: per slot, `options: [meal…]` with `default` flag, plus `chosen_meal_id` from the MealLog when set.
- Log endpoints: optional `meal_id` param; new endpoint or param for switching option (clears entries server-side in one transaction).
- Deleted: `PUT /schedule`, `PUT /schedule/:day` and their schemas.
- Errors: bare atoms per convention — `:last_day`, `:max_options`, `:not_found`.

## 5. Testing

- Context tests: day CRUD + last-day guard; assignment invariant (always 7, reassignment on day delete); option cap; option reorder changes default; `get_client_active_plan_day` resolves via assignments; log pinning + option-switch clearing (extras survive); `copy_plan` deep-copies the new structure.
- Migration test: fixture plan with 2 distinct weekday signatures → 2 days with correct assignments; uniform plan → single "Everyday" day.
- FE: tsc clean both apps; manual smoke of builder (single day, add day, options) and client Today (switch, log, switch-after-log confirm).

## Non-goals (add when asked)

- Per-date overrides ("this specific Wednesday only").
- Item-level swaps / equivalent-food lists.
- Client option preferences ("always pick oats") or option analytics.
- Macro ranges/averages across options.
- Multi-week plans; any training-builder changes.
