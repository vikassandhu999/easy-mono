# Define the queue reason contract

Type: grilling
Status: resolved
Parent: [Coach workbench v1 delivery](../map.md)

## Question

What machine-readable shape should represent queue membership reasons across Onboarding, Programming, Expiring, Quiet, Check-ins, and Replies?

Resolve the canonical reason vocabulary, fields needed for dates and services, how a client with several reasons is represented, and how counts and list rows share the same contract. The result must let CoachApp render labels without reproducing backend membership rules.

## Answer

Use queue-specific item envelopes that share one strict, closed queue-reason union. A reason is a structured domain fact only: it never contains display text, tone, or an action definition.

### Item envelopes

* Onboarding, Programming, Expiring, and Quiet return `{client, reasons}`.
* Check-ins return `{submission, client, assignment, reasons}`.
* Replies return `{conversation, reasons}`.
* `reasons` contains only reasons for the requested queue. It is always non-empty and deterministically ordered.
* Queue-item identity is the client id for client queues, submission id for Check-ins, and conversation id for Replies. Reasons never create extra queue rows.

The exact endpoint paths and schema module boundaries belong to the coordinated API-cutover decision. The contract does not add context-dependent reasons to the generic Client schema.

### Reason union

Every reason uses `code` as its OpenAPI discriminator. Each variant requires exactly its listed fields, rejects unknown fields, and has no nullable catch-all properties or fallback display text.

| Code | Required fields |
| --- | --- |
| `invitation_follow_up_due` | `invitation_id`, `sent_at`, `follow_up_due_at` |
| `intake_overdue` | `assignment_id`, `due_on` |
| `check_in_awaiting_review` | `submission_id`, `submitted_at` |
| `service_never_programmed` | `service` |
| `service_coverage_missing` | `service`, `first_uncovered_on` |
| `service_coverage_ending_soon` | `service`, `coverage_ends_on`, `first_uncovered_on` |
| `engagement_ending_soon` | `ends_on` |
| `missed_check_in` | `assignment_id`, `due_on` |
| `reply_needed` | `waiting_since` |

`service` is the closed enum `training | nutrition`. Date-only facts are ISO `YYYY-MM-DD` dates evaluated under the specification's UTC-date rule. Clocks are UTC RFC 3339 date-times.

### Multiplicity and ordering

One queue item may carry several independent reasons:

* Onboarding returns at most one reason for the latest invitation and one reason for every overdue intake assignment. Invitation follow-up becomes actionable strictly after `follow_up_due_at`; resending replaces the latest-invitation clock. An intake due today or without a due date is not overdue.
* Programming returns at most one reason per required service. All may contain both Training and Nutrition reasons; a service-filtered list returns only the matching service reasons.
* The other v1 queues return one reason per item.

The first reason is the primary explanation; there is no duplicate `primary_reason` field. Onboarding orders oldest-due action first, then code and referenced entity id. Programming orders never programmed, missing coverage, then ending soon; ties use earliest uncovered date, Training before Nutrition. Duplicate Programming reasons are prevented by `(code, service)` and other duplicates by `(code, referenced entity id)`.

### Programming classification

For each required service, evaluate the earliest uncovered day in the bounded eight-day window:

* No plan has ever been assigned for the service: `service_never_programmed`.
* The first uncovered day is today or earlier: `service_coverage_missing`.
* The first uncovered day is after today: `service_coverage_ending_soon`.

A future internal gap is `service_coverage_ending_soon`. Draft, unassigned, or deleted plans do not prevent `service_never_programmed`; a historically assigned plan does, even after it expires.

### Counts and list parity

Counts measure queue items, not reasons. The workbench count shape is:

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

Programming service counts may overlap; `programming.all` counts distinct clients. No counts are grouped by reason.

Counts and lists must consume the same reason-bearing membership facts. Lists group those facts by queue-item identity and return ordered reasons. Counts aggregate distinct queue-item identities from those same facts; Programming filters the fact set by service before counting distinct clients.

### Simplicity and efficiency guardrails

* Do not build a configurable or generic rules engine. Each queue query emits its small typed reason facts from the same data that establishes membership.
* Keep aggregation in the tenant-scoped database query. Do not load reason rows into application memory merely to calculate counts, and do not add per-client queries.
* Share the membership query or composable query source between list and count projections; do not maintain parallel predicates.
* Select absolute semantic dates and identifiers already needed by the predicate. Do not add computed display strings, days-remaining fields, a generic `actionable_at`, or grouped-reason statistics.
* Keep the OpenAPI union explicit even if its schemas are repetitive. Precise generated frontend types are preferable to a sparse generic object and require less defensive UI logic.
