# Finish the nutrition simplification audit

Type: task
Status: resolved

Preserve the staged audit cleanup. Replace positional menu resolution with results
keyed by Library source and chosen portion. State the assembler's availability and
rounding rules. Verify the public date contract and run the finish checks.

Retain migration history while production/shared database preservation is required.
The repository records a production deployment in `docs/deploy-digitalocean.md`;
do not infer that those databases are disposable from the prototype label.
Do not commit until requested.

## Answer

Kept the staged audit changes, including centralized snapshot semantics, direct
query returns, a two-argument slot changeset, single-owner document validation,
and typed date parameters. API generation and both app builds passed; Date typing
does not change the generated TypeScript representation.

Library resolution returns a map keyed by source and chosen portion. Menu reads
look up their own values without list splitting, counting, or zipping. Diary and
recipe writes consume the same map; ingredient order follows the submitted list.
Regression coverage includes repeated references, distinct portions, copied Menu
identities, and empty menus. The assembler's source hiding and rounding rules have
explicit comments.

`mix precommit`: 1,350 tests passed. `just test-e2e`: 10 browser journeys passed.
Both app checks/builds, API generation, `scripts/check-rm.sh`, and whitespace checks
passed. Restarted the local API to load the typed date parser; authenticated coach
and client reads agree on migrated Diary history.

Migration history and ADR deployment notes remain. `docs/deploy-digitalocean.md`
records a deployed production database; its disposability has not been confirmed.
No database reset or production action was performed. Changes are uncommitted.
