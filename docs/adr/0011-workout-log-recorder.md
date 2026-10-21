---
status: accepted
date: 2026-10-18
---

# Keep workout recorder references in the coaching domain

A workout log records which client or coach originally created it. Use the log's coaching references instead of storing a user identity reference. Authentication still determines who can act; the writer must resolve and authorize that person's coaching role before creating the log.

| recorded_by | client_id | coach_id |
|---|---|---|
| client | Required; the client who trained and recorded | Must be null |
| coach | Required; the client who trained | Required; the coach who recorded |

Use `coach_id` as the log field name, as chosen by the user. Its meaning is the recording coach. `WorkoutSchedule.coach_id` continues to mean the assigned session leader. These can differ: one coach can record a session assigned to another coach. Coach recording also works when the log has no schedule, so the recorder cannot be inferred from the schedule.

`recorded_by` has only `client` and `coach` values and no automatic default. The server sets it together with the coaching references from the authorized context. The recorder is fixed after creation, including corrections and reopening. Ordinary input must not be allowed to replace it.

The future database must require `recorded_by`, enforce the two valid field combinations, and use a composite foreign key to keep the recording coach in the log's business. Removing a coach from the business must preserve past recorder references.

The [review draft](../../.scratch/workout/models.ex) declares the enum and coach association. Its [log changesets](0014-workout-log-validation-and-lifecycle.md) validate the recorder combination and keep it fixed after creation. The persistence writer remains pending. The runtime still stores a user UUID in `recorded_by`; this decision does not alter stored data or the running apps.

During implementation, existing user UUIDs need an explicit mapping to the client or coach in that log's business. A UUID cannot be cast directly to the new enum. Rows whose recorder cannot be identified unambiguously need resolution before migration; do not infer their recorder from the schedule leader.

This records W70 in the [workout concept](../../.scratch/workout/concept.md).
