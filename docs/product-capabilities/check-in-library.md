# Check-in library

Owner: Check-ins

## Supported outcome

A coaching business can maintain reusable question sets for onboarding and check-ins without redefining them for each client.

## Available information

* Shared library: every reusable question set in the business. Each has a product type of onboarding or check-in, plus a name, active or archived state, creation time, and last update time.
* Question set: ordered sections containing ordered questions. A section may have a title.
* Question definition: label, answer type, whether an answer is required, and answer options for single-select or multi-select questions.
* Answer types: text, number, yes/no, calendar date, single select, multi-select, rating from 1 through 5, weight, and photos.
* Common questions: editable starting questions grouped under body, training, nutrition, recovery, and mindset.
* Starter content: one editable weekly check-in for each business and one effective onboarding question set used during client invitation.

## Supported actions

* Any coach in the business can access the shared library and inspect question sets of either type.
* Any coach can create an active check-in question set with a name and one or more questions grouped into sections.
* Any coach can edit the onboarding question set or a check-in question set, including its name, section order, section titles, question order, question labels, answer types, required settings, and select options.
* Any coach can add an editable common question or a blank question, move questions or sections, and remove questions or sections while keeping at least one valid question.
* Any coach can delete a question set only when no assignment or schedule still references it.

## Lifecycle

* Each library access ensures that the business has an editable weekly check-in starter. If an unused starter is deleted, a replacement is created the next time the library is accessed.
* Inviting a client assigns the oldest active onboarding question set. If the business has none, the product creates the standard onboarding questions and assigns them.
* Questions remain live for open assignments. Editing or removing questions changes what clients with unanswered assignments receive.
* Submission stores a snapshot of the full question structure, including optional questions left unanswered. Later edits do not rewrite a completed submission.
* Active and archived states exist in the data, but archiving does not reliably retire a question set from scheduling or existing assignments. It is not a complete product lifecycle.
* An existing assignment blocks deletion even after it is completed, dismissed, or missed. A schedule also blocks deletion while it exists.

## Conditions

* The library belongs to the business. It is shared by the owner and trainers, with no creator ownership or owner-only management condition.
* Clients do not browse the library. They receive questions through onboarding assignment or check-in scheduling.
* Onboarding is assigned during client invitation. Check-ins feed the separate scheduling capability; onboarding cannot be scheduled as a check-in.
* Coach-created reusable question sets are check-ins. The product has no supported action for creating several onboarding question sets or choosing which one is the default.
* The onboarding or check-in type is fixed as product behavior. Although the data contract accepts a type change, changing it after use can contradict existing assignments and schedules.
* Starter identity and onboarding-default identity are not exposed. A design cannot reliably label an item as system-provided or selected as the default.

## UX-relevant constraints

* Each question set needs a nonblank name and at least one question. Section titles are optional, but every question needs a nonblank label and a supported answer type.
* Single-select and multi-select questions need at least one nonblank option. The product does not reject duplicate option text.
* Required questions reject a missing value, an empty string, or an empty list.
* Ratings use the fixed integers 1 through 5. Weight must be greater than 0 and less than 1,000. A photo answer accepts one to four distinct images when answered.
* Weight answers create entries in the client's weight history. Photo answers must use images that belong to the answering client. These effects occur during completion, not authoring.
* Saving replaces the full ordered question set. There is no draft, published version, revision history, rollback, or concurrent-edit protection.
* Editing a used question set affects open assignments without a publish step. Completed submissions remain readable from their saved question snapshots.
* The library does not provide usage counts or a deletable flag. A coach may learn that an assignment blocks deletion only after attempting it, so that failure must preserve the item and explain the assignment dependency.
* A future schedule with no generated assignment can also block deletion, but that failure does not have a dependable product-level recovery response.
* Archived items can be returned and edited, but archived state does not prevent check-in scheduling. Do not present archive as a dependable retirement control.

## Related capabilities

* Client relationships: assigns the effective onboarding questions during invitation and derives incomplete-onboarding attention from the assignment.
* Check-in lifecycle: supplies client schedules, one-time or recurring occurrences, due dates, reminders, missed state, pause, and resume.
* Completion and submissions: supplies client answering, validation, submission state, and saved question snapshots.
* Check-in review and messaging: supplies the review queue, reviewed state, answer review, and conversation handoff.
* Weight tracking and attachments: receive the side effects of weight and photo answers.

## Unsupported assumptions

* The product has exactly two types in this library: onboarding and check-in. A third custom type requires approval and product work.
* Creating several onboarding question sets, selecting a default, or assigning arbitrary onboarding questions outside client invitation requires approval and product work.
* Changing an item's type after creation requires approval and product work.
* Treating archive as a reliable way to prevent new assignments or schedules requires implementation work.
* Conditional questions, branching, scoring, calculated results, per-question help text, configurable rating scales, and configurable numeric bounds are not supported.
* Descriptions, creator attribution, private trainer items, per-item permissions, usage counts, and default markers are not available.
* Server-side drafts, publishing, revisions, rollback, and edit-conflict detection are not supported.

## Verification evidence

* `backend/lib/easy_web/controllers/coaches/form_template_controller.ex`, `backend/lib/easy_web/controllers/coaches/form_template_json.ex`, and `backend/lib/easy_web/open_api/schemas/client_profile.ex`: public form-template information and coach actions.
* `backend/lib/easy/forms/form_template.ex`: backend purposes and states, ordered structure, question types, and validation.
* `backend/lib/easy/forms.ex`, `backend/lib/easy/default_intake.ex`, and `backend/lib/easy/default_check_in.ex`: starter content, onboarding selection, assignment consequences, deletion rules, and submission snapshots.
* `backend/lib/easy/forms/form_submission.ex`: required-answer and answer-type validation.
* `backend/lib/easy/forms/check_in_schedule.ex` and `backend/priv/repo/migrations/20260711120000_add_check_in_schedules.exs`: check-in-only scheduling and schedule deletion constraints.
* `frontend/apps/coachapp-v2/src/api/checkins.ts`, `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx`, `frontend/apps/coachapp-v2/src/checkins/question-presets.ts`, `frontend/apps/coachapp-v2/src/checkins/create-checkin.tsx`, and `frontend/apps/coachapp-v2/src/checkins/edit-checkin.tsx`: product-facing authoring behavior and terminology gaps.
* `backend/test/easy/forms_test.exs` and `backend/test/easy_web/controllers/coaches/form_template_controller_test.exs`: source-backed defaults, validation, business isolation, editing, and deletion behavior.
