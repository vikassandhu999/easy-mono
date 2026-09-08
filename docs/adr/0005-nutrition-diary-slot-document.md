# Diary slots own complete documents

A Diary save replaces the actual intake of each supplied slot under one revision.
Frozen choices and entries have no independent lifecycle. Store them together in
`DiarySlot.document` as ordered `options`, selected `meal_id`, and ordered `entries`.
Keep client/date/slot identity, timezone, coverage, and revision as slot columns;
DiaryDay owns the targets shared across the date. Nutrition has two Diary tables.

Entry IDs identify values within a slot. Frozen choices and planned items retain
their Menu UUIDs. A planned association remains attached to its original item when
the client switches meals; switching back reveals that association again. Source
IDs remain scalars, so Library deletion leaves frozen history intact.

The embedded document owns snapshot and reference validation. Postgres protects
the document root, slot identity, revision, and tenant/day relationship. Saving a
slot writes its document once; a multi-slot save remains one repeatable-read
transaction. Live guidance is converted into this same value for rendering.
Diary constructs trusted slot identity once from the authorized client and frozen
day. Its changeset takes the slot and document; later saves advance the revision
without reassigning ownership.

The tradeoff is rewriting a slot document for an intake edit and validating nested
values through Ecto. There is no independent entry query API or global entry ID
constraint. These boundaries match the operations the product exposes.

The forward-only migration preserves frozen values, public UUIDs, revisions,
timezones, targets, and order before dropping child tables and their redundant
parent index. Stop writers, take a database backup, migrate, and start the matching
backend. Rollback restores that backup and release. The public JSON contract stays
the same; there is no runtime compatibility reader.
