# Workout execution and history

Owner: Training

## Supported outcome

A client can record one active workout at a time from their current training plan, or without a plan, and both the client and their coach can later understand the planned context and performed work.

## Available information

* Plan for a date: active assigned plan, requested date, weekday, scheduled workout when present, and schedule reference when present.
* Workout session: date, start time, end time when present, active/completed/discarded state, optional soreness rating, optional notes, linked workout when present, planned snapshot when present, creation time, and last update time.
* Planned snapshot: workout name, ordered exercises, exercise names and tracking types, and selected planned-set fields captured when a planned session starts.
* Performed set: exercise and stored exercise name, working/warm-up/drop-set type, session-wide position, reps, load and unit, duration, distance and unit, RPE, completion flag, notes, and optional swapped-from exercise reference.
* History: newest-first sessions with all performed sets, an overall count, and optional inclusive start-date and end-date filtering.

## Supported actions

* An active client can inspect their current assigned training plan and scheduled workout for a selected date.
* An active client can start a planned workout from any workout in the assigned plan that is active on the current UTC date.
* An active client can start a freestyle workout without a plan or workout.
* During a session, a client can add, edit, and remove performed sets using any visible exercise.
* A client can record an added or substituted exercise by creating performed sets with the chosen exercise and, when applicable, a swapped-from reference.
* A client can update session notes and soreness, complete the session, or discard it.
* A client can inspect their session history and one session's detail.
* A coach can inspect the same history and details for a visible client but cannot change them on the client's behalf.

## Lifecycle

* Starting a session sets its date to the current UTC date, records the server start time, and makes it active.
* Only one active session may exist for a client. A second start is blocked until the active session is completed or discarded.
* Starting a planned workout captures a snapshot of its current structure. Starting freestyle leaves the planned snapshot and workout link empty.
* Starting does not create performed sets. Each actual set is created separately as the client records work.
* Completion sets the state to completed and records the server end time. Discard changes the state to discarded without recording an end time.
* Plan, workout, or exercise deletion can remove live links later; the planned snapshot and stored performed-set exercise names preserve partial historical context.

## Conditions

* A planned workout can start only when its assigned plan belongs to the client, is active, and includes the current UTC date.
* The selected workout does not need to be the workout scheduled for the current weekday. Schedule membership is guidance, not a server-enforced start condition.
* A performed set may use a globally shared exercise or a business-owned exercise from the client's coaching business.
* The business owner can read every client's history. A trainer can read history only for clients they currently coach.
* Session and performed-set changes are client-only actions.
* Client actions require an active client account.

## UX-relevant constraints

* The date used to inspect a plan does not change the session date. A newly started session always belongs to the current UTC date.
* The client plan payload currently omits exercise tracking type even though the generated contract expects it. The exercise library or the session snapshot must supply that information until the contract is repaired.
* The planned snapshot excludes workout notes, planned-exercise notes, superset groups, rest seconds, and planned-set notes. Historical plan-versus-actual presentation cannot recover them from the snapshot.
* Performed-set positions are unique across the whole session, not separately within each exercise. A pending create must allocate a distinct position.
* RPE is limited to 1 through 10 and soreness to 1 through 5. Repetitions are text. Load and distance values have no supported minimum beyond type validation.
* A performed set's exercise and swapped-from reference are fixed after creation. Changing them requires deleting and recreating the set.
* The backend does not require a completed set, all planned work, session notes, or soreness before completion.
* Completed and discarded sessions are not server-locked. Session details and performed sets can still be changed through existing mutations. Reopening or post-completion editing is not an approved workflow merely because this guard is missing.
* History is not paginated. Large date ranges return the full matching collection.
* Invalid date-filter text is treated as an absent filter rather than a field-level error.

## Related capabilities

* Training plan authoring and assignment: supplies assigned date ranges, workouts, weekly guidance, planned exercises, and sets.
* Exercise library: supplies exercise detail and alternatives for freestyle, added, or substituted work.
* Client relationships: supplies current coach visibility.

## Unsupported assumptions

* A local in-session timer is possible, but persisted timer state, continuity across navigation, background rest alerts, automatic set creation, offline execution, and cross-device recovery are not supported capabilities.
* Coach-authored or coach-corrected sessions, coach approval, feedback, and messaging are not supported here.
* A server-owned adherence score, completion percentage, personal records, volume summaries, estimated duration, streaks, and progression recommendations are not available. Existing summaries are presentation calculations.
* Dated workout occurrences, skip reasons, rescheduling, and automatic plan progress are not supported.
* A dependable immutable-history or reopen workflow requires a product decision and server enforcement.

## Verification evidence

* `backend/lib/easy/sessions.ex`: session start authorization, single-active rule, snapshots, transitions, performed-set mutations, and history visibility.
* `backend/lib/easy/training/training_session.ex` and `backend/lib/easy/training/training_performed_set.ex`: fields, states, validation, and ordering.
* `backend/lib/easy_web/open_api/schemas/training_children.ex`: supported session and performed-set requests and responses.
* `backend/lib/easy_web/controllers/clients/training_plan_json.ex`: date-specific plan information and the current missing tracking-type field.
* `backend/test/easy_web/controllers/clients/workout_session_controller_test.exs` and `backend/test/easy/training/performed_set_test.exs`: planned and freestyle starts, snapshots, state changes, filters, ownership, and set validation.
* `backend/test/easy_web/controllers/coaches/workout_session_controller_test.exs`: read-only coach history and client visibility.
