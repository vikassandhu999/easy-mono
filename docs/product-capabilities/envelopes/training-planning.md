# Design Envelope: Training planning

Derived from: [Exercise library](../exercise-library.md) and [Training plan authoring and assignment](../training-plan-authoring-and-assignment.md)

## Supported outcome

A coach can maintain a shared exercise library, assemble reusable weekly training plans, and assign independent plan copies to clients for specific coaching periods.

## Available information

* Exercise collection: matching count, name search, pagination, and filters for muscles and equipment.
* Exercise: system, imported, or custom source; global or business ownership; tracking type; name; description; instructions; mechanics; force; images; muscles; equipment; creation time; and last update time.
* Reusable plan collection: matching count, name search, active or archived filtering, pagination, and newest-first order.
* Plan: name, description, state, dates when assigned, assigned client when present, creation time, and last update time.
* Workout: name, notes, ordered planned exercises, and ordered planned sets.
* Planned exercise: exercise detail, position, notes, optional superset identifier, and sets.
* Planned set: working, warm-up, or drop-set type; reps; load and unit; duration; distance and unit; RPE; rest; and notes.
* Weekly schedule: one workout or rest for each Monday through Sunday.

## Supported actions

* Any coach can discover and inspect globally shared exercises and exercises owned by the business.
* Any coach can create, edit, copy, or delete business-owned exercises. A globally shared exercise can be adapted only by copying it.
* Any coach can create, inspect, edit, archive, restore, duplicate, or delete a reusable training plan.
* On a reusable plan or assigned plan they can access, a coach can add, rename, and delete workouts.
* On a plan they can access, a coach can add visible exercises, define or replace their planned sets, edit notes and superset identifiers, remove exercises, and reorder all planned exercises.
* On a plan they can access, a coach can assign one workout or rest to each weekday and can reuse one workout on several days.
* A coach can assign a reusable plan to a visible client with a start and end date.
* A coach can tailor, archive, restore, or delete the client's independent assigned copy.

## Lifecycle

* A reusable plan starts active and empty.
* A duplicate starts as another active reusable plan with copied workouts, exercises, sets, and weekly schedule.
* Assignment deep-copies the plan, records its reusable source, and advances an onboarding client to coaching.
* Reusable and assigned plans diverge after copying. Plan structure does not synchronize, while shared exercise definitions remain live references.
* An assigned plan becomes current only while active and within its inclusive start and end dates.
* Deleting a workout removes its weekday assignments. Deleting a plan removes its plan structure without deleting stored workout-session history.

## Conditions

* The owner and trainers share reusable plans and business-owned exercises. Creator identity does not make library content private.
* The owner can access every assigned plan. A trainer can access only plans belonging to clients they coach.
* Globally shared exercises are read-only. Business-owned exercises are editable by any coach in the business, regardless of source label.
* Active assigned training-plan date ranges cannot overlap for one client.
* Each weekday contains at most one workout. A planned exercise uses a globally shared exercise or a business-owned exercise from the same business.

## UX-relevant constraints

* Exercise, plan, and workout names are required. Business-owned exercise names are unique within the business; plan and workout names need not be unique.
* Coach-authored exercises cannot select tracking type and default to weight and reps. Copying an exercise also resets tracking type to weight and reps.
* Unknown muscle or equipment choices may be omitted during save rather than identified individually.
* Exercise deletion has no complete dependency preview and can leave unresolved planned rows. Failure or uncertainty must preserve context rather than imply safe removal.
* Assignment should collect both dates. An undated training assignment can be stored, but it never becomes current and later editing requires date repair.
* Reusable-plan dates do not become assignment defaults.
* Archive does not reliably prevent a reusable plan from being assigned. Assigned-plan reuse as a source is also not intentionally supported because that restriction is not enforced.
* A weekly schedule repeats over the assigned date range. There are no dated occurrences, exceptions, completion markers, or times.
* Reordering needs the complete exercise order. Planned sets are saved as a full ordered collection and may be empty.
* Tracking type guides relevant set fields but does not make irrelevant combinations invalid. RPE alone has a fixed 1-through-10 bound.
* Superset identifiers have no separate label or lifecycle.
* There is no authoring draft, publish step, revision history, rollback, concurrent-author edit handling, or automatic template-to-client synchronization.

## Related capabilities

* Workout experience: owns starting, recording, completing, discarding, and reviewing workout sessions.
* Client relationships: supplies client identity, coaching status, assigned trainer, visibility, and coaching-stage advancement.
* Attachments: would own uploaded exercise media. Current exercise images are external string references.

## Unsupported assumptions

* Multiweek phases, progression rules, generated workout occurrences, more than one scheduled workout per weekday, time-of-day scheduling, exceptions, deloads, and automatic progression are not supported.
* Private trainer libraries, plan approvals, client acceptance, bulk assignment, groups, reminders, and notifications are not supported.
* Coach-authored tracking types, safe impact-based exercise deletion, a standalone workout library, and copying workouts between plans require product work.
* Automatic set generation, tracking-type validation, target recommendations, and plan-quality scoring are unavailable.

## Example content

* "Four-day strength" is an active reusable plan with four workouts: Lower A, Upper A, Lower B, and Upper B. Monday, Tuesday, Thursday, and Friday use those workouts; the other weekdays are rest.
* Lower A contains Barbell back squat, Romanian deadlift, and Leg press. Each exercise has three working sets, a rep range, load unit, RPE target, and rest target.
* Barbell back squat is a globally shared exercise with a system source, classified as compound and push and linked to quadriceps, glutes, and barbell equipment. A coach may copy it as "High-bar squat" before changing its instructions.
* Aisha receives an independent copy from 20 July through 30 August 2026. Editing Aisha's Tuesday workout does not change the reusable plan or another client's copy.
* An archived plan named "Beginner full body" remains readable and duplicable, but assignment should first restore it to active because archive is not enforced as a source rule.
