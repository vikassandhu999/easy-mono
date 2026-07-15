# Design Envelope: Prospects and enrollment

Derived from: [Prospect management and enrollment](../prospect-management-and-enrollment.md), [Landing page authoring and applications](../landing-page-authoring-and-applications.md), [Client relationships](../coach-client-relationships.md), and [Billing and seats](../billing-and-seats.md)

## Supported outcome

Coaches in a business can review public applicants together, record a shared review state and note, and turn a suitable prospect into a pending client invitation.

## Available information

* A newest-first prospect collection with optional new, reviewing, won, or lost filter.
* Pages of 20 by default and up to 100, with the matching result count and business-wide totals for all four statuses.
* Prospect details: name, phone, email, Instagram, application answers, source page slug, optional selected program, shared note, status, and submitted and updated times.
* An optional linked client with name and relationship status.
* Application answers identified by question identity. Their original wording is unavailable if the current landing page no longer has the same question.
* A selected program's identity and name while that association remains available.

## Supported actions

* Any coach in the business can inspect the shared collection and a prospect's details.
* A coach can filter by status, move between result pages, replace the shared note, mark a prospect reviewing, or mark an unenrolled prospect lost.
* A coach can begin enrollment using the submitted contact details and can supply replacement invitation name, email, or phone values.
* Enrollment creates a pending client invitation, assigns that client to the enrolling coach, assigns the effective onboarding question set and creates the standard onboarding questions when none exists, links the client, and marks the prospect won.
* Repeating enrollment for an already linked prospect returns the linked client.
* When there is no email, a coach can copy the pending invitation link for manual sharing.

## Lifecycle

* A public application starts as a new prospect.
* Reviewing and lost are shared review labels. Won is the supported result of successful enrollment.
* The note is one shared value. Saving another value replaces it.
* Enrollment first creates the pending client invitation and then links it to the prospect. Success ends with a linked client and won status.
* Invitation acceptance later changes the client relationship from pending to active; it does not happen during enrollment.
* Revoking a linked pending invitation removes the client and its link but can leave the prospect marked won.
* Later landing-page edits can remove a selected-program association or the labels for older application answers.

## Conditions

* All coaches in the business share prospect access. Trainer assignment does not limit it.
* Prospects originate from public applications; direct coach creation is unavailable.
* Enrollment needs an email or phone after replacement invitation values are applied.
* Client seat capacity, self-invitation, duplicate active email, and contact rules apply.
* The enrolling coach becomes the pending client's assigned trainer.
* A linked client, not the won label alone, is the dependable evidence that enrollment completed.
* The supported flow does not offer manually setting won without enrollment or moving a linked prospect away from won.

## UX-relevant constraints

* Submitted contact details and answers are read-only. Invitation values changed during enrollment do not rewrite the original application.
* Selected program is optional and may disappear after later page edits. Treat it as context, not durable reporting data.
* Question wording is not preserved with an application. Unknown answer identities need a neutral fallback instead of an invented label.
* The collection has no search, coach filter, custom sorting, or bulk selection.
* Notes have no author, history, or conflict warning. They should not be treated as an activity timeline.
* Enrollment creates a pending client, not an active relationship. Acceptance and email verification remain separate.
* Enrollment can partially succeed: the client invitation may exist even when linking the prospect fails. After an uncertain failure, refresh both records before retrying and expose any already-created pending client.
* Capacity failure leaves the prospect unchanged. It needs a clear path to capacity resolution without implying that enrollment is queued.
* Phone-only enrollment cannot send an email. Preserve a visible invitation link for manual sharing, and make clear that the invitee must still supply and verify an email during acceptance.
* A won prospect without a client link has no dependable retained history. Use a neutral recovery state rather than claiming whether an invitation was revoked, status was changed manually, or data became inconsistent.
* Empty collection, empty filter result, missing program, unknown answer label, note save failure, invalid contact details, capacity failure, uncertain enrollment, pending invitation, and completed link need intentional states.
* There is no prospect conversation, notification, reminder, task, delivery receipt, or follow-up timeline.

## Related capabilities

* Landing page authoring and applications creates each prospect and supplies present-day question and program context.
* Client relationships owns the pending invitation, assigned trainer, seat-dependent state, and ongoing relationship.
* Authentication and invitation acceptance owns verification and activation after enrollment.
* Check-in library owns the effective onboarding question set assigned with the pending client.
* Billing and seats owns capacity resolution when enrollment cannot proceed.

## Unsupported assumptions

* Coach-created or imported prospects, deletion, merging, deduplication, and bulk actions are unsupported.
* Custom stages, scoring, tags, owners, assignment, tasks, reminders, activity history, and automated follow-up are unsupported.
* Search, custom sorting, conversion analytics, source analytics, and campaign attribution are unavailable.
* Editing the original application, direct prospect messaging, native WhatsApp, and email delivery tracking are unsupported.
* Direct activation, payment, subscription setup, and training or nutrition assignment during enrollment are unsupported.

## Example content

* A new prospect named Arjun submitted a phone number, chose "12-week strength coaching," and answered two questions. Every coach in the business can review the same record.
* A coach marks Arjun reviewing and replaces the shared note with "Call after 6 PM." The note has no author or earlier versions.
* During enrollment, the coach splits the submitted name into first and last name and adds an email. These values create the client invitation without changing Arjun's original application.
* Enrollment succeeds. Arjun is linked to a pending client, assigned to the enrolling coach, and marked won. He is not active until he accepts the invitation.
* A phone-only prospect is enrolled. The coach copies the invitation link and shares it manually because there is no email destination.
* Enrollment reports an uncertain failure. Refresh shows that a pending client was created but not linked, so the coach can resolve that partial result instead of creating another invitation.
