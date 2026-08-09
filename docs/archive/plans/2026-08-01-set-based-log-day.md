# Set-Based Log Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `MealLogs.log_client_day/2` use flat, set-based DB work while preserving pins, snapshots, atomicity, response shape, and repeat-call idempotence.

**Architecture:** Keep public interface in `Easy.MealLogs`. One transaction loads authorized slot choices and selected meal nutrition data in bounded joined queries, computes snapshot/entry rows in Elixir, then performs three bulk writes. Partial unique index makes planned-item fulfillment race-safe.

**Tech Stack:** Elixir, Ecto, PostgreSQL, ExUnit, Repo telemetry.

## Global Constraints

- Preserve staged audit-fix work; do not stage or commit unrelated files.
- Keep `log_client_meal/2` request-sized path intact except duplicate-conflict handling required by new DB invariant.
- Keep `201 %{data: [...]}` contract; repeated bulk logging returns only newly inserted entries.
- Scope every query by `business_id`; authorize requested plan for client once.
- No new dependency or public module.

---

### Task 1: Lock behavior and query budget

**Files:**
- Modify: `backend/test/easy/nutrition/meal_log_test.exs`
- Modify: `backend/test/easy/nutrition/food_log_entry_test.exs`

**Interfaces:**
- Consumes: `MealLogs.log_client_day/2`, `FoodLogEntry.insert_changeset/3`
- Produces: regression coverage for pins, repeat calls, flat query count, and unique planned-item fulfillment

- [ ] Add test proving repeat `log_client_day/2` returns `[]` and leaves one entry per planned item.
- [ ] Add telemetry test comparing one-slot and multi-slot calls; query count must not grow per slot and must stay within nine wire roundtrips after client resolution is excluded.
- [ ] Add schema test inserting same non-null `(nutrition_meal_log_id, nutrition_meal_item_id)` twice and expecting changeset error.
- [ ] Run focused tests; confirm failures come from loop-shaped query flow and missing uniqueness.

### Task 2: Add DB idempotence invariant

**Files:**
- Create: `backend/priv/repo/migrations/20260801010000_unique_planned_food_log_entries.exs`
- Modify: `backend/lib/easy/nutrition/food_log_entry.ex`

**Interfaces:**
- Consumes: existing `nutrition_meal_item_id` nullable FK
- Produces: named partial unique index and changeset mapping for duplicate planned-item fulfillment

- [ ] Create partial unique index on `[:nutrition_meal_log_id, :nutrition_meal_item_id]` where item id is non-null.
- [ ] Add matching `unique_constraint/3` to `insert_changeset/3`.
- [ ] Migrate test DB and run uniqueness test; confirm pass.

### Task 3: Replace per-slot loop with batch flow

**Files:**
- Modify: `backend/lib/easy/meal_logs.ex`
- Modify only if query ownership requires it: `backend/lib/easy/nutrition/meal.ex`, `backend/lib/easy/nutrition/day_meal.ex`

**Interfaces:**
- Consumes: `log_client_day/2`, `MacroCalc.for_meal_item/1`, plan/meal schema query builders
- Produces: unchanged `{:ok, [FoodLogEntry.t()]}` with newly inserted rows only

- [ ] Replace `slot_meals -> log_slot_meals -> do_log_meal` day path with one transaction.
- [ ] Load authorized plan-day options plus existing pins in one query; choose pin before position-zero default.
- [ ] Load chosen meals/items/direct foods/recipe metadata in one joined query and recipe ingredients/foods in one optional joined query.
- [ ] Build meal-log rows, snapshots, and entry rows in Elixir using existing macro rules.
- [ ] Bulk upsert meal logs, preserving non-null existing pins/snapshots and returning real IDs.
- [ ] Bulk insert entries with `on_conflict: :nothing`, returning newly inserted entries.
- [ ] Recalculate all affected `logged_calories` in one scoped `UPDATE`.
- [ ] Run focused tests; confirm behavior and query-budget tests pass.

### Task 4: Verify full backend

**Files:**
- Inspect: `docs/agents/recurring-mistakes.md`

**Interfaces:**
- Consumes: completed implementation
- Produces: fresh verification evidence

- [ ] Run `mix test test/easy/nutrition/meal_log_test.exs test/easy/nutrition/food_log_entry_test.exs`.
- [ ] Run `mix precommit`.
- [ ] Run `git diff --check` and inspect staged vs unstaged diff separation.
- [ ] Report exact telemetry roundtrip count and any remaining ceiling.
