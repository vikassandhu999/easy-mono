# Prospect management and enrollment

Owner: Prospect management and enrollment

## Supported outcome

Coaches in a business can review prospects created by public applications, record a shared review state and note, and convert a suitable prospect into a pending client invitation.

## Available information

* Prospects are ordered newest first and can be filtered by new, reviewing, won, or lost status.
* The collection uses offset pagination with a default of 20 and maximum of 100 records, supplies the filtered-result count, and supplies business-wide totals for every status.
* A prospect includes name, phone, email, Instagram, answers keyed by application-question identity, source page slug, optional selected program, shared note, status, creation and update times, and optional linked client.
* A linked client includes identity, name, and current relationship status.
* The selected program provides its identity and name while the association still exists.
* Application answers do not preserve their original question labels. Labels can be recovered only from questions that remain on the current landing page with the same identities.

## Supported actions

* Every coach in the business can inspect the same prospect collection and prospect details, regardless of trainer assignment.
* A coach can filter by status, move through pages, change the shared note, mark a prospect reviewing, or mark an unenrolled prospect lost.
* The supported review flow uses new for an untouched application, reviewing for active consideration, lost for a declined opportunity, and won as the result of enrollment.
* A coach can enroll an unlinked prospect using its contact details or replacement first name, last name, email, and phone values supplied for the client invitation.
* Enrollment creates a pending client, assigns that client to the enrolling coach, assigns the effective onboarding question set and creates the standard onboarding questions when none exists, links the client to the prospect, and marks the prospect won.
* Repeating enrollment after a client is linked returns the linked client instead of creating another.
* When email is available, enrollment attempts to send the client invitation. A phone-only enrollment creates the pending relationship but requires the invitation link to be shared manually.

## Lifecycle

* A public application creates a new prospect. There is no separate application record.
* Review status is stored as a mutable label. The underlying behavior does not enforce forward-only transitions.
* Notes are one replaceable shared text value without author or revision history.
* Enrollment creates the client invitation before linking it back to the prospect. When both parts succeed, the prospect is linked and becomes won.
* A prospect with a linked client is already enrolled. A repeat enrollment returns that relationship.
* If a linked pending invitation is later revoked, the client is removed and the link becomes empty while the prospect remains won.
* Saving the source landing page recreates its programs and can remove an older prospect's selected-program association.
* Editing or replacing application questions can change or remove the labels available for older answers.

## Conditions

* Prospect access is limited to the same business but is shared by its coaches.
* Public applications are the supported way to create prospects. Coaches cannot add prospects directly.
* Enrollment requires an email or phone after applying any replacement contact values.
* Enrollment follows client-relationship rules for seat capacity, self-invitation, existing active email, and valid contact details.
* The newly created client is pending rather than active. Invitation acceptance remains a separate step.
* The enrolling coach becomes the client's assigned trainer, including when that coach is the business owner.
* Status updates are technically permissive, but a linked client is the reliable evidence of enrollment. The supported experience does not offer manual won status without a linked client.

## UX-relevant constraints

* Status alone does not prove enrollment. The underlying status can be set to won without a client or changed after enrollment; product treatment must use the client link as the source of truth.
* Contact details and application answers cannot be edited on the prospect. Replacement contact values entered during enrollment affect the client invitation rather than rewriting the original application.
* The collection has no search, coach-assignment filter, arbitrary sorting, or bulk actions.
* A missing selected program is valid and can result from a general application, stale selection, or later page save.
* Older answer labels can drift or disappear because applications do not capture question wording.
* Notes are shared plain text without an author, activity history, or conflict handling.
* Enrollment creates a pending invitation, not an active relationship, payment, or plan assignment.
* Enrollment is not fully atomic. The client invitation can succeed before prospect linking fails. After an uncertain result, refresh the prospect and client collection before retrying; a pending client may already exist.
* A seat-capacity failure leaves the prospect unenrolled and requires capacity resolution through Billing and seats.
* A phone-only enrollment needs an explicit way to copy and share the invitation link because no invitation email can be sent. The invitee must still supply and verify an email during acceptance.
* A won prospect without a client link is ambiguous. It may reflect a revoked pending invitation, a manual status change, or inconsistent data, so it requires a neutral recovery state rather than an invented history.
* There is no prospect notification, task, reminder, direct conversation, delivery tracking, or follow-up history.

## Related capabilities

* Landing page authoring and applications creates prospects and supplies current program and question context.
* Client relationships owns the pending client invitation, trainer assignment, relationship status, and later relationship management.
* Authentication and invitation acceptance owns the invited client's verification and activation journey.
* Check-in library owns the effective onboarding question set assigned during enrollment.
* Billing and seats owns the capacity limit checked during enrollment.

## Unsupported assumptions

* Coach-created prospects, imported leads, prospect deletion, merging, deduplication, and bulk actions are unsupported.
* Custom pipeline stages, lead scoring, tags, prospect owners, assignment, tasks, reminders, and follow-up history are unsupported.
* Search, arbitrary sorting, conversion analytics, source analytics, and campaign attribution are unsupported.
* Editing submitted contact details or answers on the prospect is unsupported.
* Prospect messaging, native WhatsApp, email delivery tracking, and automated sequences are unsupported.
* Direct activation, payment collection, subscription setup, and training or nutrition plan assignment during enrollment are unsupported.

## Verification evidence

* `backend/lib/easy/landing.ex` and `backend/lib/easy/landing/prospect.ex`: prospect creation, filtering, summaries, updates, enrollment, idempotency, and tenant boundaries.
* `backend/lib/easy_web/controllers/coaches/prospect_controller.ex`, `backend/lib/easy_web/controllers/coaches/prospect_json.ex`, and `backend/lib/easy_web/open_api/schemas/landing.ex`: collection, detail, status, note, and enrollment actions and information.
* `backend/lib/easy/clients.ex`: pending client creation, contact and duplicate rules, trainer assignment, onboarding assignment, and seat enforcement used by enrollment.
* `frontend/apps/coachapp-v2/src/prospects/list-prospects.tsx`, `frontend/apps/coachapp-v2/src/prospects/prospect-detail.tsx`, `frontend/apps/coachapp-v2/src/prospects/enroll-prospect.tsx`, and `frontend/apps/coachapp-v2/src/api/prospects.ts`: supported review, filtering, notes, status, invitation overrides, and enrollment use.
* `backend/test/easy_web/controllers/landing_funnel_test.exs`, `backend/test/easy/billing/seat_enforcement_test.exs`, and `backend/test/easy/clients/read_boundary_test.exs`: source-backed prospect, enrollment, capacity, and visibility behavior.
