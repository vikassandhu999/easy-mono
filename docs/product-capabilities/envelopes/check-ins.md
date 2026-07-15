# Design Envelope: Check-ins

Derived from: [Check-in library](../check-in-library.md), [Check-in lifecycle](../check-in-lifecycle.md), [Completion and submissions](../completion-and-submissions.md), and [Check-in review and messaging](../check-in-review-and-messaging.md)

## Supported outcome

A coaching business can define reusable onboarding and check-in questions, schedule check-ins for clients, receive completed responses, and review them with optional feedback through the client's single coach-client conversation.

## Available information

* Library: onboarding and check-in question sets with a name, active or archived state, creation time, last update time, ordered sections, and ordered questions.
* Question definition: label, answer type, required setting, and select options when applicable. Supported answers are text, number, yes/no, calendar date, single select, multi-select, rating from 1 through 5, weight, and photos.
* Starting content: editable common questions grouped under body, training, nutrition, recovery, and mindset, plus an editable weekly check-in and effective onboarding questions.
* Schedule: client, selected check-in, cadence, next due date, active state, creation time, and last update time. Cadence may be once, weekly, every two weeks, or monthly.
* Occurrence: selected check-in, linked schedule, due date when present, state, completion time when present, creation time, and last update time. States are to do, in progress, completed, dismissed, and missed. Due today and overdue are derived from an open occurrence's due date.
* History: every schedule and generated occurrence for a visible client, including whether and when each due and overdue email was recorded as sent.
* Completion: live questions while answering, followed by saved answers, submission time, photo information, and a stable snapshot of the submitted question structure.
* Review: visible client identity, unreviewed check-in submissions ordered newest first, review state and time, saved answers, and photos.
* Conversation reference: check-in title and submission time captured when a coach sends the reference. The reference identifies the submission without copying its answers into the message.

## Supported actions

* Any coach can inspect the shared library, create check-in question sets, and edit onboarding or check-in questions.
* Any coach can add common or blank questions, reorder or remove content, and delete a question set when no onboarding item, check-in occurrence, or schedule still references it.
* The business owner can manage schedules, inspect submissions, and review check-ins for every client. A trainer can do so for clients they coach.
* A coach can create a one-time or recurring schedule, change its cadence or next date, pause or resume it, change or clear an open occurrence's due date, and delete the schedule before it has generated an occurrence.
* A coach can dismiss an open occurrence. This closes that occurrence without pausing its schedule.
* An active client can answer and submit their own open onboarding or check-in item early, when due, or while overdue.
* An active client can revisit the latest saved submission for a completed item.
* A coach can mark an unreviewed check-in submission reviewed.
* A coach can prepare a check-in reference for the client's conversation, remove it before sending, send it alone, or combine it with supported message content.
* An active client can see whether their completed check-in has been reviewed and can open a check-in reference sent by a coach.

## Lifecycle

* Accessing the library restores an editable weekly check-in starter when none exists.
* Client invitation assigns the oldest active onboarding question set. If none exists, the standard onboarding questions are created and assigned.
* Edits apply immediately to unanswered items. A completed submission keeps its saved question structure despite later edits.
* A due recurring schedule makes any prior open occurrence from that schedule missed, creates one occurrence, and advances its next date beyond the processing date. Missed cadence dates do not create a backlog.
* A due one-time schedule becomes inactive after processing. Any occurrence it created remains open until completion or dismissal.
* A client who is not active receives no occurrence when a schedule is processed. A recurring schedule advances, while a due one-time schedule becomes inactive.
* Pausing stops future occurrences. It does not close an open occurrence or stop that occurrence's reminder eligibility.
* An open occurrence is eligible for a due email on its due date and an overdue email from two days late onward.
* A successful submission completes the item and saves its answers and question snapshot. Completed, dismissed, and missed items cannot be submitted.
* Completing onboarding clears incomplete-onboarding attention. It does not change coaching stage, create a plan, or copy answers into client profile fields.
* A completed check-in enters the review queue. Onboarding does not.
* Review is an acknowledgement. It does not change the occurrence or schedule, send feedback, or notify the client.
* A prepared check-in reference becomes persistent only when the coach sends it as message content.

## Conditions

* The library is shared by the owner and trainers. Clients receive questions through onboarding or check-in occurrences and cannot browse the library.
* Only check-in question sets can be scheduled. Onboarding questions are assigned through client invitation.
* Archived check-ins remain eligible for scheduling, and their schedules continue generating occurrences. Archive is not a dependable retirement control.
* Only one active schedule may pair the same client and check-in. Different check-ins may have separate active schedules.
* Only active clients can load or submit their items. Coaches may still review a visible submission after a client becomes inactive.
* Review access follows client visibility at the time of access. Reassigning a client transfers an unreviewed submission from the former trainer's scope to the new trainer's scope; the business owner retains access.
* A schedule controls future generation, while each occurrence has its own due date and state. Changing one does not update the other.
* Due state does not control submission eligibility. To-do and in-progress items are open; completed, dismissed, and missed items are closed.
* Schedule dates and reminders use UTC calendar dates without a configurable time or client timezone.
* A check-in reference must belong to the same client and business as the conversation. Clients cannot originate these references.

## UX-relevant constraints

* A question set needs a nonblank name and at least one valid question. Select questions need at least one nonblank option; duplicate option text is accepted.
* Saving replaces the whole ordered question set. There is no authoring draft, publish step, revision history, rollback, or edit-conflict handling.
* Editing a used question set can change what an answering client sees. There is no merge or version-recovery flow.
* Starter identity, the effective onboarding default, usage counts, and a deletable flag are unavailable. An onboarding item or occurrence dependency may become known only after deletion is attempted; a future-schedule dependency has no dependable recovery response.
* Required answers cannot be missing, empty text, or an empty selection. Ratings are integers from 1 through 5. Weight is greater than 0 and less than 1,000. General number answers have no configurable bounds.
* A photo answer accepts one to four distinct JPEG, PNG, WebP, or HEIC images, each no larger than 15 MB. The supported flow waits for selected uploads before submission, but final validation cannot confirm that every file transfer succeeded. An image cannot be reused across photo questions, and uploaded files remain when removed, abandoned, or followed by a failed submission.
* Client answers remain unsaved until final submission. Navigation, refresh, or a closed session can discard them, and opening an item does not move it to in progress.
* A final rejection identifies the answer collection rather than an individual question. Entered answers must remain available for recovery.
* Submission is immutable through supported actions. A pending submission must block repeats, and an uncertain result must be checked by reloading before retrying.
* Each weight answer adds a weight-history entry dated with the UTC submission date. Its unit comes from the client's newest weight entry, then goal-weight unit, then the business default, without conversion. The saved answer itself has no unit.
* The saved question snapshot does not contain the question-set name. Historical answers use the live name, so a later rename changes the name shown beside them.
* Monthly cadence advances by one calendar month and clamps invalid dates to month end. The clamped date becomes the next anchor.
* Creating a schedule due today or earlier can create an occurrence immediately. Changing or resuming one waits for daily processing.
* A paused schedule can coexist with an active replacement for the same client and check-in. Resuming it fails until the conflicting schedule is paused or deleted. Schedule creation has no duplicate-request protection; repeating due-now creation can create another schedule and occurrence, so the pending action must block repeats.
* A used schedule cannot be deleted. Pausing is the supported way to stop a recurring schedule with history.
* The review queue has no search, filtering, pagination, review assignment, or custom sorting. Its count is derived from the returned collection.
* The review queue and reviewed state have no real-time event; refresh is required to discover a submission or review completed elsewhere. Another coach may review the same submission while it is open, and simultaneous requests do not guarantee which reviewer is retained.
* Reviewed means acknowledged, not approved, accepted, answered, or accompanied by feedback. A reviewer name is not available from the review record.
* Preparing a check-in reference does not save or send it. Message delivery, failure recovery, unread state, and real-time updates belong to Messaging.

## Related capabilities

* Client relationships: supplies client identity, coaching status, trainer assignment, visibility, invitation-created onboarding, and onboarding attention.
* Messaging: owns the single coach-client conversation, message delivery, unread state, failure recovery, and real-time updates. This project covers only the check-in handoff and reference context.
* Attachments: owns private photo upload, access, and stored-file availability.
* Weight tracking: owns weight units, history, trends, progress against the relationship-owned goal, and later edits.

## Unsupported assumptions

* Additional question-set types, several selectable onboarding sets, branching, conditional questions, scoring, calculated results, configurable rating scales, and publishing require approval and product work.
* Changing a question set's onboarding or check-in type after creation is not supported.
* Descriptions, creator attribution, private trainer question sets, and per-item permissions are unavailable.
* Treating archive as a dependable retirement control requires product work.
* Custom schedule intervals, selected weekdays, skipped dates, end dates, occurrence limits, due times, timezone-aware delivery, bulk scheduling, and manual occurrence generation are not supported.
* Switching an existing schedule to another client or check-in, reopening a dismissed or missed occurrence, and manually marking an occurrence completed or missed are not supported.
* Manual reminder sending, custom timing, resend controls, snooze, SMS, push, in-app reminders, and coach escalation are not supported.
* Client drafts, autosave, offline completion, partial submission, answer recovery after navigation, and coach completion on behalf of a client are not supported.
* Editing, withdrawing, deleting, reopening, or resubmitting a completed response is not supported.
* Automatic scores, summaries, recommendations, profile updates, stage changes, plan creation, and coach notifications are not supported completion effects.
* A selectable or snapshotted weight unit, automatic weight conversion, video answers, arbitrary files, photo captions, cropping, and post-submission photo replacement are not supported.
* Approval, rejection, internal review notes, reviewer assignment, priority, bulk review, review reminders, and undoing review are not supported.
* Onboarding review and a separate check-in comment thread or feedback inbox are not supported. Feedback uses the single client conversation.

## Example content

* "Client onboarding" is an active onboarding question set with 4 sections and 15 questions. It mixes required selections and text with optional number questions. It is editable sample content, not a fixed system name or structure.
* "Weekly progress" is an active check-in with 4 sections and 11 questions. It includes weight, progress photos, adherence ratings, selections, and reflection text.
* Aisha has an active weekly "Weekly progress" schedule. Her occurrence due 11 July 2026 is overdue with both reminders recorded. If it remains open on 18 July, it becomes missed and a fresh occurrence is created. If she submits first, the saved weight, two photos, ratings, and reflections enter review instead.
* Aisha's submitted answers include weight 68.4, displayed as kg from related weight history; two progress photos; nutrition adherence 4 out of 5; and "Meal prep made weekdays easier" for "What went well this week?"
* "Monthly reflection" is archived but remains readable, editable, and eligible for scheduling. Meera's paused monthly schedule still has an overdue occurrence available for completion because pausing did not close it.
* Rohan is inactive. His weekly schedule advances from 15 July to 22 July 2026 without creating an occurrence or backlog.
* Kabir completes onboarding, which clears incomplete-onboarding attention without creating a review item, changing coaching stage, creating a plan, or copying answers into profile fields.
* A coach reviews Aisha's submission and separately prepares its reference with feedback in Aisha's conversation. Reviewing alone sends nothing; preparing the reference sends nothing until the message is sent.
