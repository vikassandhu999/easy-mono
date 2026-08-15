# Training plan authoring and assignment

Owner: Training

## Supported outcome

A coach can author reusable Training Templates, replace a complete Prescription atomically, assign an independent Client Plan, and tailor that copy without changing the Template or another client's plan.

## Available information

* Training Template collection: matching count, newest-first results, name search, archived filtering, and pagination.
* Plan: kind (`template` or `client_plan`), name, description, archive timestamp, revision, optional start and end dates, derived lifecycle for Client Plans, creator identifier, source Template when assigned, assigned client when present, creation time, and last update time.
* Workout: name, explicit position, ordered Prescribed Exercises, and the weekdays that schedule it.
* Prescribed Exercise: linked visible exercise, explicit position, and an ordered collection of Prescribed Sets.
* Prescribed Set: working, warm-up, or drop-set type; repetitions as text; optional load and unit; duration; distance and unit; RPE; rest; and notes.
* Workout Schedule: sparse weekday rows. Absence means rest. The same workout may occupy several weekdays.

## Supported actions

* Any coach can inspect the shared Template library and create, edit, archive, restore, duplicate, or delete a Training Template.
* On a Template or Client Plan they can access, a coach replaces the complete Prescription and Workout Schedule in one revisioned write. Omitted persisted nodes are deleted.
* A coach can assign an unarchived Training Template to a visible client. The result is an independent Client Plan, and onboarding advances in the same transaction.
* A coach can inspect and edit a Client Plan for a visible client, including its period dates, Prescription, and Workout Schedule.
* A coach can archive, restore, or delete a Client Plan for a visible client.

## Lifecycle

* A new Training Template starts unarchived and empty. It has no workouts or Workout Schedule until a coach replaces its Prescription.
* Duplicating a Template creates another unarchived Template with copied workouts, Prescribed Exercises, sets, and weekday schedule.
* Assignment clones the complete ordered Prescription, records the source Template, and advances an onboarding client to coaching. The Template remains unchanged.
* Later structural edits do not synchronize between a Template and an assigned copy. Shared exercise definitions remain live references in both.
* A Client Plan supplies Coverage only while unarchived, with a start date on or before the requested UTC date, and with no end date or an end date on or after that date. A missing start date is incomplete and supplies no Coverage.
* Deleting a Training Template leaves assigned Client Plans unchanged. Deleting a Client Plan removes its workouts and schedule. Existing Training Session history remains available through frozen snapshots.

## Conditions

* Training Templates are shared across the business. A trainer can work with any Template, regardless of creator.
* The business owner can access every Client Plan. A trainer can access Client Plans only for clients they currently coach. Inaccessible plans return not found.
* Unarchived Coverage periods for one client cannot overlap. At most one unarchived incomplete Client Plan exists per client.
* Each weekday has at most one scheduled workout. Archived Templates cannot be duplicated or assigned. A Client Plan cannot be used as a duplication or Assignment source.
* A Prescribed Exercise must use a globally shared exercise or a business-owned exercise from the same business.
* Every plan write supplies the expected revision. A stale revision is rejected with the current revision.

## UX-relevant constraints

* Plan and workout names are required and accept at most 255 characters. Plan description and notes accept at most 5,000 characters.
* Client Plan end date may equal start date but cannot be earlier. Open-ended Coverage uses a start date with no end date.
* The weekly schedule repeats implicitly over the Coverage period. It does not create dated occurrences, completion states, skips, or exceptions.
* A Prescribed Exercise can have no Prescribed Sets. Set fields are not validated against the exercise tracking type; tracking type only tells an experience which fields are relevant.
* Prescribed-set RPE is limited to 1 through 10. Repetitions are free text, while load, duration, distance, rest, and notes are optional.
* There is no authoring draft, publish step, revision history, rollback, or automatic save recovery. Concurrent writers recover by refetching and reapplying.

## Related capabilities

* Exercise library: supplies the exercise definitions and tracking types used by Prescribed Exercises.
* Workout execution and history: resolves Coverage, starts a Training Session, and records actual work.
* Client relationships: supplies client visibility and advances onboarding to coaching after the first Assignment.

## Unsupported assumptions

* Multiweek phases, progression rules, dated workout occurrences, more than one scheduled workout per weekday, time-of-day scheduling, schedule exceptions, deload generation, and automatic program progression are not supported.
* Live synchronization from a Training Template into Client Plans is not supported.
* Bulk assignment, assignment to client groups, plan approval, client acceptance, reminders, and notifications are not supported.
* A reusable workout library outside a Training Template is not supported.
* Automatic validation of prescribed fields against tracking type or automatic target calculation requires product work.

## Verification evidence

* `backend/lib/easy/training_programming.ex`: Template and Client Plan lifecycle, Prescription replacement, Assignment, Coverage, and revision conflicts.
* `backend/lib/easy/training/training_plan.ex`, `backend/lib/easy/training/prescribed_exercise.ex`, and `backend/lib/easy/training/planned_set.ex`: kind rules, positions, set data, and validation.
* `backend/lib/easy_web/open_api/schemas/training_plan.ex` and `backend/lib/easy_web/open_api/schemas/training_children.ex`: supported request and response contracts.
* `backend/test/easy/training/programming_template_test.exs`, `backend/test/easy/training/programming_prescription_test.exs`, and `backend/test/easy/training/programming_client_plan_test.exs`: copy behavior, schedule semantics, ordering, isolation, and Assignment.
