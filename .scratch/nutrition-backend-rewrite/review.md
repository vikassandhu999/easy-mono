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
  Disposition: open (identical code at lines 494–541 on the tip)

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
  Disposition: open

Standards (Claude subagent):

- P0 — Week-schedule completeness trigger makes plan deletion fail at commit
  Path: backend/priv/repo/migrations/20260817010000_add_nutrition_meal_options.exs
  Quote: "IF weekday_count <> 7 THEN RAISE EXCEPTION 'nutrition_week_schedule must contain every weekday'"
  Why: Same defect as the Spec finding above.
  Disposition: open

- P1 — Omitted Day Patterns are deleted after inserts, colliding on the (plan, position) unique index
  Path: backend/lib/easy/nutrition_programming.ex
  Quote: ":ok <- delete_omitted_patterns(plan, Map.values(pattern_ids)) do" (last step of replace_locked_menu)
  Why: Meals go stage → delete → insert, but patterns insert/update while omitted patterns still hold their old positions (`stage_positions` only moves retained rows). Dropping pattern A (position 0) while submitting a new/repositioned pattern at position 0 hits `nutrition_day_patterns_nutrition_plan_id_position_index` — spurious "position has already been taken" 422 on a valid menu. No test covers omit-and-reuse-position; order unchanged on the tip.
  Disposition: open

- P1 — changeSlot deletes the option when the current slot is re-selected
  Path: frontend/apps/coachapp-v2/src/nutrition-plans/builder/commands.ts
  Quote: "if (!moved || fromSlot === mealSlot) { return optionId; }"
  Why: The recipe removes the option and reindexes *before* this guard, and returning a defined marker makes `saveMenu` send the mutated menu anyway — a same-slot "move" serializes the menu without the option and the server deletes it. Guard must run before the removal (or abort the save). Reachability currently depends on react-aria suppressing same-key selection events, which is library-internal behavior, not a contract. Still present on the tip.
  Disposition: open

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
  Disposition: open

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
  Disposition: open

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
  Disposition: open

- P1 — Cooked-weight protection races a concurrent Menu replacement
  Path: backend/lib/easy/nutrition_library.ex; backend/lib/easy/nutrition_programming.ex
  Quote: "A Library edit that would invalidate a Menu Portion is rejected; removing Recipe cooked weight while a Menu uses a gram Portion is covered explicitly."
  Why: `mutate_recipe/4` locks the Recipe and then checks existing Menu Items, but a concurrent `replace_menu/4` can resolve a gram Portion using the old cooked weight before that lock. Its Meal Item insert waits on the Recipe FK, then succeeds after the Recipe update commits. The FK checks only that the Recipe still exists; no database invariant couples `cooked_weight_g` to gram Menu Items. The result is a gram Menu Item referencing a Recipe with no cooked weight. Persists on the tip.
  Disposition: open

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
  Disposition: open

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

Reviewed:

### 12 — Planned logging statuses

Reviewed:

### 13 — Option switching

Reviewed:

### 14 — Diary corrections

Reviewed:

### 15 — History summaries

Reviewed:

### 16 — Contract cutover

Reviewed:
