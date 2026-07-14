# Design Envelope: Workout experience

Derived from: [Exercise library](../exercise-library.md), [Training plan authoring and assignment](../training-plan-authoring-and-assignment.md), and [Workout execution and history](../workout-execution-and-history.md)

## Supported outcome

A client can understand the training intended for a date, record actual work in one active session, and revisit the result while their coach can inspect the same history.

## Available information

* Training for a date: current assigned plan, date, weekday, scheduled workout when present, and plan date range.
* Planned workout: name, ordered exercises, tracking context when resolvable, and planned sets with reps, load, duration, distance, RPE, rest, and notes.
* Exercise detail: instructions, mechanics, force, images, muscles, equipment, and tracking type from the exercise library.
* Active session: start time, planned snapshot when present, session notes, soreness, and actual performed sets.
* Performed set: exercise and saved name, type, session-wide position, reps, load, duration, distance, RPE, completion flag, notes, and optional substitution origin.
* History: completed, discarded, and active sessions ordered newest first, optional inclusive date filtering, and session detail.

## Supported actions

* An active client can inspect the current plan and scheduled workout for a selected date.
* An active client can start a workout from the plan that is active today or start freestyle without a plan.
* A client can add, edit, and remove performed sets, including sets for an added or substituted visible exercise.
* A client can update session notes and soreness, complete the session, or discard it.
* A client can revisit workout history and detail.
* A coach can inspect history and detail for a visible client but cannot modify it.

## Lifecycle

* Starting creates an active session for the current UTC date and records the authoritative start time.
* Only one active session may exist. Another workout cannot start until it is completed or discarded.
* A planned start captures workout name, exercise names, tracking types, and selected planned-set fields. Freestyle starts without planned context.
* Starting does not create performed sets. Actual sets appear as the client records them.
* Completion records the authoritative end time. Discard closes the session without an end time.
* Historical names and the planned snapshot preserve partial context if a plan, workout, or exercise is later removed.

## Conditions

* A planned workout must belong to the client's active assigned plan for today's UTC date.
* Another workout from the current plan is technically permitted even when it is not scheduled for today. The scheduled workout remains the primary planned path.
* Performed sets may use globally shared exercises or business-owned exercises from the client's coaching business.
* Session and set changes belong to the client. Coach access is read-only and follows current client visibility.
* Client actions require an active client account.

## UX-relevant constraints

* Looking at another date does not backdate a session. Starting always records the current UTC date.
* Tracking type comes from exercise detail and is not reliably present in date-specific plan information. Resolve it before choosing the relevant set inputs.
* The planned snapshot omits workout notes, exercise notes, superset groups, rest seconds, and planned-set notes. Those details are not dependable in later history.
* Actual sets are not pre-created. A recoverable pending state is needed while each set result is saved.
* Positions are unique across the whole session. Exercise grouping must be derived from exercise references rather than independent per-exercise numbering.
* RPE is 1 through 10 and soreness is 1 through 5. Repetitions are text; other actual values are optional.
* An actual set's exercise cannot be changed after creation. A substitution correction requires delete and recreate.
* No minimum performed work is required before completion.
* Closed sessions are not immutable. Do not offer reopening or post-completion editing as settled behavior without a product decision.
* History is unpaginated, has no authoritative summaries, and has no real-time updates.

## Related capabilities

* Training planning: supplies exercises, assigned date ranges, weekly guidance, workouts, and planned sets.
* Client relationships: supplies the responsible coach and current visibility.
* Messaging: may carry discussion about a workout but does not own workout records or a separate review state.

## Unsupported assumptions

* Dated workout occurrences, skip reasons, rescheduling, automatic progress, adherence scores, personal records, volume summaries, streaks, and recommendations are not supported product facts.
* Coach-authored sessions, approval, feedback, and corrections are not supported.
* A local in-session timer is possible, but persisted timer state, rest-alert continuity across navigation, automatic set seeding, offline execution, background recovery, and conflict handling are unavailable.
* Several simultaneous workouts, group workouts, wearable sync, location tracking, and media capture are not supported.

## Example content

* On Tuesday 21 July 2026, Aisha's current plan offers Upper A with Bench press, One-arm row, and Seated shoulder press.
* Bench press plans three working sets of 8-10 reps at 40 kg and RPE 8. The exercise library identifies weight and reps as its tracking type.
* Aisha starts Upper A, records three bench-press sets, substitutes Cable row for One-arm row, adds one set of lateral raises, records soreness 2 out of 5, and completes the session.
* The saved session shows the planned snapshot beside actual sets. It can identify the substitution and added exercise, but it cannot recover the planned rest target later because rest is not in the snapshot.
* Kabir starts a freestyle session with no plan, records bodyweight squats and a 20-minute run, then discards it. The discarded session remains visible in history.
