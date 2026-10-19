---
status: accepted
date: 2026-10-18
---

# Use trusted references and explicit commands for workout logs

A workout log records a client's session and may claim a scheduled occurrence. Its original recorder and prescription links must remain stable while the client corrects actual results or feedback. The draft uses separate insert, update, finish, discard, and reopen changesets so ordinary input cannot change ownership or bypass the state transitions.

## Trusted creation inputs

`insert_changeset/7` receives business ID, client ID, recorder, resolved prescription, editable input, client-local today, and authorized Exercise definitions. The lookup can be omitted when there are no swaps. The server supplies the recorder as `:client` or `{:coach, coach_id}` after checking access; these values are not taken from ordinary edit input.

The resolved prescription has three forms:

| Input | Log references |
|---|---|
| nil | No workout or scheduled occurrence |
| Workout | That client-owned workout, without a scheduled occurrence |
| {Workout, WorkoutSchedule, Date} | The workout and one occurrence of its schedule |

The workout must belong to the same client and business. A scheduled log also requires a matching schedule and a date inside its inclusive window on a selected weekday. The recording coach can differ from the schedule's session leader.

Required references must be valid UUIDs. Client recording requires coach_id to be null; coach recording requires coach_id. Actual date defaults to the client's local today on creation, while explicit null is invalid. Actual time has no default and is not copied from the schedule.

The draft retains the current backend restriction that neither actual date nor scheduled occurrence date can be after the client's local today. Actual date can differ from scheduled_date. Changing actual date never moves the occurrence claim.

## Editing and state transitions

`update_changeset/5` and `finish_changeset/5` take the stored log, input, client-local today, its resolved prescription, and authorized Exercise definitions. They validate the complete resulting metadata and call [swap validation](0013-workout-swaps-preserve-recorded-sets.md). Stored sets must be loaded and scoped to this log; the changesets do not replace them from input.

W83 adds [activity-owned recording](0015-exercise-log-and-set-details.md). New logs start with an empty exercise_logs association. Update and finish also require the complete valid activity/set hierarchy, with unique positions and recording slots. New activity records cannot be mixed with the legacy swaps or direct set rows described above. Finishing freezes unfinished activity records as they are, without inventing completion, skipped outcomes, measurements, or missing sets. Reopening preserves their existing states and restores editing through the active parent session.

Ordinary editable fields are date, time, effort, pain, text, and swaps. Log ID, ownership, recorder, prescription references, state, and timestamps are protected from that input. Existing errors are retained when finishing.

| Action | Allowed transition |
|---|---|
| Update | active stays active |
| Finish | active -> completed |
| Discard | active -> discarded |
| Reopen | completed -> active |

Discard and reopen take only the stored log and change only its state. They preserve original recorder, references, dates, feedback, swaps, and sets. They do not revalidate metadata during reopening, so the now-active log can be corrected before finishing again. Repeated commands from the wrong source state are rejected.

[Feedback](0012-workout-session-feedback.md) remains optional even on completion. Effort is null or an integer from 1 to 5. Pain distinguishes true, false, and unanswered. Text is trimmed, blank becomes null, and internal text and line breaks are preserved. The 10,000-character limit uses Unicode code points to match a future PostgreSQL character-length check; it applies on creation and edits, including retained text.

## Database and writer boundary

The [review draft](../../.scratch/workout/models.ex) registers existing and proposed foreign-key, check, and unique constraints. Registrations translate database failures; they do not execute queries or create constraints.

The database must enforce one active log per client and one non-discarded log per scheduled occurrence. A reopen changeset alone cannot know whether another active log exists. The future persistence code must check availability, lock the relevant rows, and rely on the unique indexes to handle races. Discarded rows remain stored but do not occupy either slot.

The context must authorize the client or coach, resolve the original references, supply the correct local date, load complete recorded sets, preserve prescription history, and save changes atomically. Recorded-set metric validation and persistence remain a separate step. Database migrations must adapt the old user-UUID recorder, mandatory difficulty/pain rule, and map-based swaps without losing historical data.

The standalone checks cover metadata, immutable references, all three logging cases, schedule boundaries, optional feedback, protected recorder fields, state transitions, and integration with swaps. They do not prove database uniqueness, authorization, or app flows. Runtime backend and frontend files remain unchanged.

This records W77 in the [workout concept](../../.scratch/workout/concept.md) and builds on the [recorder decision](0011-workout-log-recorder.md).
