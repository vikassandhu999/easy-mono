# Design Envelope: Check-in lifecycle

Derived from: [Check-in lifecycle](../check-in-lifecycle.md)

## Supported outcome

A coach can schedule one-time or recurring check-ins for a client, while the product creates due occurrences and supports each one through completion, dismissal, or missed state.

## Available information

* Schedule: client, selected check-in question set, cadence, next due date, active state, creation time, and last update time.
* Cadence: once, weekly, every two weeks, or monthly.
* Occurrence: selected check-in, linked schedule, due date when present, state, completion time when present, creation time, and last update time.
* Occurrence states: to do, in progress, completed, dismissed, and missed. Due today and overdue are derived from the due date of an open occurrence.
* Reminder record: whether the due email or overdue email was recorded as sent, and when.
* History: schedules and every generated occurrence remain available for each visible client.

## Supported actions

* A coach can create an active schedule for a visible client by selecting a check-in question set, first due date, and cadence.
* A coach can change a schedule's cadence or next due date and can pause an active schedule. A paused recurring schedule can be resumed.
* A coach can set, change, or clear the due date of an open occurrence without changing the schedule's next due date.
* A coach can dismiss an open occurrence. The dismissal closes that occurrence without pausing its schedule.
* A coach can delete a schedule only before it has generated an occurrence.
* An active client can open a to-do, in-progress, due-today, or overdue occurrence and complete it through the Completion and submissions capability.

## Lifecycle

* For an active client, creating a schedule with a first due date today or earlier immediately creates one occurrence. A future first due date waits for daily processing.
* For an active client, a due recurring schedule marks any existing open occurrence from that schedule as missed, creates one occurrence with the stored due date, and advances until its next date is after the processing date. Missed cadence dates do not create backlog occurrences.
* For a client who is not active, a recurring schedule advances without creating occurrences. A due one-time schedule becomes inactive without creating an occurrence.
* A one-time schedule becomes inactive when its due date is processed. If it created an occurrence, that occurrence remains open until completion or dismissal and can remain overdue without a time limit.
* An overdue recurring occurrence remains open until completion or dismissal, or until the next occurrence makes it missed.
* Pausing stops future occurrence generation. It does not close an open occurrence or stop that occurrence's due and overdue email eligibility.
* An open occurrence is eligible for a due email on its due date and an overdue email from two days late onward. A successful send of each reminder type is recorded.

## Conditions

* The business owner can manage schedules for every client in the business. A trainer can manage schedules only for clients they coach.
* Scheduling accepts check-in question sets, not onboarding question sets. Archived check-ins remain eligible for new schedules, and their existing schedules continue generating occurrences.
* Only one active schedule can pair the same client with the same check-in question set. The client may have active schedules for different check-ins.
* Schedules can be created for visible clients regardless of client status, but only active clients receive new occurrences. Making a client inactive does not close an existing open occurrence or stop its reminder eligibility.
* A schedule controls future occurrence generation. An occurrence has its own due date and state. Changing one does not update the other.
* Dismissing an occurrence does not pause its schedule. A later occurrence can still be generated.
* Dates are calendar dates evaluated against UTC. Schedules and reminders have no time-of-day or client-timezone setting.

## UX-relevant constraints

* Weekly cadence adds 7 days and every-two-weeks cadence adds 14. Monthly cadence adds one calendar month to the last stored date and clamps invalid dates to month end. The clamped date becomes the next anchor, so 31 January becomes 28 February and then 28 March in a non-leap year.
* Creation is the only schedule change that can generate an occurrence immediately. Changing or resuming a schedule due today or earlier waits for daily processing.
* A paused schedule can coexist with an active replacement using the same client and check-in. Resuming the paused schedule then fails until the conflicting schedule is paused or deleted.
* An inactive one-time schedule has no paused-or-finished reason. An occurrence proves that it ran, but no occurrence does not prove that it was paused: a due schedule for a non-active client also finishes without creating one.
* A schedule with any occurrence history cannot be deleted, including when every occurrence is completed, dismissed, or missed. Pausing is the supported way to stop a used recurring schedule.
* An open occurrence with no due date stays to do and receives no due or overdue email. A later recurring occurrence can still make it missed.
* Changing an occurrence's due date does not clear a recorded reminder. The same reminder type is not sent again for the changed date once its successful send is recorded.
* Clients without an email address receive no email reminders. A failed due-date email is not retried as a due reminder after that date, but the occurrence may later qualify for an overdue email. A failed overdue email can be retried on a later daily cycle while the occurrence remains open. Send failure is not exposed.
* Opening an occurrence does not save progress or move it to in progress. Answers remain unsaved until the Completion and submissions capability accepts them.
* Repeat creation can produce another schedule and occurrence, especially for a one-time check-in due today. The pending action must block a repeat request.

## Related capabilities

* Check-in library: supplies the reusable check-in question sets that schedules select.
* Client relationships: supplies client visibility, the responsible trainer, and active or inactive client state.
* Completion and submissions: supplies answer entry, validation, saved answers, completion, and question snapshots.
* Check-in review and messaging: supplies reviewed state, the review queue, and conversation handoff after completion.

## Unsupported assumptions

* Custom intervals, selected weekdays, skipped dates, end dates, occurrence limits, due times, and timezone-aware delivery require approval and product work.
* Bulk or multi-client scheduling, schedule copying, occurrence previews, and manual occurrence generation require approval and product work.
* Switching a schedule to another client or check-in question set requires approval and product work.
* Several active schedules for the same client and check-in question set are not supported.
* Scheduling onboarding questions as a check-in is not supported.
* Manual reminder sending, resend controls, custom reminder timing, snooze, SMS, push, in-app reminders, and coach escalation require approval and product work.
* Saved answer drafts, autosave, and a dependable client-triggered in-progress transition require approval and product work.
* Reopening completed, dismissed, or missed occurrences, manually marking an occurrence completed or missed, and setting occurrence priority require approval and product work.
* Resuming an inactive one-time schedule as another one-time occurrence requires approval and product work.

## Example content

* Weekly progress for Aisha is active and repeats weekly. Its next schedule date is 18 July 2026. The open occurrence due 11 July is overdue, with both due and overdue emails recorded. If it remains open on 18 July, it becomes missed and a new occurrence is created.
* Monthly reflection for Meera is paused with a next schedule date of 31 July 2026. Its open occurrence due 30 June remains overdue and available for completion; pausing did not close it or stop its reminder eligibility.
* Quick update for Kabir was a one-time schedule due 15 July 2026. It created one to-do occurrence and became inactive. The schedule is finished and cannot be deleted because it has occurrence history.
* Weekly check-in for inactive client Rohan advanced from 15 July to 22 July 2026 without creating an occurrence. It can generate again after Rohan is active, with no backlog for the skipped date.
