# Backend validation — 2026-09-23

The core product keeps clients and direct invitations, team and billing access,
training plans and workout execution, food and recipe libraries, nutrition plans
and diaries, and messages with attachments and workout or meal references.
Weight Progress, weight goals, and weight chat cards have been removed. Exercise
loads, food and recipe weights, and the default training weight unit remain.
The earlier structural audit is available in Git at
`codex/checkpoint-rewrite-2026-09-23:backend/QUALITY_AUDIT.md`.

## Checks completed

- `MIX_TEST_PARTITION=_core_reset_20260923 mix precommit` passed: **1,441 tests,
  zero failures**, compile with warnings as errors, formatting, strict Credo
  across 405 source files, and 121 typed routes.
- Focused chat, profile, client, and contract tests passed: 179 tests, zero failures.
  Reusable weight-card chat tests now exercise completed workout references,
  retaining tenant isolation, attachments, sockets, and snapshot coverage.
- `just gen-api` regenerated contracts for the three retained product apps.
- The retained `dev_client_states.exs` and `dev_rich_client.exs` scripts compiled
  without executing their writes. Weight fixtures were removed; training,
  nutrition, client, and message fixtures remain.
- A bounded source scan found no retired weight runtime, fixture, or configuration
  references. Historical migrations retain their original definitions.

Logs are `/tmp/easy-weight-removal-precommit-20260923.log` and
`/tmp/easy-weight-seed-compile-20260923.log`.

The test partition uses a separate database. The default `easy_test` database
has a pre-squash migration history through `20260919000002`, while this tree starts
at `20260922000000`; it was preserved rather than reset.

## Database upgrade evidence

All 15 migrations through `20260923160000` are applied to `easy_dev_refactoring`.
The three additive removal migrations are `20260923120000`, `20260923121000`,
and `20260923160000`; historical migrations were preserved.

Before the latest migration, a local backup was created at
`/tmp/easy-before-weight-removal-20260923.dump` with owner-only permissions.
The migration first passed on a restored copy and on a newly created empty
database, then ran against local development. No existing database was reset.

Development and the fresh chain have identical schema snapshots: 34 tables,
359 columns, 156 constraints, and 136 indexes. The restored copy is equivalent;
PostgreSQL dump restoration distributes varchar-array casts over array elements
in 18 existing checks and one partial index, so that representation alone was
normalized for comparison.

The ten retired tables, including `weight_entries`, are absent. Weight goal,
form, queue, and dashboard setup columns are absent. The chat constraint allows
only `training_session` and `meal` references.

Counts and content checksums match before and after for all 33 retained data
tables, excluding only the approved goal-field removal and weight-card conversion.
Selected counts at migration time:

| Table | Rows before and after |
| --- | ---: |
| attachments | 155 |
| business_billing | 325 |
| businesses | 845 |
| chat_message_attachments | 78 |
| chat_messages | 1,977 |
| clients | 522 |
| conversations | 235 |
| nutrition_diary_slots | 37 |
| nutrition_plans | 3,354 |
| training_performed_sets | 150 |
| training_plans | 2,168 |
| training_sessions | 361 |

The approved removal deleted 211 weight entries. Development contained no weight
chat cards, so a separate restored database exercised three synthetic cards through
the actual migration. Existing message text was preserved; cards without text used
the snapshot title or `Shared record`. Message identities, conversations, and all
78 attachment links remained. The new constraint rejects weight cards and accepts
workout and meal cards.

Evidence files:

- `/tmp/easy-weight-removal-verification-20260923.json`: migration versions,
  schema summaries, all retained counts, and verification results.
- `/tmp/easy-weight-removal-final-schema-20260923.json`: final schema snapshot.
- `/tmp/easy-weight-removal-retention-20260923.json`: retained counts and checksums.
- `/tmp/easy-weight-removal-embed-migration-20260923.json`: synthetic conversion checks.

The earlier backup, before the first two removals, remains at
`/tmp/easy-core-reset-20260923-before-removal.dump`. Removal migrations deliberately
require restoring the corresponding backup for rollback rather than recreating
empty tables in place of deleted records.

## Limits

No production database or deployment was changed. These upgrade checks cover the
local schema and dataset. Real-provider email and billing delivery were not
exercised by this pass.
