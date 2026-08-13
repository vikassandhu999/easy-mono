# Create the implementation tickets and execution order

Type: task
Status: resolved
Blocked by: 03, 06
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Turn the closed decisions and prototypes into implementation tickets that can be executed without reopening product questions.

The tickets must cover schema and migrations, backend domain behavior, OpenAPI regeneration, CoachApp interactions, removal of superseded behavior, behavioral tests, query-plan checks, and coordinated verification. Record their blocking order on this map, then graduate implementation and verification work from Not yet specified.

## Answer

The implementation route is fully specified in eleven child tickets. Their `Blocked by` headers are the executable dependency graph.

1. [Add canonical workbench persistence](./08-add-canonical-workbench-persistence.md) establishes the fields, constraints, and indexes.
2. Three branches can then advance: [Implement client lifecycle and required-service writes](./09-implement-client-lifecycle-and-required-service-writes.md), [Implement atomic Replies waiting state](./10-implement-atomic-replies-waiting-state.md), and [Build Expiring and Quiet queue facts](./13-build-expiring-and-quiet-queue-facts.md).
3. The canonical writes unlock [Build Programming queue facts](./12-build-programming-queue-facts.md); the client and conversation writes together unlock [Build lifecycle and communication queue facts](./11-build-lifecycle-and-communication-queue-facts.md).
4. Those three queue-fact tickets converge on [Cut over the workbench HTTP and OpenAPI contract](./14-cut-over-workbench-http-and-openapi-contract.md), including typed-client regeneration and deletion of the retired public contract.
5. The cutover unlocks three parallel tickets: [Implement required-services capture in the apps](./15-implement-required-services-capture-in-the-apps.md), [Implement the accepted CoachApp queue interactions](./16-implement-accepted-coachapp-queue-interactions.md), and [Prove queue behavior and query plans](./17-prove-queue-behavior-and-query-plans.md).
6. [Run the coordinated workbench cutover](./18-run-coordinated-workbench-cutover.md) removes any remaining superseded runtime behavior and runs the full release gate.

Two implementation details were made explicit so downstream work does not stop for another product decision:

* The locked Onboarding `Send reminder` action uses a tenant-scoped Forms command exposed as `POST /v1/coach/form-assignments/:id/remind`; it sends through the existing notification boundary and does not change queue membership.
* The Intake-only `service_type` question includes the narrow ClientApp answer renderer required for a client to complete the accepted capture flow. CoachApp still owns question configuration and the direct Invite/edit surfaces.

Every backend ticket includes focused tests for its behavior. [Prove queue behavior and query plans](./17-prove-queue-behavior-and-query-plans.md) owns the public cross-queue matrix and representative `EXPLAIN ANALYZE` evidence, while [Run the coordinated workbench cutover](./18-run-coordinated-workbench-cutover.md) owns the clean-regeneration, build, live-browser, and no-compatibility checks.
