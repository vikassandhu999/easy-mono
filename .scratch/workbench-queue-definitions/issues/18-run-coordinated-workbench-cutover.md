# Run the coordinated workbench cutover

Type: task
Status: in_progress
Blocked by: 15, 16, 17
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Remove remaining superseded behavior and run the full backend, generated-contract, app, database, and live-flow verification as one release gate.

## Cutover checks

* Delete the shared `attention_facts` path and every duplicate Programming, Expiring, New, role-derived Replies, and training-derived Quiet predicate left after the replacement tickets.
* Remove retired client-list queue filters, `waiting=true`, the `new` queue name, and generic Client queue-only fields from runtime code, tests, and generated contracts. Historical specs, Wayfinder tickets, and locked prototype assets remain valid evidence and are not rewritten.
* Confirm the six queue list operations and counts use the same fact sources. Confirm every write invalidates or updates all affected frontend caches.
* Review the relevant entries in `docs/agents/recurring-mistakes.md`, especially deterministic ordering, OpenApiSpex view parity, route-surface verification, date-relative fixtures, and frontend generated-type usage.

## Verification gate

* Run backend `mix precommit`.
* Run `just gen-api` and require a clean second generation.
* Run CoachApp and ClientApp lint/build commands and review formatter writes.
* Run the repository's relevant `just` checks.
* Verify all CoachApp queue flows at 375px and 1280px and the ClientApp Intake service answer at 375px in the existing browser session.
* Re-run the representative query-plan harness and compare it with [Prove queue behavior and query plans](./17-prove-queue-behavior-and-query-plans.md).

## Acceptance

The map destination is reached only when the full gate passes, no live compatibility layer remains, and the workbench can be drained through the accepted interactions without count/list drift.
