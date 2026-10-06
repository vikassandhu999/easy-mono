# Slice 1 backend report

The backend uses the frozen training model. Full `rtk mix precommit` passes: 1,020 tests, zero failures, and no Credo issues. The API generator passes with 126 typed routes. The local development and test databases have all migrations through `20261005000400`.

## Storage and writes

Training templates use `templates`. Client training plans use `plans` and immutable `plan_revisions`. Workouts, blocks, exercises, sets, and schedule entries form one JSON document. Embedded Ecto schemas validate the document. Node ids remain UUIDs across revisions.

A template save updates its complete document in one request. Assignment locks the client and template. It copies the locked name, description, and content into revision 1. An archived template cannot be assigned. An optional expected revision guards the reviewed template value.

A client plan publication adds a revision. The date defaults to the client's local today. The revision in force uses the effective date, then revision number. A future revision can be withdrawn. The response includes scheduled revisions for the P4 notice.

Plan dates preserve past coverage. A started plan cannot change its start date. Past end dates cannot change. Archive closes an active plan at local today. It keeps the coverage for today and all earlier dates. Restore keeps these dates and checks the one-unscheduled-plan constraint.

`training_sessions` stores the prescription revision and optional occurrence identity. `performed_sets` stores typed values, prescribed set ids, outcomes, entered units, request ids, and deletion timestamps. The code removes the snapshot, soreness, and set-request table protocol.

`RecordJournal.write` locks the tenant-scoped client, allocates its sequence, writes records, and adds journal rows in one transaction. Retries with no change restore the prior sequence. Set changes also advance the session revision. Set removal keeps a tombstone and adds a removal entry with the prior value. The `records` view contains training sessions other than discarded sessions.

Postgres rejects updates to published revisions and journal rows. The database checks record pairs, states, unit pairs, tenant foreign keys, active-session uniqueness, request uniqueness, and library names. The library name index uses `NULLS NOT DISTINCT`.

## SQL coverage and queries

`plan_coaching_stop` is the shared E6 calculation. It uses the stored `created_local_date`. `plan_period_covers` supplies date coverage. `plan_covers` applies it to shared plans. `expected_workouts` selects the plan revision and repeating schedule entries for each date.

`PlanCoverage` uses SQL for term coverage, effective end, and the E6 stop. `PlanOverlap` uses the shared SQL range under the client lock. A prospective overlap range considers a coaching end only after that end has passed in the client's local timezone. A scheduled coaching end remains editable and cannot release reserved plan dates early. This preserves the nutrition reservation rule and prevents later term extension from exposing two plans on one date. Prepared plans also reserve their dates before acceptance.

Nutrition keeps its tables and its archive behavior. Its plans gain the stored creation date needed by E6. The prototype migration fills this date once from the client's timezone. Later timezone changes do not recalculate it.

An occurrence is fulfilled at most once. When more than one completed session uses its identity, the query chooses the earliest completion, then id. Extra sessions are completed sessions with no selected occurrence, within the requested execution-date range.

PRs include only done working sets that are not deleted and belong to completed sessions. Results use the latest recorded values. The API returns best kg per rep count and set history with local dates. Read assembly uses batch exercise preloads. Prescribed names come from the immutable document. Extra library sets use the library name. Free-text sets keep their entered name.

Session and plan lists retain count, stable timestamp-and-id cursor order, search, and offset mode. An explicit cursor cannot be combined with a nonzero offset. Discarded sessions remain available in session history and the state filter.

## Library and units

Exercises use `measures`, `bodyweight`, `media_id`, and `archived_at`. The code and API remove `tracking_type`, `source`, `images`, and exercise description. Muscle and equipment descriptions remain. The API calculates `built_in` from the absent business id. An archive removes an exercise from picker lists and preserves direct history reads.

The seed maps each imported tracking type into measures and bodyweight. It copies the first available image URL into system `library_media`. Repeated seed runs reuse media by external URL. The development seed run upserted 417 exercises, 20 muscles, and 8 equipment rows. The food library was already seeded and remained available. A SQL audit found 417 built-in exercises and 12 names containing `(Weighted)`. All 12 have `bodyweight=true` and include the load measure.

The unit registry supports kg, lb, m, km, mi, and s. Set writes convert entered values to kg and m. Load values round to three decimal places. Distance values round to two decimal places, as required by the database columns. Negative loads retain assistance values. Missing values remain null.

## Contract and application behavior

The routes keep `/v1/coach` and `/v1/client`. The separate prescription PUT route is removed. Template and client-plan edits save a complete document through PATCH. The API adds scheduled revision withdrawal, expected occurrences with extra sessions, and exercise PR history.

Session creation accepts explicit revision, workout, schedule entry, and occurrence date ids. An earlier occurrence uses that date's revision. The execution date remains the client's local today. A workout without an occurrence must belong to today's coverage. A session with no prescription ids is free.

Request ids retain session and set identities across retries. A set retry cannot restore a deleted row. A changed retry body returns conflict. Repeated completion or discard returns the recorded terminal value before the stale revision check, when the submitted editable values match. The revision and journal sequence remain unchanged.

A completed note is sent through `ChatRecordNotes.share` inside the record transaction. A changed completed note produces another message. A completion retry does not send another message. Subscriber notification occurs after commit. Ended clients retain reads and cannot write. Coaches cannot record training sessions or sets through the domain API.

The generated contract is in coachapp and clientapp schema files. `clientapp-v2` has no changes. The concrete API brief is `s1-api.md`. The full passing check output is `s1-precommit.log`. The final seed output is `s1-seeds.log`. The parent task owns frontend changes and browser evidence.

## Choices where the documents did not specify a detail

* All document node ids are UUIDs, including ids that the examples describe with short labels. Session and occurrence foreign values use these ids directly.
* A template may contain an empty document. The coach can save it before adding a workout.
* Assignment may set an initial start date in the past. Changes to a started plan cannot alter that start date.
* Archive of a future plan clears its dates. No past coverage exists to preserve. Restore exposes that plan as unscheduled.
* An unused withdrawn revision number may be used again when it was the highest number. Revision ids remain distinct.
* The first available imported image becomes the single media reference. The model has one media id.
* Imported media permits null content type and byte size. External URLs do not have upload metadata.
* Occurrence queries have a 366-day difference bound. Fulfilment uses earliest completion and id when sessions share an occurrence.
* Set-history output is unpaginated for the selected client and exercise. Plan and session lists use cursor or offset pagination.
* Completed record corrections have no seven-day limit. Writes still require active coaching and an execution date that is not in the future.
* Extra library-set names are resolved from the library. Prescribed names remain frozen in the referenced revision, and free-text names remain stored on the set. This follows the DDL's exercise-id versus free-text-name rule.
* Prototype migrations replace training data and retain business, account, and nutrition data. Follow-up migrations apply SQL changes to databases where the initial training reset already ran.

## Verification

The focused training and HTTP suites check immutable revisions, revision selection, date changes, E6, overlap, occurrence selection, single fulfilment, extra sessions, units, PR filters, corrections, tombstones, close replay, note messages, pagination, and tenant denial. Router tests send a complete typed document with a superset and `cycle_weeks: 1`. They also read external seed media, reject malformed UUIDs, and verify picker archive behavior.

Two tests use independent Postgres connections. One proves concurrent set writes receive separate sequence numbers and positions. The other holds a reader snapshot while a writer has an uncommitted sequence and session. After commit, the writer's change is visible above the reader's saved sequence.

The tests for removed training tables and snapshot fields are replaced by the domain, router, and concurrency suites. Existing nutrition, chat, coaching, billing, and architecture tests remain in the full suite. Assertions for changed exercise and session fields use the public replacement fields.

| Command | Result |
|---|---|
| `rtk mix precommit` | Exit 0. Compile with warnings as errors, dependency check, format, typed route drift check, strict Credo, and all 1,020 tests pass. |
| `rtk just gen-api` | Exit 0. Generates 126 typed routes and both maintained app schemas. |
| `rtk mix ecto.migrate` | Exit 0. Development migrations applied through `20261005000400`. |
| `rtk mix ecto.migrations` | All local development migrations are up. |
| `rtk proxy env MIX_ENV=test mix ecto.migrations` | All local test migrations are up, including the SQL follow-up migrations. |
| `rtk mix run priv/repo/seeds.exs` | Exit 0. Exercise library upserted. Food library retained. |
| Built-in exercise SQL audit | 417 built-ins. All 12 `(Weighted)` exercises permit added load. No duplicate built-in names. |

The first migration retry was rejected by automatic approval review because it did not recognize authorization for data removal. The next request cited the owner's task, line 19, which explicitly permits training-data discard and local database resets. The review accepted that evidence, and the local migration completed. No work remains blocked by approval.

A temporary 120-column formatting pass expanded touched code for Credo. The repository's 180-column formatter configuration remains unchanged. Unrelated changes that contained only formatting were restored. No commit, push, or new worktree was created.

The later nutrition and tracker slices, occurrence exceptions, multiweek cycles, and reviews remain out of scope. Frontend build, lint, browser, and screen results belong in the parent report.
