Backend review of Slice 1, 6 October 2026. This review reads the working tree on `codex/core-domains`. The implementation worker changed source during the review. Each resolved item below has a second source check.

The review uses `.scratch/core-domains/decisions.md`, `.scratch/core-domains/training.md`, `.scratch/core-domains/build/s1-foundation-training.md`, `.scratch/coaching-terms/spec.md`, and `backend/AGENTS.md`. It also checks the typed route contract and the behavior in `HEAD` where a regression needs that comparison. The production-quality, cognitive-complexity, and technical-writing skills apply.

The seven findings below are resolved in source after a second read. No confirmed backend defect remains open in this review. Test results remain the implementation worker's responsibility.

1. P2, resolved: Workout notes did not reach Messages. Completion and completed-session correction saved the note without `ChatRecordNotes.share`. The client screen still promises both actions. Complete a session with `notes: "My knee hurt"`, then change the completed session note: the affected implementation saved both notes without a message. `HEAD` sent these notes. `backend/lib/easy/training_execution.ex:200` now shares the note inside the journal transaction. `mutate` sends the notification after commit. The added test checks the completion message, the correction message, and no duplicate message on replay.

2. P2, resolved: An unconfirmed completion could not be retried with its saved revision. Complete revision 1 with `expected_revision: 1`, lose the response, and repeat that request. The affected implementation checked the revision first and returned a stale-revision error. A repeat without the revision added another journal change. The client keeps the draft and its revision after an unconfirmed response. `backend/lib/easy/training_execution.ex:176` now returns a no-op for the same final state and editable values before the revision check. Different values return a conflict. The added test checks that completion and discard replay preserve both the revision and the journal sequence.

3. P2, resolved: Assignment accepted an archived template and could raise after a concurrent delete. Archive a template, then assign it: the affected implementation still copied it. If deletion occurred between the first read and the locked read, the following access used nil. `backend/lib/easy/training_programming.ex:35` now checks the locked template before use. It returns `:not_found` for nil and `:conflict` for an archived row. Assignment copies name, description, and content from that same locked row. The added test covers archived-template denial.

The other four findings were sent to the parent agent and resolved in source:

* Invalid session UUID values reached Ecto queries or `Ecto.UUID.dump!`. `Execution.start_client_session` now casts the input through `start_input` before the journal transaction. This covers the revision, workout, occurrence entry, and request IDs. Source check: `backend/lib/easy/training_execution.ex:17`.
* Restoring archived unscheduled plan A while active unscheduled plan B exists raised an unhandled unique-constraint exception. Restore now locks the client and declares `plans_one_unscheduled`. It also checks overlap. Source check: `backend/lib/easy/training_programming.ex:154`.
* Plan and session lists rejected `offset: 20` when the request omitted `cursor`. Both readers now apply offset when the request has no cursor. They reject the offset only with an explicit cursor. Source checks: `backend/lib/easy/training_plan_reader.ex:77` and `backend/lib/easy/training_execution.ex:235`.
* Deleted exercises remained in the library and exercise picker. Both list query paths now filter `archived_at`. Direct reads still retain the exercise for historical references. Source checks: `backend/lib/easy/training_library.ex:61` and `backend/lib/easy/training_library.ex:98`.

Other source checks:

* The database rejects updates to published revisions and journal rows through `forbid_update`. Revision selection uses effective date, then revision number. Withdrawal checks that the revision is in the client's future.
* Plan assignment persists the creation date from the client timezone. SQL coverage uses that stored date for E6. Archiving a started plan sets its end to today and retains prior coverage. Archiving a future plan removes its future dates.
* `RecordJournal.write` locks the tenant-scoped client before it updates `last_change_seq`. Session and set writes use this helper. The record rows and journal rows commit in the same transaction. No-op replay restores the sequence inside that transaction.
* Session starts validate tenant, client, workout, the revision in force, and explicit occurrence membership. Expected-versus-done selects one completed session per occurrence, including the plan ID. Unscheduled completed sessions appear as extra work.
* PR queries require a completed session and a done, working, undeleted set. They exclude unknown reps and unknown load. Zero remains a recorded number.
* Unit normalization retains nil values and stores converted base units with the entered unit. Negative load remains available for assistance.
* Exercise measures and bodyweight are absent from the update cast. Seed conversion maps the legacy input types and fixes `(Weighted)` exercises. Seed image URLs use system `library_media` rows.
* Retired training tables, snapshot modules, and soreness input are absent from runtime source. The legacy seed input vocabulary remains only for conversion.

The parent agent confirmed one choice: overlap prevention includes prepared plans before a coaching term starts. This prevents two plans from becoming active on the same date when the invitation is accepted. Permanently expired plans still use the E6 cutoff. SQL contains the coverage rules. Elixir calls those rules rather than copying them.

Verification limits: this reviewer ran no tests, database reset, or seeds. The implementation worker owns the test database window. The concurrency tests were read, including the test that holds a reader snapshot while a journal write commits. Their results are not claimed here. Lock ordering was checked in source. An unconfirmed lock-cycle concern is excluded from the findings.
