# Add canonical workbench persistence

Type: task
Status: resolved
Blocked by: 07
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Add the canonical stored facts and supporting indexes required by the accepted workbench cutover.

## Locked scope

* Add nullable UTC microsecond `clients.joined_at`, non-null `clients.required_services` with default `[]`, and nullable UTC microsecond `conversations.waiting_since`.
* Permit only `[]`, `[training]`, `[nutrition]`, and `[training, nutrition]`; reject duplicates, unknown values, and the reverse two-service order at the database boundary.
* Do not backfill existing clients or conversations.
* Add the partial indexes from [Define the coordinated schema and API cutover](./06-define-coordinated-schema-api-cutover.md): waiting conversations, assigned active Training coverage, assigned active Nutrition coverage, and the business-leading active Expiring index. Retain the `(business_id, assigned_coach_id)` client index.
* Replace the non-business-leading Expiring index rather than keeping both versions.

## Edit surface

* `backend/priv/repo/migrations/`
* `backend/lib/easy/clients/client.ex`
* `backend/lib/easy/chat/conversation.ex`
* The Training and Nutrition plan schemas only where an index or enum name needs a matching source constant.

## Acceptance

* The migration has a working `down/0` path and does not rewrite existing rows.
* Ecto types preserve microsecond timestamps and canonical service order.
* Database constraints reject every invalid required-services representation.
* Schema and migration tests prove defaults, nullability, constraints, index names, predicates, and column order.

## Verification

Run the focused schema and migration tests, then `mix precommit` from `backend/`.

## Answer

Added one reversible migration, `20260813100000_add_canonical_workbench_persistence.exs`, with no data-update statement or compatibility layer.

The stored facts are:

* Nullable microsecond `clients.joined_at`.
* Non-null `clients.required_services` with database and Ecto defaults of `[]`. `Easy.Clients.Client` represents values as the closed atom list `:training | :nutrition`.
* Nullable microsecond `conversations.waiting_since`.

The `clients_required_services_check` constraint permits only `[]`, `[training]`, `[nutrition]`, and `[training, nutrition]`. Database tests reject reversed order, duplicates, unknown services, and null.

The migration adds these partial indexes:

* `conversations_waiting_since_index` on `(business_id, waiting_since, id)`.
* `training_plans_active_client_coverage_index` on `(business_id, client_id, start_date, end_date)` for assigned active Training plans.
* `nutrition_plans_active_client_coverage_index` on `(business_id, client_id, start_date, end_date)` for assigned active Nutrition plans.
* A replacement `clients_active_subscription_ends_on_index` on `(business_id, subscription_ends_on, id)` for active clients with an end date.

The existing `clients_business_id_assigned_coach_id_index` remains in place. The migration's down path removes the added objects and restores the prior non-business-leading Expiring index.

Verification completed:

* Focused persistence suite: 10 tests, 0 failures.
* Completed migration rollback and reapply both succeeded against the test database.
* Backend `mix precommit`: 1,111 tests, 0 failures. Credo reported the pre-existing advisory for `Easy.Clients.attention_facts/2`, which a later replacement ticket removes.
