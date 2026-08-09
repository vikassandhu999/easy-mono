# Client Last-Active Stamp Design

## Goal

Give coaches a cheap, trustworthy signal for whether clients are completing their core adherence work or may be ghosting. Client lists must read and sort a stored timestamp without aggregating activity tables at request time.

## Product meaning

`last_active_at` is the UTC time when a client most recently completed a successful adherence action. It is not:

- the scheduled date attached to a workout, meal, or weight record;
- the time a coach edited the client;
- a login, page view, chat message, or generic application heartbeat;
- a value recomputed from records that still exist.

The stamp is historical and monotonic. Editing or deleting an underlying record cannot move it backward. This is intentional: the client still performed the action, which is the fact relevant to ghosting.

## Qualifying actions

The following client-authored actions stamp activity:

| Domain | Qualifying action |
|---|---|
| Training | A session transitions into `completed` |
| Nutrition | A food-log entry is created or edited |
| Nutrition | `log_client_meal` or `log_client_day` inserts at least one new entry |
| Forms | A client form/check-in submission completes successfully |
| Weight | A client weight upsert succeeds, whether it inserts or edits the daily record |

The following do not stamp activity:

- reads;
- failed or rolled-back writes;
- deletes;
- coach-authored actions;
- starting, editing, or discarding a workout;
- replaying an already-completed workout;
- switching a planned meal option;
- repeating an already-logged meal or day when no entry is inserted;
- a weight row created internally from a check-in, because the enclosing submission stamps once.

## Architecture

`clients.last_active_at` is the single runtime source of truth.

```text
client adherence command
    -> perform the domain write
    -> stamp clients.last_active_at
    -> commit both atomically

client list
    -> read and sort clients.last_active_at
```

The implementation is synchronous. The word "event" is only a domain metaphor: no event module, event table, trigger, callback, queue, background job, or asynchronous consumer is introduced.

The existing domain contexts continue to own their writes. The `Client` schema owns one pure Ecto update-query builder that:

- scopes by both `business_id` and `client_id`;
- updates one client row;
- sets `last_active_at` to the greater of the stored timestamp and the supplied timestamp.

Each owning context executes that query through `Repo` inside the same transaction as the qualifying domain write. There is no client reread and no cross-context activity service.

## Data model and query interface

`Easy.Clients.Client` changes `last_active_at` from a virtual `:date` field to a persisted nullable `:utc_datetime` field.

The schema exposes a pure query builder with this interface:

```elixir
@spec last_active_stamp(
        Ecto.Queryable.t(),
        Ecto.UUID.t(),
        Ecto.UUID.t(),
        DateTime.t()
      ) :: Ecto.Query.t()
def last_active_stamp(query \\ __MODULE__, business_id, client_id, occurred_at)
```

Its SQL behavior is equivalent to:

```sql
UPDATE clients
SET last_active_at = GREATEST(
  COALESCE(last_active_at, $occurred_at),
  $occurred_at
)
WHERE business_id = $business_id
  AND id = $client_id;
```

The update must affect exactly one row. Zero affected rows is `:not_found` and rolls back the surrounding transaction. Postgres row locking plus `GREATEST` makes concurrent stamps monotonic without an application read.

## Write flows

### Workout completion

`Easy.Sessions.update_client_session/3` stamps only when the loaded session is not already completed and the requested transition to `completed` succeeds. It uses one `DateTime.utc_now(:second)` value for both `ended_at` and `last_active_at`. Completion and stamping run in one transaction.

### Nutrition logging

The existing nutrition transactions stamp after the log write and calorie recalculation succeed:

- `create_client_food_log_entry/2`: stamp after entry creation;
- `update_client_food_log_entry/3`: stamp after entry update;
- `log_client_meal/2`: stamp only when the returned new-entry list is non-empty;
- `log_client_day/2`: stamp only when the returned new-entry list is non-empty.

Deleting an entry and switching a planned meal option do not stamp.

### Check-in submission

`Easy.Forms.submit_client_form_assignment/3` already owns a transaction. After the submission, generated weight rows, and assignment completion succeed, it stamps with the existing `submitted_at` value. A generated weight row does not cause another stamp.

### Weight upsert

`Easy.WeightEntries.upsert_client_weight_entry/2` wraps the insert-or-update and stamp in one transaction. A successful explicit client upsert stamps even when it edits an existing record for that date. Deletion does not stamp.

## Migration

Add one forward migration. Do not backfill existing activity.

The migration:

1. adds nullable `clients.last_active_at :utc_datetime`;
2. creates an index supporting tenant-scoped last-active ordering:

   ```sql
   (business_id, last_active_at DESC NULLS LAST, inserted_at DESC, id DESC)
   ```

3. drops `training_sessions_last_activity_index`;
4. drops `nutrition_meal_logs_last_activity_index`.

Existing clients start with `NULL` and receive a stamp after their next qualifying action. The down migration recreates the two old partial indexes, drops the client ordering index, and removes the column.

## Read path

`Easy.Clients.list_clients/2` reads `last_active_at` directly from each client row for every sort mode.

For `sort: :last_active`, `Client.by_last_active/1` orders by:

```text
last_active_at DESC NULLS LAST
inserted_at DESC
id DESC
```

The last two fields are the deterministic tie-break required by RM-001.

Delete the old derived-data path:

- `Client.join_last_active/2`;
- private `Client.last_activity/1`;
- `Client.last_activity_for_clients/2`;
- `Clients.put_last_active_for_clients/3`;
- their UNION, GROUP BY, and activity-table reads.

Default client lists therefore lose the page-decoration query. Last-active sorting becomes a direct indexed client query. Runtime query count and query shape do not depend on the number of sessions, meal logs, submissions, or weights.

## API and frontend contract

Keep the JSON property name `last_active_at` and its nullable behavior. Change its OpenAPI format from `date` to `date-time` and update the description to name the four qualifying adherence categories.

Regenerate the API schemas for both frontend applications. The TypeScript representation remains `string | null`; coachapp's existing relative-time formatter now receives a real timestamp instead of a date-only string.

Both coach-facing consumers use the stored field:

- the client-list status cell continues to format `client.last_active_at`;
- `ClientStatStrip` stops deriving activity from seven-day workout and meal windows and formats `client.last_active_at` directly.

The detail card removes its `meal log` / `workout` source note. We deliberately do not add `last_active_kind`: the coach's ghosting signal needs the time, and storing another denormalized field has no current product use. Other stat-strip cells keep their existing workout, meal, and weight queries. No UI interaction or response-envelope change is required.

## Failure behavior

- A domain failure does not stamp.
- A stamp failure rolls back the domain write.
- A missing or cross-tenant client affects zero rows and becomes `{:error, :not_found}`.
- Concurrent stamps cannot regress the stored value.
- Replayed idempotent operations do not refresh the stamp unless they perform a qualifying edit or insert.

## Test design

### Stored value and sorting

- Client JSON returns the persisted timestamp.
- Last-active sort puts the newest stamp first and `NULL` last.
- Equal timestamps fall back to `inserted_at`, then `id`.
- Default listing returns the stored stamp without a decoration query.
- The client-list row and client-detail stat strip both render the stored timestamp.
- The client-detail stat strip does not derive last activity or display a source-kind note.

### Stamp invariant

- A newer timestamp replaces an older timestamp.
- Applying an older timestamp after a newer one leaves the newer value unchanged.
- A cross-business client id cannot be updated.

### Qualifying context actions

- Completing an active workout stamps using the completion timestamp.
- Replaying completion does not refresh the stamp.
- Creating and editing food logs stamp.
- Non-empty meal/day bulk logging stamps; an empty idempotent replay does not.
- A successful client check-in stamps once.
- A successful explicit weight upsert stamps on insert and edit.

### Negative behavior

- Failed actions leave the stamp unchanged.
- Deletes leave the stamp unchanged.
- Meal-option switching leaves the stamp unchanged.
- Coach-only operations leave the stamp unchanged.

### Performance regression

Capture client-list SQL through Repo telemetry and assert it does not reference `training_sessions`, `nutrition_meal_logs`, `form_submissions`, or `weight_entries`. Query-count-only coverage is insufficient because the old whole-business aggregate was also one query.

## Verification

Run:

```bash
cd backend
mix test test/easy/clients/last_active_test.exs
mix test test/easy/sessions_test.exs test/easy/nutrition/meal_log_test.exs test/easy/forms_test.exs test/easy/fitness/weight_entry_test.exs
mix precommit

cd ..
just gen-api

cd frontend
pnpm exec biome check apps/coachapp-v2/src apps/clientapp-v2/src
pnpm -C apps/coachapp-v2 exec tsc --noEmit -p tsconfig.app.json
pnpm -C apps/clientapp-v2 exec tsc --noEmit -p tsconfig.app.json

cd ..
git diff --check
```

## Acceptance criteria

- Coaches see the actual time of the client's latest qualifying adherence action.
- The stamp never moves backward.
- Only successful client-authored workout, nutrition, check-in, and weight actions advance it.
- Reads and sorts use only the stored client column.
- No runtime last-active query reads or aggregates activity tables.
- Existing response shape and UI controls remain unchanged.
- Existing clients remain `NULL` until their next qualifying action; no historical backfill is performed.
