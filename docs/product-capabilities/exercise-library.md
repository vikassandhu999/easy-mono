# Exercise library

Owner: Training

## Supported outcome

A coaching business can maintain a shared business-owned exercise library for building plans and recording workouts while retaining a read-only globally shared library as starting content.

## Available information

* Collection context: matching count, newest-first results, name search, pagination, and muscle and equipment filters. A result matches any selected item within each filter; when both filters are used, it must match at least one selected muscle and one selected equipment item.
* Exercise identity: name; system, imported, or custom source; global or business ownership; tracking type; description; instructions; mechanics; force; images; creation time; and last update time.
* Tracking type: weight and reps, bodyweight reps, weighted bodyweight, assisted bodyweight, reps only, duration, weight and duration, distance and duration, or weight and distance.
* Classification: compound, isolation, or isometric mechanics; push, pull, or static force; and linked muscles and equipment.
* Reference data: searchable, alphabetically ordered muscles and equipment with names and optional descriptions.

## Supported actions

* Any coach can browse, search, filter, and inspect globally shared exercises and exercises owned by the business.
* An active client can browse, search, filter, and inspect the same visible exercises for workout execution and history.
* Any coach can create a business-owned exercise with a name and optional descriptive, classification, image, muscle, and equipment information.
* Any coach can edit or delete a business-owned exercise, regardless of which coach created it.
* Any coach can copy any visible exercise into the business-owned library after supplying a name.

## Lifecycle

* Globally shared exercises are read-only reference content. Business-owned exercises are shared editable content within one coaching business; the source label is separate from that ownership boundary.
* A copied exercise becomes a separate business-owned exercise. Later changes to the original do not update the copy.
* Exercise edits are visible anywhere the live exercise is loaded, including existing reusable and assigned plans.
* Deleting a business-owned exercise removes the live exercise reference from planned and performed rows without deleting those rows. Stored exercise names and workout-session snapshots preserve partial history.

## Conditions

* A business can see every globally shared exercise and its own business-owned exercises, never another business's exercises.
* Globally shared exercises cannot be edited or deleted. Copying is the supported way to adapt one.
* Business-owned exercise names must be unique within the business.
* The muscles and equipment lists are global reference vocabularies rather than coach-owned library content.
* Client access requires an active client account.

## UX-relevant constraints

* Name is required and accepts at most 255 characters. Description accepts at most 5,000 characters and instructions at most 10,000.
* The supported create and edit requests cannot choose a tracking type. A new business-owned exercise defaults to weight and reps.
* Copying preserves descriptive content, images, mechanics, force, muscles, and equipment, but it does not preserve tracking type. The copy also defaults to weight and reps.
* The product does not expose creator attribution, private ownership, or a dependable usage count for exercises.
* Unknown muscle or equipment identifiers are omitted rather than reported individually. A partially valid selection can therefore save with fewer relationships than requested.
* Images are stored as string references. The exercise capability has no upload, crop, ordering, or media-recovery workflow.
* There is no dependency-impact check before exercise deletion. Plans may retain a planned row whose exercise can no longer be resolved.

## Related capabilities

* Training plan authoring and assignment: places exercises and planned sets inside reusable and assigned workouts.
* Workout execution and history: uses visible exercises for planned, swapped, added, and freestyle work while preserving names and snapshots.
* Attachments: would own an upload workflow if exercise images stop being external string references.

## Unsupported assumptions

* Coach-authored tracking types, custom tracking types, or automatic tracking-type inference require product and API work.
* Private trainer exercise libraries, per-exercise permissions, approvals, publishing, revisions, and rollback are not supported.
* Creating or editing the global muscle and equipment vocabularies is not exposed as a coach or client action.
* Video hosting, file upload, image transformation, barcode-style exercise lookup, and external exercise import are not supported product workflows.
* Safe deletion based on complete plan and history impact is not supported.

## Verification evidence

* `backend/lib/easy/exercises.ex` and `backend/lib/easy/training/training_exercise.ex`: library visibility, search, filters, mutations, defaults, and validation.
* `backend/lib/easy_web/open_api/schemas/exercise.ex`: supported request and response information.
* `backend/lib/easy_web/controllers/coaches/exercise_controller.ex` and `backend/lib/easy_web/controllers/clients/exercise_controller.ex`: coach and client actions.
* `backend/priv/repo/migrations/20260703000300_create_training.exs`: business-name uniqueness and deletion behavior for exercise references.
* `backend/test/easy_web/controllers/coaches/exercise_controller_test.exs` and `backend/test/easy_web/controllers/clients/exercise_controller_test.exs`: visibility, filters, read-only system content, copying, and tenant isolation.
