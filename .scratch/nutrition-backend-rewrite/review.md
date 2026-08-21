# Nutrition rewrite review

Status: ready-for-agent

Review each resolved ticket's diff against that ticket, then fix what still matters on the tip. The source spec is [spec.md](./spec.md). Tickets live in [issues/](./issues/).

Stay on `nutrition-backend-rewrite/16-contract-cutover` for every session. Diff an old range; do not check out tickets 01–15 to patch them.

## Ground rules

1. One ticket per chat. A chat that reviews more than one ticket is not done.
2. Review the three-dot range for that ticket, not `main...HEAD`, except in the integration pass.
3. The spec for a ticket is its issue file. Use `spec.md` stories only when that issue points at them.
4. Leftovers a ticket deferred (`Blocked by`, "until ticket 16", "cutover still owns this") belong to the later ticket. If a later resolved ticket already removed the leftover, drop the finding and name that ticket.
5. Out of scope stays out of scope: a frontend timezone setting, reconstructing dropped Programming or Diary data, a broad builder UI rename (`NutritionPlanDay` / `day_meals`) unless a P0/P1 depends on it.
6. Do not implement in a review chat. Write findings into this file, then stop.
7. Fix only on the tip, after the review phase, P0 then P1. P2 waits.

A ticket review is done when that ticket's heading below has a `Reviewed:` line and every finding has severity, a spec or issue quote, and a path. The review phase is done when all sixteen headings have `Reviewed:`.

## Ranges

Three-dot diffs. Confirm `git rev-parse` on both ends and a non-empty diff before reviewing.

* 01 `main...nutrition-backend-rewrite/01-local-calendar-foundations` — [01-local-calendar-foundations.md](./issues/01-local-calendar-foundations.md)
* 02 `nutrition-backend-rewrite/01-local-calendar-foundations...nutrition-backend-rewrite/02-food-library` — [02-food-library.md](./issues/02-food-library.md)
* 03 `nutrition-backend-rewrite/02-food-library...nutrition-backend-rewrite/03-recipe-library` — [03-recipe-library.md](./issues/03-recipe-library.md)
* 04 `nutrition-backend-rewrite/03-recipe-library...nutrition-backend-rewrite/04-template-lifecycle` — [04-template-lifecycle.md](./issues/04-template-lifecycle.md)
* 05 `nutrition-backend-rewrite/04-template-lifecycle...nutrition-backend-rewrite/05-atomic-menu-meals` — [05-atomic-menu-meals.md](./issues/05-atomic-menu-meals.md)
* 06 `nutrition-backend-rewrite/05-atomic-menu-meals...nutrition-backend-rewrite/06-day-patterns-slots-schedule` — [06-day-patterns-slots-schedule.md](./issues/06-day-patterns-slots-schedule.md)
* 07 `nutrition-backend-rewrite/06-day-patterns-slots-schedule...nutrition-backend-rewrite/07-assignment-client-plans` — [07-assignment-client-plans.md](./issues/07-assignment-client-plans.md)
* 08 `nutrition-backend-rewrite/07-assignment-client-plans...nutrition-backend-rewrite/08-coverage-workbench` — [08-coverage-workbench.md](./issues/08-coverage-workbench.md)
* 09 `nutrition-backend-rewrite/08-coverage-workbench...nutrition-backend-rewrite/09-library-menu-protection` — [09-library-menu-protection.md](./issues/09-library-menu-protection.md)
* 10 `nutrition-backend-rewrite/09-library-menu-protection...nutrition-backend-rewrite/10-live-nutrition-days` — [10-live-nutrition-days.md](./issues/10-live-nutrition-days.md)
* 11 `nutrition-backend-rewrite/10-live-nutrition-days...nutrition-backend-rewrite/11-extras-freezing-idempotency` — [11-extras-freezing-idempotency.md](./issues/11-extras-freezing-idempotency.md)
* 12 `nutrition-backend-rewrite/11-extras-freezing-idempotency...nutrition-backend-rewrite/12-planned-logging-statuses` — [12-planned-logging-statuses.md](./issues/12-planned-logging-statuses.md)
* 13 `nutrition-backend-rewrite/12-planned-logging-statuses...nutrition-backend-rewrite/13-option-switching` — [13-option-switching.md](./issues/13-option-switching.md)
* 14 `nutrition-backend-rewrite/13-option-switching...nutrition-backend-rewrite/14-diary-corrections` — [14-diary-corrections.md](./issues/14-diary-corrections.md)
* 15 `nutrition-backend-rewrite/14-diary-corrections...nutrition-backend-rewrite/15-history-summaries` — [15-history-summaries.md](./issues/15-history-summaries.md)
* 16 `nutrition-backend-rewrite/15-history-summaries...nutrition-backend-rewrite/16-contract-cutover` — [16-contract-cutover.md](./issues/16-contract-cutover.md)

If a local branch is missing, use the remote of the same name.

## Review session

New chat. Working tree clean. Branch is the tip. Attach the ticket file.

Prompt:

```text
/code-review <fixed-point>

Spec: the attached ticket. spec.md stories only if that ticket names them.
Stay on nutrition-backend-rewrite/16-contract-cutover. Diff the range in
.scratch/nutrition-backend-rewrite/review.md for this ticket. Do not check
out the old branch. Do not implement.

Treat leftovers this ticket deferred to a later ticket as owned by that
later ticket. If a later resolved ticket already removed them, drop the
finding and name the ticket.

For each finding: path, why, quote from the ticket or spec, severity
(P0 ship-blocker / P1 wrong behavior / P2 cleanup). Append the report
under that ticket heading in .scratch/nutrition-backend-rewrite/review.md
with a Reviewed: YYYY-MM-DD line. Stop.
```

`<fixed-point>` is the left side of the range (`main` for 01, the previous ticket branch otherwise). `/code-review` three-dot diffs that point against `HEAD` if you pass only the left side while sitting on the tip **and** the ticket's commits are ancestors of `HEAD`. Prefer the full range from the list so the review does not include later tickets.

Run Standards and Spec as parallel axes. Do not merge or rerank them.

### Models

* Spec: Claude Opus, or GPT 5.6.
* Standards: Grok 4.6, or Claude Opus.
* Tickets 08, 09, and 10–16 also get a Bugbot pass (defects) or Security Review (Library deletes, tenant scope, Diary writes). Skip that on 01–07 unless Spec found a P0/P1.

Do not use a fast or Composer model for these reviews.

Optional ensemble on 08–16 Spec: run Opus and GPT 5.6 on the same range. Keep findings both report, plus any single-model P0 you accept.

Spend the expensive models on 08, 09, and 10–16. 01–07 get one Spec pass each unless something looks structurally wrong.

## Finding shape

```text
- P1 — short title
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "<ticket or spec line>"
  Why: <what the diff does instead>
  Disposition: open | superseded by NN | wontfix | fixed
```

`superseded by NN` is the later ticket that already closed it. `wontfix` needs a one-line reason (out of scope, judgement, already matching the ticket).

## Fix session

Start only after the review phase is done.

1. Dedupe. The same bug on tickets 10, 12, and 16 is one fix on the tip.
2. New chat on `nutrition-backend-rewrite/16-contract-cutover`. Implement P0 then P1. Leave P2.
3. One commit per cluster (Library, Programming, Diary, frontend cutover), not per finding.
4. After each cluster: `cd backend && mix precommit`, then `pnpm -C apps/coachapp-v2 build` and `pnpm -C apps/clientapp-v2 build` when that cluster touched frontend.
5. Mark dispositions in this file as `fixed` with the commit.

A fix cluster is done when those commands pass and every finding it claimed is `fixed`.

## Integration pass

After P0/P1 fixes:

```text
/code-review main

Spec: .scratch/nutrition-backend-rewrite/spec.md stories 136–142 and
HTTP / persistence / testing decisions. Catch holes no single ticket owned.
Do not implement in this chat.
```

Then the live widths ticket 16 asked for and the cutover session skipped: coach client overview at 375 and 1280, client Today and History at 375. Dev login OTP is `123456`.

## Tickets

### 01 — Local calendar foundations

Reviewed: 2026-08-19

Spec (Claude subagent): no findings — all seven acceptance criteria satisfied by the range.

Standards (Claude subagent):

- P2 — Dead validation: `validate_timezone/1` can never fire
  Path: backend/lib/easy/local_calendar.ex
  Quote: "def stamp_timezone(changeset) do changeset |> put_change(:timezone, @default_timezone) |> validate_timezone() end"
  Why: `stamp_timezone/1` always `put_change`s the compile-time constant `"Asia/Kolkata"`, so the piped `validate_timezone/1` is a no-op on every call; no other production caller of `validate_timezone/1` / `valid_timezone?/1` exists at ticket 01 or at the tip. Dead code exercised only by tests, which gives false confidence that write boundaries reject invalid names.
  Disposition: open

- P2 — Module file path does not mirror module name
  Path: backend/lib/easy/nutrition_meal_slot.ex
  Quote: "defmodule Easy.Nutrition.MealSlot do"
  Why: Repo convention mirrors namespace in path (`Easy.Clients.Client` → `lib/easy/clients/client.ex`); the module's test already sits at `test/easy/nutrition/meal_slot_test.exs` and `lib/easy/nutrition/` exists at the tip. Belongs at `lib/easy/nutrition/meal_slot.ex`. Persists on the tip.
  Disposition: open

- P2 — "Backfill" test asserts the factory's own input, not the backfill
  Path: backend/test/easy/local_calendar_test.exs
  Quote: "test \"retained factory rows carry the backfilled Asia/Kolkata timezone\" do"
  Why: The diff also adds `timezone: Easy.LocalCalendar.default_timezone()` to the `:business`/`:client` factories, so the test asserts the value the factory inserted — remove the migration default and it still passes. A raw insert without the field would actually cover the backfill/default.
  Disposition: open

### 02 — Food library

Reviewed: 2026-08-19

Spec (Claude subagent):

- P2 — Delete 409 contract only documents the stale-revision shape, but `in_use` still returns a different 409 body
  Path: backend/lib/easy_web/controllers/coaches/food_controller.ex
  Quote: "Food list, search, filters, categories, detail, copy, create, update, and delete work through the generated contract in the coach app."
  Why: The diff rewrote deleteFood's only documented conflict response to `StaleRevisionError`, yet `Library.delete_food/3` still returns `{:error, :in_use}`, which FallbackController renders as a 409 with `error_code: "in_use"` and empty `error_detail` — a body the generated contract declares impossible for that endpoint. Tip declares `conflict: {"Stale revision or still in use", ..., ErrorResponse}` (commit 48b2dad9, branch 09).
  Disposition: superseded by 09

Standards (Claude subagent):

- P2 — Recipe JSON renders `media` from an unloaded association
  Path: backend/lib/easy_web/controllers/coaches/recipe_json.ex (also clients/recipe_json.ex)
  Quote: "defp food_data(%Food{} = food), do: FoodPayload.data(food)"
  Why: backend/AGENTS.md: "Preload associations the JSON response includes." `FoodPayload.data/1` renders `media: media_data(food.media)`, but `Recipe.include_ingredients/2` preloads ingredient foods without `include_media`, so `food.media` is `%Ecto.Association.NotLoaded{}` and every recipe-embedded food reports `media: null` even when media exists. Still true on the tip (recipe_payload.ex, same preload).
  Disposition: open

- P2 — Delete's documented 409 schema doesn't cover the `:in_use` conflict it still returns
  Path: backend/lib/easy_web/controllers/coaches/food_controller.ex
  Quote: "conflict: {\"Stale revision\", \"application/json\", StaleRevisionError}"
  Why: Same defect as the Spec finding above, from the contract-hygiene angle ("implementation, generated spec, and Swagger UI agree").
  Disposition: superseded by 09

- P2 — Dead public context functions introduced with no runtime caller
  Path: backend/lib/easy/nutrition_library.ex
  Quote: "def resolve_food_portion(...) / def food_nutrients(%Food{} = food)"
  Why: Root quality rules: no dead code. At ticket 02 neither function has a caller outside its own tests. `resolve_food_portion/2` gains a caller in ticket 03; `food_nutrients/1` never does — test-only even on the tip.
  Disposition: resolve_food_portion superseded by 03; food_nutrients open

- P2 — list_foods caps the requested limit at 20 instead of the documented max 100
  Path: backend/lib/easy/nutrition_library.ex
  Quote: "limit = min(Keyword.get(opts, :limit, 20), 20)"
  Why: backend/AGENTS.md Contexts: "Pagination: `offset` default `0`, `limit` default `20`, max `100`." Any requested limit is silently clamped to 20. Still present on the tip (and repeated for recipes).
  Disposition: open

- P2 — create_food re-resolves the coach from ctx.user_id instead of using ctx.coach_id
  Path: backend/lib/easy/nutrition_library.ex
  Quote: "with {:ok, coach} <- get_coach(ctx), ... Food.insert_changeset(coach.id, attrs)"
  Why: backend/AGENTS.md Ctx: `coach_id` is already on `%Ctx{}`; `get_coach/1` does a Repo round-trip for an id the Ctx carries, while the same diff's `ensure_coach/1` (update/delete) reads `ctx.coach_id` — inconsistent within the module. Still on the tip.
  Disposition: open

### 03 — Recipe library

Reviewed: 2026-08-19

Spec (Claude subagent):

- P2 — Request contract still advertises an ingredient `position` the server ignores
  Path: backend/lib/easy_web/open_api/schemas/nutrition.ex
  Quote: "Recipe Ingredients reference visible Foods only, use positive gram weights, and have deterministic unique positions."
  Why: Positions are stamped `0..n-1` from list order (`RecipeIngredient.insert_changeset/4` casts only `[:food_id, :amount, :unit, :weight_g]`), yet `RecipeIngredientRequest` still declares a `position` property (and the example sends it). Clients can send arbitrary positions that are silently discarded; schema.ts misrepresents write behavior. Still on the tip. Behavior itself deterministic, so cleanup only.
  Disposition: open

- P2 — No test that a failed ingredient replacement rolls the update back
  Path: backend/test/easy/nutrition/library_recipe_test.exs
  Quote: "Library, database, controller, contract, and frontend tests cover tenant isolation, atomic replacement, portions, revisions, duplication, and incomplete nutrients."
  Why: Update tests cover successful replacement and revision bump, but no test exercises a failing replacement on update (e.g. invisible food in the new list) asserting scalars, revision, and old ingredient rows all roll back. Code is atomic; the claim is untested under failure. No later ticket adds it.
  Disposition: open

Standards (Claude subagent):

- P2 — Migration `down` drops the position unique index by the wrong identifier
  Path: backend/priv/repo/migrations/20260816210000_add_nutrition_recipe_library_invariants.exs
  Quote: "drop index(:nutrition_recipe_ingredients, :nutrition_recipe_ingredients_recipe_id_position_index)"
  Why: `index/2`'s second argument is the column list, not the index name, so this builds an index whose auto-generated name never matches the one created in `up` — `mix ecto.rollback` fails. Needs `drop index(:nutrition_recipe_ingredients, [:recipe_id, :position], name: :nutrition_recipe_ingredients_recipe_id_position_index)`. Unchanged on the tip.
  Disposition: open

- P2 — Contract still advertises a client-settable ingredient `position` the server silently ignores
  Path: backend/lib/easy_web/open_api/schemas/nutrition.ex
  Quote: "position: %Schema{type: :integer, minimum: 0}" (in `RecipeIngredientRequest`)
  Why: Same defect as the Spec finding above from the contract-hygiene angle; `recipeIngredientDraftToApi` still sends `position: index`, which CastAndValidate accepts and the changeset discards. Still on the tip.
  Disposition: open

- P2 — `include_ingredient_foods` left as a byte-identical duplicate of `include_ingredients`, now dead
  Path: backend/lib/easy/nutrition/recipe.ex
  Quote: "def include_ingredient_foods(query \\ __MODULE__, business_id)"
  Why: This diff collapsed both preload builders onto the same `ingredient_food_query/1`, making the two functions identical. Its only remaining caller (`meal_logs.ex`) was deleted by ticket 16 — zero callers on the tip, not removed. Dead code.
  Disposition: open

### 04 — Template lifecycle

Reviewed: 2026-08-19

Spec (Claude subagent):

- P2 — Client Plan constructor shipped with no caller
  Path: backend/lib/easy/nutrition/plan.ex
  Quote: "Assignment and Menu writes stay on later tickets."
  Why: The diff adds `Plan.insert_changeset/5` (client_plan constructor copying name/targets from a source Template), but nothing in the 04 tree calls it — assignment machinery landed a ticket early, dead at this commit. Ticket 07 is its first caller (confirmed on the tip, nutrition_programming.ex:1101).
  Disposition: superseded by 07

- P2 — NutritionPlanAssignRequest schema orphaned after assign route removal
  Path: backend/lib/easy_web/open_api/schemas/nutrition.ex
  Quote: "Coaches can list, search, create, read, edit, archive, restore, delete, and duplicate Templates through top-level plan routes."
  Why: The diff deletes the assign route and every controller reference, but leaves the schema module defined with zero references at the 04 tip. On the tip it lives in nutrition_plan.ex, referenced again by the restored assign operation.
  Disposition: superseded by 07

- P2 — Template detail keeps Day Pattern/menu controls wired to always-failing stubs
  Path: frontend/apps/coachapp-v2/src/api/nutrition-plan-builder.ts
  Quote: "The coach Template list and create/edit/detail flows use the replacement contract and handle revision conflicts."
  Why: The builder screen still renders add/rename/delete-day and weekday-assignment controls, but every backing request is a stub that unconditionally rejects with "Menu editing returns in a later ticket" — visible controls always fail with a generic toast at this ticket. Stubs are gone on the tip (tickets 05/06 wired the real menu contract).
  Disposition: superseded by 06

Standards (Claude subagent):

- P2 — Down migration drops the legacy overlap guarantee without restoring it
  Path: backend/priv/repo/migrations/20260816220000_rebuild_nutrition_programming.exs
  Quote: "drop_if_exists constraint(:nutrition_plans, :nutrition_plans_no_overlapping_active)"
  Why: `up` drops the legacy exclusion constraint, but `down` only restores columns and FKs — after rollback the legacy schema runs without its overlapping-active-plan invariant, so `down` does not reproduce the pre-migration schema.
  Disposition: open

- P2 — Dead `status` vestiges left on Easy.Nutrition.Plan
  Path: backend/lib/easy/nutrition/plan.ex
  Quote: "field :status, Ecto.Enum, values: [:active, :archived], virtual: true, default: :active"
  Why: `statuses/0`, `for_status/2`, and the virtual `status` field have zero callers — controllers inline the values, queries use `for_archived/for_kind`, JSON derives status from `archived_at`. Caller-less on the tip too.
  Disposition: open

- P2 — DayPattern virtual `weekdays` field is never populated or read
  Path: backend/lib/easy/nutrition/day_pattern.ex
  Quote: "field :weekdays, {:array, :string}, virtual: true, default: []"
  Why: JSON derives weekdays via `DayPattern.weekdays_for(pattern, schedule)`; nothing assigns or reads the virtual field at this ticket or on the tip. Dead field carried over from the deleted `PlanDay` shape.
  Disposition: open

- P2 — `NutritionPlanAssignRequest` schema orphaned when the assign action was deleted
  Path: backend/lib/easy_web/open_api/schemas/nutrition.ex
  Quote: "defmodule EasyWeb.OpenApi.Schemas.NutritionPlanAssignRequest do"
  Why: Same defect as the Spec finding above.
  Disposition: superseded by 07

- P2 — Cascade FK `nutrition_day_pattern_id` on nutrition_week_schedule has no supporting index
  Path: backend/priv/repo/migrations/20260816220000_rebuild_nutrition_programming.exs
  Quote: "create unique_index(:nutrition_week_schedule, [:nutrition_plan_id, :weekday])"
  Why: `nutrition_day_pattern_id` carries an `on_delete: :delete_all` FK but no index leads with it, so every Day Pattern delete cascades via a full-table scan of nutrition_week_schedule across all tenants. No later migration adds the index.
  Disposition: open

### 05 — Atomic menu meals

Reviewed: 2026-08-19

Spec (Claude subagent): no findings — all eleven acceptance criteria satisfied by the range.

Standards (Claude subagent):

- P1 — `writeItem` mutates the frozen React Query cache, so debounced amount edits throw before the request is sent
  Path: frontend/apps/coachapp-v2/src/nutrition-plans/builder/commands.ts
  Quote: "found.item.portion = { kind: values.kind, grams: values.grams ?? null, ... }" (inside the serialized send, before the `try`)
  Why: frontend/AGENTS.md optimistic writes go through `patchQueryData` (immer `produce()` output, auto-frozen). `writeItem`'s optimistic `patch(...)` freezes the cached plan; 600ms later the debounced send reads that frozen tree via `read()` and the direct assignment throws `TypeError: Cannot assign to read only property 'portion'` before `api.replaceMenu` runs — and the rejection bypasses the `catch` (toast + refetch), so amount edits are silently never persisted. The re-apply must go through `patch(...)` like every other cache write in the file.
  Disposition: fixed in d17c13bc

- P2 — Meal keeps a dead `creator` association after this ticket removed its only writer
  Path: backend/lib/easy/nutrition/meal.ex
  Quote: "belongs_to :creator, Orgs.Coach, foreign_key: :creator_id"
  Why: The rewritten `insert_changeset/3` dropped the `creator_id` writes, and the OpenAPI schema/JSON view no longer expose it — association and column are write-never/read-never. Still unreferenced on the tip.
  Disposition: open

- P2 — `replace_menu/4` @spec advertises `:invalid_portion`, which the function can never return
  Path: backend/lib/easy/nutrition_programming.ex
  Quote: "{:ok, Plan.t()} | {:error, :not_found | :invalid_portion | Ecto.Changeset.t()}"
  Why: `resolve_library_items` converts Library's `{:error, :invalid_portion}` into a changeset error before it can escape; the atom is a dead union member and the spec misleads callers and Dialyzer. Same spec on the tip.
  Disposition: open

### 06 — Day patterns, slots, schedule

Reviewed: 2026-08-19

Spec (Claude subagent):

- P0 — Week Schedule completeness trigger blocks plan and template deletion in production
  Path: backend/priv/repo/migrations/20260817010000_add_nutrition_meal_options.exs
  Quote: "The database rejects incomplete schedules at transaction commit and rejects cross-plan or cross-business schedule references."
  Why: The deferred constraint trigger `nutrition_week_schedule_must_be_complete` raises whenever the plan's schedule row count is not exactly 7, with no exemption for the plan itself being deleted. `delete_plan/3` / `delete_template/3` are hard `Repo.delete` calls; the cascade removes all 7 schedule rows, the queued per-row DELETE events fire at commit, see count 0, and raise `check_violation` — aborting every plan/template/business deletion. Tests never catch it: the Ecto sandbox never commits, and the only trigger test forces `SET CONSTRAINTS ALL IMMEDIATE` on a partial delete, never a plan delete. Unchanged on the tip. Fix: allow count 0 / skip when the parent plan row is gone. (Reported P1 by the agent; verified by the reviewer against the trigger source and upgraded to P0 — both axes found this independently.)
  Disposition: fixed in d17c13bc

Standards (Claude subagent):

- P0 — Week-schedule completeness trigger makes plan deletion fail at commit
  Path: backend/priv/repo/migrations/20260817010000_add_nutrition_meal_options.exs
  Quote: "IF weekday_count <> 7 THEN RAISE EXCEPTION 'nutrition_week_schedule must contain every weekday'"
  Why: Same defect as the Spec finding above.
  Disposition: fixed in d17c13bc

- P1 — Omitted Day Patterns are deleted after inserts, colliding on the (plan, position) unique index
  Path: backend/lib/easy/nutrition_programming.ex
  Quote: ":ok <- delete_omitted_patterns(plan, Map.values(pattern_ids)) do" (last step of replace_locked_menu)
  Why: Meals go stage → delete → insert, but patterns insert/update while omitted patterns still hold their old positions (`stage_positions` only moves retained rows). Dropping pattern A (position 0) while submitting a new/repositioned pattern at position 0 hits `nutrition_day_patterns_nutrition_plan_id_position_index` — spurious "position has already been taken" 422 on a valid menu. No test covers omit-and-reuse-position; order unchanged on the tip.
  Disposition: fixed in d17c13bc

- P1 — changeSlot deletes the option when the current slot is re-selected
  Path: frontend/apps/coachapp-v2/src/nutrition-plans/builder/commands.ts
  Quote: "if (!moved || fromSlot === mealSlot) { return optionId; }"
  Why: The recipe removes the option and reindexes *before* this guard, and returning a defined marker makes `saveMenu` send the mutated menu anyway — a same-slot "move" serializes the menu without the option and the server deletes it. Guard must run before the removal (or abort the save). Reachability currently depends on react-aria suppressing same-key selection events, which is library-internal behavior, not a contract. Still present on the tip.
  Disposition: fixed in d17c13bc

- P2 — Weekday lookup probes both atom and string keys
  Path: backend/lib/easy/nutrition_programming.ex
  Quote: "Map.get(schedule, weekday) || Map.get(schedule, Atom.to_string(weekday))"
  Why: backend/AGENTS.md forbids exactly this dual-key probe; after `CastAndValidate`, `NutritionWeekScheduleInput` always yields atom keys, so the string branch is dead. Still present on the tip (line 493).
  Disposition: open

- P2 — No index for the meal-side cascade FK on nutrition_meal_options
  Path: backend/priv/repo/migrations/20260817010000_add_nutrition_meal_options.exs
  Quote: "FOREIGN KEY (nutrition_meal_id, nutrition_plan_id, business_id) REFERENCES nutrition_meals(...) ON DELETE CASCADE"
  Why: No index leads with `nutrition_meal_id`, so every meal delete — including `delete_omitted_meals` inside each menu replace — scans nutrition_meal_options for the cascade. Same pattern as the week-schedule finding on ticket 04, introduced here on a new table. No later migration adds one.
  Disposition: open

- P2 — New plan-tree mutation helpers ship without a sibling .check.ts
  Path: frontend/apps/coachapp-v2/src/nutrition-plans/builder/plan-tree.ts
  Quote: "A new mapper, predicate, or lifecycle helper ships with a sibling `.check.ts` in the same change." (frontend/AGENTS.md)
  Why: `dropEmptySlots`, `reindexSlotOptions`, `removeMealFromPatterns` feed the authoritative menu PUT but no plan-tree.check.ts exists at the tip.
  Disposition: open

- P2 — include_options mixes a parent row filter into a preload builder
  Path: backend/lib/easy/nutrition/day_pattern.ex
  Quote: "from(pattern in query, where: pattern.business_id == ^business_id, preload: [meal_options: ^option_query])"
  Why: backend/AGENTS.md: "`for_` filters, `include_` preloads." The parent-row `where` duplicates `DayPattern.for_business/2` already piped at the only call site.
  Disposition: open

### 07 — Assignment and client plans

Reviewed: 2026-08-19

Spec (Claude subagent): no findings — all twelve acceptance criteria satisfied by the range.

Standards (Claude subagent):

- P1 — `assigned_client_count` now counts plans, not distinct clients
  Path: backend/lib/easy/nutrition/plan.ex
  Quote: "select: %{template_id: copy.source_template_id, plans: count(copy.id)}"
  Why: The diff changed the aggregate from `count(copy.client_id, :distinct)` to `count(copy.id)`, but the contract field (`assigned_client_count`) and the ticket's Answer name a distinct client count. One client can hold several sequential unarchived plans from the same Template (DB only enforces one *incomplete* plan per client), so the field overstates assigned clients. Still `count(copy.id)` on the tip (plan.ex:297).
  Disposition: fixed in d17c13bc

- P2 — Client list serves archived plans the show endpoint can never open
  Path: backend/lib/easy/nutrition_programming.ex
  Quote: "|> Plan.for_archived(false)" (added to `get_client_plan/2`)
  Why: The client index keeps and documents `status=archived`, while `get_client_plan` hard-filters to unarchived — every row the archived list returns 404s on detail read. Unchanged on the tip.
  Disposition: open

- P2 — Dead client detail hook with no consumer
  Path: frontend/apps/clientapp-v2/src/api/nutrition.ts
  Quote: "export function useGetClientNutritionPlanQuery(id: string, options?: {enabled?: boolean}) {"
  Why: Added in this ticket, zero call sites anywhere in clientapp-v2 even on the tip nine tickets later — scaffolding for a screen that never arrived.
  Disposition: open

### 08 — Coverage and workbench

Reviewed: 2026-08-20

Spec (Codex subagent):

- P1 — Client-list Coverage uses the default timezone's date for every client
  Path: backend/lib/easy/clients.ex
  Quote: "Start and end dates are inclusive client-local dates" and "lifecycle labels are derived from dates, archive state, and the client's applied timezone."
  Why: `put_plan_names_for_clients/3` computes one `today` in `LocalCalendar.default_timezone()` and passes it to `covering_plans_for_clients/3` for the whole page. A client in another timezone can therefore gain or lose the nutrition-plan chip one local day early or late. The lifecycle stamper uses each plan client's applied timezone, so the same response can pair a correctly derived lifecycle with Coverage selected for the wrong day. No boundary test covers the batch caller. Persists on the tip.
  Disposition: fixed in d17c13bc

Standards (Codex subagent):

- P2 — Pure Coverage helper lives in the shared component directory
  Path: frontend/apps/coachapp-v2/src/@components/plan-period.ts
  Quote: "export function periodError(startDate: string | null, endDate: string | null): string | undefined"
  Why: frontend/AGENTS.md says every shared concept has an owning feature, and coachapp-v2/AGENTS.md puts pure helpers in the owning feature's `lib` or API/form file. The shared `PlanPeriodCard` UI belongs in `@components`; its pure validation helper does not. Persists on the tip.
  Disposition: open

- P2 — Coverage API function invalidates caches outside a mutation hook
  Path: frontend/apps/coachapp-v2/src/api/nutrition-plan-builder.ts
  Quote: "export async function updatePlanPeriod(...)" followed by direct `queryClient.invalidateQueries(...)` calls
  Why: frontend/AGENTS.md requires invalidation to live in mutation hooks. The module's own boundary says plan-level CRUD belongs in `nutrition-plans-list.ts` because it invalidates, but this change adds a plain plan-level PATCH function with seven invalidation paths to the builder data module. Persists on the tip.
  Disposition: open

- P2 — Coverage error helper uses a relative cross-boundary import
  Path: frontend/apps/coachapp-v2/src/nutrition-plans/lib/coverage-error.ts
  Quote: "import {getValidationErrors} from '../../api/shared.ts';"
  Why: coachapp-v2/AGENTS.md requires direct `@/...` imports. This should import `@/api/shared`. Persists on the tip.
  Disposition: open

- P2 — Duplicated Coverage resolver pipeline
  Path: backend/lib/easy/nutrition_programming.ex
  Quote: "|> covering_plan_query(client_id, date) |> Repo.one() |> resolve_covering_plan(date)"
  Why: Possible Duplicated Code. `resolve_client_coverage/2` and `resolve_coverage_for_client/3` repeat the same query-and-resolution pipeline after their distinct actor authorization steps. A private resolver could own the shared operation. Persists on the tip.
  Disposition: open

### 09 — Library menu protection

Reviewed: 2026-08-20

Spec (Codex subagent):

- P1 — String-key cooked-weight removal bypasses the Menu guard
  Path: backend/lib/easy/nutrition_library.ex
  Quote: "A Library edit that would invalidate a Menu Portion is rejected."
  Why: `removing_cooked_weight?/2` only checks `:cooked_weight_g`, while `Recipe.update_changeset/2` also accepts string-key maps. Calling `update_recipe/4` with `%{"cooked_weight_g" => nil}` therefore clears the value without checking whether a Menu uses a gram Portion, leaving that Menu invalid. Persists on the tip.
  Disposition: fixed in a5125350

- P1 — Cooked-weight protection races a concurrent Menu replacement
  Path: backend/lib/easy/nutrition_library.ex; backend/lib/easy/nutrition_programming.ex
  Quote: "A Library edit that would invalidate a Menu Portion is rejected; removing Recipe cooked weight while a Menu uses a gram Portion is covered explicitly."
  Why: `mutate_recipe/4` locks the Recipe and then checks existing Menu Items, but a concurrent `replace_menu/4` can resolve a gram Portion using the old cooked weight before that lock. Its Meal Item insert waits on the Recipe FK, then succeeds after the Recipe update commits. The FK checks only that the Recipe still exists; no database invariant couples `cooked_weight_g` to gram Menu Items. The result is a gram Menu Item referencing a Recipe with no cooked weight. Persists on the tip.
  Disposition: fixed in a5125350

- P2 — Structural migration silently deletes Recipe Ingredients
  Path: backend/priv/repo/migrations/20260817120000_restrict_library_structural_references.exs
  Quote: "Structural references use restrictive foreign keys and exact-one item constraints; historical reference behavior remains reserved for Diary."
  Why: `DELETE FROM nutrition_recipe_ingredients WHERE food_id IS NULL` irreversibly removes ingredients, changing Recipe contents and nutrients, so the new constraint can be installed. The ticket asks for structural protection but does not authorize silent Library data loss; the migration should either repair known legacy rows or stop with an actionable error. Persists on the tip.
  Disposition: open

Standards (Codex subagent):

- P2 — update_recipe/4 omits its new :in_use return from @spec
  Path: backend/lib/easy/nutrition_library.ex
  Quote: "@spec update_recipe(...) :: {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}"
  Why: `ensure_recipe_edit_valid/3` now returns `{:error, :in_use}`, but the public function's declared return contract omits that atom. This violates backend/AGENTS.md's public `@spec` rule. Persists on the tip.
  Disposition: open

- P2 — New impact hooks and normalizer use unchecked TypeScript casts
  Path: frontend/apps/coachapp-v2/src/api/nutrition-foods.ts; frontend/apps/coachapp-v2/src/foods/lib/library-impact.ts
  Quote: "as Promise<FoodImpactResponse>" / "as Promise<RecipeImpactResponse>" / "data as FoodImpact"
  Why: The TypeScript rules forbid `as` casts without validation. These casts hide the generated client's actual result type instead of narrowing it or correcting the contract typing. Persists on the tip.
  Disposition: open

- P2 — Library impact helper uses cross-boundary relative imports
  Path: frontend/apps/coachapp-v2/src/foods/lib/library-impact.ts
  Quote: "import type {components} from '../../api/schema.ts';"
  Why: coachapp-v2/AGENTS.md requires direct `@/...` imports. Both the schema and shared-error imports cross the feature boundary relatively. Persists on the tip.
  Disposition: open

- P2 — Library impact helper redeclares generated reference shapes
  Path: frontend/apps/coachapp-v2/src/foods/lib/library-impact.ts
  Quote: "export type LibraryUsageItem = {id: string; name: string};"
  Why: frontend/AGENTS.md requires API-facing shapes to derive from `schema.ts`. `LibraryUsageItem` and `namedRefs` independently redeclare the generated `{id, name}` reference instead of deriving the normalized required form from the contract. Persists on the tip.
  Disposition: open

- P2 — Food impact contract marks an always-present field optional
  Path: backend/lib/easy_web/open_api/schemas/nutrition_food.ex
  Quote: "recipes: %Schema{type: :array, items: @recipe_ref}"
  Why: `FoodJSON.impact/1` always emits `data.recipes`, defaulting to `[]`, but `FoodImpactResponse` does not include `recipes` in a `required` list. Both generated `schema.ts` files therefore type it as optional. This breaks backend/AGENTS.md's rule that the JSON view, generated spec, and frontend contract agree. Persists on the tip.
  Disposition: open

- P2 — Food and Recipe deletion protection is duplicated
  Path: frontend/apps/coachapp-v2/src/foods/food-detail.tsx; frontend/apps/coachapp-v2/src/recipes/recipe-detail.tsx
  Quote: the new in-use delete dialog, conditional body/footer, and error handling have the same structure in both detail screens
  Why: Possible Duplicated Code. A shared Library deletion-protection component or helper could own the common behavior while each detail screen supplies its noun and mutation. Persists on the tip.
  Disposition: open

### 10 — Live nutrition days

Reviewed: 2026-08-20

Spec (Codex subagent):

- P1 — Client Today requests the browser's date instead of the client's applied local date
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx
  Quote: "A Nutrition Day request identifies intake by local calendar date and resolves the Client timezone with Business fallback."
  Why: The screen computes `today` with `formatDateISO(new Date())`, always sends that date, and derives its past and navigation boundaries from the same browser-local value. When the browser timezone differs from the Client or Business timezone, Today can request and display the wrong calendar day around midnight. The backend's timezone resolution cannot correct an explicit wrong date. Persists on the tip.
  Disposition: fixed in 18afbd67

Standards (Codex subagent):

- P2 — Coach Nutrition Day uses an unchecked Meal Slot cast
  Path: frontend/apps/coachapp-v2/src/clients/client-screen/nutrition-day.tsx
  Quote: "MEAL_SLOT_LABELS[slot as keyof typeof MEAL_SLOT_LABELS]"
  Why: The TypeScript rules forbid unchecked `as` casts. The API value is a runtime string, so the cast claims membership without validating it. Use a typed boundary or a string-keyed lookup. Persists on the tip.
  Disposition: open

- P2 — Nutrition Day mapping helpers lack sibling checks
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-utils.ts; frontend/apps/coachapp-v2/src/clients/client-screen/nutrition-day.tsx
  Quote: "A new mapper, predicate, or lifecycle helper ships with a sibling `.check.ts` in the same change." (frontend/AGENTS.md)
  Why: The changed `plannedItemCalories` and `freezeAsOptionItem` mapping logic, plus the new `liveOptionItems` and `slotLabel` helpers, ship without focused sibling checks. No later ticket adds them. Persists on the tip.
  Disposition: open

- P2 — Nutrition Day fixtures are duplicated across three test modules
  Path: backend/test/easy/nutrition/diary_test.exs; backend/test/easy_web/controllers/clients/nutrition_day_controller_test.exs; backend/test/easy_web/controllers/coaches/nutrition_day_controller_test.exs
  Quote: repeated `breakfast_menu`, `assign_covering_plan`, and `local_today` helpers
  Why: Possible Duplicated Code. The same Menu, Coverage, and timezone setup is copied across all three modules. A shared test helper could keep the Nutrition Day fixture shape consistent. Persists on the tip.
  Disposition: open

### 11 — Extras, freezing, idempotency

Reviewed: 2026-08-20

Spec (Codex subagent):

- P1 — Concurrent first extras with distinct keys race on Diary Slot creation
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Ledger reservation, command execution, and outcome storage are atomic under simultaneous requests."
  Why: Two first extras with different idempotency keys can both observe no slot. The loser hits the slot identity constraint inside a nested `Repo.transaction`; `Repo.rollback/1` aborts the outer ledger transaction, so `recover_slot/4` cannot re-query and one valid occurrence fails. The concurrency test covers only the same key, which serializes before this race. Persists on the tip.
  Disposition: fixed in ca664762

- P1 — Overlapping add intents share one mutable retry key
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx
  Quote: "The client add-item flow creates one key per user intent, reuses it for retries, and refreshes Nutrition Day through the generated contract."
  Why: Every add intent writes the same ref, while "Add food off-plan" remains enabled during the request. Intent B can overwrite intent A's key, and either completion clears the shared ref. If A committed but its response was lost, retrying A mints a new key and records a duplicate. Persists on the tip.
  Disposition: fixed in 18afbd67

Standards (Codex subagent):

- P2 — Nutrition Day contract marks always-present nullable fields optional
  Path: backend/lib/easy_web/open_api/schemas/nutrition.ex
  Quote: "Schema and JSON view change together."
  Why: `NutritionDayEntry.required` omits `food_id`, `recipe_id`, and `notes`, and `NutritionDayRow.required` omits `planned` and `entry`, although the JSON view always emits every key. Generated clients therefore treat present nullable fields as optional. Persists on the tip.
  Disposition: open

- P2 — Diary Entry slot index is not tenant-leading
  Path: backend/priv/repo/migrations/20260817110000_create_nutrition_diary.exs
  Quote: "Invariants that matter belong in Postgres too (unique, FK, check, non-null, tenant-leading indexes)."
  Why: The entry preload filters by `business_id` and `nutrition_diary_slot_id`, but the supporting index contains only `nutrition_diary_slot_id`. Persists on the tip.
  Disposition: open

- P2 — Meal Slot uses an unchecked TypeScript cast
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx
  Quote: "No `as` casts | Every `as` is a runtime crash waiting. Cast only after validation."
  Why: `meal_slot: picked.slot as MealSlot` claims that the picker's runtime string is a valid Meal Slot. Type `Picked.slot` at its source instead. Persists on the tip.
  Disposition: open

- P2 — Idempotency key and fingerprint remain interchangeable strings
  Path: frontend/apps/clientapp-v2/src/nutrition/diary-command-key.ts
  Quote: "Branded types | Brand primitives" and "Object args | Pass objects, not positional."
  Why: `DiaryCommandIntent` stores both domain values as plain strings, and `diaryCommandKey(previous, fingerprint)` takes positional arguments. The type system cannot prevent the values or arguments from being mixed up. Persists on the tip.
  Disposition: open

- P2 — `unwrap_transaction/1` is a Middle Man
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "defp unwrap_transaction({:ok, day}), do: {:ok, day}"
  Why: Possible Middle Man. Both clauses return their inputs unchanged, so `replay_or_run/4` can return `Repo.transaction/1` directly. Persists on the tip.
  Disposition: open

- P2 — Portion serialization is duplicated
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "defp portion_data(%MealItem{} = item)" and "defp frozen_portion(item)"
  Why: Possible Duplicated Code. Both functions build the same `kind`, `grams`, `amount`, `unit`, and `label` map. One mapper is enough. Persists on the tip.
  Disposition: open

- P2 — Slot creation threads a Data Clump through private helpers
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "fetch_or_create_slot!(ctx, client, date, timezone, today, meal_slot)"
  Why: Possible Data Clump. The same slot-creation identity travels through the lock, insert, and recovery helpers. A command or slot-identity value could carry it once. Persists on the tip.
  Disposition: open

Security (Codex subagent):

- P1 — Concurrent first extras can abort one valid command
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Ledger reservation, command execution, and outcome storage are atomic under simultaneous requests."
  Why: The distinct-key slot creation race described by the Spec pass aborts the losing outer transaction and can return a 500 instead of recording the second occurrence. Persists on the tip.
  Disposition: fixed in ca664762

- P2 — Expired ledger rows have no production cleanup caller
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Ledger lookup occurs before correction-window validation, entries are retained for 30 days, and bounded cleanup removes expired rows."
  Why: Only `purge_expired_command_ledger/1` reads `expires_at`, and no production job, task, or configuration calls it. Stored Nutrition Day outcomes, including notes, remain replayable indefinitely and the ledger keeps growing. Persists on the tip.
  Disposition: open

- P2 — Oversized Diary notes raise an unhandled database error
  Path: backend/lib/easy_web/open_api/schemas/nutrition.ex; backend/lib/easy/nutrition/diary_entry.ex
  Quote: "Cover the rule: valid and invalid input."
  Why: `notes` has no OpenAPI maximum and no changeset length validation, while the database column is `varchar(255)`. A client can submit more than 255 characters, pass request validation, and trigger an unhandled PostgreSQL truncation error. Persists on the tip.
  Disposition: open

- P2 — Database constraints do not bind a Diary Entry's client to its slot's client
  Path: backend/priv/repo/migrations/20260817110000_create_nutrition_diary.exs
  Quote: "Invariants that matter belong in Postgres too (unique, FK, check, non-null, tenant-leading indexes)."
  Why: Separate `(client_id, business_id)` and `(nutrition_diary_slot_id, business_id)` foreign keys allow an entry labeled as client A to belong to client B's slot in the same business; `frozen_option_id` also has no foreign key. Slot reads would expose the mismatched entry to B. Persists on the tip.
  Disposition: open

Summary: Spec 2 findings, worst P1 concurrent slot creation and shared retry keys; Standards 7 findings, all P2; Security 4 findings, worst P1 concurrent slot creation.

### 12 — Planned logging statuses

Reviewed: 2026-08-20

Spec (Codex subagent):

- P1 — Concurrent first planned commands can abort
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Whole-option and whole-day commands insert only unfulfilled planned items and remain safe under retries and concurrent taps."
  Why: Distinct-key commands can both observe that no Diary Slot exists. The loser rolls back from the nested slot insert inside the outer ledger transaction, so `recover_slot/4` cannot re-query and one valid command fails. The concurrency test pre-seeds the slot and misses the first-slot race. Persists on the tip.
  Disposition: fixed in ca664762

- P1 — Overlapping Today commands share one mutable retry key
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx
  Quote: "The client Today flow supports item, option, and day logging and renders backend-derived statuses without local reconciliation."
  Why: Item, option, day, and extra commands overwrite and clear the same `commandIntent` ref. If intent A completes while B is pending, A clears B's retry state. Retrying B after a lost response mints a new key; for a planned item, the backend records the repeated occurrence as an `added` extra. Persists on the tip.
  Disposition: fixed in 18afbd67

- P1 — Whole-day logging is unavailable for supported frozen states
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx
  Quote: "A planned command may create and freeze a slot only on the client's local day; an already frozen slot may accept corrections within the correction window."
  Why: Today's frozen `pending` rows do not satisfy `anyUnlogged`, so the screen hides "Log rest of day." Recent past `skipped` rows show the button, but `logWholeDay` returns without a request because historical Nutrition Days have `plan_id: nil`. Persists on the tip.
  Disposition: fixed in 18afbd67

- P2 — Client tests cover fingerprints, not the planned logging flow
  Path: frontend/apps/clientapp-v2/src/nutrition/diary-command-key.check.ts
  Quote: "Diary, database, controller, contract, concurrency, status, nutrient, and client-app tests cover each command scope and fulfilment invariant."
  Why: The client check only proves fingerprint equality. No client test exercises item, option, or day mutations, pending/skipped rendering, retry-key ownership, or the whole-day controls. No later ticket adds that coverage.
  Disposition: open

Standards (Codex subagent):

- P2 — Planned mutation hooks cast their response instead of checking inference
  Path: frontend/apps/clientapp-v2/src/api/nutrition.ts
  Quote: "No `as` casts | Every `as` is a runtime crash waiting. Cast only after validation."
  Why: Each new hook ends with `as Promise<NutritionDayResponse>`. That assertion can keep compiling after the generated endpoint response changes. The return type should be inferred or checked through an annotation. Persists on the tip.
  Disposition: open

- P2 — Meal Slot types widen to string and are cast back at the request
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx; frontend/apps/clientapp-v2/src/nutrition/components/amount-sheet.tsx
  Quote: "No `as` casts | Every `as` is a runtime crash waiting. Cast only after validation."
  Why: `SlotView`, `SheetTarget`, and fingerprint inputs widen the schema-derived Meal Slot enum to `string`, so the new writes use `slot.slot as DiaryMealSlot` and `target.slot as DiaryMealSlot`. Preserve `NutritionDaySlot['meal_slot']` through those types instead. Persists on the tip.
  Disposition: open

- P2 — Planned option and day endpoints lack negative-path tests
  Path: backend/test/easy/nutrition/diary_test.exs; backend/test/easy_web/controllers/clients/nutrition_day_controller_test.exs
  Quote: "Cover the rule: valid and invalid input, trusted ids not cast, tenant scope, cross-tenant denial, `{:error, reason}` for expected failures, controller status and rendered shape."
  Why: The planned-option and planned-day suites cover successful logging and repeats only. Their public functions declare not-found, inactive-client, future-date, closed-window, and invalid-key errors, but no controller negative case exercises either endpoint. Tickets 13–16 do not add them.
  Disposition: open

Security (Codex subagent):

- P1 — Whole-day correction checks the current timezone instead of each frozen slot
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "A planned command may create and freeze a slot only on the client's local day; an already frozen slot may accept corrections within the correction window."
  Why: `record_planned_day/3` calls `ensure_writable/2` once with the client's current applied timezone. After a timezone change, it can fulfil an already-frozen slot after that slot's correction window or reject a correction that remains valid under the slot's frozen `applied_timezone`. Persists on the tip.
  Disposition: fixed in ca664762

- P1 — Frozen source Menu Item identity is attached to a live foreign key
  Path: backend/priv/repo/migrations/20260817110000_create_nutrition_diary.exs
  Quote: "Frozen planned items retain source Menu Item identity, display values, Portion, nutrient basis, nutrients, completeness, and order without live structural foreign keys."
  Why: `source_meal_item_id` references `nutrition_meal_items` with `ON DELETE SET NULL`. Menu replacement can erase the promised frozen identity, after which a stale client holding the original Menu Item id receives not-found even though its frozen item still exists. Persists on the tip.
  Disposition: fixed in ca664762

- P2 — Planned status ignores a frozen slot's applied timezone
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "An unfulfilled active planned item is `pending` during its client-local date and `skipped` only after that date ends."
  Why: `assemble_day/4` calculates `today` from the client's current timezone and passes it to every frozen slot. After a timezone change, a row can become `skipped` before its frozen local day ends or remain `pending` afterward. Persists on the tip.
  Disposition: open

- P2 — Planned-option logging accepts an unscheduled Meal Slot
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "A client can log one frozen planned item, every remaining item in the active option, or every scheduled active option for the day."
  Why: `start_planned_slot/6` checks that some Coverage exists, not that the requested Meal Slot has an option. A stale or crafted valid Meal Slot creates an empty `has_coverage: true` frozen slot and returns success. The slot can then mask later live guidance for the same date and Meal Slot. Persists on the tip.
  Disposition: open

Summary: Spec 4 findings, worst P1 concurrent commands, shared retry state, and unavailable whole-day logging; Standards 3 findings, all P2; Security 4 findings, worst P1 whole-day timezone handling and lossy frozen source identity.

### 13 — Option switching

Reviewed: 2026-08-21

Spec (Codex subagent):

- P1 — Frozen options lose their switch identifier
  Path: backend/lib/easy/nutrition_diary.ex; backend/priv/repo/migrations/20260817110000_create_nutrition_diary.exs
  Quote: "A client may switch only among options frozen in the Diary Slot" and "it does not reload Programming."
  Why: The response and command identify a frozen option by nullable `nutrition_meal_id`. Menu replacement or Client Plan deletion nullifies that live FK, after which the frontend has no ID to submit and `find_frozen_option/2` cannot select the surviving frozen option. Tickets 14–16 leave this unchanged.
  Disposition: fixed in ca664762

- P1 — Concurrent first switches bypass revision arbitration
  Path: backend/lib/easy/nutrition_diary.ex; backend/test/easy/nutrition/diary_concurrency_test.exs
  Quote: "The switch command uses the shared idempotency wrapper and resolves simultaneous switch attempts through the slot revision."
  Why: Two distinct-key switches for an unstarted slot can both see no row and race through nested slot creation. The identity-constraint loser aborts the outer idempotency transaction instead of returning a stale-revision result. The concurrency test pre-seeds a slot, so it misses this path. Tickets 14–16 do not fix it.
  Disposition: fixed in ca664762

- P1 — Failed switch outcomes are not idempotent
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "The ledger lookup occurs before correction-window validation. An identical retry returns the original outcome even when the local date has since left the correction window."
  Why: `run_and_store/2` stores only successful days; every error rolls back the ledger reservation. An identical retry can therefore produce a different result, and the same key can later be reused with another payload. The new switch command inherits this behavior from the shared wrapper. Unchanged through ticket 16.
  Disposition: fixed in ca664762

- P1 — Recent past days still offer an option switch the server rejects
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx
  Quote: "A client may switch only among options frozen in the Diary Slot and only during that slot's local date."
  Why: The option-picker button uses `day.write_eligible`, which remains true throughout the seven-day correction window. A recent past day therefore opens the picker and posts a switch, but the backend always returns `cannot_switch_past_slot`. The button needs today's stricter eligibility, separate from entry correction eligibility. Persists on the tip.
  Disposition: fixed in 18afbd67

- P1 — First selection validates one Menu snapshot and freezes another
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "First same-day selection freezes offered options with the chosen one active."
  Why: `freeze_switch_slot/6` resolves Coverage to validate the requested Meal, then `insert_slot!/6` calls `freeze_source/3` and resolves mutable Programming again. A concurrent Menu replacement between those reads can remove the validated Meal; the command then succeeds while `freeze_slot!/4` silently falls back to the new default option. Tickets 14–16 retain both reads.
  Disposition: fixed in ca664762

- P2 — Client behavior is untested
  Path: frontend/apps/clientapp-v2/src/nutrition/diary-command-key.check.ts
  Quote: "Diary, database, controller, contract, concurrency, and client-app tests cover same-day limits, stale revisions, preserved associations, switch-back behavior, and totals."
  Why: The client check proves fingerprint stability only. No client test exercises canonical choices, server-owned selection, recent-past eligibility, preserved rows, switch-back, stale revisions, or totals. No later ticket adds that coverage.
  Disposition: open

Standards (Codex subagent):

- P2 — Switch responses omit reachable HTTP statuses
  Path: backend/lib/easy_web/controllers/clients/nutrition_day_controller.ex
  Quote: "A public JSON endpoint is unfinished until implementation, generated spec, and Swagger UI agree."
  Why: The operation documents only 200, 401, 409, and 422, while `switch_client_option/4` also returns `:client_inactive` as 403 and several `:not_found` paths as 404. The mismatch remains through ticket 16.
  Disposition: open

- P2 — The public switch update lacks a cross-tenant denial test
  Path: backend/test/easy/nutrition/diary_test.exs
  Quote: "Test isolation on every public read, list, update, and delete."
  Why: The new public update has same-client, inactive-client, and coach-route coverage, but no context-level test proves that a forged or other-tenant client context cannot switch another tenant's frozen slot. Still absent at ticket 16.
  Disposition: open

- P2 — Coach denial test accepts three different statuses
  Path: backend/test/easy_web/controllers/clients/nutrition_day_controller_test.exs
  Quote: "Cover the rule: valid and invalid input, trusted ids not cast, tenant scope, cross-tenant denial, `{:error, reason}` for expected failures, controller status and rendered shape."
  Why: `assert conn.status in [401, 403, 404]` does not pin the controller status or rendered error shape, so several routing or authorization regressions would pass. Unchanged through ticket 16.
  Disposition: open

- P2 — Switch mutation asserts its response type
  Path: frontend/apps/clientapp-v2/src/api/nutrition.ts
  Quote: "No `as` casts | Every `as` is a runtime crash waiting. Cast only after validation."
  Why: `as Promise<NutritionDayResponse>` trusts the response instead of letting the generated client infer it or checking it through an annotation. Remains through ticket 16.
  Disposition: open

- P2 — Switch intent widens domain values to interchangeable strings
  Path: frontend/apps/clientapp-v2/src/nutrition/diary-command-key.ts
  Quote: "Branded types | Brand primitives so they can't be mixed up" and "Schema-derived types | Reach for `Pick`/`Omit`/... before declaring a new interface."
  Why: Date, Meal ID, and Meal Slot are plain strings. At minimum, the slot should retain the generated `NutritionDaySlot['meal_slot']` type instead of widening and casting it at the request. Remains through ticket 16.
  Disposition: open

- P2 — Single-element insertion loop is speculative generality
  Path: backend/test/easy/nutrition/diary_concurrency_test.exs
  Quote: "for {option, grams} <- [{option_a, 50.0}] do"
  Why: Possible Speculative Generality. The loop generalizes one fixture insertion and obscures what the setup creates. Inline the insert. Remains through ticket 16.
  Disposition: open

- P2 — Switch tests use repeated message chains
  Path: backend/test/easy/nutrition/diary_test.exs
  Quote: "logged.slots |> hd() |> Map.fetch!(:rows) |> hd() |> Map.fetch!(:entry) |> Map.fetch!(:id)"
  Why: Possible Message Chains. The same long traversal appears more than once; pattern-matching the response once would state the expected shape and shorten the assertions. Remains through ticket 16.
  Disposition: open

Defects (Codex subagent):

- P1 — Frozen option identity depends on mutable Programming
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Original frozen-item associations survive so switching back restores their meaning."
  Why: Same runtime defect as the first Spec finding. A frozen choice whose live `nutrition_meal_id` was nullified still exists in Diary but can no longer be named by the client or found by the switch command.
  Disposition: fixed in ca664762

- P1 — Concurrent first-switch loser can return 500
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "resolves simultaneous switch attempts through the slot revision."
  Why: Same runtime defect as the concurrency Spec finding. The nested rollback aborts the already-open idempotency transaction, so the recovery query cannot turn the losing insert into a stale-revision outcome.
  Disposition: fixed in ca664762

- P1 — Switches share mutable retry state with every Diary command
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx
  Quote: "The switch command uses the shared idempotency wrapper."
  Why: Switches and every other Diary write overwrite and clear one `commandIntent` ref while other controls remain enabled. Overlapping intents can lose the key needed to replay a committed command after a lost response. This extends the ticket 11/12 retry-state defect to option switching and persists on the tip.
  Disposition: fixed in 18afbd67

- P2 — A stale switch leaves the client stuck on the stale revision
  Path: frontend/apps/clientapp-v2/src/api/nutrition.ts; frontend/apps/clientapp-v2/src/nutrition/nutrition-today.tsx
  Quote: "Switching requires the expected Diary Slot revision."
  Why: The mutation invalidates Nutrition Days only on success, and the switch catch does not refetch after a stale-revision response. The screen retains the old active option and revision, so an immediate retry sends the same stale command until an unrelated refetch occurs. Persists on the tip.
  Disposition: open

Summary: Spec 6 findings, worst P1 frozen-option identity and first-switch concurrency; Standards 7 findings, all P2; Defects 4 findings, worst P1 frozen-option identity, first-switch concurrency, and shared retry state.

### 14 — Diary corrections

Reviewed: 2026-08-21

Spec (Codex subagent):

- P1 — Serving Portion corrections always fail
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Updating a Diary Entry accepts Portion and notes only, requires the expected entry revision, and scales the frozen nutrient basis without consulting Library."
  Why: `scaled_nutrients/2` accepts only `grams` or `weight_g`, while the contract and client submit a serving correction as `{kind: "serving", amount, unit}`. Every serving-based correction therefore returns `:invalid_portion` instead of scaling from the entry's frozen amount and weight basis. Tickets 15 and 16 leave this unchanged.
  Disposition: fixed in ca664762

- P1 — The client cannot edit notes, and a Portion edit clears the existing note
  Path: frontend/apps/clientapp-v2/src/nutrition/components/amount-sheet.tsx; backend/lib/easy/nutrition_diary.ex
  Quote: "Substitution, Portion updates, note updates, and deletion use explicit commands" and "The client Today and History flows expose the allowed correction actions."
  Why: The amount sheet has no notes input and omits `notes` from its PATCH body. `cast_update_command/1` converts that omission to `nil`, and `update_attrs/2` writes the nil value, so changing only a Portion silently erases an existing note. Tickets 15 and 16 add no note control and leave this write path unchanged.
  Disposition: fixed in ca664762 and 18afbd67

- P1 — Replacement revision checks are not concurrency-safe
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Substitution, Portion updates, note updates, and deletion use explicit commands, optimistic revisions, the applied timezone, and the shared idempotency wrapper."
  Why: Replacement reads the existing entry through the slot preload, checks that stale struct's revision, then updates by id without locking the entry or putting the expected revision in the update predicate. A concurrent PATCH can commit first and then be overwritten by the replacement while both commands succeed; a concurrent delete can raise instead of returning a stale-revision result. Tickets 15 and 16 do not change the replacement path.
  Disposition: fixed in ca664762

Standards (Codex subagent):

- P2 — Entry update and delete lack client cross-tenant tests
  Path: backend/test/easy/nutrition/diary_test.exs
  Quote: "Test isolation on every public read, list, update, and delete." (backend/AGENTS.md)
  Why: The new public `update_client_entry/5` and `delete_client_entry/5` tests cover successful writes, revisions, and date boundaries, but never attempt to mutate another client's entry. Ticket 16 adds coach-actor denial, not a forged or other-tenant client context case.
  Disposition: open

- P2 — Diary error mapper has no sibling check
  Path: frontend/apps/clientapp-v2/src/nutrition/diary-write-error.ts
  Quote: "A new mapper, predicate, or lifecycle helper ships with a sibling `.check.ts` in the same change." (frontend/AGENTS.md)
  Why: The new exported `diaryWriteError/2` mapper has no `diary-write-error.check.ts`. Tickets 15 and 16 do not add one.
  Disposition: open

- P2 — Diary error mapping depends on backend message text
  Path: frontend/apps/clientapp-v2/src/nutrition/diary-write-error.ts
  Quote: "Don't introduce slop: very fragile code that just patches specific cases." (root AGENTS.md)
  Why: The helper branches on whether the server's human-readable date error contains `"previous 7"` or `"future"`. Copy edits can silently select the wrong client message; a structured error code should drive the behavior. Tickets 15 and 16 leave this unchanged.
  Disposition: open

- P2 — Diary error parsing uses an unchecked TypeScript cast
  Path: frontend/apps/clientapp-v2/src/nutrition/diary-write-error.ts
  Quote: "No `as` casts | Every `as` is a runtime crash waiting. Cast only after validation." (TypeScript rules)
  Why: `error as {data?: ...}` asserts the nested API error shape after checking only that `error` is an object with a `data` property. It does not validate `data`, `error_detail`, or `fields` before dereferencing them. Tickets 15 and 16 leave this unchanged.
  Disposition: open

Security (Codex subagent):

- P1 — Replacement races bypass optimistic revision arbitration
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Replacing a planned fulfilment with another visible Food or Recipe commits atomically" and "requires the expected entry revision."
  Why: Replacement does not lock the existing Diary Entry. A concurrent PATCH can advance the entry while replacement still holds its stale preloaded struct; both writes succeed and replacement overwrites the PATCH without a stale-revision loser. A concurrent delete can instead turn the stale update into an exception.
  Disposition: fixed in ca664762

- P1 — Valid serving corrections are rejected
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Updating a Diary Entry accepts Portion and notes only, requires the expected entry revision, and scales the frozen nutrient basis without consulting Library."
  Why: Serving requests carry `amount` and `unit`, but the frozen scaling function requires request grams. A client cannot correct any serving-based Food or Recipe entry even though the public contract accepts the request shape.
  Disposition: fixed in ca664762

- P2 — An omitted notes field is a destructive update
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Updating a Diary Entry accepts Portion and notes only."
  Why: Missing `notes` becomes `nil` and is always included in update attrs. A Portion-only PATCH erases stored notes, and an otherwise empty PATCH clears notes while incrementing the revision.
  Disposition: open

Summary: Spec 3 findings, all P1; Standards 4 findings, all P2; Security 3 findings, worst P1 replacement races and rejected serving corrections.

### 15 — History summaries

Reviewed: 2026-08-21

Spec (Codex subagent):

- P1 — Historical adherence loses its frozen target
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Serve bounded client history and coach summaries from frozen Diary rows only" and "Deleting a Client Plan leaves Diary history unchanged and may null optional plan provenance without changing frozen values."
  Why: Past dates intentionally skip Programming, so `merge_day/5` replaces the plan targets with `empty_targets/0`. `day_summary/2` then computes adherence from a nil calorie target, making adherence unknown for every past day with intake. Deleting a Client Plan can likewise change today's targets and adherence even though the frozen Diary rows are unchanged. Ticket 16 leaves this logic unchanged.
  Disposition: fixed in ca664762

Standards (Codex subagent):

- P2 — Coach summary helpers lack a sibling check and make the component deep
  Path: frontend/apps/coachapp-v2/src/clients/client-screen/nutrition-tab.tsx
  Quote: "A new mapper, predicate, or lifecycle helper ships with its `.check.ts` in the same change" and "If helpers or constants grow, move them to the owning `lib`, `domain`, or mapper file." (coachapp-v2/AGENTS.md)
  Why: The new `caloriePct/1` and `adherenceBand/1` helpers have no sibling check and live below the screen component instead of in the owning clients helper module. Ticket 16 leaves both helpers unchanged.
  Disposition: open

- P2 — Client summary types redeclare generated API shapes
  Path: frontend/apps/clientapp-v2/src/nutrition/nutrition-summary.ts
  Quote: "Types come from `schema.ts`" and "Derive with `Pick` / `Omit` / indexed access; do not redeclare the shape." (frontend/AGENTS.md)
  Why: `NutritionSummaryAdherence` and the handwritten `SummaryDay.summary` repeat concepts already available through `NutritionDay['summary']`. The duplicate adherence vocabulary can drift from the generated contract. Ticket 16 leaves the declarations unchanged.
  Disposition: open

- P2 — Coach summary type repeats the generated adherence union
  Path: frontend/apps/coachapp-v2/src/clients/client-screen/nutrition-tab.tsx
  Quote: "Do not duplicate existing shapes. Derive types from API/domain types with `Pick`, `Omit`, `Partial`, indexed access, or local zod inference when the meaning is the same." (coachapp-v2/AGENTS.md)
  Why: `DayTotals.adherence` manually repeats `'none' | 'on' | 'over' | 'under' | null` instead of deriving it from the re-exported Nutrition Day API type. Ticket 16 leaves it unchanged.
  Disposition: open

Defects (Codex subagent):

- P1 — Historical adherence is always unavailable
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Coach summaries derive counts and totals from the same stored relationships and status rules as Nutrition Day detail."
  Why: After the day ends, `live_guidance/5` returns nil, `merge_day/5` discards the calorie target, and `calorie_adherence/3` returns nil. Client and coach history therefore show unknown adherence for every historical day with intake, even when the day was frozen under a positive plan target.
  Disposition: fixed in ca664762

- P1 — Plan deletion can change the active option's planned summary
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Deleting a Client Plan leaves Diary history unchanged and may null optional plan provenance without changing frozen values."
  Why: Plan deletion nulls every frozen option's `nutrition_meal_id`. `frozen_slot_view/2` still selects the active option by `active_frozen_option_id`, but serializes its `meal_id` as nil. `active_option_items/1` then matches the first option whose `meal_id` is also nil, so a slot switched to a later option reports the first option's planned nutrients after plan deletion.
  Disposition: fixed in ca664762

- P1 — Library deletion can turn a swapped row into as-planned
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "After structural blockers are removed, deleting a Food or Recipe may null its optional Diary reference while names, Portions, nutrients, completeness, and statuses remain readable."
  Why: `same_source?/2` compares the optional live `food_id` and `recipe_id` fields. After both the planned source and its substituted source are deleted, both sides contain nil IDs, so the row changes from `swapped` to `as_planned` and corrupts historical status counts.
  Disposition: fixed in ca664762

- P1 — Read eligibility and statuses use a different timezone than the response reports
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Client history and authorized coach/owner history return the same slots, entries, statuses, totals, timestamps, and applied timezone vocabulary."
  Why: `assemble_day/4` computes `today`, `write_eligible`, and pending/skipped statuses from the client's current timezone, while the response reports an existing slot's frozen `applied_timezone`. After a timezone change across a date boundary, read eligibility and statuses can disagree with the write boundary, which correctly uses the frozen slot timezone.
  Disposition: fixed in ca664762

- P2 — Exact-date filtering does not override malformed range fields
  Path: backend/lib/easy_web/controllers/clients/nutrition_day_controller.ex; backend/lib/easy_web/controllers/coaches/nutrition_day_controller.ex
  Quote: "Exact local date (YYYY-MM-DD); overrides from/to."
  Why: Both controllers parse `from` and `to` before passing the exact `date` to the context. A request such as `?date=2026-08-10&from=bad` returns 422 instead of ignoring the malformed range and returning the exact day. Ticket 16 leaves both controllers unchanged.
  Disposition: open

Summary: Spec 1 finding, P1 historical adherence; Standards 3 findings, all P2; Defects 5 findings, worst P1 frozen-history changes after plan, Library, or timezone changes.

### 16 — Contract cutover

Reviewed: 2026-08-21

Spec (Codex subagent):

- P1 — Rich-client development seed cannot create its first planned fulfilment
  Path: backend/priv/repo/dev_rich_client.exs; backend/lib/easy/nutrition_diary.ex
  Quote: "Representative factories and development seeds rebuild Foods, Recipes, Templates, Client Plans, Menus, frozen options, planned fulfilments, extras, and no-Coverage entries without discarded IDs."
  Why: The seed deletes every Diary Slot for the client, then calls `log_client_planned_item/4` for yesterday. `start_planned_slot/6` rejects every non-today first freeze with `:cannot_start_past_slot`, so the asserted `{:ok, _}` raises before any of the extras or the no-Coverage entry are created.
  Disposition: fixed in ca664762

- P2 — Cutover test does not prove retained rows survive the destructive reset
  Path: backend/test/easy/nutrition/cutover_test.exs
  Quote: "Reset verification proves that retained Library, Business, Client, and media data survive while legacy Programming and Diary data do not."
  Why: The test inserts retained rows after the test database has already run every migration, then proves only that those current tables accept and return new rows. It never places retained rows before the reset migrations, so it cannot catch a destructive reset that accidentally deletes retained data.
  Disposition: open

- P2 — Required live-width verification is checked off but was not run
  Path: .scratch/nutrition-backend-rewrite/issues/16-contract-cutover.md
  Quote: "The coach app builds and its touched flows are verified at phone and desktop widths." / "The client app builds and its Today and History flows are verified at phone width."
  Why: The ticket Answer says, "Live 375/1280 walkthrough was not run in this session," while both verification requirements remain checked.
  Disposition: fixed in 73df7a42

- P2 — Replaced `MacroCalc` symbol remains in a live builder comment
  Path: frontend/apps/coachapp-v2/src/nutrition-plans/builder/components/amount-sheet.tsx
  Quote: "Backend precommit, frontend checks, generated OpenAPI checks, recurring-mistake checks, and searches for every replaced symbol and route pass on the integrated rewrite."
  Why: The amount-sheet header still says its preview "mirrors the backend's MacroCalc" after this ticket deletes that module. The surviving reference makes the claimed replaced-symbol search false and documents an implementation that no longer exists.
  Disposition: open

Standards (Codex subagent):

- P2 — Rewritten Nutrition Day fixture bypasses generated-contract type checking
  Path: frontend/apps/coachapp-v2/src/clients/lib/client-detail-data.check.ts
  Quote: "const days = [...] as any;"
  Why: `.agents/skills/typescript-best-practices/SKILL.md` requires `unknown` over `any` and forbids unchecked `as` casts. The ticket rewrites this fixture from raw logs to Nutrition Days but keeps `as any`, so generated Nutrition Day contract changes cannot invalidate the check at compile time.
  Disposition: open

Defects (Codex subagent):

- P1 — Builder seed deletes the plan ID its fixed verification route uses
  Path: backend/priv/repo/dev_nutrition_builder.exs; design-handoff/manifests/NB.json
  Quote: "Representative factories and development seeds rebuild Foods, Recipes, Templates, Client Plans, Menus, frozen options, planned fulfilments, extras, and no-Coverage entries without discarded IDs."
  Why: The seed deletes `49584e72-1edd-41d5-a648-f339a1b57149`, then creates the replacement through `Programming.create_template/2`, whose changeset does not accept that ID and generates a new one. `NB.json` still routes to the deleted fixed ID, so the seed's own verification flow reaches a 404 after every run.
  Disposition: fixed in d17c13bc

- P1 — Rich-client seed deletes other clients' and Templates' same-name plans
  Path: backend/priv/repo/dev_rich_client.exs
  Quote: "Representative factories and development seeds rebuild Foods, Recipes, Templates, Client Plans, Menus, frozen options, planned fulfilments, extras, and no-Coverage entries without discarded IDs."
  Why: The cleanup query deletes every `nutrition_plans` row in the business named `Cutting Phase`, without filtering by `kind`, `client_id`, or seed provenance. Re-running this client-specific seed can therefore delete another client's Client Plan or an unrelated coach Template. The pre-cutover query was limited to this client.
  Disposition: fixed in ca664762

Summary: Spec 4 findings, worst P1 broken rich-client seed; Standards 1 finding, P2 unchecked fixture cast; Defects 2 findings, both P1 destructive or broken development seeds.

## Integration pass

Reviewed: 2026-08-21

Spec (Codex subagent):

- P1 — A multi-slot day is interpreted in an arbitrary slot's timezone
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Each Diary Slot snapshots `applied_timezone`. An existing slot's date meaning and correction deadline use that snapshot even if the Client timezone changes later."
  Why: The day assembler selected one timezone from the frozen-slot map and used its local date for every slot. If a client changed timezone between first writes to different meal slots, one slot's pending or skipped status and correction eligibility could be evaluated under the other slot's snapshot.
  Disposition: fixed in b8b1a315

- P1 — Rolled-back command failures lose their idempotency reservation
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "Ledger reservation, Diary mutation, and stored outcome commit atomically."
  Why: Stale replacement and replacement changeset failures called `Repo.rollback/1`, which also removed the new ledger reservation. The same idempotency key could then be reused with a different fingerprint instead of replaying the original failure or returning a conflict.
  Disposition: fixed in b8b1a315

- P1 — Frozen source identity is not fully protected by Postgres
  Path: backend/priv/repo/migrations/20260818130000_freeze_diary_option_identity.exs; backend/priv/repo/migrations/20260818150000_freeze_diary_library_identity.exs
  Quote: "Postgres constraints protect required frozen historical values."
  Why: Frozen options allowed a null source Meal, while frozen planned items and entries allowed neither or both source kinds. Invalid direct writes could therefore erase stable option identity or corrupt `as_planned` and `swapped` history after live references disappeared.
  Disposition: fixed in b8b1a315

Standards (Codex subagent):

- No new P0 or P1 findings. The bounded Food and Recipe list behavior remains recorded as an open P2 above.

Summary: Integration review found 3 new P1 spec defects; all are fixed in b8b1a315. It found no new P0 or P1 standards defects.
