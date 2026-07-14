# Training plan authoring and assignment

Owner: Training

## Supported outcome

A coach can build reusable weekly training plans, copy them to clients for a bounded period, and tailor each assigned copy without changing the reusable source or another client's plan.

## Available information

* Reusable plan collection: matching count, newest-first results, name search, active or archived filtering, and pagination.
* Plan: name, description, active or archived state, optional start and end dates, creator identifier, source-plan identifier when copied, assigned client when present, creation time, and last update time.
* Workout: name, optional notes, ordered planned exercises, creation time, and last update time.
* Planned exercise: linked exercise, position, optional notes, optional superset-group identifier, and an ordered collection of planned sets.
* Planned set: working, warm-up, or drop-set type; repetitions as text; optional load and unit; duration; distance and unit; RPE; rest; and notes.
* Weekly workout schedule: one workout reference or rest for each weekday. The same workout may be used on several weekdays.

## Supported actions

* Any coach can inspect the shared reusable-plan library and create, edit, archive, restore, duplicate, or delete a reusable plan.
* On a reusable plan or an assigned plan they can access, a coach can add, rename, and delete workouts.
* On a plan they can access, a coach can add a visible exercise to a workout, replace its planned-set collection, edit its notes or superset identifier, remove it, and reorder all planned exercises.
* On a plan they can access, a coach can set one workout for a weekday or clear that weekday to rest.
* A coach can assign a reusable plan to a visible client with a start and end date. The result is an independent assigned plan.
* A coach can inspect and edit an assigned plan for a visible client, including its metadata, workouts, planned exercises, sets, and weekly schedule.
* A coach can archive, restore, or delete an assigned plan for a visible client.

## Lifecycle

* A new reusable plan starts active and empty. It has no workouts or weekly schedule until a coach adds them.
* Duplicating a reusable plan creates another active reusable plan with copied workouts, planned exercises, sets, and weekday schedule.
* Assignment deep-copies the same structure, records the source plan, and advances an onboarding client to coaching. The reusable plan remains unchanged.
* Later structural edits do not synchronize between a reusable plan and an assigned copy. Shared exercise definitions remain live references in both.
* An assigned plan is current for a date only while active and while the date falls within its inclusive start and end dates.
* Deleting a workout also removes its weekday schedule entries. Existing workout sessions retain their stored snapshots and may lose only the live workout link.
* Deleting an assigned plan removes its workouts and schedule. Existing workout-session history remains available through stored session information.

## Conditions

* Reusable plans are shared across the business. A trainer can work with any reusable plan, regardless of creator.
* The business owner can access every assigned plan. A trainer can access assigned plans only for clients they currently coach.
* Active date ranges for one client's assigned training plans cannot overlap. Archived assigned plans do not participate in the overlap rule.
* Each weekday has at most one scheduled workout. Absence of a schedule entry means rest.
* A planned exercise must use a globally shared exercise or a business-owned exercise from the same business.

## UX-relevant constraints

* Plan and workout names are required and accept at most 255 characters. Plan description, workout notes, and planned-exercise notes accept at most 5,000 characters.
* An assigned training plan needs both start and end dates to become current. End date may equal start date but cannot be earlier.
* The assignment request currently accepts missing dates and stores the copy. Such a plan is never current for a day, and a later metadata edit rejects it until both dates are supplied. This is an implementation gap, not a useful undated-plan state.
* Dates stored on a reusable plan are not copied as assignment defaults. Assignment dates must be supplied separately.
* Archived reusable plans are still technically assignable because source status is not enforced. Treat assignment as an active reusable-plan action until that rule is made explicit.
* Assignment and duplication are described as reusable-plan actions, but the backend does not enforce that the source has no client. Reusing an assigned plan is not an approved design affordance.
* The weekly schedule repeats implicitly over the assigned date range. It does not create dated occurrences, completion states, skips, or exceptions.
* Reordering planned exercises requires the complete current set of planned-exercise identifiers. A partial reorder is rejected.
* A planned exercise can have no planned sets. Set fields are not validated against the exercise tracking type; tracking type only tells an experience which fields are relevant.
* Planned-set RPE is limited to 1 through 10. Repetitions are free text, while load, duration, distance, rest, and notes are optional.
* Superset groups are arbitrary shared identifiers with no separate name, ordering, or lifecycle.
* There is no authoring draft, publish step, revision history, rollback, concurrent-author edit detection, or automatic save recovery.

## Related capabilities

* Exercise library: supplies the exercise definitions and tracking types used by planned exercises.
* Workout execution and history: resolves a current assigned plan, starts a workout session, and records actual work.
* Client relationships: supplies client visibility and advances onboarding to coaching after the first plan assignment.

## Unsupported assumptions

* Multiweek phases, progression rules, dated workout occurrences, more than one scheduled workout per weekday, time-of-day scheduling, schedule exceptions, deload generation, and automatic program progression are not supported.
* Live synchronization from a reusable plan into assigned copies is not supported.
* Bulk assignment, assignment to client groups, plan approval, client acceptance, reminders, and notifications are not supported.
* A reusable workout library outside a plan, workout copying between plans, and dedicated set-reorder actions are not supported.
* Automatic validation of planned fields against tracking type or automatic target calculation requires product work.

## Verification evidence

* `backend/lib/easy/training_plans.ex`: reusable-plan listing, cloning, assignment, schedule updates, client visibility, and coaching-stage effects.
* `backend/lib/easy/workouts.ex`: workout and planned-exercise actions, ordering, and exercise validation.
* `backend/lib/easy/training/training_plan.ex`, `backend/lib/easy/training/training_workout_exercise.ex`, and `backend/lib/easy/training/planned_set.ex`: fields, date rules, set data, and validation.
* `backend/lib/easy_web/open_api/schemas/training_plan.ex` and `backend/lib/easy_web/open_api/schemas/training_children.ex`: supported request and response contracts.
* `backend/test/easy_web/controllers/coaches/training_plan_controller_test.exs`, `backend/test/easy_web/controllers/coaches/training_schedule_controller_test.exs`, and `backend/test/easy_web/controllers/coaches/workout_element_controller_test.exs`: copy behavior, undated assignment, schedule semantics, ordering, and isolation.
* `backend/test/easy/training_plans_test.exs` and `backend/test/easy/workouts_test.exs`: business-wide reusable libraries and trainer access to assigned content.
