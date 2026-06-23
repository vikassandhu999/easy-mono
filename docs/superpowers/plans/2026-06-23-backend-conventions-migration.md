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
- **attrs (§A10):** always string-keyed (CastAndValidate); delete `Map.get("x") || Map.get(:x)` dual-key probes. **Error reasons** are bare atoms or `Ecto.Changeset.t()` (or the existing `%Easy.Error{}` wrapper) — not ad-hoc tagged tuples.
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
