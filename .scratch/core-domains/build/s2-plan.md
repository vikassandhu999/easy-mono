# Nutrition slice implementation plan

Goal: implement the frozen Nutrition model on the slice-1 foundation.

Architecture: shared plans own identity, revision time, coverage and publication. Per-domain content modules validate and copy prescriptions. Nutrition owns library values, meal records and calculated reads. One record journal serializes writes for each client.

Constraints: remain in this working tree on `codex/core-domains`; no commits or pushes; preserve existing work; do not edit clientapp-v2. Use Ctx-first contexts, typed routes, generated app types and existing UI primitives. Frozen decisions remain unchanged.

## Work

- [x] Fix journal eligibility, actor identity and sequence allocation. Test client and coach actors, absent coaching terms, no-op writes, rollback and concurrent writes.
- [x] Extract shared plan schemas and verbs to Easy.Plans with a domain registry. Run training regression tests.
- [x] Replace Nutrition library storage, portions and nutrient arithmetic. Replace plans with shared tables and copied content. Replace diary snapshots with meal and entry rows, journal writes, expected meals, daily summaries and food metrics. Test tenant isolation and the required domain rules.
- [x] Replace the typed Nutrition contract and generate the retained app schemas.
- [x] Rebuild coach Nutrition builder, library editors, assignment, day/week views and metrics against the new contract.
- [x] Rebuild client Today and meal logging, retain durable drafts and request retries, and correct portion labels.
- [x] Run full backend and frontend gates; seed development data; run training regression and Nutrition browser flows at the required widths. Save screenshots and s2-report.md.

Review focus: stale requests must not overwrite newer meal data; absent nutrients must not become zero; recipes and servings must resolve consistently; historical coverage must survive archive and coaching gaps; publishing today must keep scheduled revisions and show the P4 limit.

## Progress

Initial branch verified. Existing slice-1 and design changes are present. Shared-plan extraction runs independently of the journal fixes. Nutrition implementation starts after the foundation is ready.

Final: all required gates passed; backend precommit 672 tests with zero failures. Live Training and Nutrition flows passed. Final report: s2-report.md.
