# Nutrition plan builder — UX design

## Goal

One-page, no-navigation, mobile-first builder where a coach composes an entire
nutrition plan — meals, items, macro targets, and the weekly schedule — without
leaving the page.

Backs the schema/API in
`2026-06-20-coaching-profile-nutrition-schema-api-design.md`. Sibling of the
training plan builder (`2026-06-20-training-plan-builder-ux-design.md`) and
inherits its decisions wholesale except where nutrition genuinely differs.

Validated mockups are preserved in `assets/nutrition-plan-builder/`. ASCII
wireframes below are the durable record.

## Inherited from the training builder (no re-decision)

- One-page, no navigation, mobile-first.
- **Layout A**: inline accordion + pinned section + collapse-all.
- **Width discipline**: indent once + a 2px accent rule; never stack padding;
  numeric fields span full width.
- **Keyboard-aware entry**: any numeric input uses a sheet docked above the
  keyboard; the edited field never hides.
- **Search picker sheet**: multi-select, filters, create-from-no-match.
- **Two-section structure**: a library + a schedule (see below).
- **Autosave per action**.

## Nutrition-specific decisions

| Decision | Choice | Why |
|---|---|---|
| Meals vs days | **Two sections — Meals library + Schedule** | Mirrors workouts+week; an explicit library is the place to scan/manage/reuse meals. |
| Schedule shape | **Hybrid — daily template (edit) + read-only week grid (scan)** | day × meal_slot is 42 cells; most plans repeat daily. Template = 90% path; grid = at-a-glance. |
| Per-day variation | **"Customize days" overrides** | Weekday/weekend splits write only the overridden day's entries. |
| Macro totals | **Three-level rollup: item → meal → day-vs-target** | Nutrition has live math training lacks; show it where it's acted on. |
| Item amount | **Serving size or grams → resolves to `weight_g`**, docked sheet, live macro preview | `weight_g` is the calc value; preview updates per keystroke. |
| Foods vs recipes | **One picker, a Foods/Recipes toggle** | Recipes contribute per-serving macros as a single line. |

### Concept (locked)

> **Plan → Meals (library) + Schedule (assigns meals to day × slot).**
> Build meals with items in the library; assign them in the hybrid schedule. A
> meal is a reusable entity; editing it updates everywhere it's assigned (warn
> if assigned to 2+ places).

## Page anatomy

```
┌────────────────────────────┐
│ Cutting Plan          ✎    │  ← plan header: name + macro TARGET
│ Target 2100 · 180P 200C 60F│
├────────────────────────────┤
│ Schedule ▸ Bfast Oats…     │  ← pinned schedule bar (sticky), tap to expand
├────────────────────────────┤
│ MEALS                      │
│ ┌ Oats & Eggs    420 · ▾ ┐ │  ← meal accordion (library), expanded = editor
│ │ ┃ Rolled Oats 80g  300 │ │
│ │ ┃ Whole Eggs 100g  140 │ │
│ │ + Add food or recipe   │ │
│ │ Meal total 420 · 28/63/15│ │
│ └────────────────────────┘ │
│ ┌ Chicken & Rice 650 · ▸ ┐ │
│ + Add meal                 │
├────────────────────────────┤
│ SCHEDULE                   │  ← assign meals to slots
│ [Every day] [Customize]    │
│ Breakfast  Oats & Eggs  ▾  │
│ Lunch      Chicken&Rice ▾  │
│ …6 slots…                  │
│ Daily total 2080/2100 ▓▓▓  │  ← day vs target
│ Week overview (read-only)  │  ← 6×7 grid projection
└────────────────────────────┘
```

## Meals library (build)

Each meal is an accordion; expanding shows the **meal editor**:

- **Items** — food or recipe + amount, each on a full-width row (single accent
  rule) showing its macro contribution.
- **Meal total** — kcal + P/C/F, rolled up live.
- `+ Add food or recipe` → picker; `+ Add meal` appends a new meal.

### Add food/recipe — picker sheet
Keyboard-aware search sheet (shared pattern):

```
┌ Add to Oats & Eggs      ✕ ┐
│ [ search ]                │
│ [Foods] Recipes           │  ← toggle
│ ☑ Whey Protein  380/100g 80P│  ← macro badge, multi-select
│ ☐ Whey Isolate  360/100g 88P│
│ [ Add 1 food ]            │  ← floats above keyboard
└───────────────────────────┘
```
No match → `+ Create food`. Recipes are picked the same way; a recipe item shows
its per-serving macros as one line.

### Amount sheet (docked above keyboard)
```
┌ Whey Protein          Add ┐
│ [grams] [1 scoop·30g] [½] │  ← serving sizes (taps) or grams
│ [ AMOUNT 30 ] [ UNIT g ]  │
│ resolves to 30g → 114 kcal│  ← live, updates per keystroke
│ 24P · 3C · 1F             │
│ [ ✓ Add to meal ]         │
├── numeric keypad ─────────┤
```
All amounts resolve to `weight_g` (the calc value). If `weight_g` can't be
resolved, the add is rejected (per schema).

## Schedule (assign) — hybrid

Assigns **library meals** to day × meal_slot.

### "Every day" (default, 90% path)
A single daily-template column of the 6 slots; each slot picks a meal from the
library (or "+ assign meal" → meal picker). The chosen meal applies to all 7
days. A **daily total bar** tracks Σ meal macros vs the plan target.

```
Breakfast  Oats & Eggs    420
AM snack   Greek Yogurt   180
Lunch      Chicken & Rice 650
PM snack   + assign meal
Dinner     Salmon & Veg   630
Evening    Casein Shake   200
─ Daily total 2080 / 2100 kcal ▓▓▓▓ 99% ─
```

Meal slots (schema): `breakfast, morning_snack, lunch, afternoon_snack, dinner,
evening_snack`. An empty slot = nothing scheduled.

### "Customize days" (overrides)
Toggling reveals **day tabs**; editing a day writes only that day's
`schedule_entries`. Overridden cells glow amber in the week grid; untouched days
keep inheriting the template.

### Week overview (read-only)
A compact 6×7 grid (slots × days) — pure projection of `schedule_entries`.
Tapping a cell jumps to that day's override editor. This is the "scan the whole
week" surface; editing always happens in the template/override column.

## Macro totals (three levels)

- **Item** — each item row shows its kcal + P/C/F contribution.
- **Meal** — meal editor footer: rolled-up total.
- **Day vs target** — schedule daily-total bar: Σ scheduled-meal macros vs the
  plan's `target_*`, with a progress bar and %.
- Plan header shows the **targets** themselves.

## Interactions

- **Autosave** per action: name/targets → `PATCH plan`; add meal → `POST meal`;
  add item (with amount) → `POST meal-item`; assign slot → `PUT schedule/:day`.
- **Empty states**: no meals → "Add your first meal"; meal with no items → "Add
  foods"; unassigned slots → empty.
- **Shared-meal warning**: editing a meal assigned to 2+ slots/days warns that
  all uses change.

## API mapping

| Action | Endpoint (nutrition API spec) |
|---|---|
| Create / edit plan + targets | `POST` / `PATCH /v1/coach/nutrition-plans` |
| Add / rename meal | `POST /v1/coach/nutrition-plans/:plan_id/meals`, `PATCH /v1/coach/nutrition-meals/:id` |
| Add / edit / remove item | `POST /v1/coach/nutrition-meals/:meal_id/items`, `PATCH`/`DELETE /v1/coach/nutrition-meal-items/:id` |
| Search foods / recipes | `GET /v1/coach/nutrition-foods`, `GET /v1/coach/nutrition-recipes` |
| Create custom food | `POST /v1/coach/nutrition-foods` |
| Assign meals to a day | `PUT /v1/coach/nutrition-plans/:plan_id/schedule/:day` (keyed by meal slot) |

## Visual references

`assets/nutrition-plan-builder/`:

- `01-meals-days-concept-faceoff.html` — schedule-centric vs two-section (chose two-section)
- `02-meal-editor.html` — meal editor, food/recipe picker, amount sheet
- `03-schedule-scorecard.html` — template vs grid vs day-accordion
- `04-schedule-hybrid.html` — daily template + read-only week grid, every-day & override modes

## Out of scope

- Schedule-centric model (meals-in-slots) — rejected for two-section
- Editable 6×7 grid as the primary surface (grid is read-only overview)
- Multi-week nutrition cycles, daily target overrides (see schema spec)
- Client nutrition logging UI (separate spec)
- Recipe authoring inside the plan builder (recipes are library entities; built elsewhere)
</content>
