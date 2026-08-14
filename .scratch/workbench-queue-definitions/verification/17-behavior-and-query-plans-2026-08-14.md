# Ticket 17 behavior and query-plan verification

Date: 2026-08-14

## Behavioral matrix

The public behavior is covered by context and controller tests. Dates in the focused queue tests derive from `Date.utc_today/0` or `DateTime.utc_now/1`, and equal-priority cases assert the UUID tie-break.

| Area | Evidence |
| --- | --- |
| Onboarding | `workbench_lifecycle_communication_queues_test.exs` covers fresh and overdue invitations, resend, pre-acceptance Intake suppression, overdue Intake, completed and dismissed Intake, inactive clients, pagination, tenant scope, and trainer visibility. |
| Check-ins | `workbench_lifecycle_communication_queues_test.exs` and the check-in review controller tests cover submission identity, multiple submissions per client, review drain, inactive clients, oldest-first order, pagination, tenant scope, and trainer visibility. |
| Replies | `chat_test.exs`, `workbench_lifecycle_communication_queues_test.exs`, and `conversation_controller_test.exs` cover stable `waiting_since`, repeated messages, read-state independence, reply drain, Mark handled, stale Mark handled conflicts, inactive clients, tenant scope, and trainer visibility. |
| Required services | `clients/required_services_test.exs`, `forms/required_services_test.exs`, and the client form-assignment controller tests cover optional Invite selection, direct edits, one Intake Service type question, Intake replacement, Intake without the question, and Check-in rejection. |
| Programming | `workbench_programming_queue_test.exs` covers Training, Nutrition, both services, unclassified and inactive clients, every reason, both lookahead boundaries, successors, gaps, open-ended plans, filters, distinct All counts, pagination, tenant scope, and trainer visibility. |
| Expiring | `workbench_expiring_quiet_queues_test.exs` covers days 0, 14, and 15, no end date, renewal drain, active and expired snoozes, pagination, tenant scope, and trainer visibility. `client_subscription_sweeper_test.exs` covers automatic subscription-expired deactivation. |
| Quiet | `workbench_expiring_quiet_queues_test.exs` covers the latest due check-in, future assignments, a later completion, training activity exclusion, snooze behavior, pagination, tenant scope, and trainer visibility. |
| HTTP and OpenAPI | `workbench_controller_test.exs` validates every queue envelope and reason variant. `workbench_open_api_test.exs` validates the Programming filter enum, joined-date and waiting-state nullability, Service type, Intake reminder, and Mark handled request semantics. |

## Representative plan seed

`workbench_query_plan_test.exs` bulk-seeds 20 tenants with 100 clients per tenant, then runs owner and trainer calls through `Easy.Workbench`. The seed contains the following rows:

| Relation | Rows |
| --- | ---: |
| clients | 2,000 |
| conversations | 1,800 |
| chat_messages | 1,000 |
| form_assignments | 2,000 |
| form_submissions | 600 |
| training_plans | 4,000 |
| nutrition_plans | 4,000 |

The plan history has one active row and four archived rows for each seeded plan. Five percent of active conversations are waiting, and each waiting sequence contains ten client messages.

## Recorded plan structure

The harness captures SQL emitted by the public calls and replays each statement with `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`. The 2026-08-14 run recorded these fixed query counts and highest statement execution times:

| Projection | Queries | Highest execution time |
| --- | ---: | ---: |
| owner counts | 6 | 1.121 ms |
| trainer counts | 6 | 0.669 ms |
| Onboarding list | 2 | 0.185 ms |
| Check-ins list | 2 | 0.143 ms |
| Replies list | 5 | 0.083 ms |
| owner Replies list | 5 | 0.100 ms |
| Programming list | 2 | 0.891 ms |
| owner Programming list | 2 | 1.410 ms |
| Expiring list | 2 | 0.058 ms |
| owner Expiring list | 2 | 0.064 ms |
| Quiet list | 2 | 0.199 ms |

The exact costs and timings are recorded for review only. Tests assert plan structure, not those values.

The recorded plans used all intended indexes:

* `clients_active_subscription_ends_on_index`
* `clients_business_id_assigned_coach_id_index`
* `conversations_waiting_since_index`
* `nutrition_plans_active_client_coverage_index`
* `training_plans_active_client_coverage_index`

No seeded large relation had an unbounded sequential scan. PostgreSQL used sequential scans only for the 40-row form-template set and the empty snooze table. Query counts stayed fixed as the target tenant grew to 100 clients, so the public calls did not issue per-client application queries.

The first plan run found the Replies enrichment scanning all 1,800 conversations. The fixed query applies the selected conversation IDs and waiting timestamps directly to the tenant-scoped message query. The repeated plan run used the message business index and had no conversation scan.
