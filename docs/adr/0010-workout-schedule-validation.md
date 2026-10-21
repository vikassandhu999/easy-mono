---
status: accepted
date: 2026-10-18
---

# Validate client workout schedules within their date window

A coach assigns a client-owned workout to selected weekdays. One schedule row shares its date window and session details across those weekdays. Keep the weekly rule on the row; expected occurrences remain calculated from it under W13.

## Dates and time

The weekday mask is required and ranges from 1 to 127, with Monday = 1 through Sunday = 64. The stored start date is required. On creation, an omitted start defaults to the client's current local date, supplied by the context. A chosen future start must be preserved. A static schema default cannot represent each client's local today.

The end date is optional and inclusive. Null repeats until stopped. A supplied end must be on or after the start, and the date window must contain at least one selected weekday. Equal start/end dates work when that weekday is selected. A one-week assignment can end on that week's Sunday. No separate one-week flag is needed.

Time is optional and uses the client's timezone. Null means anytime on the scheduled date; `00:00` means midnight. Each selected weekday uses the same time. Different times require separate schedule rows.

## Session details and ownership

Place is optional free text. Meeting URL is an optional full HTTP or HTTPS URL with a host. Both trim surrounding whitespace and store blank input as null. At most one can be set; both may be null. Switching locations requires clearing the previous value explicitly.

The optional coach reference identifies the session leader. A newly selected coach must be active and belong to the business. Removing that coach later must preserve references on past sessions.

Business, client, and workout references are required. Business and client remain fixed after creation. The workout must belong to the same client and business; library workouts are copied first. Retaining client_id on the schedule supports direct client filtering. Composite foreign keys must prevent disagreement with the workout's ownership.

## Draft changesets and implementation boundary

`WorkoutSchedule.insert_changeset/5` takes trusted business/client/workout IDs, input, and the client's local today. `update_changeset/2` takes the existing row and input. Ordinary input cannot set identity, ownership, workout reference, or timestamps. A context operation that changes the referenced workout must follow the history rules in W14 and W37–W39.

Both changesets validate required UUIDs, a valid weekday mask, inclusive date ordering, and at least one matching weekday. They cast optional time and validate normalized location fields. Partial updates retain omitted values and check the complete resulting date window and location combination. Explicit null clears optional fields; it cannot clear the required start date. Weekday matching needs at most seven checks regardless of window length.

The [review draft](../../.scratch/workout/models.ex) registers database constraints but does not create them. Its standalone checks cover valid and invalid inputs, partial updates, protected reference fields, all seven weekdays, short and long date windows, URL shape, and midnight versus no time. They do not query a database.

The persistence context must still authorize access, resolve references, check newly selected coaches are active, apply [workout content readiness](0009-workout-content-readiness.md), handle the client's timezone, and preserve past schedule facts. Runtime context/API code must accept chosen dates instead of forcing today. Database migrations and app integration remain outside this draft change.

This records W56–W63 in the [workout concept](../../.scratch/workout/concept.md). Record a superseding decision if these rules change.
