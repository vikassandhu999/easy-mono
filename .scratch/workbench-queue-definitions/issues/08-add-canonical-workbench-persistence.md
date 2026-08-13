# Add canonical workbench persistence

Type: task
Status: claimed
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
