# Backend Conventions Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Executed continuously, reporting at slice boundaries, on branch `refactor/coachapp-api-simplify`.

**Goal:** Bring the entire `backend/` to full conformance with the locked conventions (`backend/AGENTS.md` / `docs/superpowers/specs/2026-06-23-elixir-conventions-design.md` Part A), so the codebase is consistent and conventional end-to-end.

**Architecture:** Apply the conventions as **vertical per-context slices** (context + its schemas + its controllers + its tests), ordered by risk: a low-risk foundation (security + mechanical stragglers + global builder renames) first, then one slice per domain. Each slice ends green (`mix precommit`) and is reviewed before the next. No DB migrations — `Ecto.Enum` conversions are string-backed; trusted-id and timestamp fixes are code-only.

**Tech Stack:** Elixir 1.19 / Phoenix 1.8 / Ecto / OpenApiSpex / Credo.

## Global Constraints (every task inherits these)

- **Ctx-first (§A3):** every tenant-scoped public context fn takes `%Easy.Ctx{} = ctx` first; reads `ctx.business_id`/`ctx.user_id`/`ctx.client_id` internally. Pure reference reads (`list_muscles`) may take plain args. Schema fns (changesets, query builders) stay `Ctx`-ignorant — pass plain ids down.
- **Three-case naming (§A2) — the canonical map:**
  - Case 1 (coach in system): `verb_noun(ctx, …)`.
  - Case 2 (coach for a client): `verb_noun_for_client(ctx, client_id, …)` / `verb_noun_to_client(...)` — `client_id` is ALWAYS the 2nd positional arg.
  - Case 3 (client for self): `verb_client_noun(ctx, …)` — target is `ctx.client_id`, never a param.
  - **Retires `_for_user`, `_for_coach_user`, `_as_coach`, `_as_client`, and the `_my_` infix.** So `list_my_sessions(ctx)` → `list_client_sessions(ctx)`; coach `list_sessions(ctx, client_id)` → `list_sessions_for_client(ctx, client_id)`; `create_thread_as_coach` → `create_thread(ctx, attrs)`; `create_thread_as_client` → `create_client_thread(ctx, attrs)`.
- **Trusted ids (§A7):** `business_id`, actor (`creator_id`/`user_id`), parent ids are SEPARATE positional params set with `put_change/3`, never `cast`, never in `attrs`. Canonical changeset arg order: **`business_id` first**, then actor, then parent, then `attrs`.
- **Query builders (§A6):** `for_<dim>` = filter (no-op on nil/""); `include_<assoc>` = preload (lives in schema, takes `business_id` to scope nested reads); bare predicate = named subset; `newest`/`oldest`/`by_position`/`alphabetical` = ordering. **`with_*` and `load_*` are retired.** Identity filters carry `business_id`: `for_client(business_id, client_id)`, `for_coach(business_id, coach_id)`.
- **Closed sets (§A4):** `Ecto.Enum` (string-backed, NO DB migration), not `:string` + `validate_inclusion`. Values become atoms in Elixir — update pattern matches; JSON renders atoms as strings (verify views/tests).
- **Lists (§A9):** one trailing `opts \\ []` (not a positional tail); `:offset`/`:limit` default 0/20 clamped to max 100; filter keys map to `for_*` builders; count+list = two explicit queries → `{:ok, %{count: n, <plural>: items}}`.
- **attrs / ids (§A10) — LOCKED 2026-06-23 (hybrid):** identity ids (`client_id`, `plan_id`, `meal_id`, `day`, `session_id`, …) come from `conn.path_params` (string) and are passed to the context as explicit positional args (§A7 trusted-id shape); the request **body** carries only editable fields → straight to the changeset. `Ecto.Changeset.cast/3` is **key-agnostic**, so changeset-bound attrs need NO normalization (note: `CastAndValidate` `struct?: false` actually yields **atom** keys — the original §A10 "string-keyed" premise was wrong). Net rule: never extract a value from the body by key in a context → **no `Map.get("x") || Map.get(:x)` probes**, no `stringify_keys`. Where a route currently carries an id in the body, **move it to the path** (small API change). **Error reasons** are bare atoms or `Ecto.Changeset.t()` (or `%Easy.Error{}`) — not ad-hoc tagged tuples.
- **Web (§A5):** controllers read `conn.assigns.ctx` (never `conn.assigns.claims` raw ids), one context call, `with` → render, `CastAndValidate` on writes, co-located `operation`. No `Repo`/queries/workflows in controllers. `auth_controller.ex` is the §A8 exception (claims/tokens, raw json).
- **Schemas:** no `@moduledoc`/`@doc`; `@spec` on public fns; `insert_changeset`/`update_changeset` only (no `create_changeset`, no generic top-level `changeset/2`); `timestamps(type: :utc_datetime)`; explicit `binary_id` keys.
- **Tenant safety:** wrong tenant/owner → `:not_found`, never `:forbidden`. Scope every query by `ctx.business_id`; client-self additionally by `ctx.client_id`.
- **Deferred (parked, §A15):** deep client-ownership denormalization (e.g. `thread_message`, `performed_set`) — scope via the parent that carries `business_id`/`client_id`; do NOT add new columns in this migration.
- **Every task ends green:** `mix compile --warnings-as-errors` exit 0 and `mix test` fully green before committing. Run `mix format`. Keep the existing boundary/`business_id_response`/`open_api_route_coverage` tests passing.

## Slice roadmap (each = a vertical slice, executed in order)

- **Slice 0 — Foundation:** security cast→put_change (identity) + mechanical schema stragglers + 3 global builder renames. *(Tasks below.)*
- **Slice 1 — threads:** naming sweep (`_as_*`/`_for_user`→three-case), `with_*`→`for_*`/`include_*`, `Ecto.Enum` (module/status/priority/author_type), `list_threads` opts+pagination, controllers (`thread`/`thread_message`) — drop `stringify_keys`. `thread_message` scoped via parent (no new column).
- **Slice 2 — nutrition:** `nutrition_plans`/`meals`/`meal_logs` → Ctx-first + three-case + list-opts; schemas (`plan`/`meal`/`meal_item`/`meal_log`/`schedule_entry`/`food`) arg-order + `Ecto.Enum` + builder renames + extract hand-rolled preloads to `include_*`; nutrition controllers (`nutrition_plan`/`meal`/`meal_item`/`meal_log`/`schedule`/client-side) claims→ctx + CastAndValidate.
- **Slice 3 — training (finish):** `_my_`→`verb_client_noun`, Case-2/3 fixes in `training_plans`/`sessions`/`workouts`/`exercises`; list-opts; `with_*`→`for_*`/`include_*`; `Ecto.Enum` (exercise/performed_set/planned_set/schedule_entry); changeset arg-order (`training_workout`/`schedule_entry`/`training_workout_exercise`); dual-key removal; extract context preloads; training controllers verify (mostly ctx already).
- **Slice 4 — clients + client_profiles + weight_entries:** Ctx-first + three-case; actor-stamp security casts (`form_submission`, `profile_field_value`); `Ecto.Enum` (form_*/profile_field_*); `for_client`+`business_id`; list-opts; controllers claims→ctx + CastAndValidate.
- **Slice 5 — storefront/offers/testimonials:** extract context modules for `offer` + `testimonial` (currently Repo+queries in controller — structural); move Repo out of `offer`/`store_profile`/`testimonial` schemas; `store_profile` `Ecto.Enum`; controllers case→with + CastAndValidate + claims→ctx.
- **Slice 6 — reference polish + web sweep + verify:** finish `exercises`/`foods`/`recipes`/`workouts` (list-opts, dual-key); `for_business_or_system` already global from Slice 0; remaining controllers claims→ctx + CastAndValidate (`business`/`profile`/`profile_field`/`store_profile`); `for_client`+`business_id` for any remaining builders; whole-tree `mix check` (`credo --strict`) pass; full verification (`ecto.reset`+seeds, boundary tests, suite).

*Slices 1–6 task breakdowns are appended to this doc at each slice boundary, authored against live (post-prior-slice) code — the audit file-lists above are their scope. Slice 0 is fully specified now.*

---

## Slice 0 — Foundation

### Task 1: Security — trusted-id cast → put_change (identity)

**Files:**
- Modify: `lib/easy/identity/one_time_token.ex`, `lib/easy/identity/user_session.ex`
- Modify: their callers (grep — likely `lib/easy/identity*.ex` / auth context / `lib/easy_web/.../auth_controller.ex` builders)
- Test: `test/easy/identity/*`, auth/session tests

**Interfaces:**
- Produces: changesets that `put_change/3` the trusted ids (`:user_id`, `:business_id`) instead of casting them; ids passed as explicit leading positional args. `OneTimeToken`'s `changeset/2`→`insert_changeset/…`.
- Consumes: nothing new.

- [ ] **Step 1:** Grep callers: `grep -rn "OneTimeToken\.\(changeset\|insert_changeset\)\|UserSession.new_session\|\.changeset(" lib | grep -i "token\|session"` and read the two schemas to see current arg shapes.
- [ ] **Step 2:** `one_time_token.ex`: rename `changeset/2` → `insert_changeset(user_id, attrs)` (or `(user_id, business_id, attrs)` if it carries business) that `put_change(:user_id, user_id)` and casts only non-identity fields; change bare `timestamps()` → `timestamps(type: :utc_datetime)`. Add `@spec`.
- [ ] **Step 3:** `user_session.ex`: `new_session/…` → `put_change(:user_id, user_id)` + `put_change(:business_id, business_id)` (ids as leading args), cast only the rest; bare `timestamps()` → `:utc_datetime`.
- [ ] **Step 4:** Update every caller to pass the ids positionally (not inside attrs).
- [ ] **Step 5:** `mix precommit` green (esp. auth/session/token tests — these are security-critical; confirm login/OTP/refresh flows pass).
- [ ] **Step 6:** Commit: `git commit -m "fix(identity): put_change trusted ids (user_id/business_id), no cast — security"`

### Task 2: Mechanical schema stragglers

**Files:**
- Modify: `lib/easy/orgs/business.ex` (`create_changeset`→`insert_changeset` + arg order `business`/ids first + `@spec` on `update_changeset/2`), `lib/easy/training/training_plan.ex` (`create_changeset`→`insert_changeset`), `lib/easy/training/training_equipment.ex` + `training_muscle.ex` (`create_changeset`→`insert_changeset` + `timestamps(type: :utc_datetime_usec)`→`:utc_datetime`)
- Modify: `lib/easy/identity/user.ex` (bare `timestamps()`→`:utc_datetime`; `@spec` on all public fns), `lib/easy/clients/client.ex` (bare `timestamps()`→`:utc_datetime`)
- Modify: `lib/easy/nutrition/recipe.ex` (strip `@doc`), `lib/easy/client_profiles/client_profile.ex` (strip `@doc`)
- Modify: `lib/easy/orgs/coach.ex` (`@spec` on public fns lacking them)
- Modify: `lib/easy/nutrition/food_log_entry.ex` (remove redundant `validate_inclusion` on an already-`Ecto.Enum` field)
- Create/Modify: `lib/easy/storefront/lead.ex` (add `insert_changeset/…` + `for_business/2` builder)
- Modify: callers of the renamed changesets (`lib/easy/orgs.ex`, `lib/easy/training_plans.ex`, `lib/easy/exercises.ex`)
- Test: affected schema + context tests

**Interfaces:**
- Produces: `insert_changeset` names everywhere (no `create_changeset`); `:utc_datetime` timestamps on the listed schemas; `@spec`-complete `user`/`business`/`coach`; `Lead.for_business/2` + `Lead.insert_changeset`.
- Consumes: nothing new.

- [ ] **Step 1:** Rename `create_changeset`→`insert_changeset` in the 4 schemas; grep+update callers (`grep -rn "create_changeset" lib test`); confirm `business.ex` arg order is `business_id`/ids-first per §A7.
- [ ] **Step 2:** Timestamps: equipment/muscle `:utc_datetime_usec`→`:utc_datetime`; user/client bare→`:utc_datetime`.
- [ ] **Step 3:** Strip `@doc` from `recipe.ex` + `client_profile.ex`. Remove redundant `validate_inclusion` in `food_log_entry.ex`.
- [ ] **Step 4:** Add missing `@spec` to `identity/user.ex`, `orgs/business.ex`, `orgs/coach.ex` public fns.
- [ ] **Step 5:** `storefront/lead.ex`: add `for_business/2` query builder + an `insert_changeset` (cast lead fields, `put_change(:business_id, business_id)`).
- [ ] **Step 6:** `mix precommit` green.
- [ ] **Step 7:** Commit: `git commit -m "refactor(schemas): insert_changeset names, utc_datetime timestamps, @spec, strip @doc, lead builder"`

### Task 3: Global query-builder renames (semantics-preserving)

**Files:**
- Modify: `lib/easy/training/training_exercise.ex` (`owned_or_system`→`for_business_or_system`, `newest_first`→`newest`, `load_muscles_and_equipment`→`include_muscles_and_equipment`)
- Modify: all call sites — `owned_or_system` (~8): `exercises.ex:16,38`, `sessions.ex:339,368,415`, `workouts.ex:156,165`, `training_performed_set.ex:87`, `training_workout_exercise.ex:75`; `newest_first`: `exercises.ex:44`; `load_muscles_and_equipment`: `exercises.ex:17,26,46`
- Test: exercise/session/workout tests

**Interfaces:**
- Produces: `TrainingExercise.for_business_or_system/2`, `.newest/1`, `.include_muscles_and_equipment/1` (renamed; behavior identical).
- Consumes: nothing.

- [ ] **Step 1:** Rename the 3 builders in `training_exercise.ex`.
- [ ] **Step 2:** Grep + update every call site: `grep -rn "owned_or_system\|newest_first\|load_muscles_and_equipment" lib test` → all updated; re-grep returns empty.
- [ ] **Step 3:** `mix precommit` green (pure rename, no behavior change).
- [ ] **Step 4:** Commit: `git commit -m "refactor(training): rename query builders to convention (for_business_or_system, newest, include_*)"`

---

## Self-Review (Slice 0)

Covers the spec's "do-first" bucket: the OneTimeToken security cast (§A7, the one explicit SECURITY flag) + user_session, the mechanical schema stragglers (changeset names, timestamps, @doc, @spec, lead builder — all from the audit), and the 3 unambiguous global builder renames. Each task is independently green-able and low-blast-radius. No `_my_`/naming or Ctx-first work here (that's Slices 1–6, per context). Type consistency: the renamed builders keep identical query semantics; the changeset renames update all callers in the same task.

---

## Slice 1 — threads (authored at slice boundary against live code)

`Easy.Threads` is already Ctx-first; this slice finishes naming (three-case), query-builder taxonomy, `Ecto.Enum`, list opts, and controller call-site updates. `thread_message` stays scoped via its parent thread (no `business_id` column — §A15 parked).

### Task 4: threads schema layer (builders + enums) + builder call-sites

**Files:** `lib/easy/threads/thread.ex`, `lib/easy/threads/thread_message.ex`, `lib/easy/threads.ex` (builder call-sites + enum-safe filter inputs only — NOT the public-fn renames, which are Task 5), `test/easy/threads/*`, threads JSON views if they emit the enum fields.

**Interfaces:**
- Produces: `Thread.for_status/2`, `for_module/2`, `for_priority/2` (filters, no-op on nil); `Thread.include_messages/1` (preload — child `thread_message` is not business-scoped, so it does NOT take business_id; scopes via the thread); `Thread.for_client/3` (now `(query, business_id, client_id)`); `Ecto.Enum` on `Thread.{module,status,priority}` and `ThreadMessage.author_type`; `ThreadMessage.oldest/1` (was `ordered`). Enum values are atoms in Elixir.
- Consumes: nothing new.

- [ ] **Step 1:** `thread.ex`: rename filters `with_status`→`for_status`, `with_module`→`for_module`, `with_priority`→`for_priority` (each no-op on nil/""); `with_messages`→`include_messages`; `for_client(query, client_id)`→`for_client(query, business_id, client_id)`. Convert `field :module/:status/:priority, :string` (+`validate_inclusion`) → `Ecto.Enum, values: [...]` (drop the now-redundant `validate_inclusion`; keep any DB-check). NO DB migration.
- [ ] **Step 2:** `thread_message.ex`: `author_type` → `Ecto.Enum`; rename `ordered`→`oldest`. Leave tenant scope flowing through `:thread_id` (parked — no `for_business`, no new column).
- [ ] **Step 3:** `threads.ex`: update builder call-sites (`for_status`/`for_module`/`for_priority`, `include_messages`, `for_client(business_id, client_id)`, `oldest`). Because the enum fields are now atoms, any filter value arriving as a string (from `opts`/request) must be safely converted at the context boundary before the `for_*` builder (use `Easy.Utils`-style safe `String.to_existing_atom` guarded against invalid input → ignore/no-op). Do NOT rename public fns here (Task 5).
- [ ] **Step 4:** Update tests + JSON views: enum fields render as strings (atoms auto-encode) — verify `business_id_response_test` + thread JSON still pass; fix any test that pattern-matched a string status to expect the atom internally / string in JSON.
- [ ] **Step 5:** Verify: `grep -rn "with_status\|with_module\|with_priority\|with_messages\|\bordered\b" lib/easy/threads* lib/easy/threads.ex` → empty. `mix precommit` green.
- [ ] **Step 6:** Commit: `git commit -m "refactor(threads): for_/include_ builders, Ecto.Enum, for_client+business_id"`

### Task 5: threads context three-case naming + list opts + controllers

**Files:** `lib/easy/threads.ex`, `lib/easy_web/controllers/coaches/thread_controller.ex` + `thread_message_controller.ex` + any `clients/thread*` controllers, their tests, threads OpenApiSpex if operation_ids encode fn names.

**Interfaces (rename map):**
- `list_client_threads(ctx, client_id)` → `list_threads_for_client(ctx, client_id)` (Case-2)
- `list_threads_for_user(ctx)` → `list_client_threads(ctx)` (Case-3)
- `get_thread_for_user(ctx, id)` → `get_client_thread(ctx, id)`
- `create_thread_as_coach(ctx, attrs)` → `create_thread(ctx, attrs)`
- `create_thread_as_client(ctx, attrs)` → `create_client_thread(ctx, attrs)`
- `add_message_as_coach(ctx, thread_id, attrs)` → `add_message(ctx, thread_id, attrs)`
- `add_message_as_client(ctx, thread_id, attrs)` → `add_client_message(ctx, thread_id, attrs)`
- `list_threads(ctx, filters_map)` → `list_threads(ctx, opts \\ [])` (offset/limit default 0/20 clamp 100; filter keys → `for_*`; return `{:ok, %{count: n, threads: [...]}}`)

- [ ] **Step 1:** Rename the public fns per the map. Keep the coach (Case-1/2) vs client (Case-3, resolves `ctx.client_id`) split correct.
- [ ] **Step 2:** Convert `list_threads` to `opts`-based with two-query count+list + clamp.
- [ ] **Step 3:** Update controllers to the renamed fns; **delete the duplicate private `stringify_keys/1`** in `thread_controller.ex` (attrs are string-keyed via CastAndValidate — pass `conn.body_params` straight through). Confirm controllers already read `conn.assigns.ctx` (they do — threads was migrated); if any `assigns.claims` remains, switch it.
- [ ] **Step 4:** Update tests for renamed fns + list shape. If `attention`/other callers reference `create_thread_as_coach` (the memory notes attention would), grep + update: `grep -rn "_as_coach\|_as_client\|_for_user\|list_client_threads(" lib test`.
- [ ] **Step 5:** Verify: `grep -rn "_as_coach\|_as_client\|threads_for_user\|stringify_keys" lib/easy/threads.ex lib/easy_web/controllers/*thread*` → empty. `mix precommit` green.
- [ ] **Step 6:** Commit: `git commit -m "refactor(threads): three-case naming + opts-based list_threads; drop stringify_keys"`

---

## Slice 2 — nutrition (authored at slice boundary)

Three contexts (`nutrition_plans`, `meals`, `meal_logs`) are still raw-`business_id`-first. This slice makes them Ctx-first + three-case + opts-lists, fixes their schemas (arg-order, `Ecto.Enum`, builder taxonomy, `for_client`+`business_id`), extracts hand-rolled preloads to schema `include_*` builders, and migrates their controllers (claims→ctx, CastAndValidate, **ids from path** per the locked §A10). Reference shape: `lib/easy/foods.ex`/`recipes.ex` + the completed threads slice.

Order: Task 6 (schemas) first; then `meals` (Task 7) before `nutrition_plans` (Task 8, whose copy/assign calls meals); `meal_logs` (Task 9) last.

### Task 6: nutrition schema layer + preload extraction

**Files:** `lib/easy/nutrition/{plan,meal,meal_item,meal_log,schedule_entry,food,food_log_entry}.ex`; extract preload builders currently in `lib/easy/nutrition_plans.ex`/`meals.ex`/`meal_logs.ex` into schema `include_*` builders + update those builder CALL-SITES only (NOT public-fn renames — Tasks 7–9). Tests + JSON for enum fields.

**Changes (audit):**
- **Changeset arg-order (§A7, business_id first):** `meal.insert_changeset(plan_id, business_id, creator_id, attrs)`→`(business_id, creator_id, plan_id, attrs)`; `schedule_entry.insert_changeset(plan_id, business_id, attrs)`→`(business_id, plan_id, attrs)`. Update callers.
- **Ecto.Enum (string-backed, no migration):** `meal.default_meal_slot`; `schedule_entry.{day_of_week, meal_slot}`; `meal_log.meal_slot`. Drop redundant `validate_inclusion`; safe string→atom for filter inputs (reuse `Utils.safe_to_atom`).
- **Builders (§A6):** `plan.with_status`→`for_status`; `plan.for_client(client_id)`→`for_client(business_id, client_id)`; `meal_log.with_entries`→`include_entries(business_id)` (food_log_entry IS business-scoped → scope nested by business_id); `meal_item.ordered`→`by_position`; `food_log_entry.ordered`→`by_position`; `meal_log.ordered`→`oldest`; any `food.ex with_*`→`for_*`/`include_*`.
- **Preload extraction (§A6):** move hand-rolled context preloads into schema `include_*` builders (each takes `business_id`, scopes nested children): `Plan.include_full/2`, `Meal.include_items/2`, `MealItem.include_food_and_recipe/2`, `ScheduleEntry.include_meal/2` (names illustrative). Replace inline `from(...preload:...)`/`Repo.preload(...)` in the 3 contexts with these.

- [ ] Step 1: arg-order in meal + schedule_entry; grep+update callers. Step 2: Ecto.Enum conversions + safe filter atoms. Step 3: builder renames + call-sites. Step 4: extract preloads → schema `include_*`. Step 5: tests + JSON; verify `grep -rn "with_status\|with_entries\|\bordered\b\|with_full_preloads\|with_meal\b\|meals_with_items\|plan_items_with_meal\|meal_items_with_food_and_recipe" lib/easy/nutrition* lib/easy/nutrition_plans.ex lib/easy/meals.ex lib/easy/meal_logs.ex` → empty; `mix precommit` green. Step 6: commit `refactor(nutrition): schema arg-order, Ecto.Enum, for_/include_ builders, preload extraction`.

### Task 7: meals context Ctx-first + three-case + controllers

**Files:** `lib/easy/meals.ex`; `coaches/{meal,meal_item,schedule}_controller.ex`; tests.

**Shape:** all 8 fns `%Ctx{}`-first; `create_meal_for_coach_user(business_id, user_id, plan_id, attrs)`→`create_meal(ctx, plan_id, attrs)` (plan_id from PATH; coach via private `get_coach(ctx)`); the rest Ctx-first; `list_meals(business_id, plan_id, offset, limit)`→`list_meals(ctx, plan_id, opts \\ [])` (path plan_id; clamp; `{:ok, %{count, meals}}`). Controllers: `conn.assigns.ctx`; ids (`plan_id`/`meal_id`/`meal_item_id`) from `conn.path_params`; CastAndValidate on writes; body→changeset (no dual-key/stringify).

- [ ] Convert meals.ex; update 3 controllers; tests; `grep -rn "_for_coach_user\|_for_user" lib/easy/meals.ex` → empty; `mix precommit` green; commit `refactor(nutrition): Ctx-first meals + three-case + path ids`.

### Task 8: nutrition_plans context Ctx-first + three-case + controllers

**Files:** `lib/easy/nutrition_plans.ex`; `coaches/nutrition_plan_controller.ex`, `clients/nutrition_plan_controller.ex`, `coaches/client_plan_controller.ex` (nutrition list), `coaches/schedule_controller.ex` (if it calls nutrition_plans); tests.

**Rename map (§A2):** `create_plan_for_coach_user`→`create_plan(ctx, attrs)`; `assign_to_client_for_coach_user`→`assign_plan_to_client(ctx, client_id, plan_id, attrs)` (client_id+plan_id from path); `duplicate_for_coach_user`→`duplicate_plan(ctx, plan_id)`; `get_client_plan_full_for_user`→`get_client_plan_full(ctx, plan_id)` (Case-3); `list_client_plans_for_user`→`list_client_plans(ctx, opts)` (Case-3); `list_client_plans_full_for_client`→`list_plans_for_client(ctx, client_id, opts)` (Case-2); `get_active_plan_day_for_user`→`get_client_active_plan_day(ctx, date)` (date from query/path); `list_template_plans(ctx, opts)`; `get_plan_full`/`update_plan`/`delete_plan` Ctx-first; `get_schedule`/`set_day_schedule` Ctx-first (day from path; slots/body via changeset — fix the `Map.get("start_date") || Map.get(:start_date)` in assign). All lists → opts + clamp + `{:ok, %{count, plans}}`. `creator_id` via `get_coach(ctx)`.

- [ ] Convert context; update controllers (ctx, path ids, CastAndValidate); tests; `grep -rn "_for_coach_user\|_for_user\|_full_for_client\|Map.get(attrs, \"start_date\")" lib/easy/nutrition_plans.ex` → empty; `mix precommit` green; commit `refactor(nutrition): Ctx-first nutrition_plans + three-case + path ids`.

### Task 9: meal_logs context Ctx-first + three-case + controllers

**Files:** `lib/easy/meal_logs.ex`; `coaches/meal_log_controller.ex`, `clients/meal_log_controller.ex`, `clients/food_log_entry_controller.ex`; tests.

**Rename map (§A2):** drop all 7 `_for_user` → Case-3 `verb_client_noun`: `list_meal_logs_for_user`→`list_client_meal_logs(ctx, opts)`; `log_entry_for_user`→`create_client_food_log_entry(ctx, attrs)`; `update_entry_for_user`→`update_client_food_log_entry(ctx, entry_id, attrs)` (entry_id path); `delete_entry_for_user`→`delete_client_food_log_entry(ctx, entry_id)`; `log_meal_for_user`→`log_client_meal(ctx, attrs)`; `log_day_for_user`→`log_client_day(ctx, attrs)`. Coach: `list_meal_logs`/`list_meal_logs_for_client`→`list_meal_logs_for_client(ctx, client_id, opts)` (Case-2, client_id path). Remove dual-key `attrs["meal_slot"] || attrs[:meal_slot]` (body→changeset or explicit arg). Lists → opts (date/from/to keys) + clamp. Controllers: ctx, ids/dates from path/query, CastAndValidate, no dual-key.

- [ ] Convert context + controllers + tests; `grep -rn "_for_user\|meal_slot\"\] || attrs\[:meal_slot" lib/easy/meal_logs.ex` → empty; `mix precommit` green; commit `refactor(nutrition): Ctx-first meal_logs + three-case + path ids`.

*Slice 2 gate: compile, full suite, `grep -rn "_for_user\|_for_coach_user" lib/easy/{nutrition_plans,meals,meal_logs}.ex` empty, no dual-key probes, no hand-rolled context preloads in those contexts.*

---

## Slice 3 — training (finish) (authored at slice boundary)

Training contexts (`training_plans`, `workouts`, `sessions`, `exercises`) are already Ctx-first (from training Plan 2) but still carry: `_my_` infix names (must be `verb_client_noun`), Case-2/3 confusion, positional list tails, `with_*` builders, `:string`+`validate_inclusion` enums, changeset arg-order (parent-id before business_id), residual dual-key probes, hand-rolled context preloads, and `stringify_keys`/`Map.drop` in schedule/assign controllers. Reference shapes: the just-finished nutrition slice + `lib/easy/foods.ex`.

Order: Task 10 (schemas) first; then 11 (training_plans) before 13 (sessions); 12 (workouts+exercises) independent.

### Task 10: training schema layer + preload extraction

**Files:** `lib/easy/training/{training_exercise,training_performed_set,planned_set,schedule_entry,training_plan,training_workout,training_workout_exercise,training_session}.ex`; extract hand-rolled preloads from `training_plans.ex` (`preload_plan!`) + `sessions.ex` into schema `include_*` builders + update builder CALL-SITES (NOT public-fn renames — Tasks 11-13). Tests + JSON for enum fields.

**Changes (audit):**
- **Ecto.Enum (string-backed, no migration):** `training_exercise.{source,tracking_type,mechanics,force}`; `training_performed_set.{set_type,load_unit,distance_unit}`; `planned_set.{set_type,load_unit,distance_unit}`; `schedule_entry.day_of_week`. Drop redundant `validate_inclusion`; safe string→atom (`Utils.safe_to_atom`) for filter inputs; changeset `cast` handles body coercion. JSON renders atoms as strings — verify.
- **Changeset arg-order (§A7, business_id first):** `training_workout.insert_changeset(plan_id, business_id, creator_id, attrs)`→`(business_id, creator_id, plan_id, attrs)`; `schedule_entry.insert_changeset(plan_id, business_id, creator_id, attrs)`→`(business_id, creator_id, plan_id, attrs)`; `training_workout_exercise.insert_changeset(workout_id, business_id, attrs)`→`(business_id, workout_id, attrs)`. Update callers.
- **Builders (§A6):** `training_plan.with_status`→`for_status`, `with_workouts`→`include_workouts(business_id)`, `with_plan_items`→`include_schedule_entries(business_id)`; `training_workout.with_elements`→`include_exercises(business_id)`; `training_session.with_state`→`for_state`, `with_sets`→`include_sets(business_id)`; `training_performed_set.with_exercise`→`include_exercise(business_id)`; `training_workout_exercise.with_exercise`→`include_exercise(business_id)`; `schedule_entry.with_workout`→`include_workout(business_id)`. `for_client` add `business_id`: `training_session.for_client`, `training_plan.for_client`. Update all call-sites.
- **Preload extraction (§A6):** move `training_plans.ex preload_plan!` inline preloads + `sessions.ex` inline `Repo.preload` into schema `include_*` builders (each takes business_id, scopes nested children incl. `for_business_or_system` for exercises). Replace inline with builder calls.

- [ ] Steps: (1) Ecto.Enum conversions + safe filter atoms. (2) arg-order + callers. (3) builder renames + call-sites. (4) extract preloads → schema include_*. (5) tests + JSON; verify `grep -rn "with_status\|with_workouts\|with_plan_items\|with_elements\|with_state\|with_sets\|with_exercise\|with_workout\b\|preload_plan!" lib/easy/training* lib/easy/training_plans.ex lib/easy/sessions.ex lib/easy/workouts.ex` → empty; `grep -rn "validate_inclusion" lib/easy/training` → empty (those fields). `mix precommit` green. (6) commit `refactor(training): schema Ecto.Enum, arg-order, for_/include_ builders, preload extraction`.

### Task 11: training_plans context + controllers

**Files:** `lib/easy/training_plans.ex`; `coaches/training_plan_controller.ex`, `clients/training_plan_controller.ex`, `coaches/client_plan_controller.ex` (training list), `coaches/training_schedule_controller.ex` (if it calls training_plans — schedule get/set); tests.

**Rename map (§A2):** `list_my_plans`→`list_client_plans(ctx, opts)` (Case-3); `get_my_plan_full`→`get_client_plan_full(ctx, plan_id)`; `get_my_active_plan_day`→`get_client_active_plan_day(ctx, date)`; coach `list_client_plans(ctx, client_id, ...)`→`list_plans_for_client(ctx, client_id, opts)` (Case-2). `list_template_plans(ctx, opts)`. All list fns → opts (clamp 100, two-query `{:ok, %{count, plans}}`). Remove dual-key `attrs["training_workout_id"] || attrs[:training_workout_id]` in `set_day_schedule` → atom-only. Drop `stringify_keys/1` in `coaches/training_plan_controller.ex` assign (body is atom-keyed; pass through / read once). ids (plan_id/client_id/day) from path. Use Task-10 `include_*` builders.

- [ ] Convert context + controllers (ctx, path ids, CastAndValidate, no stringify/dual-key) + tests; `grep -rn "list_my_plans\|get_my_plan_full\|get_my_active_plan_day\|stringify_keys\|training_workout_id\"\] ||" lib/easy/training_plans.ex lib/easy_web/controllers/*training_plan*` → empty; `mix precommit` green; commit `refactor(training): three-case naming + opts + path ids (training_plans)`.

### Task 12: workouts + exercises contexts + controllers

**Files:** `lib/easy/workouts.ex`, `lib/easy/exercises.ex`; `coaches/{workout,workout_element,exercise}_controller.ex`, `clients/exercise_controller.ex`, `coaches/{muscle,equipment}_controller.ex`; tests.

**Changes (audit):**
- `workouts.list_workouts(ctx, plan_id, offset, limit)`→`list_workouts(ctx, plan_id, opts \\ [])` (clamp, `{:ok, %{count, workouts}}`); plan_id from path.
- `exercises.list_exercises(ctx, search, muscle_ids, offset, limit)`→`list_exercises(ctx, opts \\ [])` (opts: `:search`, `:muscle_ids`, `:offset`, `:limit`; clamp; `{:ok, %{count, exercises}}`). Remove the 3 dual-key probes (`create_exercise`/`update_exercise` `muscle_ids`/`equipment_ids`; `duplicate_exercise` `name`) → atom-only reads (body atom-keyed; `muscle_ids`/`equipment_ids` are body arrays → read `attrs[:muscle_ids]` once). 
- Controllers: ctx (already), CastAndValidate (exercise controller has it; add to workout/workout_element if missing — they were added in training Plan 2, verify), path ids, no dual-key.

- [ ] Convert both contexts + controllers + tests; `grep -rn "Map.get(.*) || Map.get\|\] || Map.get" lib/easy/exercises.ex lib/easy/workouts.ex` → empty; `list_exercises`/`list_workouts` are opts-based; `mix precommit` green; commit `refactor(training): opts lists + drop dual-key (workouts, exercises)`.

### Task 13: sessions context + controllers

**Files:** `lib/easy/sessions.ex`; `coaches/workout_session_controller.ex`, `clients/workout_session_controller.ex`, `clients/performed_set_controller.ex`, `coaches/performed_set_controller.ex` (if still present); tests.

**Rename map (§A2):** the `_my_` infix (7 fns) → `verb_client_noun`: `list_my_sessions`→`list_client_sessions(ctx, opts)`; `get_my_session_with_sets`→`get_client_session_with_sets(ctx, id)`; `create_my_session`→`create_client_session(ctx, attrs)`; `update_my_session`→`update_client_session(ctx, id, attrs)`; `create_my_performed_set`→`create_client_performed_set(ctx, session_id, attrs)`; `update_my_performed_set`→`update_client_performed_set(ctx, set_id, attrs)`; `delete_my_performed_set`→`delete_client_performed_set(ctx, set_id)`. Coach: `list_sessions(ctx, client_id, from, to)`→`list_sessions_for_client(ctx, client_id, opts)` (Case-2); `get_client_session_with_sets(ctx, client_id, id)` (coach Case-2) — disambiguate from the client Case-3 `get_client_session_with_sets(ctx, id)` by naming the coach one `get_session_for_client(ctx, client_id, id)`. Date-range lists → opts (`:from`/`:to`) bounded → `{:ok, [sessions]}` ok. Remove dual-key probes (`attrs["state"] || attrs[:state]`, `exercise_id`) → atom-only. ids (session_id/set_id/client_id) from path. Use Task-10 `include_sets`/`include_exercise` builders.

- [ ] Convert context + controllers (ctx, path ids, CastAndValidate, no dual-key) + tests; `grep -rn "list_my_sessions\|_my_session\|create_my_\|update_my_\|delete_my_\|state\"\] || attrs\[:state" lib/easy/sessions.ex` → empty; cross-client write safety preserved (set lookup scoped by client from ctx); `mix precommit` green; commit `refactor(training): three-case session naming + opts + path ids`.

*Slice 3 gate: compile, full suite, `grep -rn "_my_\|with_status\|with_sets\|with_elements\|_for_user" lib/easy/training_plans.ex lib/easy/sessions.ex lib/easy/workouts.ex lib/easy/exercises.ex lib/easy/training` empty, no dual-key, no hand-rolled context preloads.*

---

## Slice 4 — clients + client_profiles + weight_entries (authored at slice boundary)

These three contexts are still raw-`business_id`-first (full Ctx-first conversion) and include TWO actor-stamp SECURITY casts. Reference: `lib/easy/foods.ex` + the migrated nutrition/training contexts.

Order: Task 14 (schemas, incl. security) first; then 15 (clients), 16 (client_profiles), 17 (weight_entries).

### Task 14: clients/client_profiles/weight_entries schema layer (+ SECURITY)

**Files:** `lib/easy/clients/client.ex`; `lib/easy/client_profiles/{client_profile,form_assignment,form_template,form_submission,profile_field_definition,profile_field_value}.ex`; `lib/easy/fitness/weight_entry.ex`; `lib/easy/orgs/coach.ex` (builder); builder/changeset CALL-SITES in the 3 contexts (NOT public-fn renames — Tasks 15-17). Tests + JSON.

**Changes (audit):**
- **SECURITY (cast→put_change, §A7):** `form_submission.insert_changeset` casts `:submitted_by_type`/`:submitted_by_id` → take as positional args + `put_change`; `profile_field_value` (insert/upsert) casts `:updated_by_type`/`:updated_by_id` → positional + `put_change`. Update callers to pass the actor explicitly (the actor identity comes from `ctx` in the context layer — but schema stays Ctx-ignorant; context passes `ctx.user_id`/role down).
- **Ecto.Enum:** `form_assignment.{purpose,priority,status}`; `form_template.{purpose,status}`; `form_submission.submitted_by_type`; `profile_field_definition.{section,field_type}`; `profile_field_value.updated_by_type`. Drop redundant `validate_inclusion`; safe atoms for filters; JSON renders strings (verify).
- **Changeset arg-order (§A7):** `weight_entry.insert_changeset(client_id, business_id, attrs)` → `(business_id, client_id, attrs)`. Update callers.
- **Builders (§A6):** `client.with_status`→`for_status`, `client.with_preloads`→`include_preloads(business_id)`, `coach.with_preloads`→`include_preloads(business_id)`; `for_client`+`business_id` on `client_profile.for_client`, `profile_field_value.for_client`, `form_assignment.for_client`, `weight_entry.for_client`. Update call-sites; when callers use `for_client`, drop redundant `for_business`.

- [ ] Steps: (1) SECURITY put_change + callers. (2) Ecto.Enum + safe filter atoms. (3) weight_entry arg-order + callers. (4) builder renames (`for_status`/`include_preloads`/`for_client+business_id`) + call-sites. (5) tests + JSON; verify `grep -rn "cast(.*:submitted_by\|cast(.*:updated_by" lib/easy/client_profiles` → empty; `grep -rn "with_status\|with_preloads" lib/easy/clients lib/easy/client_profiles lib/easy/orgs/coach.ex` → empty; `grep -rn "validate_inclusion" lib/easy/client_profiles` → empty (converted fields). `mix precommit` green. (6) commit `refactor(clients/profiles): schema Ecto.Enum, put_change actor ids (security), arg-order, for_/include_ builders`.

### Task 15: clients context Ctx-first + three-case + controllers

**Files:** `lib/easy/clients.ex`; controllers `coaches/client_controller.ex`, `clients/profile_controller.ex`, `coaches/profile_controller.ex`, `business_controller.ex` (if it calls Clients); tests.

**Shape (§A2/§A3):** all 14 fns `%Ctx{}`-first; `get_client_for_user`→ collapse into Case-3 `get_client(ctx)` private resolver + public client-self reads (`get_client_profile(ctx)`/`update_client_profile(ctx, attrs)` — distinguish from the `ClientProfiles` context's profile, this is the user/account profile); coach fns `get_client(ctx, client_id)` (Case-2: explicit client_id from path), `list_clients(ctx, opts \\ [])` (opts: `:search`/`:status`/`:profile_filter`/`:offset`/`:limit`, clamp, `{:ok, %{count, clients}}`), `invite_client`→`invite_client(ctx, attrs)` / Case naming, `update_client(ctx, client_id, attrs)`, `revoke_invitation(ctx, client_id)`, `resend_invitation(ctx, client_id)`, `create_inquiry(ctx, attrs)`. `accept_invite`/`invitation_preview`/`resolve_invitation_token` are token-based (no tenant ctx) — leave as documented exceptions if they predate auth. Controllers: ctx, path ids, CastAndValidate on writes (add where missing — client_controller update/delete, profile update per web audit), no dual-key/Repo.

- [ ] Convert + controllers + tests; `grep -rn "_for_user" lib/easy/clients.ex` → empty; `mix precommit` green; commit `refactor(clients): Ctx-first + three-case + path ids`.

### Task 16: client_profiles context Ctx-first + three-case + controllers

**Files:** `lib/easy/client_profiles.ex`; controllers `coaches/client_profile_controller.ex`, `clients/client_profile_controller.ex`, `coaches/form_template_controller.ex`, `coaches/form_assignment_controller.ex`, `clients/form_assignment_controller.ex`, `coaches/profile_field_controller.ex`; tests.

**Shape:** all 18 fns `%Ctx{}`-first (ids from path). Naming: coach Case-1/2 (`get_or_create_profile(ctx, client_id)` Case-2, `list_profile_fields(ctx)`, `create_profile_field(ctx, attrs)`, `assign_form_template_to_client(ctx, client_id, template_id, attrs)`); client Case-3 (`get_client_form_assignment`→`get_client_form_assignment(ctx, assignment_id)` Case-3 resolving ctx.client_id, `submit_client_form_assignment(ctx, assignment_id, attrs)`, `list_client_form_assignments(ctx)`); fix `get_client_form_assignment` Case-mismatch (it had `client_id` arg + `get_client_` prefix → pick Case-2 `get_form_assignment_for_client(ctx, client_id, assignment_id)` for coach, Case-3 `get_client_form_assignment(ctx, assignment_id)` for client). Actor stamp (submitted_by/updated_by) passed from ctx (role + user_id) to the schema put_change. List fns → `{:ok, [items]}` (small per-client lists) or opts where paginated. Controllers: ctx, path ids, CastAndValidate on writes (form_template create/update/delete, form_assignment update, profile_field create/update, client_profile update — per web audit), no dual-key/Repo; drop the `with_business_template` retired-prefix private helper → `include_*` or inline-via-schema-builder.

- [ ] Convert + controllers + tests; `grep -rn "_for_user\|with_business_template" lib/easy/client_profiles.ex` → empty; `mix precommit` green; commit `refactor(client_profiles): Ctx-first + three-case + path ids + actor put_change`.

### Task 17: weight_entries context Ctx-first + three-case + controllers

**Files:** `lib/easy/weight_entries.ex`; controllers `clients/weight_entry_controller.ex`, `coaches/client_weight_entry_controller.ex`; tests.

**Shape:** all 7 fns `%Ctx{}`-first; drop `_for_user` → Case-3: `list_entries_for_user`→`list_client_weight_entries(ctx, opts)` (opts `:since`); `upsert_for_user`→`upsert_client_weight_entry(ctx, attrs)`; `delete_for_user`→`delete_client_weight_entry(ctx, entry_id)` (entry_id path). Coach Case-2: `list_entries_for_client(ctx, client_id, opts)`, `adherence(ctx, client_id, opts)` (window_days as opt). Fix `upsert(client_id, business_id, attrs)` reversed arg-order (now via the Ctx-first public fns + Task-14 corrected `insert_changeset(business_id, client_id, attrs)`). Remove dual-key probes in `normalize_attrs` (`Map.get(attrs,:value)||Map.get(attrs,"value")` etc.) → atom-only (body atom-keyed). Controllers: ctx, path ids, CastAndValidate on writes (weight_entry create/delete per web audit), no dual-key/Repo.

- [ ] Convert + controllers + tests; `grep -rn "_for_user\|Map.get(.*) || Map.get" lib/easy/weight_entries.ex` → empty; `mix precommit` green; commit `refactor(fitness): Ctx-first weight_entries + three-case + path ids`.

*Slice 4 gate: compile, full suite, `grep -rn "_for_user\|_for_coach_user" lib/easy/{clients,client_profiles,weight_entries}.ex` empty; no dual-key; no `cast(.*:submitted_by\|:updated_by\|:user_id\|:business_id)` in client_profiles/fitness schemas (SECURITY); builder grep clean.*

---

## Slice 5 — storefront / offers / testimonials (authored at slice boundary)

The structural slice. `offer` + `testimonial` controllers do `Repo`+query-building INLINE with NO context module (§A5 violation); their schemas also call `Repo` (§A4 violation — schemas never touch Repo). This slice EXTRACTS proper Ctx-first context modules, moves `Repo` out of schemas, and converts the controllers to `with`→FallbackController + CastAndValidate + `conn.assigns.ctx`. Plus `store_profile` `Ecto.Enum` + upsert-via-context. Reference: any migrated context (`foods.ex`) for the Ctx-first CRUD shape.

Each task is a vertical (schema cleanup + new/updated context + controller). Independent — any order; do 18, 19, 20.

### Task 18: Offers — extract `Easy.Offers` context

**Files:** create `lib/easy/offers.ex` (or `lib/easy/storefront/offers.ex` matching the repo's context-dir convention — check where `storefront.ex` lives; put the context at `lib/easy/` top-level like other contexts); `lib/easy/storefront/offer.ex` (remove Repo, keep pure builders); `lib/easy_web/controllers/coaches/offer_controller.ex`; tests.

**Changes:**
- **Move `Repo` OUT of `storefront/offer.ex`** (audit flagged `Repo` at ~122/128/136). The schema keeps ONLY pure query builders (`for_business/2`, `by_position` [rename from `ordered`], etc.) + changesets. NO `Repo`.
- **Create `Easy.Offers` context (Ctx-first):** `list_offers(ctx, opts \\ [])` (clamp, `{:ok, %{count, offers}}` or bare list if small/ordered — judgment), `get_offer(ctx, id)`, `create_offer(ctx, attrs)`, `update_offer(ctx, id, attrs)`, `delete_offer(ctx, id)`. All scope by `ctx.business_id`. This is where `Repo` lives now.
- **`offer_controller.ex`:** remove `alias Easy.Repo` + all `Repo.*`; each action = `with {:ok, x} <- Offers.fn(ctx, ...)` → render; expected errors → FallbackController (no `case Repo.get`); `conn.assigns.ctx`; CastAndValidate on create/update/delete writes; ids from path.
- If offers are PUBLIC-readable (storefront display) via an unauthenticated path, keep that read in `Easy.Storefront` (slug-based, no ctx) — only the COACH CRUD moves to `Easy.Offers`.

- [ ] Steps: create context; strip Repo from schema (+`ordered`→`by_position`); rewrite controller (with/Fallback/ctx/CastAndValidate); tests; verify `grep -rn "Repo\." lib/easy/storefront/offer.ex lib/easy_web/controllers/coaches/offer_controller.ex` → empty, `grep -rn "case .*Repo\|\bordered\b" lib/easy_web/controllers/coaches/offer_controller.ex lib/easy/storefront/offer.ex` → empty; `mix precommit` green. Commit `refactor(storefront): extract Easy.Offers context; offer controller with/Fallback/ctx`.

### Task 19: Testimonials — extract `Easy.Testimonials` context

**Files:** create `lib/easy/testimonials.ex`; `lib/easy/storefront/testimonial.ex` (remove Repo — audit flagged ~168/174/182; keep pure builders + `by_position`); `lib/easy_web/controllers/coaches/testimonial_controller.ex`; tests.

**Changes:** same shape as Task 18 — `Easy.Testimonials` Ctx-first CRUD (`list_testimonials(ctx, opts)`, `get/create/update/delete_testimonial`), Repo OUT of schema, controller `with`→Fallback + ctx + CastAndValidate + path ids + no Repo.

- [ ] Steps mirror Task 18; verify `grep -rn "Repo\." lib/easy/storefront/testimonial.ex lib/easy_web/controllers/coaches/testimonial_controller.ex` → empty; `mix precommit` green. Commit `refactor(storefront): extract Easy.Testimonials context; testimonial controller with/Fallback/ctx`.

### Task 20: store_profile + public storefront

**Files:** `lib/easy/storefront/store_profile.ex` (Ecto.Enum `theme_color`; remove Repo — audit ~107/114/118/130; pure builders); `lib/easy/storefront.ex` (own the store_profile upsert + the public reads); `lib/easy_web/controllers/coaches/store_profile_controller.ex`; `lib/easy_web/controllers/public/storefront_controller.ex` (verify — inquiry already Ctx from Slice 4); tests.

**Changes:**
- `store_profile.ex`: `theme_color` `:string`+validate_inclusion → `Ecto.Enum`; move `Repo` out (pure builders + changeset).
- `Easy.Storefront`: add/keep Ctx-first `get_store_profile(ctx)` + `upsert_store_profile(ctx, attrs)` (owns Repo); public slug-based reads stay unauthenticated (documented exception, no ctx — like `create_inquiry`).
- `store_profile_controller.ex`: `show`/`update` → `with`→Fallback (drop the `case` upsert branching into `upsert_store_profile(ctx, attrs)`); `conn.assigns.ctx`; CastAndValidate on update; no Repo.
- `public/storefront_controller.ex`: verify it uses `Easy.Storefront` public reads, no Repo, `create_inquiry` already Ctx (Slice 4) + CastAndValidate on `create_inquiry`.

- [ ] Steps: enum + Repo-out of store_profile schema; storefront context upsert; controllers with/ctx/CastAndValidate; tests; verify `grep -rn "Repo\." lib/easy/storefront/store_profile.ex` → empty, `grep -rn "validate_inclusion" lib/easy/storefront/store_profile.ex` → empty; `mix precommit` green. Commit `refactor(storefront): store_profile Ecto.Enum + Repo-out + context upsert; controllers with/ctx`.

*Slice 5 gate: compile, full suite, `grep -rn "Repo\." lib/easy/storefront` → empty (no Repo in storefront schemas), `grep -rn "alias Easy.Repo\|Repo\." lib/easy_web/controllers/coaches/{offer,testimonial,store_profile}_controller.ex` → empty, `grep -rn "case .*Repo" lib/easy_web/controllers` (offer/testimonial) → empty; new `Easy.Offers`/`Easy.Testimonials` contexts exist + Ctx-first.*
