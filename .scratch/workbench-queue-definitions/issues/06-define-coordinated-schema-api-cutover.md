# Define the coordinated schema and API cutover

Type: grilling
Status: resolved
Blocked by: 01, 02, 04, 05
Parent: [Coach workbench v1 delivery](../map.md)

## Question

What final schema, migration, context, endpoint, and OpenAPI changes support the accepted queue behavior as one prototype cutover?

Resolve field names and constraints for `joined_at`, the undated required-services set, and conversation waiting state. Resolve the Mark handled action, queue filter parameters, reason response shape, count/list consistency, indexes, and deletion of superseded predicates. No compatibility or data-backfill path is required.

## Answer

Make one coordinated cutover to explicit workbench queue resources backed by canonical client and conversation facts. Do not retain legacy queue filters, response flags, predicates, or compatibility aliases.

### Persistence and migrations

Add these canonical fields:

* `clients.joined_at` is a nullable UTC microsecond timestamp. Invitation acceptance sets it in the same guarded write that links the user and activates the client. It is not accepted by Invite, coach edit, or client edit changesets and is never rewritten.
* `clients.required_services` is a non-null array defaulting to `[]`. Its only valid stored values are `[]`, `[training]`, `[nutrition]`, and `[training, nutrition]`; normalize the two-service value into that order. The database check rejects unknown values, duplicates, and noncanonical ordering. An empty set means Unclassified.
* `conversations.waiting_since` is a nullable UTC microsecond timestamp. A client message sets it to that message's timestamp only when it is null. Further client messages preserve it. A coach reply or Mark handled clears it. Read cursors never change it.

Existing rows are not backfilled: clients start with an empty required-services set and a null `joined_at`; conversations start with a null `waiting_since`.

Add or replace the query-supporting indexes in the same cutover:

* `(business_id, waiting_since, id)` on conversations where `waiting_since IS NOT NULL`.
* `(business_id, client_id, start_date, end_date)` on assigned active Training plans and separately on assigned active Nutrition plans.
* A business-leading `(business_id, subscription_ends_on, id)` Expiring index for active clients with an end date, replacing the current non-business-leading form.
* Retain the existing `(business_id, assigned_coach_id)` client index used for coach visibility.

A client has at most one Intake assignment over their lifetime, including completed and dismissed assignments. Do not add a database uniqueness constraint for this invariant. Instead, the application transaction locks the client row, checks for any existing Intake assignment across all statuses, and creates the first assignment or returns `:conflict`. The controller maps that conflict to HTTP 409. Purpose-aware form validation permits the special question only on Intake templates and at most once.

### Required-services writes

Add `service_type` as a closed form-question type. It has no coach-configurable options and is invalid in Check-in templates. Its submitted answer is a `services` array containing `training`, `nutrition`, or both in canonical order.

The optional Invite field writes `required_services` and may be omitted or empty. A later direct coach edit may replace the set but, when supplied, must contain at least one service. Submitting an Intake with `service_type` replaces the client's set in the same submission transaction; an Intake without it leaves the set unchanged. Check-in submissions can never update required services. The latest successful direct edit or Intake submission wins.

### HTTP and OpenAPI contract

Keep `GET /v1/coach/workbench` for counts and replace the overloaded list filters with six concrete operations:

* `GET /v1/coach/workbench/queues/onboarding`
* `GET /v1/coach/workbench/queues/programming`
* `GET /v1/coach/workbench/queues/expiring`
* `GET /v1/coach/workbench/queues/quiet`
* `GET /v1/coach/workbench/queues/check-ins`
* `GET /v1/coach/workbench/queues/replies`

Every list accepts `offset` and `limit` using the repository defaults and maximum. Queue-defined ordering is fixed and has no public sort override. Each response is `{data, count}`, where `count` is total filtered membership before pagination. Programming additionally accepts `service=all|training|nutrition`, defaulting to `all`; the other queue operations do not accept that parameter.

Use separate OpenAPI operations and queue-specific response schemas so generated frontend types remain precise:

* Onboarding, Programming, Expiring, and Quiet items are `{client, reasons}`.
* Check-in items are `{submission, client, assignment, reasons}`.
* Replies items are `{conversation, reasons}`.

`reasons` is the strict non-empty discriminated union and deterministic ordering defined by [Define the queue reason contract](./01-define-queue-reason-contract.md). Each reason variant and item envelope rejects unknown properties. The workbench count response becomes:

```json
{
  "check_ins": 0,
  "replies": 0,
  "onboarding": 0,
  "programming": {
    "all": 0,
    "training": 0,
    "nutrition": 0
  },
  "expiring": 0,
  "quiet": 0
}
```

Add `joined_at` and `required_services` to the canonical Client response schema. `joined_at` is response-only. Add optional `required_services` to Invite and coach-update requests with their context-specific empty-set validation. Add `waiting_since` to Conversation while retaining `last_message_role` only as conversation history; it no longer defines or describes Replies membership. Update the form-template and submission schemas for `service_type` and its closed answer.

Delete the client-list `filter=programming|expiring|new|quiet` contract and the conversation-list `waiting=true` contract. There is no alias for `new`; Onboarding is the only queue name.

### Mark handled

Add `POST /v1/coach/conversations/:id/mark-handled` with the strict body:

```json
{"expected_last_message_at": "2026-08-13T09:30:00.000000Z"}
```

The public context verb is `Easy.Chat.mark_conversation_handled(ctx, conversation_id, expected_last_message_at)`. It is tenant- and coach-visibility-scoped and continues to allow inactive clients' waiting conversations to be handled.

The write clears `waiting_since` only when the conversation is still waiting on the observed message state. Return 204 when it clears the sequence or when that sequence is already cleared, 409 when a newer message state is waiting, and 404 when the conversation is absent or invisible. The command sends no message and does not change read cursors. Message persistence and Mark handled must update the conversation atomically so a stale confirmation cannot erase a newer client message.

### Context and query ownership

`Easy.Workbench` is the public read context. Expose `counts/1` and explicit `list_onboarding_queue/2`, `list_programming_queue/2`, `list_expiring_queue/2`, `list_quiet_queue/2`, `list_check_in_queue/2`, and `list_replies_queue/2` functions using a trailing options keyword list.

Each queue has one internal, tenant-scoped, reason-bearing membership-fact query. Its list projection groups facts by queue-item identity and orders the reasons; its count projection counts distinct identities from the same fact source. Programming applies the requested service to the fact set before grouping or counting and produces All, Training, and Nutrition counts from one service-status result. The counts endpoint may orchestrate the small per-domain aggregate queries; do not construct one universal cross-domain SQL query or a configurable rules engine.

Keep writes with their owning contexts: conversation messages and Mark handled in `Easy.Chat`, direct required-service changes in `Easy.Clients`, and Intake validation/submission effects in `Easy.Forms`.

### Superseded behavior to delete

Remove the current shared `attention_facts` implementation and its duplicated Programming, Expiring, and New membership predicates and ordering. Replace the collapsed three-day Programming calculation, seven-day Expiring window, insertion-time New calculation, `last_message_role` Replies predicate, and training-derived Quiet arm with the accepted reason-bearing rules. Quiet must select the latest check-in that is already due before deciding whether it was missed, so a future assignment cannot hide an earlier missed one.

Remove the queue-derived `intake_incomplete`, `needs_plan`, `needs_programming`, and combined `covered_until` fields from the generic Client contract. Retain `expiring_soon` only as the unsnoozed roster fact and calculate it using the accepted 14-day window; snoozing changes queue membership, not that underlying fact.
