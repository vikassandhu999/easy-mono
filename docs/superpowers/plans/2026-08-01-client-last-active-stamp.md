# Client Last-Active Stamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the actual UTC time of each client's latest successful adherence action and make every coach-facing last-active read use that stored timestamp.

**Architecture:** Existing training, nutrition, forms, and weight contexts keep ownership of their writes. Each qualifying transaction executes one tenant-scoped monotonic update query built by `Easy.Clients.Client`; client lists and the coach UI then read the persisted `clients.last_active_at` field without aggregating activity tables.

**Tech Stack:** Elixir/Phoenix, Ecto/Postgres, ExUnit, OpenApiSpex, React/TypeScript, pnpm, Biome.

## Global Constraints

- Follow `backend/AGENTS.md`; every tenant-owned query includes `business_id`.
- Follow `docs/agents/recurring-mistakes.md`, especially RM-001 and RM-021.
- No historical backfill. Existing clients remain `NULL` until their next qualifying action.
- `last_active_at` is a nullable UTC datetime and never moves backward.
- Qualifying actions are client-authored workout completion, food-log create/edit/non-empty bulk log, check-in submission, and weight upsert.
- Reads, failures, deletes, coach actions, option switching, and idempotent replays do not stamp.
- Domain write and activity stamp commit or roll back together.
- Keep the JSON field name `last_active_at`; change only its format from `date` to `date-time`.
- Do not add an event table, event module, trigger, callback, queue, dependency, or `last_active_kind`.
- Do not touch or commit `.claude/skills/first-principles-edit/`.

---

### Task 1: Persist and read the client activity stamp

**Files:**
- Create: `backend/priv/repo/migrations/20260801020000_add_client_last_active_at.exs`
- Modify: `backend/lib/easy/clients/client.ex:37-39,334-383`
- Modify: `backend/lib/easy/clients.ex:105-140`
- Modify: `backend/lib/easy_web/open_api/schemas/client.ex:97-102`
- Modify: `backend/test/easy/clients/client_test.exs`
- Rewrite: `backend/test/easy/clients/last_active_test.exs`
- Modify: `backend/test/easy_web/controllers/coaches/client_controller_test.exs:169-205`
- Regenerate: `frontend/apps/coachapp-v2/src/api/schema.ts`
- Regenerate: `frontend/apps/clientapp-v2/src/api/schema.ts`
- Regenerate: `frontend/openapi/easy-openapi.json`
- Regenerate: `frontend/openapi/coach.openapi.json`
- Regenerate: `frontend/openapi/client.openapi.json`

**Interfaces:**
- Produces: `Client.last_active_stamp(query \\ Client, business_id, client_id, occurred_at) :: Ecto.Query.t()`.
- Produces: persisted `%Client{last_active_at: DateTime.t() | nil}`.
- Produces: deterministic `Client.by_last_active/1` over the persisted column.
- Preserves: `Clients.list_clients/2` response envelope and `last_active_at` JSON property name.

- [ ] **Step 1: Write the failing monotonicity and tenant-scope tests**

Add to `backend/test/easy/clients/client_test.exs`:

```elixir
describe "last_active_stamp/4" do
  test "stores the greatest timestamp without crossing businesses" do
    business = insert(:business)
    client = insert(:client, business: business)
    older = ~U[2026-08-01 08:00:00Z]
    newer = ~U[2026-08-01 09:00:00Z]

    assert {1, nil} =
             Client
             |> Client.last_active_stamp(business.id, client.id, newer)
             |> Repo.update_all([])

    assert {1, nil} =
             Client
             |> Client.last_active_stamp(business.id, client.id, older)
             |> Repo.update_all([])

    assert Repo.reload(client).last_active_at == newer

    other_business = insert(:business)

    assert {0, nil} =
             Client
             |> Client.last_active_stamp(other_business.id, client.id, DateTime.add(newer, 60))
             |> Repo.update_all([])

    assert Repo.reload(client).last_active_at == newer
  end
end
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `backend/`:

```bash
mix test test/easy/clients/client_test.exs
```

Expected: FAIL because `Client.last_active_stamp/4` does not exist.

- [ ] **Step 3: Add the forward-only prototype migration**

Create `20260801020000_add_client_last_active_at.exs` with explicit `up/0` and `down/0`:

```elixir
defmodule Easy.Repo.Migrations.AddClientLastActiveAt do
  use Ecto.Migration

  def up do
    alter table(:clients) do
      add :last_active_at, :utc_datetime
    end

    create index(
             :clients,
             [:business_id, desc_nulls_last: :last_active_at, desc: :inserted_at, desc: :id],
             name: :clients_last_active_at_index
           )

    drop index(:training_sessions, [:business_id, :client_id, :date],
           name: :training_sessions_last_activity_index
         )

    drop index(:nutrition_meal_logs, [:business_id, :client_id, :date],
           name: :nutrition_meal_logs_last_activity_index
         )
  end

  def down do
    create index(:nutrition_meal_logs, [:business_id, :client_id, :date],
             where: "logged_calories > 0",
             name: :nutrition_meal_logs_last_activity_index
           )

    create index(:training_sessions, [:business_id, :client_id, :date],
             where: "state = 'completed' AND date IS NOT NULL",
             name: :training_sessions_last_activity_index
           )

    drop index(
           :clients,
           [:business_id, desc_nulls_last: :last_active_at, desc: :inserted_at, desc: :id],
           name: :clients_last_active_at_index
         )

    alter table(:clients) do
      remove :last_active_at
    end
  end
end
```

Do not add an `UPDATE` backfill.

- [ ] **Step 4: Implement the persisted field and pure stamp query**

In `Client`:

```elixir
field :last_active_at, :utc_datetime

@spec last_active_stamp(Ecto.Queryable.t(), String.t(), String.t(), DateTime.t()) :: Ecto.Query.t()
def last_active_stamp(query \\ __MODULE__, business_id, client_id, occurred_at) do
  from(client in query,
    where: client.business_id == ^business_id and client.id == ^client_id,
    update: [
      set: [
        last_active_at:
          fragment(
            "GREATEST(COALESCE(?, ?), ?)",
            client.last_active_at,
            type(^occurred_at, :utc_datetime),
            type(^occurred_at, :utc_datetime)
          )
      ]
    ]
  )
end
```

Replace `by_last_active/1` with a direct total order and delete `join_last_active/2`, `last_activity_for_clients/2`, and private `last_activity/1`:

```elixir
@spec by_last_active(Ecto.Queryable.t()) :: Ecto.Query.t()
def by_last_active(query \\ __MODULE__) do
  from(client in query,
    order_by: [
      desc_nulls_last: client.last_active_at,
      desc: client.inserted_at,
      desc: client.id
    ]
  )
end
```

- [ ] **Step 5: Delete the runtime activity aggregation from `Clients.list_clients/2`**

Change the list pipeline to call `sort_clients(sort)` and remove `put_last_active_for_clients/3` entirely:

```elixir
clients:
  base
  |> sort_clients(sort)
  |> Easy.Utils.paginate(offset, limit)
  |> Client.include_preloads(ctx.business_id)
  |> Repo.all()
  |> put_attention_flags_for_clients(ctx.business_id)
  |> put_plan_names_for_clients(ctx.business_id, include_plans?)

defp sort_clients(query, :last_active), do: Client.by_last_active(query)
defp sort_clients(query, _newest), do: Client.newest(query)
```

- [ ] **Step 6: Rewrite last-active read and performance tests**

Replace fixture-derived activity tests in `last_active_test.exs` with persisted values. Cover:

```elixir
test "returns the persisted stamp without deriving it from activity rows" do
  business = insert(:business)
  coach = insert(:coach, business: business)
  stamp = ~U[2026-08-01 10:30:00Z]
  client = insert(:client, business: business, creator: coach, last_active_at: stamp)

  insert(:workout_session, business: business, client: client, state: :completed)
  insert(:meal_log, business: business, client: client, logged_calories: 500.0)

  assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business))
  assert listed.last_active_at == stamp
end
```

Keep the existing newest/stale/never sort scenario, but set `last_active_at` directly. Add an equal-stamp test with identical `inserted_at` values and explicit UUIDs; assert UUID-descending order so RM-001 remains enforced.

Add Repo telemetry around `Clients.list_clients/2` and assert no captured SQL contains any of:

```elixir
["training_sessions", "nutrition_meal_logs", "form_submissions", "weight_entries"]
```

Use a local `capture_queries/1` helper that attaches to `[:easy, :repo, :query]`, detaches in `after`, and drains `metadata.query` messages after the call.

- [ ] **Step 7: Update and test the OpenAPI contract**

Change `last_active_at` to:

```elixir
last_active_at: %Schema{
  type: :string,
  format: :"date-time",
  nullable: true,
  description:
    "UTC time of the client's latest workout completion, food log, check-in submission, or weight entry"
}
```

In the existing coach `GET /v1/coach/clients/:id` controller test, insert a client with `last_active_at: ~U[2026-08-01 10:30:00Z]`, keep `assert_schema/3`, and assert:

```elixir
assert data["last_active_at"] == "2026-08-01T10:30:00Z"
```

- [ ] **Step 8: Apply, roll back, and reapply the migration**

Run from `backend/`:

```bash
mix ecto.migrate
mix ecto.rollback --step 1
mix ecto.migrate
MIX_ENV=test mix ecto.migrate
```

Expected: all four commands succeed; migration output contains no backfill statement.

- [ ] **Step 9: Regenerate API schemas and run focused verification**

Run from the repository root:

```bash
just gen-api
cd backend
mix test test/easy/clients/client_test.exs test/easy/clients/last_active_test.exs test/easy_web/controllers/coaches/client_controller_test.exs
mix format --check-formatted lib/easy/clients/client.ex lib/easy/clients.ex lib/easy_web/open_api/schemas/client.ex test/easy/clients/client_test.exs test/easy/clients/last_active_test.exs test/easy_web/controllers/coaches/client_controller_test.exs priv/repo/migrations/20260801020000_add_client_last_active_at.exs
```

Expected: all focused tests pass and both generated TypeScript schemas describe `last_active_at` as `Format: date-time`.

- [ ] **Step 10: Commit the persisted read model**

```bash
git add backend/priv/repo/migrations/20260801020000_add_client_last_active_at.exs \
  backend/lib/easy/clients/client.ex backend/lib/easy/clients.ex \
  backend/lib/easy_web/open_api/schemas/client.ex \
  backend/test/easy/clients/client_test.exs backend/test/easy/clients/last_active_test.exs \
  backend/test/easy_web/controllers/coaches/client_controller_test.exs \
  docs/superpowers/plans/2026-08-01-client-last-active-stamp.md \
  frontend/openapi/easy-openapi.json frontend/openapi/coach.openapi.json frontend/openapi/client.openapi.json \
  frontend/apps/coachapp-v2/src/api/schema.ts frontend/apps/clientapp-v2/src/api/schema.ts
git commit -m "feat(clients): persist last active stamp"
```

---

### Task 2: Stamp workout completion

**Files:**
- Modify: `backend/lib/easy/sessions.ex:69-79,192-199`
- Modify: `backend/test/easy/sessions_test.exs`

**Interfaces:**
- Consumes: `Client.last_active_stamp/4` from Task 1.
- Preserves: `Sessions.update_client_session/3` return values and completed-session response shape.
- Produces: workout completion and client activity stamp in one transaction.

- [ ] **Step 1: Write failing completion and replay tests**

Add a context test that completes an active session and asserts:

```elixir
assert {:ok, completed} =
         Sessions.update_client_session(client_ctx, session.id, %{
           state: "completed",
           soreness_rating: 4,
           notes: "Great"
         })

assert completed.state == :completed
assert Repo.reload(client).last_active_at == completed.ended_at
```

Capture SQL around a second `state: "completed"` update and assert it can still edit `notes` but emits no `UPDATE "clients"` statement. Add a discard test that also emits no client update. Use a local telemetry helper rather than sleeping for timestamp precision.

- [ ] **Step 2: Run the focused test and verify it fails**

```bash
cd backend
mix test test/easy/sessions_test.exs
```

Expected: FAIL because completion does not update `clients.last_active_at`.

- [ ] **Step 3: Make only the active-to-completed transition transactional**

Branch on the loaded state before completion:

```elixir
case to_string(attrs[:state] || "") do
  "completed" when session.state == :completed -> update_client_workout_session(session, attrs)
  "completed" -> complete_workout_session(session, attrs)
  "discarded" -> discard_workout_session(session)
  _ -> update_client_workout_session(session, attrs)
end
```

Implement completion with one timestamp and preload only after the transaction:

```elixir
defp complete_workout_session(%TrainingSession{} = session, attrs) do
  occurred_at = DateTime.utc_now(:second)
  attrs = Map.merge(attrs, %{ended_at: occurred_at, state: :completed})

  Repo.transaction(fn ->
    with {:ok, updated} <- session |> TrainingSession.update_changeset(attrs) |> Repo.update(),
         :ok <- stamp_client_activity(session.business_id, session.client_id, occurred_at) do
      updated
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end)
  |> preload_session()
end
```

Add a private `stamp_client_activity/3` that executes `Client.last_active_stamp/4`, returns `:ok` for one updated row, and `{:error, :not_found}` for zero rows.

- [ ] **Step 4: Run focused verification**

```bash
cd backend
mix test test/easy/sessions_test.exs test/easy_web/controllers/clients/workout_session_controller_test.exs
mix format --check-formatted lib/easy/sessions.ex test/easy/sessions_test.exs
```

Expected: completion and replay tests pass; controller contract remains green.

- [ ] **Step 5: Commit workout stamping**

```bash
git add backend/lib/easy/sessions.ex backend/test/easy/sessions_test.exs
git commit -m "feat(training): stamp client workout activity"
```

---

### Task 3: Stamp nutrition logging without restoring N+1 behavior

**Files:**
- Modify: `backend/lib/easy/meal_logs.ex:72-119,249-325,648-688`
- Modify: `backend/test/easy/nutrition/meal_log_test.exs`

**Interfaces:**
- Consumes: `Client.last_active_stamp/4` from Task 1.
- Preserves: all MealLogs public return values and the set-based `log_client_day` flow.
- Produces: one client update per non-empty qualifying nutrition request, independent of entity count.

- [ ] **Step 1: Write failing create, edit, replay, delete, and bulk tests**

Extend the existing nutrition tests to assert:

- `create_client_food_log_entry/2` leaves the client with a non-null stamp;
- `update_client_food_log_entry/3` advances a deliberately old stamp;
- deleting the entry preserves the prior stamp;
- an invalid create leaves a nil stamp;
- first `log_client_meal/2` stamps, while its empty replay emits no `UPDATE "clients"`;
- first `log_client_day/2` stamps, while its existing empty replay emits no client update;
- `switch_client_meal_option/2` emits no client update.

Capture SQL with Repo telemetry for replay assertions; do not use `Process.sleep/1`.

Update the set-based query budgets for the one deliberate client update:

```elixir
assert two_slot_queries == one_slot_queries
assert two_slot_queries in 8..9
assert recipe_queries in 9..10
```

- [ ] **Step 2: Run the focused test and verify the new assertions fail**

```bash
cd backend
mix test test/easy/nutrition/meal_log_test.exs
```

Expected: stamp assertions fail and old query-budget ranges fail once stamping is introduced.

- [ ] **Step 3: Stamp entry creation and edits inside their existing transactions**

Pass `client.id` into the update transaction. Compute one `occurred_at = DateTime.utc_now(:second)` inside each create/edit transaction and extend the `with` chain:

```elixir
with {:ok, entry} <- create_food_log_entry(...),
     {:ok, _meal_log} <- recalculate_logged_calories(meal_log),
     :ok <- stamp_client_activity(business_id, client_id, occurred_at) do
  entry
else
  {:error, reason} -> Repo.rollback(reason)
end
```

Apply the same shape to `update_entry_transaction/4`. Leave `delete_entry_transaction/2` unchanged.

- [ ] **Step 4: Stamp only non-empty meal and day bulk logs**

Wrap `do_log_meal/5` without changing it:

```elixir
defp log_meal(business_id, client_id, date, meal_slot, meal_id) do
  Repo.transaction(fn ->
    occurred_at = DateTime.utc_now(:second)
    entries = do_log_meal(business_id, client_id, date, meal_slot, meal_id)
    stamp_new_entries(entries, business_id, client_id, occurred_at)
    entries
  end)
end
```

In `log_day/4`, reuse its existing `now` value and call `stamp_new_entries/4` after `recalculate_day_calories/2`.

Implement:

```elixir
defp stamp_new_entries([], _business_id, _client_id, _occurred_at), do: :ok

defp stamp_new_entries(_entries, business_id, client_id, occurred_at) do
  case stamp_client_activity(business_id, client_id, occurred_at) do
    :ok -> :ok
    {:error, reason} -> Repo.rollback(reason)
  end
end
```

Add the same local `stamp_client_activity/3` result handling used by Sessions. Do not add a per-entry update.

- [ ] **Step 5: Run focused verification and confirm query growth stays flat**

```bash
cd backend
mix test test/easy/nutrition/meal_log_test.exs test/easy/nutrition/food_log_entry_test.exs
mix format --check-formatted lib/easy/meal_logs.ex test/easy/nutrition/meal_log_test.exs
```

Expected: all tests pass; food-only log-day is 8-9 roundtrips, recipe log-day is 9-10, and adding slots does not add queries.

- [ ] **Step 6: Commit nutrition stamping**

```bash
git add backend/lib/easy/meal_logs.ex backend/test/easy/nutrition/meal_log_test.exs
git commit -m "feat(nutrition): stamp client logging activity"
```

---

### Task 4: Stamp successful check-in submission

**Files:**
- Modify: `backend/lib/easy/forms.ex:329-349`
- Modify: `backend/test/easy/forms_test.exs:220-370`

**Interfaces:**
- Consumes: `Client.last_active_stamp/4` from Task 1.
- Preserves: `Forms.submit_client_form_assignment/3` response and its existing transaction.
- Produces: one stamp using the submission's `submitted_at` timestamp.

- [ ] **Step 1: Write failing success and failure tests**

In a successful submission test, assert:

```elixir
assert Repo.reload(client).last_active_at == submission.submitted_at
```

In an existing invalid-answer submission test, assert the reloaded client's stamp remains `nil`. Capture SQL around the successful weight-bearing submission and assert exactly one query starts with `UPDATE "clients"`; generated weight rows must not stamp separately.

- [ ] **Step 2: Run the focused tests and verify they fail**

```bash
cd backend
mix test test/easy/forms_test.exs
```

Expected: the successful submission leaves `last_active_at` nil.

- [ ] **Step 3: Stamp at the end of the existing submission transaction**

Keep the already-created `submitted_at` value and stamp after every submission side effect succeeds:

```elixir
submission = insert_submission!(ctx.business_id, client.id, assignment.id, attrs)
append_weight_entries!(ctx.business_id, client, template.sections, answers, submission)
submission = complete_assignment!(assignment, submission)
stamp_client_activity!(ctx.business_id, client.id, submitted_at)
submission
```

Add a private `stamp_client_activity!/3` that calls the schema query, returns `:ok` for one row, and calls `Repo.rollback(:not_found)` for zero rows. Do not call it from `insert_submission_weight!/6`.

- [ ] **Step 4: Run focused verification**

```bash
cd backend
mix test test/easy/forms_test.exs test/easy_web/controllers/clients/form_assignment_controller_test.exs
mix format --check-formatted lib/easy/forms.ex test/easy/forms_test.exs
```

Expected: submissions stamp once; invalid submissions remain unstamped; controller behavior is unchanged.

- [ ] **Step 5: Commit check-in stamping**

```bash
git add backend/lib/easy/forms.ex backend/test/easy/forms_test.exs
git commit -m "feat(check-ins): stamp client submission activity"
```

---

### Task 5: Stamp explicit weight upserts

**Files:**
- Modify: `backend/lib/easy/weight_entries.ex:25-32,84-95`
- Modify: `backend/test/easy/fitness/weight_entry_test.exs:185-285`

**Interfaces:**
- Consumes: `Client.last_active_stamp/4` from Task 1.
- Preserves: `WeightEntries.upsert_client_weight_entry/2` validation and return values.
- Produces: weight insert-or-edit and client stamp in one transaction.

- [ ] **Step 1: Write failing insert, edit, failure, and delete assertions**

Extend existing tests:

```elixir
assert Repo.reload(client).last_active_at
```

For the edit test, set `last_active_at` to `~U[2026-01-01 00:00:00Z]` before the call and assert the stamp advances. For invalid date/future date tests, assert it remains nil. For delete, set a known stamp and assert deletion does not change it.

- [ ] **Step 2: Run the focused tests and verify they fail**

```bash
cd backend
mix test test/easy/fitness/weight_entry_test.exs
```

Expected: successful upserts do not stamp.

- [ ] **Step 3: Validate before opening the transaction**

Move date parsing and future-date validation to the public function, then call a transaction only for valid writes:

```elixir
def upsert_client_weight_entry(%Ctx{} = ctx, attrs) do
  with {:ok, client} <- get_client(ctx),
       {:ok, date} <- parse_date(attrs[:date]),
       :ok <- ensure_not_future(date) do
    upsert_and_stamp(ctx.business_id, client.id, date, attrs)
  end
end
```

- [ ] **Step 4: Make upsert and stamp atomic**

```elixir
defp upsert_and_stamp(business_id, client_id, date, attrs) do
  Repo.transaction(fn ->
    occurred_at = DateTime.utc_now(:second)

    with {:ok, entry} <- upsert(business_id, client_id, date, attrs),
         :ok <- stamp_client_activity(business_id, client_id, occurred_at) do
      entry
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end)
end
```

Change private `upsert/4` to accept the already-validated `date` and keep its existing insert/concurrent-update behavior. Add the same local `stamp_client_activity/3` result handling as Sessions. Leave deletion untouched.

- [ ] **Step 5: Run focused verification**

```bash
cd backend
mix test test/easy/fitness/weight_entry_test.exs test/easy/weight_entries_test.exs test/easy_web/controllers/clients/weight_entry_controller_test.exs
mix format --check-formatted lib/easy/weight_entries.ex test/easy/fitness/weight_entry_test.exs
```

Expected: inserts and edits stamp; invalid writes and deletes do not.

- [ ] **Step 6: Commit weight stamping**

```bash
git add backend/lib/easy/weight_entries.ex backend/test/easy/fitness/weight_entry_test.exs
git commit -m "feat(weight): stamp client weight activity"
```

---

### Task 6: Make both coach UI consumers use the stored timestamp

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/clients/components/client-stat-strip.tsx:1-20,68-79,124-128`
- Modify: `frontend/apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx:44-47`
- Modify: `frontend/apps/coachapp-v2/src/api/clients.ts:38-43`

**Interfaces:**
- Consumes: generated `Client.last_active_at: string | null` from Task 1.
- Preserves: `ClientStatStrip({client, weeklyTarget})` props and all four stat cells.
- Produces: one consistent stored last-active value in the client list and detail strip.

- [ ] **Step 1: Run a frontend baseline check**

```bash
cd frontend
pnpm -C apps/coachapp-v2 exec tsc --noEmit -p tsconfig.app.json
```

Expected: PASS before the presentation-only edit.

- [ ] **Step 2: Delete the detail-strip derivation**

Import `formatTimeAgo` from `@easy/utils`, remove `relativeDay` from the client-detail-data import, and delete `newest`, `lastSession`, `lastMeal`, `lastActive`, and `lastActiveKind`.

Render the stored value directly:

```tsx
<StatCell
  label="Last active"
  value={client.last_active_at ? formatTimeAgo(client.last_active_at) : 'Never'}
/>
```

Do not add a kind/source note. Keep the workout, meal, and weight queries because the other three stat cells still use them.

- [ ] **Step 3: Correct stale comments**

Update comments in `client-list-item.tsx` and `api/clients.ts` to say the value is the latest successful workout completion, food log, check-in submission, or weight upsert. Remove all statements that call it a day or restrict it to meals/workouts.

- [ ] **Step 4: Run frontend checks**

```bash
cd frontend
pnpm exec biome check apps/coachapp-v2/src/clients/components/client-stat-strip.tsx \
  apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx \
  apps/coachapp-v2/src/api/clients.ts
pnpm -C apps/coachapp-v2 exec tsc --noEmit -p tsconfig.app.json
```

Expected: Biome and TypeScript pass; no unused `relativeDay` or local last-active derivation remains.

- [ ] **Step 5: Commit coach UI convergence**

```bash
git add frontend/apps/coachapp-v2/src/clients/components/client-stat-strip.tsx \
  frontend/apps/coachapp-v2/src/clients/clients-list/client-list-item.tsx \
  frontend/apps/coachapp-v2/src/api/clients.ts
git commit -m "refactor(coachapp): read stored client activity"
```

---

### Task 7: Full verification and handoff

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Verifies every interface and acceptance criterion from the design spec.
- Produces: evidence that backend, generated contract, frontend, migration, and live coach UI agree.

- [ ] **Step 1: Run the complete backend gate**

```bash
cd backend
mix precommit
```

Expected: formatting, warnings-as-errors compilation, Credo, and the full ExUnit suite pass.

- [ ] **Step 2: Regenerate and verify the frontend contract**

From the repository root:

```bash
just gen-api
git diff --exit-code -- frontend/openapi frontend/apps/coachapp-v2/src/api/schema.ts frontend/apps/clientapp-v2/src/api/schema.ts
```

Expected: regeneration produces no uncommitted diff.

- [ ] **Step 3: Run frontend and recurring-mistake gates**

```bash
cd frontend
pnpm exec biome check apps/coachapp-v2/src apps/clientapp-v2/src
pnpm -C apps/coachapp-v2 exec tsc --noEmit -p tsconfig.app.json
pnpm -C apps/clientapp-v2 exec tsc --noEmit -p tsconfig.app.json

cd ..
just check-rm
git diff --check
```

Expected: every command passes. Add no recurring-mistake entry unless implementation reveals a genuinely repeatable new violation class.

Confirm the stamp query has no accidental coach or read-path callers:

```bash
rg -n "last_active_stamp" backend/lib/easy
```

Expected references: the `Client` schema plus the qualifying client write paths in `sessions.ex`, `meal_logs.ex`, `forms.ex`, and `weight_entries.ex` only.

- [ ] **Step 4: Verify the live coach flow using the existing AXI session**

Follow the repository browser rules:

```bash
chrome-devtools-axi pages
```

Reuse the authenticated CoachEasy tab. After performing one qualifying client action against local development data, verify from a fresh accessibility snapshot that:

- the client-list row shows a relative last-active time;
- the same client's detail stat strip shows the same stored time;
- the detail strip has no `meal log` / `workout` source note;
- refreshing the page preserves the value.

Do not clear browser storage or open a duplicate authenticated tab.

- [ ] **Step 5: Inspect final history and worktree**

```bash
git status --short
git log --oneline -8
git diff --check
```

Expected: only `.claude/skills/first-principles-edit/` remains untracked; the six implementation commits are present; no unstaged implementation changes remain.
