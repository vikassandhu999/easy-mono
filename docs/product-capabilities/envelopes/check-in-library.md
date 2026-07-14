# Design Envelope: Check-in library

Derived from: [Check-in library](../check-in-library.md)

## Supported outcome

A coaching business can maintain reusable question sets for onboarding and check-ins without redefining them for each client.

## Available information

* Shared library: every reusable question set in the business, with a product type of onboarding or check-in, plus a name, active or archived state, creation time, and last update time.
* Question set: ordered sections containing ordered questions. Section titles are optional.
* Question definition: label, answer type, required setting, and options for single-select or multi-select questions.
* Answer types: text, number, yes/no, date, single select, multi-select, rating from 1 through 5, weight, and photos.
* Common questions: editable starting questions grouped under body, training, nutrition, recovery, and mindset.
* Starter content: an editable weekly check-in and one effective onboarding question set.

## Supported actions

* Any coach in the business can access the shared library and inspect question sets of either type.
* A coach can create an active check-in question set with a name and one or more questions grouped into sections.
* A coach can edit the onboarding question set or a check-in question set, including its name, ordered sections, question labels, answer types, required settings, and select options.
* A coach can start with a common question or a blank question, then add, remove, or reorder sections and questions.
* A coach can delete a question set only when no assignment or schedule still references it.

## Lifecycle

* Each library access ensures that the business has an editable weekly check-in starter. If an unused starter is deleted, a replacement is created the next time the library is accessed.
* Client invitation assigns the oldest active onboarding question set. If none exists, the standard onboarding questions are created and assigned.
* Edits apply to open, unanswered assignments because they use the live question set.
* A completed submission keeps a snapshot of the full question structure, including optional questions left unanswered, so later edits do not rewrite that submission.
* Active and archived states may be present, but archive does not reliably stop scheduling or existing assignments and is not a complete retirement workflow.
* An existing assignment blocks deletion even after completion, dismissal, or a missed occurrence. A schedule also blocks deletion while it exists.

## Conditions

* The owner and trainers share the same business library. Its contents are not private to their creator.
* Clients receive questions only through onboarding assignment or check-in scheduling; they cannot browse the library.
* Coach-created reusable question sets are check-ins. Onboarding uses the single effective onboarding question set, which coaches may edit.
* Check-ins can feed scheduling. Onboarding cannot be scheduled as a check-in.
* Type is fixed as product behavior after creation.
* The product does not identify a starter item or the effective onboarding default in the returned information.

## UX-relevant constraints

* Each question set needs a nonblank name and at least one question. Every question needs a nonblank label and supported answer type; section titles are optional.
* Single-select and multi-select questions need at least one nonblank option. Duplicate option text is not rejected.
* Required answers cannot be missing, an empty string, or an empty list.
* Ratings are fixed to 1 through 5. Weight must be greater than 0 and less than 1,000. A photo answer accepts one to four distinct client-owned images.
* Weight answers add to client weight history. Photo answers depend on client-owned image uploads.
* Saving replaces the full ordered question set. There is no draft, publish, revision, rollback, or edit-conflict flow.
* Editing a used question set changes open assignments immediately. Completed submissions keep their saved question snapshots.
* No usage count or deletable flag is available. An assignment-blocked delete may only become known after the attempt; failure must preserve the item and explain the assignment dependency.
* A future schedule with no generated occurrence can also block deletion, but that failure does not have a dependable recovery response.
* Archived items may appear, but archived state does not reliably prevent scheduling. Do not treat archive as a supported retirement control.

## Related capabilities

* Client relationships: supplies invitation and incomplete-onboarding attention.
* Check-in lifecycle: supplies schedules, occurrences, due and missed states, reminders, pause, and resume.
* Completion and submissions: supplies client answering, submission state, validation, and question snapshots.
* Check-in review and messaging: supplies review and conversation handoff.
* Weight tracking and attachments: receive weight and photo answer effects.

## Unsupported assumptions

* A third type beyond onboarding and check-in requires approval and product work.
* Creating several onboarding question sets, choosing an onboarding default, or assigning onboarding outside client invitation requires approval and product work.
* Changing an item's type after creation or making archive block new use requires approval and product work.
* Conditional questions, branching, scoring, calculated results, question help text, configurable rating scales, or configurable numeric bounds require approval and product work.
* Descriptions, creator attribution, private trainer items, per-item permissions, usage counts, or default markers require approval and product work.
* Server-side drafts, publishing, revisions, rollback, or edit-conflict detection require approval and product work.

## Example content

* Client onboarding is an active onboarding question set with 4 sections and 15 questions. About you and goals includes a required primary-goal selection, required success-in-three-months text, and optional target-weight number. Training, nutrition, and lifestyle contain the remaining questions.
* Weekly check-in is an active check-in question set with 4 sections and 11 questions. Body contains optional weight and progress photos. Recovery and adherence contain six optional 1-to-5 ratings. Reflection contains three optional text questions.
* Monthly reflection is an archived check-in with an existing completed assignment. It remains readable and editable, cannot be deleted while that assignment exists, and archived state does not guarantee that scheduling will reject it.
