# Design Envelope: Weight tracking

Derived from: [Weight tracking](../weight-tracking.md), [Client relationships](../coach-client-relationships.md), and [Completion and submissions](../completion-and-submissions.md)

## Supported outcome

An active client can maintain a dated weight history and understand its change against a current goal, while permitted coaches can inspect the same history without editing it.

## Available information

* Each entry has a date, value, kilograms or pounds, optional client note, creation time, and self-logged or check-in-derived origin.
* A derived entry provides its check-in submission identity but not a check-in title or question label.
* History is ordered oldest to newest and can be narrowed from an inclusive date. No separate total is supplied.
* The current weight goal is available as a value and unit, or is absent.
* A summary supplies earliest and latest points converted into the latest point's unit, their total change, and that unit. Each point contains only date, value, and unit.
* Coaches also receive coverage labelled as 30 days, counting distinct entry dates from its lower date boundary.

## Supported actions

* A client can inspect history, save a self-logged measurement for a chosen date, and add an optional note.
* Saving a second self-log for the same date updates that self-log rather than adding another. A supplied note can replace its note, but clearing or omitting the note preserves the earlier value.
* A client can permanently delete any entry, including one derived from a check-in.
* A business owner can inspect visible active or inactive clients. A trainer can inspect visible active or inactive clients currently assigned to them.
* Coaches cannot add, change, or delete client measurements.
* Completing a check-in with weight answers can add derived entries automatically.

## Lifecycle

* One self-log can exist per date. Several check-in-derived entries, plus that self-log, can share the date.
* A check-in-derived entry takes the completed check-in's UTC submission date and inherits its unit from the newest entry, then the goal, then the business default.
* Changing the goal does not change earlier measurements or preserve earlier goals.
* Changing a self-log's date requires deletion and recreation.
* Deleting a derived entry leaves the completed check-in and its answer unchanged.
* Narrowing the viewed history recalculates its change summary. The coach's logging coverage stays tied to its own lower date boundary.

## Conditions

* Client participation requires an active coaching relationship.
* The business owner can inspect visible active or inactive clients. A trainer can inspect visible active or inactive clients currently assigned to them. Pending relationships expose no history.
* A value must be greater than zero and less than 1,000.
* Units are kilograms and pounds. Notes are optional and limited to 500 characters.
* Dates through tomorrow in UTC are accepted to allow for timezone differences. Later dates are invalid.
* Goal value and unit appear together or are both absent.
* Multiple entries on one date count once toward logging coverage. An accepted entry dated tomorrow also counts, so the value labelled as a 30-day window can exceed 30 dates.

## UX-relevant constraints

* Treat direction neutrally. Do not label every decrease as success or every increase as failure.
* Mixed units are valid. Convert individual points before placing them on one scale, and convert goal and latest value before calculating distance.
* There is no saved preferred display unit. A unit choice must remain clear wherever values are entered, compared, or summarized.
* Several readings may share the latest date. The supplied summary cannot reliably identify which same-date reading was newest, so do not give that choice false precision.
* Saving a date that already has a self-log replaces it. Make the replacement clear before the person confirms it.
* A prior note cannot currently be cleared through a same-date save. Do not offer a clear-note action that appears to succeed while retaining the old note.
* Deletion is permanent. Deleting a check-in-derived measurement does not remove or revise its original check-in answer.
* A check-in-derived origin can be identified, but its title and question label are unavailable. Do not invent a direct-open action.
* Empty history, goal without history, one reading, multiple same-date readings, mixed units, missing goal, loading, validation failure, and read failure need intentional states.
* With fewer than two usable readings, no trend can be claimed.
* A weight question inherits the newest entry's unit, then the goal unit, then the business default. That inherited unit must be displayed consistently; selectable units are not supported for check-in weight questions.

## Related capabilities

* Client relationships owns the current weight goal and the relationship that permits access.
* Completion and submissions owns completed check-in answers and the creation of derived measurements.
* Check-in lifecycle supplies the assigned check-in occurrence.
* Authentication and invitation acceptance includes choosing the business's default weight unit during owner onboarding.

## Unsupported assumptions

* Generic trackers, body measurements, body fat, medical interpretation, and a dedicated progress-photo gallery are outside this capability.
* Coach-entered measurements and client-owned goal changes are unsupported.
* Goal history, target dates, desired direction, achieved state, and automatic goal changes are unavailable.
* Logging schedules, reminders, streaks, notifications, coach alerts, and prescribed adherence are unsupported.
* Restore, direct date editing, bulk actions, export, pagination, and a saved display-unit preference are unsupported.
* A deleted derived measurement does not alter its completed check-in answer.

## Example content

* Sam logs 78.4 kg for today with the note "After breakfast." Saving 78.1 kg for the same date updates that self-log instead of creating another.
* A weekly check-in adds a second measurement on the same date. Both entries remain visible with different origins rather than being silently collapsed.
* Jordan's latest entry is 176 lb while the current goal is 78 kg. Both are converted before distance to goal is shown.
* A client has a goal but no measurements. The goal can be shown as context, but no change or trend is claimed.
* A trainer sees six distinct logged dates from the coverage period's lower boundary. Two measurements on one day still count as one logged date.
* A client deletes a check-in-derived measurement after confirmation. The history updates, while the completed check-in answer remains unchanged.
