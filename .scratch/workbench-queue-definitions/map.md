# Coach workbench v1 delivery

Label: wayfinder:map
Status: active

## Destination

Ship the v1 coach workbench queue definitions across the backend, OpenAPI contract, CoachApp, migrations, and behavioral tests. The effort ends when implementation tickets are complete and the coordinated workbench flow is verified.

## Notes

* The source specification is [Coach workbench queue definitions](./spec.md).
* This map carries execution after the decisions are closed. It does not stop at an implementation plan.
* The product is in prototype phase. Make one coordinated cutover with no backward-compatibility layer and no data backfill.
* Preserve the spec's `joined_at` decision and leave placement of the separate Recent clients metric out of scope.
* [Design the Onboarding queue interaction](./issues/05-design-onboarding-interaction.md) is locked; implementation tickets must consume its B reference without reopening A/C exploration.
* Use `grilling` and `domain-modeling` for decision tickets, `prototype` for interaction tickets, and `codebase-memory-axi` for structural code discovery.
* Refer to map tickets by title in human-facing notes.

## Decisions so far

* [Define the queue reason contract](./issues/01-define-queue-reason-contract.md) — Queue-specific items carry a strict ordered reason union, while counts aggregate the same reason-bearing membership facts by work-item identity.
* [Design required-services capture](./issues/02-design-required-services-capture.md) — An Intake-only `Service type` question writes the one undated `required_services` set; Invite may set it optionally, coaches may edit it later, and Check-in forms cannot contain the question. The service-card prototype covers each capture context.
* [Design the Programming queue interaction](./issues/03-design-programming-queue-interaction.md) — Use the urgency-grouped priority list with overlapping service filters, one client row, service-specific reason facts, and direct actions into the matching plan-assignment flow.
* [Design Replies handling](./issues/04-design-replies-handling.md) — Use color-only whole-row selection with a desktop task pane and the same content expanded beneath the selected row on mobile; read remains separate from reply-or-handle completion.
* [Design the Onboarding queue interaction](./issues/05-design-onboarding-interaction.md) — Use the compact standard queue row with one visible reason/action pair and confirmation before outbound contact; each client has one Intake, `joined_at` gates invitation work before acceptance versus intake work after acceptance, and Call appears when a phone exists.
* [Define the coordinated schema and API cutover](./issues/06-define-coordinated-schema-api-cutover.md) — Cut over to canonical lifecycle, service, and waiting facts; explicit typed queue resources share reason-bearing list/count predicates, while stale Mark handled actions are conflict-safe.
* [Create the implementation tickets and execution order](./issues/07-create-implementation-tickets.md) — Eleven dependency-wired tickets carry persistence, domain facts, the API cutover, app interactions, behavioral and query-plan proof, cleanup, and the coordinated release gate.
* [Add canonical workbench persistence](./issues/08-add-canonical-workbench-persistence.md) — Added reversible lifecycle, service, and waiting facts with a closed required-services constraint and tenant-leading partial indexes for waiting, coverage, and Expiring queries.
* [Implement client lifecycle and required-service writes](./issues/09-implement-client-lifecycle-and-required-service-writes.md) — Added guarded join timestamps, canonical Invite/edit/Intake service writes, single-Intake serialization, and a visibility-scoped reminder command.
* [Implement atomic Replies waiting state](./issues/10-implement-atomic-replies-waiting-state.md) — Added transactionally maintained waiting clocks and a visibility-scoped, row-locked Mark handled command that cannot erase newer client work.
* [Build lifecycle and communication queue facts](./issues/11-build-lifecycle-and-communication-queue-facts.md) — Added shared reason-bearing Onboarding, Check-in, and Replies membership queries with distinct SQL counts, stable ordering, and fail-closed visibility.
* [Build Programming queue facts](./issues/12-build-programming-queue-facts.md) — Added one shared required-service coverage projection with strict Programming reasons, overlapping distinct counts, filter-before-grouping behavior, and stable client ordering.
* [Build Expiring and Quiet queue facts](./issues/13-build-expiring-and-quiet-queue-facts.md) — Added shared reason-bearing Expiring and Check-in-only Quiet membership queries with canonical counts, snooze semantics, stable ordering, and the 14-day roster window.
* [Cut over the workbench HTTP and OpenAPI contract](./issues/14-cut-over-workbench-http-and-openapi-contract.md) — Added six explicit typed queue resources, canonical Mark handled and Intake reminder commands, removed overloaded queue parameters and projections, and regenerated both frontend clients from the breaking contract.
* [Implement required-services capture in the apps](./issues/15-implement-required-services-capture-in-the-apps.md) — Added generated-type Invite/edit capture, truthful Unclassified presentation, an Intake-only fixed builder question, and ClientApp Intake submission/review while excluding the question from Check-ins.
* [Implement the accepted CoachApp queue interactions](./issues/16-implement-accepted-coachapp-queue-interactions.md) — Shipped all six explicit queue interactions, completed the Intake/Replies fact contract, restored the locked responsive layouts, and verified the populated CoachApp flows at mobile and desktop widths.
* [Prove queue behavior and query plans](./issues/17-prove-queue-behavior-and-query-plans.md) — Completed the source-spec behavior matrix, added representative JSON query-plan checks, bounded Reply enrichment to the selected page, and corrected the generated Programming filter contract.

## Not yet specified

* None. Implementation and final verification are fully specified as child tickets.

## Out of scope

* Backward-compatible API rollout and production-data backfill.
* Training-derived Quiet signals.
* Plan readiness, publishing, and structural-content validation.
* Business-local date boundaries.
* Placement of the separate Recent clients metric.
* Per-coach conversation read cursors.
