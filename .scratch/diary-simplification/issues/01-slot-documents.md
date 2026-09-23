# Make Diary slots complete values

Type: task
Status: resolved

Implement the slot document, cut over reads and writes, remove retired child
schemas, migrate existing history, update behavior tests and documentation, and
validate both apps through real browser journeys. Check migration preservation on
a database copy before applying locally. Do not commit until requested.

## Answer

DiaryDay owns target snapshots. DiarySlot owns one validated document containing
frozen options, selected Meal ID, and complete intake. Removed three child schemas,
tables, relational reconstruction, and child reconciliation. Live and frozen slots
use one renderer. Entry IDs belong to a slot; ordering follows the arrays.

Preserved frozen corrections, option associations, tenant access, revision conflicts,
atomic day saves, public UUIDs, and the existing JSON contract. Validation includes
malformed document values, storage round trips, requested intake order, and reused
entry IDs across slots and clients.

Validation: `mix precommit` passed with 1,350 tests; `just test-e2e` passed all 10
real coach/client journeys and built both apps; the former repository checks and
`git diff --check` passed. API contract review found no generated-type delta.
Standards and spec reviews informed the final validation boundary and naming.

The migration rehearsal used a development database copy plus representative
history: four slots, four options, four planned items, and seven entries. Exact
values, UUIDs, order, revisions, timezones, day targets, and menus were preserved;
every converted document validated. Cases included deleted sources, incomplete
nutrients, missing gram weights, selection fallback, and an empty slot.

Applied locally after stopping the development API and taking a protected backup:
`~/.local/share/easy/backups/diary-before-slot-documents-1788694124.dump`.
Restarted the API; authenticated coach and client HTTP reads returned identical
migrated history. Both app development servers return 200. Changes are uncommitted.
