# Redesign — Nutrition Plan Interface

Caveman mode. Terse. Substance stay.

> Rewritten after adversarial validation (12 agents, grounded in code). First draft over-reached: invented a versioning/drift subsystem + table split to fix a non-problem, and assumed a schema that exists only in Elixir. This is the corrected, evidence-backed plan. See **Rejected** for what got cut and why.

## Strategy

Ship the small evidenced core. Drop speculative apparatus. Two real, grounded needs only:

1. **Fix the `plan_items` semantic mismatch on the TS backend.** FE day-planner treats a slot as `(day, meal_type) -> meal_id`; TS `plan_items` is still `{food_id, recipe_id, quantity_grams, position}`. Mismatch.
2. **Collapse `plan_items` row CRUD into desired-state writes** that match how the FE already thinks — it builds `Map<'${day}:${meal_type}', PlanItem>` and edits per-slot (`day-planner.tsx:54-60`).

Everything heavier (table split, versioning, `/me/*`, meal-item collapse) = unjustified scope. Net surface **shrinks** (24 -> ~21).

Vocab: `plan_items` -> `schedule_entry` (function/vocab level), `/schedule` route. snake_case wire.

---

## Prerequisite (own change, review separately)

Nothing below works until this lands. TS backend `apps/api`:

- Migrate `plan_items`: drop `{food_id, recipe_id, quantity_grams, position}`, add `{day, meal_type, meal_id}`. Add `day` + `meal_type` pgEnums. Unique `(plan_id, day, meal_type)`.
- Re-home day off `meals` (`day_index`) onto the schedule entry.
- This is the destructive migration deferred in the rewrite. Bring TS to parity with Elixir's `plan_item.ex`.

Enums (from Elixir, exact):
- `day`: `monday|tuesday|wednesday|thursday|friday|saturday|sunday`
- `meal_type`: `breakfast|morning_snack|lunch|afternoon_snack|dinner|evening_snack`

---

## Endpoints — what changes

### Schedule (the redesign core) — after the migration

| New | Method | Replaces |
|-----|--------|----------|
| `/nutrition_plans/:id/schedule` | GET | `GET /nutrition_plans/:plan_id/plan_items` |
| `/nutrition_plans/:id/schedule/:day` | GET | *new* — one day |
| `/nutrition_plans/:id/schedule/:day` | PUT | `POST`+`PATCH`+`DELETE` plan_items **and** `POST /nutrition_plans/:id/copy-day` |

**Die** — folded into day-scoped desired-state:
- `POST /nutrition_plans/:plan_id/plan_items`
- `GET /nutrition_plans/:plan_id/plan_items`
- `PATCH /plan_items/:id`
- `DELETE /plan_items/:id`
- `POST /nutrition_plans/:id/copy-day`

Day-scoped on purpose: blast radius = one day, not the whole week. copy-day = `GET /schedule/monday` -> `PUT /schedule/tuesday`. Clear day = `PUT` empty.

### Meal items — KEEP granular (FE actively uses all three)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/meals/:meal_id/items` | POST | keep — `meal-section.tsx:227` add |
| `/meal_items/:id` | PATCH | keep — hottest edit, tweak one food's grams (`meal-item-row.tsx:67`) |
| `/meal_items/:id` | DELETE | keep — `meal-section.tsx:237` remove |
| `/meals/:meal_id/items` | GET | **die** — dead weight, items already hydrated in deep GET |

Real 4 -> 3 reduction. No deletes-by-omission on the highest-frequency edit. If a batch case appears later -> additive `POST /meals/:id/items:bulk`, don't overload the single-item path.

### Everything else — UNCHANGED

| Endpoint | Method | Note |
|----------|--------|------|
| `/nutrition_plans` | GET / POST | index + create |
| `/nutrition_plans/:id` | GET | now deep-hydrated: meals + items + schedule + derived fields |
| `/nutrition_plans/:id` | PATCH | metadata (name/description/tags/macros_goal/status/dates) |
| `/nutrition_plans/:id` | DELETE | |
| `/nutrition_plans/:id/assign` | POST | already deep-copies to a frozen record — keep as-is |
| `/nutrition_plans/:id/duplicate` | POST | keep |
| `/nutrition_plans/:id/macros` | GET | keep + also a derived field on deep GET |
| `/nutrition_plans/:id/shopping-list` | GET | keep + also a derived field on deep GET |
| `/nutrition_plans/:plan_id/meals` | GET / POST | keep |
| `/meals/:id` | GET | keep |
| `/meals/:id` | PATCH | shallow: name / position |
| `/meals/:id` | DELETE | keep |
| `/nutrition_plans/today` | GET | client read; **add `?date=` param** for any date in window (no new `/me/*` tree) |

**Single `nutrition_plans` table stays.** `client_id` null = template, set = assigned. `source_template_id` = lineage. Already works. No `plan_templates`/`assignments` split.

---

## Behavior changes

- **`plan_items` CRUD -> day-scoped desired-state.** `PUT /schedule/:day` sends that day's slots. Slot omitted from body -> empty for that day. `(day, meal_type)` uniqueness structural via the map shape -> can't violate.
- **`copy_day` removed.** GET source day -> PUT target day. Clear = PUT empty.
- **Deep `GET /nutrition_plans/:id`** hydrates meals + items + schedule in one load (honors the whole-tree READ goal).
- **`macros` / `shopping_list`** also exposed as read-only derived fields on the deep GET; standalone endpoints stay for cheap poll. Never writable.
- **Meal items unchanged.** Granular REST kept. Only dead `GET items` removed.
- **`assign` unchanged.** Already a snapshot (deep-copy). Template edits already don't propagate — no new machinery needed.
- **Concurrency guard** for the day PUT: use row `updated_at` as `If-Match`. No new `version` column.

---

## Payload changes

**Schedule: array of rows -> per-day keyed map.**
```ts
// OLD: plan_items[]  each row { id, day, meal_type, meal_id }
// NEW body for PUT /nutrition_plans/:id/schedule/:day
type DayState = Partial<Record<MealType, { meal_id: string | null }>>;
//   omitted meal_type = empty slot for that day

// GET hydrates each slot:
type HydratedDay = Partial<Record<MealType, { meal_id: string | null; meal: Meal | null }>>;

type Day      = "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday";
type MealType = "breakfast"|"morning_snack"|"lunch"|"afternoon_snack"|"dinner"|"evening_snack";
```
- `schedule_entry` loses its own `id`. Identity = `(plan_id, day, meal_type)`.
- Body tiny — slots reference library meals by id, no inlining.

**Deep GET adds derived read-only fields.**
```ts
type Macros = { protein: number; carbs: number; fat: number };
// on GET /nutrition_plans/:id, additionally:
//   macros_total: Macros          (sum of scheduled meals; ignored on write)
//   shopping_list: ShoppingLine[] (deduped meal_items across schedule; ignored on write)
//   schedule: Record<Day, HydratedDay>
```

**Meal items: payload unchanged** (`food_id` XOR `recipe_id`, `weight_g`/`amount`/`unit`, `position`).

**Wire:** snake_case (Drizzle column rename, done). Internal `Ctx`/table-const names stay camelCase.

---

## Rejected (validation cut these — don't re-propose without evidence)

- **Table split `plan_templates` + `assignments`.** Buys no isolation that doesn't already exist (`assign` already deep-copies to a frozen record). Contradicts ADR-001:210-211 endpoint separation. Two resources sharing ~90% shape.
- **Versioning / drift (`current_version`, `template_version`, `is_outdated`, `POST republish`).** Zero codebase grounding — `version`/`republish`/`outdated`/`drift` returns no hits outside this doc. "Silent drift" is structurally impossible today. YAGNI. If ever real -> derive at read time from `source_template_id` + `template.updated_at`.
- **`/me/*` client surface.** `GET /nutrition_plans/today` already exists and is consumed; only new need (any date in window) = one `?date=` param.
- **meal_items collapse into `PUT /meals/:id`.** Fights the FE — makes the hottest edit expensive + destructive (deletes-by-omission), moves complexity to client. Kept granular instead.
- **Whole-tree `PUT` (Design A).** Would force resending the whole plan on every slot toggle. Decomposed writes match real FE.

---

## Open question (needs sign-off before locking the contract)

Read = document (deep GET, one load). Write = decomposed, **day-scoped** desired-state PUT. The first draft overrode the "whole-tree document" choice silently; this is the deliberate split — confirm it. Whole-tree write was rejected (slot-toggle would resend the entire plan); whole-week PUT was rejected (deletes-by-omission, week-wide blast radius). Day-scoped is the middle.
