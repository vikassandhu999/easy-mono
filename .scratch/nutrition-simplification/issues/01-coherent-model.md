# Simplify nutrition as one coherent change

Type: task
Status: resolved

Implement every finding in the user-provided audit. Validate tenant boundaries, deletion with frozen history, live Library changes, snapshot scaling, target stability, competing edits and migration preservation. Run backend precommit, both frontend builds, contract generation and browser scenarios.

## Answer

Implemented the full audit as one storage/API/frontend cutover. Menus remain
plan-owned documents containing Library references and chosen portions. All Library
values are live; Diary values and once-per-date targets are frozen. Portions and
nutrients each use one representation, and historical source IDs have no duplicate
Library foreign keys. Derived fields, redundant casting/formatting, duplicated
mutation helpers, and unused Food fields are removed.

Edits retain revisions; lifecycle actions and copies do not require them. Lifecycle
has one wire field, Day ranges are unpaginated, and response assertions run only
when enabled in development/test. Food media, generated contracts, dependent query
invalidation, fixtures, seeds, and documentation changed together.

Public reads and Diary saves use consistent database snapshots. Serialization
conflicts roll back the complete Diary save and return 409; no automatic retries.
Independent-connection tests cover mixed-version reads and full rollback/retry.

Validation:

- `rtk proxy mix precommit`: clean compile, format, Credo, 154-route contract drift
  check, and 1,352 passing backend tests.
- Both frontend builds/checks pass.
- `rtk proxy just test-e2e`: 10 passing real journeys, coach widths 375 and 1280,
  client width 375; fresh database migration and seed each run.
- `rtk proxy just check-rm` and `rtk git diff --check`: clean.
- Migration tested against a restored development database: all five menus and
  revisions, one historical snapshot, one day of targets, and 2,112 food image
  URLs preserved. Canonical constraint tests cover invalid JSONB values and tenant
  day identity.
- Local development database backed up outside the repository and migrated.
  Restarted API returns 200 for foods, recipes, template lists, and template details;
  all five stored menu documents validate.

See [the code map](../../../docs/nutrition-code-map.md) and
[the live Library decision](../../../docs/adr/0004-nutrition-live-library.md).
