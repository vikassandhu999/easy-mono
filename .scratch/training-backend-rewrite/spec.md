Status: ready-for-agent

# Training backend rewrite

## Problem Statement

Training behavior is split across generic plan, workout, and session resources. A caller must understand how templates and client-owned copies share storage, how workout weekday arrays encode a schedule, how timestamps encode order, and which child mutations must be combined to produce a valid Prescription. The storage model permits states the product does not mean, including using a Client Plan as a source and treating a plan without a start date as Coverage. Training Session transitions are expressed as generic updates, completed history can still be changed, and historical snapshots have no stable schema.

This shape spreads authorization, exercise visibility, ordering, cloning, scheduling, and lifecycle rules across callers. It also makes the frontend coordinate several endpoints to save one Prescription. The application is in preproduction, so preserving this internal design or its stored training data would add cost without protecting a real consumer.

## Solution

Rebuild Training around three deep modules. Library owns exercises, muscles, equipment, and exercise visibility. Programming owns Training Templates, Client Plans, Prescription replacement, Assignment, Coverage, and plan lifecycle. Execution owns Training Sessions, Performed Sets, explicit state transitions, and immutable historical snapshots.

Training Templates and Client Plans share one explicitly typed plan aggregate because both own the same Prescription. Database checks enforce the fields and lifecycle rules for each kind. A complete Prescription is replaced atomically through one Programming operation. The request carries stable IDs for persisted nodes and request-local references for nodes that have not been saved. Every plan write uses optimistic revision checking.

Execution resolves a startable Prescription through Programming, freezes a versioned snapshot when a planned Training Session begins, and stops consulting mutable Programming data for that session. Completed and discarded sessions are terminal. History remains readable after planning data or exercise references disappear.

The training planning and execution tables are dropped and recreated in one destructive migration. Exercise-library data and media remain. The backend contract, generated types, coach app, and client app move to the replacement together. The `/training-plans` route family remains as a compact transport-level umbrella, while domain code and response kinds distinguish Training Templates from Client Plans.

## User Stories

1. As a coach, I want to list Training Templates, so that I can choose reusable Prescriptions.
2. As a coach, I want to search and filter Training Templates, so that a large library remains usable.
3. As a coach, I want to create an empty Training Template, so that I can author a Prescription incrementally.
4. As a coach, I want to edit a Training Template's name and description, so that its purpose remains clear.
5. As a coach, I want to archive and restore a Training Template, so that unavailable templates leave the active library without being deleted.
6. As a coach, I want to delete a Training Template, so that unused Prescriptions can be removed.
7. As a coach, I want to duplicate an unarchived Training Template, so that I can create a variation without changing the source.
8. As a coach, I want an archived Training Template to be ineligible for duplication and Assignment, so that archived content cannot be reused accidentally.
9. As a coach, I want a Client Plan to be ineligible as a duplication or Assignment source, so that client-specific changes do not become reusable content accidentally.
10. As a coach, I want to replace a complete Prescription atomically, so that workouts, exercises, sets, order, and schedule cannot disagree.
11. As a coach, I want persisted workouts and Prescribed Exercises to retain their identities during Prescription replacement, so that references remain stable.
12. As a coach, I want unsaved Prescription nodes to use request-local references, so that a Workout Schedule can refer to workouts created in the same request.
13. As a coach, I want omitted Prescription nodes to be removed, so that the submitted Prescription is authoritative.
14. As a coach, I want Prescribed Exercises ordered explicitly, so that presentation does not depend on creation timestamps.
15. As a coach, I want workouts ordered explicitly, so that duplication and Assignment preserve their visible order.
16. As a coach, I want each weekday to select at most one workout, so that the Workout Schedule has one clear instruction per day.
17. As a coach, I want the same workout available on several weekdays, so that repeating weekly routines do not require duplicate workouts.
18. As a coach, I want an omitted weekday to mean rest, so that rest does not need a separate object.
19. As a coach, I want only visible system or business exercises accepted in a Prescription, so that tenant-owned content cannot cross businesses.
20. As a coach, I want Prescribed Sets stored with their Prescribed Exercise, so that saving the Prescription replaces them as one value.
21. As a coach, I want tracking type to guide the interface without rejecting flexible Prescribed Set fields, so that this rewrite does not invent prescription rules.
22. As a coach, I want to assign an unarchived Training Template to a visible client, so that the client receives an independent Client Plan.
23. As a coach, I want Assignment to copy the complete ordered Prescription and Workout Schedule, so that the Client Plan begins as an exact independent copy.
24. As a coach, I want Assignment and the client's onboarding-stage transition committed together, so that neither can succeed alone.
25. As a coach, I want an incomplete Client Plan to advance the coaching relationship while still reporting missing Coverage, so that onboarding and programming readiness remain distinct.
26. As a coach, I want to edit a Client Plan without changing its Training Template or another client's plan, so that coaching remains individualized.
27. As a coach, I want a Client Plan without a start date treated as incomplete, so that it supplies no accidental Coverage.
28. As a coach, I want a Client Plan with a start date and no end date treated as open-ended, so that ongoing coaching does not need an artificial end date.
29. As a coach, I want start and end dates interpreted inclusively, so that Coverage includes both selected dates.
30. As a coach, I want overlapping Coverage for one client rejected, so that date resolution returns at most one Client Plan.
31. As a coach, I want at most one unarchived incomplete Client Plan per client, so that repeated Assignment cannot accumulate ambiguous drafts.
32. As a coach, I want multiple non-overlapping upcoming Client Plans, so that future programming can be prepared in advance.
33. As a coach, I want Client Plan lifecycle labels derived from dates and archive state, so that mutable status cannot contradict Coverage.
34. As a coach, I want to archive, restore, or delete a Client Plan, so that I control whether it can supply Coverage.
35. As a coach, I want deleting a Training Template to leave its Client Plans unchanged, so that Assignment remains an independent copy operation.
36. As a coach, I want stale plan changes rejected with the current revision, so that one coach cannot silently overwrite another coach's Prescription.
37. As a coach, I want inaccessible plans to appear nonexistent, so that plan identifiers do not expose another business or coach-client relationship.
38. As a client, I want to inspect my incomplete, upcoming, current, and ended unarchived Client Plans, so that I can understand my programming.
39. As a client, I want date resolution to return a nullable Client Plan and workout successfully, so that missing Coverage is represented as a normal state.
40. As a client, I want today's scheduled workout shown as guidance, so that I know the intended workout.
41. As a client, I want to start any workout in the Client Plan supplying Coverage today, so that I can adapt the weekly order when needed.
42. As a client, I want to start a Freestyle Training Session without a Client Plan workout, so that unplanned training can still be recorded.
43. As a client, I want only one active Training Session, so that performed work cannot split between concurrent sessions.
44. As a client, I want a planned session to freeze its Prescription when it starts, so that later plan edits do not rewrite the workout I performed.
45. As a client, I want an active Training Session to continue after its Client Plan changes or is deleted, so that execution is independent after start.
46. As a client, I want to record a Performed Set using a visible exercise, so that history can retain the library relationship when available.
47. As a client, I want to record an explicitly named exercise when no library reference is used, so that freestyle work remains descriptive.
48. As a client, I want every Performed Set to freeze its exercise name, so that exercise deletion cannot erase history.
49. As a client, I want Performed Sets ordered deterministically, so that repeated reads present the workout consistently.
50. As a client, I want to update or delete Performed Sets only while the Training Session is active, so that final history cannot change.
51. As a client, I want to update notes and soreness only while a Training Session is active, so that final history is immutable.
52. As a client, I want to complete a Training Session explicitly, so that completion records one terminal outcome and closing time.
53. As a client, I want to discard a Training Session explicitly, so that abandoned work has a terminal outcome.
54. As a client, I want retrying the same terminal command to return the same result, so that a network retry does not become an error.
55. As a client, I want the opposite terminal transition rejected, so that a completed session cannot become discarded or the reverse.
56. As a client, I want Training Session history paginated, so that large histories remain bounded.
57. As a client, I want malformed or reversed date filters rejected, so that filter mistakes are visible.
58. As a client, I want historical planned-versus-performed detail to remain readable without live Programming rows, so that it remains truthful over time.
59. As a coach, I want to inspect the same immutable Training Session history for a visible client, so that I can review their work.
60. As a business owner, I want to inspect every client's Training Session history in the business, so that owner access remains intact.
61. As a trainer, I want Training Session history limited to clients I coach, so that client privacy remains intact.
62. As a frontend developer, I want plan responses to state whether they represent a Training Template or Client Plan, so that one route family remains unambiguous.
63. As a frontend developer, I want the generated contract to describe the versioned Prescription snapshot, so that history rendering does not depend on an open-ended object.
64. As a frontend developer, I want one Prescription mutation instead of child-resource orchestration, so that the builder has one save boundary.
65. As a frontend developer, I want a stale-revision response with the current revision, so that the interface can refetch and ask the coach to reapply changes.
66. As a maintainer, I want planning and execution behavior tested through their public interfaces, so that internal storage can change without rewriting behavioral tests.
67. As a maintainer, I want invalid plan kinds, schedules, positions, Coverage periods, and session states rejected by Postgres, so that application bugs cannot persist contradictory data.
68. As a maintainer, I want the replaced contexts, child mutation routes, fields, and tests deleted, so that only one Training design remains.

## Implementation Decisions

* Training is split into Library, Programming, and Execution modules. There is no pass-through Training facade.
* Library owns exercises, muscles, equipment, exercise visibility, and deletion rules. The exercise-library schema and stored data remain.
* Programming owns Training Templates, Client Plans, Prescription replacement, Assignment, Coverage, plan authorization, plan revision, and plan lifecycle.
* Execution owns Training Sessions, Performed Sets, explicit state transitions, history authorization, and versioned Prescription snapshots.
* Programming provides Execution with one internal interface that resolves a startable Prescription for a client and UTC date. Execution does not reproduce plan, Coverage, or exercise-visibility queries.
* Training Templates and Client Plans use one plan aggregate with an explicit `template` or `client_plan` kind.
* Database checks reject client, source, and period fields on Training Templates and require the client relationship on Client Plans.
* Archive state is stored as a timestamp. Incomplete, upcoming, current, and ended are derived states.
* A Client Plan supplies Coverage only when it is unarchived, has a start date on or before the requested date, and has no end date or an end date on or after the requested date.
* A partial unique rule permits at most one unarchived Client Plan without a start date per client.
* An exclusion rule rejects overlapping unarchived Client Plan Coverage, treating a missing end date as infinity.
* Plans have a monotonically increasing revision. Every metadata, lifecycle, period, and Prescription write supplies an expected revision.
* A stale revision produces a conflict carrying the current revision. The server does not merge Prescriptions.
* Workouts and Prescribed Exercises have explicit nonnegative positions and deterministic ordering. Creation timestamps are not ordering fields.
* The Workout Schedule uses sparse rows keyed by plan and weekday. Absence means rest. Database keys prove that a scheduled workout belongs to the same plan and business.
* The same workout may occupy several weekdays. A weekday may refer to at most one workout.
* Prescribed Sets remain validated embedded JSON owned by a Prescribed Exercise.
* Prescription replacement is authoritative and transactional. Omitted persisted nodes are deleted.
* Persisted nodes use server IDs. Unsaved nodes use request-local references that are unique inside one replacement request.
* Exercise visibility is validated in one batch before a Prescription is written.
* Assignment accepts only an unarchived Training Template and a visible client. It clones the complete Prescription and advances onboarding in the same transaction.
* A Client Plan cannot be assigned or duplicated as a source. An archived Training Template must be restored before use.
* Training Template deletion is allowed after Assignment because Client Plans are independent copies. Source provenance may become unavailable.
* The server continues to use UTC dates for Coverage and Training Session start behavior.
* Starting a planned Training Session may select any workout in the Client Plan supplying Coverage on the UTC date. It need not match the Workout Schedule.
* Starting a Freestyle Training Session requires no plan or workout.
* A partial unique rule permits only one active Training Session per client.
* A planned Training Session stores one immutable, versioned JSON snapshot containing the plan and workout identities and names, ordered exercises, exercise tracking types, and every Prescribed Set field.
* A Training Session has active, completed, and discarded states. Completed and discarded are terminal.
* Completion and discard use explicit context operations and HTTP commands. Generic state mutation is removed.
* Repeating the same terminal command is idempotent. Attempting the opposite terminal command returns a conflict.
* Notes, soreness, and Performed Sets can change only while the Training Session is active.
* Every Performed Set freezes a nonblank exercise name. It may also retain an optional live exercise reference and a stable reference to an exercise in the session snapshot.
* Session and Performed Set history survives plan, workout, Prescribed Exercise, and exercise-library deletion through frozen snapshot data and names.
* History list operations use standard offset and limit behavior with repository maximums. Date filters reject malformed or reversed ranges.
* Inaccessible plans and sessions return not found rather than exposing authorization distinctions.
* A missing date-specific Client Plan is represented by a successful nullable result.
* The `/training-plans` route family remains. Coach collection operations represent Training Templates; client-scoped operations represent Client Plans; individual responses include the plan kind.
* One plan-structure replacement route supersedes workout, Prescribed Exercise, reorder, and schedule mutation routes.
* The backend OpenAPI document remains the frontend contract. Backend schemas, generated frontend types, coach app callers, and client app callers change together.
* Planning and execution tables are dropped and recreated in one destructive migration. No stored training plan or session data is retained.
* Exercise-library, muscle, equipment, and media tables are not dropped.
* Migration history remains unchanged. The destructive canonical migration follows the historical migrations.
* There are no dual writes, feature flags, compatibility routes, backfills, or legacy-data repair paths.
* Factories, seeds, development fixtures, OpenAPI examples, and tests are rebuilt for the replacement model.
* Replaced contexts, schemas, routes, fields, helpers, tests, and frontend code are deleted once their callers move.

## Testing Decisions

Behavior is tested at the highest stable seam. Programming context tests exercise complete plan and Assignment outcomes through the Programming interface with the SQL sandbox. Execution context tests exercise session state and history through the Execution interface. Tests do not call private clone, ordering, snapshot, or transition helpers.

Programming tests cover plan-kind rules, tenant isolation, coach-client visibility, lifecycle derivation, optimistic revision conflicts, complete Prescription replacement, request-local reference resolution, exercise visibility, deterministic order, schedule ownership, duplication, atomic Assignment, incomplete-plan uniqueness, open-ended Coverage, and overlap rejection.

Execution tests cover planned and freestyle starts, one-active-session concurrency, UTC eligibility, snapshot fidelity, independence from later plan changes, visible and explicitly named performed exercises, active-only mutations, terminal idempotency, opposite-transition conflicts, immutable history, pagination, date validation, and coach/client authorization.

Database-focused tests attempt writes that bypass normal context validation. They cover plan-kind checks, tenant-aware parentage, nonnegative and unique positions, weekday uniqueness, cross-plan schedule references, incomplete Client Plan uniqueness, open-ended overlap exclusion, one active Training Session, required frozen exercise names, and state/closing-time consistency.

Controller tests cover the generated contract, plan-kind response discrimination, nullable date resolution, stale-revision errors, not-found concealment, explicit session commands, validation errors, and removal of child mutation routes. Existing coach and client controller-test patterns are the prior art.

Frontend contract checks cover generated type compilation and request mapping. Coach app tests cover Template listing, plan building, duplication, Assignment, revision conflict handling, and Client Plan period editing. Client app tests cover nullable Coverage, planned and freestyle session start, Performed Set editing, completion, discard, and paginated history.

End-to-end verification creates a Training Template, replaces its Prescription, duplicates it, assigns it, edits the Client Plan, resolves a date, starts planned and freestyle Training Sessions, records work, completes or discards sessions, deletes planning data, and reads unchanged history.

The final verification runs backend formatting, compilation, focused and complete tests, Credo through the repository precommit command, frontend formatting/linting, type checks, tests, builds, generated-contract checks, recurring-mistake checks, and searches for every deleted symbol, route, and field.

## Out of Scope

* Migrating or retaining training planning and Training Session rows.
* Compatibility for deployed clients or external API consumers.
* Dual-write or phased production rollout machinery.
* Client or business timezone support.
* Tracking-type-specific Prescribed Set validation.
* Multiweek phases, progression rules, deload generation, or automatic progression.
* Dated workout occurrences, rescheduling, skips, or schedule exceptions.
* Live synchronization from Training Templates into Client Plans.
* Collaborative Prescription merging or real-time editing.
* Revision history, rollback, autosave recovery, or audit-log presentation.
* Coach-authored Training Sessions, session reopening, or post-completion correction.
* Adherence scores, personal records, volume analytics, recommendations, timers, offline execution, or cross-device recovery.
* Notifications, reminders, bulk Assignment, client acceptance, or approval workflows.
* A reusable workout library separate from Training Templates.

## Further Notes

The domain glossary defines Training Template, Client Plan, Assignment, Training Session, Workout Schedule, Prescription, Prescribed Exercise, Prescribed Set, and Performed Set. Implementation and ticket language must use those terms even though the transport retains `/training-plans`.

The work is intentionally split into Programming and Execution delivery groups. Execution depends on Programming's resolved-Prescription interface. Contract and frontend tickets depend on the relevant backend behavior. Deletion and whole-application verification are final blocked tickets, not cleanup folded into earlier work.
