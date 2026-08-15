# Workout execution and history

Owner: Training

## Supported outcome

A client can record one active Training Session at a time from Coverage, or without a plan, and both the client and their coach can later inspect immutable planned-versus-performed history.

## Available information

* Coverage for a date: nullable Client Plan, requested date, weekday, and scheduled workout when present.
* Training Session: kind, date, start time, closing time when present, active/completed/discarded state, optional soreness rating, optional notes, versioned Prescription snapshot, source plan and workout identifiers, creation time, and last update time.
* Prescription snapshot: plan and workout identities and names, ordered exercises with tracking types, and every Prescribed Set field captured when a planned session starts.
* Performed Set: frozen exercise name, optional live exercise reference, optional snapshot exercise reference, working/warm-up/drop-set type, session-wide position, reps, load and unit, duration, distance and unit, RPE, and notes.
* History: newest-first paginated sessions with all performed sets, an overall count, and optional inclusive start-date and end-date filtering.

## Supported actions

* An active client can inspect Coverage and the scheduled workout for a selected UTC date.
* An active client can start a planned Training Session from any workout in the Client Plan supplying Coverage on the current UTC date.
* An active client can start a Freestyle Training Session without a plan or workout.
* During an active session, a client can add, edit, and remove Performed Sets using a visible exercise or an explicit name.
* A client can update session notes and soreness only while the session is active, then complete or discard it with explicit commands.
* A client can inspect paginated session history and one session's detail.
* A coach can inspect the same history and details for a visible client but cannot change them on the client's behalf.

## Lifecycle

* Starting a session sets its date to the current UTC date, records the server start time, and makes it active.
* Only one active session may exist for a client. A second start is blocked until the active session is completed or discarded.
* Starting a planned session freezes a versioned Prescription snapshot and stops consulting mutable Programming data. Starting freestyle leaves the snapshot empty.
* Starting does not create Performed Sets. Each actual set is created separately as the client records work.
* Completion sets the state to completed, records the server closing time, and stamps client activity in the same transaction. Discard sets discarded with a closing time and does not stamp activity.
* Repeating the same terminal command is idempotent. The opposite terminal command returns a conflict.
* Plan, workout, Prescribed Exercise, or exercise deletion can remove live links later; the snapshot and stored Performed Set names preserve historical context.

## Conditions

* A planned session can start only when its Client Plan belongs to the client and supplies Coverage on the current UTC date.
* The selected workout does not need to be the workout scheduled for the current weekday. Schedule membership is guidance, not a server-enforced start condition.
* A Performed Set may use a globally shared exercise or a business-owned exercise from the client's coaching business.
* The business owner can read every client's history. A trainer can read history only for clients they currently coach. Inaccessible sessions return not found.
* Notes, soreness, and Performed Sets can change only while the Training Session is active.
* Client actions require an active client account.

## UX-relevant constraints

* The date used to inspect Coverage does not change the session date. A newly started session always belongs to the current UTC date.
* History is offset/limit paginated with a repository maximum of 100. Malformed or reversed date filters return validation errors.
* Performed-set positions are unique across the whole session, not separately within each exercise.
* RPE is limited to 1 through 10 and soreness to 1 through 5. Repetitions are text. Load and distance values have no supported minimum beyond type validation.
* The backend does not require a completed set, all planned work, session notes, or soreness before completion.
* Completed and discarded sessions are terminal. Session details and Performed Sets cannot be changed after close.

## Related capabilities

* Training plan authoring and assignment: supplies Coverage, workouts, weekly guidance, Prescribed Exercises, and sets.
* Exercise library: supplies exercise detail and alternatives for freestyle, added, or substituted work.
* Client relationships: supplies current coach visibility.

## Unsupported assumptions

* A local in-session timer is possible, but persisted timer state, continuity across navigation, background rest alerts, automatic set creation, offline execution, and cross-device recovery are not supported capabilities.
* Coach-authored or coach-corrected sessions, coach approval, feedback, and messaging are not supported here.
* A server-owned adherence score, completion percentage, personal records, volume summaries, estimated duration, streaks, and progression recommendations are not available. Existing summaries are presentation calculations.
* Dated workout occurrences, skip reasons, rescheduling, and automatic plan progress are not supported.
* Session reopening and post-completion correction are not supported.

## Verification evidence

* `backend/lib/easy/training_execution.ex`: session start authorization, single-active rule, snapshots, terminal commands, Performed Set mutations, and history visibility.
* `backend/lib/easy/training/training_session.ex` and `backend/lib/easy/training/training_performed_set.ex`: fields, states, validation, and ordering.
* `backend/lib/easy_web/open_api/schemas/activity.ex`: supported session and Performed Set requests and responses.
* `backend/test/easy/training/execution_history_test.exs` and `backend/test/easy_web/controllers/clients/workout_session_controller_test.exs`: planned and freestyle starts, snapshots, terminal commands, filters, ownership, and immutability.
* `backend/test/easy_web/controllers/coaches/workout_session_controller_test.exs`: read-only coach history and client visibility.
