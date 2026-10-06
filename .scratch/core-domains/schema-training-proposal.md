# Training schema proposal

Status: proposed table-by-table settlement, 2026-10-04. No product decision, migration, or code change is approved by this document. The historical representation is pending the user's choice. This proposal uses immutable plan revisions provisionally; the shared schema proposal owns the final timeline contract.

## Boundary and conventions

Training owns exercise interpretation, prescriptions, Training Sessions, and Performed Sets. A planned session may start from any workout in the Client Plan covering today, including a rest day. Freestyle sessions require no plan. Completed sessions remain correctable; discarded sessions remain closed. Only clients record training. A current Coaching term gates writes; ending a term preserves reads.

Every table below has `id uuid PRIMARY KEY`, `inserted_at timestamp NOT NULL`, and `updated_at timestamp NOT NULL`, except the two membership tables. Timestamps are UTC, following the backend contract. `?` means nullable; other fields are required. Enum types are closed text values with database checks and Ecto.Enum. All tenant rows have trusted `business_id uuid` with a business FK. Tenant parent references use composite FKs including business; ownership also comes from Ctx on every query. JSON membership checks are context validation, not claimed database FKs.

Mutable fields are explicitly listed. Identity, ownership, creation time, and retained historical content are immutable. Tenant-leading indexes cover client history queries. This is a domain-specific schema, with shared value validation and change-discovery conventions; it does not introduce a generic Record table.

## 1. `training_muscles`

| Field | Type | Rule |
|---|---|---|
| `name` | text | Nonblank, unique |
| `description` | text? | Display help |

Global reference data. Name and description may change. Membership deletion may cascade, but deleting reference data is an administrative operation. No client ownership or archival lifecycle is needed for this reference list.

## 2. `training_equipment`

| Field | Type | Rule |
|---|---|---|
| `name` | text | Nonblank, unique |
| `description` | text? | Display help |

Same ownership and mutation rules as muscles. This describes required equipment, not equipment inventory or machine-specific load calibration.

## 3. `training_exercises`

| Field | Type | Rule |
|---|---|---|
| `business_id` | uuid? | Null means global; otherwise business-owned |
| `source` | enum | `system`, `imported`, `custom` |
| `external_id` | text? | Import identifier, unique when present |
| `created_by_user_id` | uuid? | Users FK, null on account deletion; global imports have no actor |
| `name` | text | Trimmed, nonblank, maximum 255 |
| `description` | text? | Maximum 5,000 |
| `instructions` | text? | Maximum 10,000 |
| `tracking_type` | enum | Nine interpretations below |
| `mechanics` | enum? | `compound`, `isolation`, `isometric` |
| `force` | enum? | `push`, `pull`, `static` |
| `images` | text[] | Empty array default; validate allowed public URLs |
| `media_id` | uuid? | Library media FK; business media must belong to this business |
| `archived_at` | timestamp? | Stops new selection; history stays readable |

Retain `tracking_type` as the first-build interpretation discriminator. An arbitrary `measures` array alone loses the difference between external weight, additional weight, and assistance. A supported-fields list can be derived in code.

| `tracking_type` | Actual primary fields | Meaning of `load_value` |
|---|---|---|
| `weight_reps` | Reps, load | External resistance |
| `bodyweight_reps` | Reps | No entered load |
| `weighted_bodyweight` | Reps, load | Additional resistance above bodyweight |
| `assisted_bodyweight` | Reps, load | Assistance, stored as a nonnegative magnitude |
| `reps_only` | Reps | No load |
| `duration` | Duration | No load |
| `weight_duration` | Load, duration | External resistance |
| `distance_duration` | Distance, duration | No load |
| `weight_distance` | Load, distance | External resistance |

These records do not imply body mass was measured, or that machine assistance equals an exact subtraction from body mass. Do not derive total moved mass or compare assistance and additional weight as the same series. Larger assistance means more help. Zero additional weight or zero assistance is valid.

Name, instructions, media, classifications, and archive state may change. Freeze `tracking_type` once any prescription revision or Performed Set uses the exercise; a different interpretation gets a different identity. Revision content and Performed Sets also freeze the interpretation they captured. The freeze-on-use rule requires locking the exercise when changing its type or first using it; checking for references without serialization is insufficient, especially with JSON prescriptions.

Use unique `(business_id, name)` for business exercises and a separate partial unique `(name) WHERE business_id IS NULL` for global names, subject to auditing imported duplicates. Index `(business_id, archived_at, name, id)`. Visibility remains business-or-global and is checked independently of `source`. Global exercises may not reference tenant media. Used exercises are archived, not deleted. This is a proposed change from deletion once relational references permit it.

## 4. `training_exercise_muscles`

Fields: `exercise_id uuid NOT NULL`, `muscle_id uuid NOT NULL`. Composite primary key `(exercise_id, muscle_id)`; FKs to exercises and muscles, cascade when an unused exercise or reference is deleted. No timestamps or surrogate ID. Replace memberships with the exercise update transaction. No primary/secondary distinction is introduced in this build.

## 5. `training_exercise_equipment`

Fields: `exercise_id uuid NOT NULL`, `equipment_id uuid NOT NULL`. Composite primary key `(exercise_id, equipment_id)`; FKs and mutations follow exercise-muscle membership. No ordering or equipment quantity.

## 6. `training_plans`

Training Templates and Client Plans remain one domain table. Assignment produces an independent Client Plan, not an Assignment row. These fields must use the shared plan-shell conventions when finalized.

| Field | Type | Rule |
|---|---|---|
| `business_id` | uuid | Tenant |
| `kind` | enum | `template`, `client_plan` |
| `client_id` | uuid? | Composite client/business FK; required exactly for client plans |
| `created_by_user_id` | uuid? | Users FK; trusted and required at creation, retained as null on deletion |
| `source_template_id` | uuid? | Same-business template FK; null allowed after source deletion |
| `name` | text | Nonblank, maximum 255 |
| `description` | text? | Maximum 5,000 |
| `start_date` | date? | Null for template; null on incomplete client plan |
| `end_date` | date? | Null for template; require start when present, end >= start |
| `archived_at` | timestamp? | Live-selection state |
| `revision` | integer | Positive optimistic concurrency version, increment on every accepted plan mutation |

Unique `(id, business_id)`. One incomplete, unarchived Client Plan per `(business_id, client_id)` using a partial unique index. Preserve separate training and nutrition overlap rules and the client-lock transaction used to serialize coverage changes. A naive exclusion constraint on raw date ranges would not preserve the existing coaching-term clipping semantics.

Name, description, dates, archive state, and prescription may change using the current revision. Kind, owner, creation fact, and source provenance cannot be reassigned. Templates have no client, coverage dates, or source template. Source-kind checks are enforced during assignment; the FK alone proves only existence and tenancy.

This row is the live shell. Its mutable dates and `archived_at` must never be the sole source for past expectations. Keep its creation timestamp because E6 depends on when the plan was created. The shared timeline must specify the applied timezone and retained coverage facts used for historical eligibility. Binding each plan to one Coaching term would change pre-acceptance preparation and returning-client rules.

## 7. `training_plan_revisions` (provisional historical representation)

| Field | Type | Rule |
|---|---|---|
| `business_id` | uuid | Tenant |
| `training_plan_id` | uuid | Composite plan/business FK |
| `number` | integer | Positive, unique per plan; stable tie-break for same-time publications |
| `effective_at` | timestamp | Immediate server publication time in the first build |
| `created_by_user_id` | uuid? | Users FK; null on account deletion |
| `schema_version` | integer | Positive document format version |
| `content` | jsonb | Validated immutable prescription document described below |

Unique `(training_plan_id, number)` and `(id, training_plan_id, business_id)`; index `(business_id, training_plan_id, effective_at, number)`. Retained revisions cannot be updated or deleted through ordinary application operations. Account deletion may null attribution without altering prescription meaning. No future scheduling, mutable future revision, or scheduled publication worker is introduced here.

The recommendation is to retain revisions for templates too, keeping one publication rule and allowing precise assignment provenance later if required. An incomplete plan can publish an empty document. The shell is the concurrency boundary; publication, metadata changes, revision increment, and shared timeline changes commit together. The shared timeline design must decide whether coverage facts belong in these revisions or in its separate authoritative history; this document does not add a competing coverage table.

### Complete `content` shape

| Document element | Fields and constraints |
|---|---|
| Root | `plan_name: string`, `plan_description: string?`, `workouts: array`, `schedule: object` |
| Workout | `id: uuid`, `name: string`, `exercises: array` |
| Prescribed Exercise | `id: uuid`, `exercise_id: uuid`, `exercise_name: string`, `tracking_type: enum`, `sets: array` |
| Prescribed Set | `id: uuid`, `set_type: working/warmup/dropset`, `reps_target: object?`, `load_value: decimal?`, `load_unit: kg/lb?`, `duration_seconds: integer?`, `distance_value: decimal?`, `distance_unit: m/km/mi?`, `rpe: decimal?`, `rest_seconds: integer?`, `notes: string?` |
| `reps_target` | `{kind: exact, value: nonnegative integer}`, `{kind: range, min: nonnegative integer, max: integer >= min}`, or `{kind: amrap}`; mutually exclusive closed shapes |
| Schedule | Keys `monday` through `sunday`, each a workout UUID or null; null is rest |

Arrays supply order; positions are not identity. IDs are unique within their node kind throughout a document, and schedule IDs resolve to workouts in that document. An occurrence cannot silently move to another workout. A set retains its ID across target edits and reorderings of that occurrence; deleting and deliberately replacing it creates a new ID. A set cannot move to another exercise occurrence under the same ID. Retained IDs let a later revision describe the same authored item; `(revision_id, set_id)` identifies its immutable target values. Assignment generates fresh workout, occurrence, and set IDs and remaps schedule references. Library exercise IDs remain shared.

All UUID reference targets must exist and be visible when newly selected. Existing archived exercises may remain in a retained prescription; adding an archived exercise to another occurrence is rejected. Published content captures the name and interpretation, so later library edits do not change it. Session rendering must read captured names, not join current library names over them.

Measurement pairs are both null or both present. Magnitudes and times are nonnegative; RPE is 1–10. Restrict fields to the captured interpretation. Null target means unspecified, never zero. Set notes may express unmodeled instructions, but typed measurement values cannot contain an alternate textual meaning. Reps ranges and AMRAP are prescriptions; actual reps are an integer.

No blocks, sides, tempo, RIR, percentage loads, progression engine, or multiweek schedule are assumed. These need product flows and additional validation; adding a `format` enum alone would not implement circuits or EMOM execution. Empty collections remain legal, preserving draft authoring.

## 8. `training_sessions`

| Field | Type | Rule |
|---|---|---|
| `business_id` | uuid | Tenant |
| `client_id` | uuid | Composite client/business FK |
| `recorded_by_user_id` | uuid? | Trusted client actor; users FK, null on deletion |
| `kind` | enum | `planned`, `freestyle` |
| `state` | enum | `active`, `completed`, `discarded` |
| `date` | date | Correctable occurrence date; cannot be future at write time |
| `timezone` | text | IANA timezone applied at start, captured from client/business fallback |
| `started_at` | timestamp | Server start, immutable |
| `closed_at` | timestamp? | First completion/discard time, immutable once set |
| `training_plan_id` | uuid? | Planned provenance, composite same-business FK |
| `plan_revision_id` | uuid? | Composite revision/plan/business FK |
| `workout_id` | uuid? | Workout identity inside that revision, context-validated |
| `notes` | text? | Maximum 4,000; preserve note-to-coach behavior |
| `soreness_rating` | smallint? | 1–5; retain until an approved Tracker migration |
| `revision` | integer | Positive record concurrency version |
| `changed_at` | timestamp | Server change marker for Review discovery; shared contract applies |

Unique `(id, business_id)` and `(id, business_id, client_id)`. Partial unique `(business_id, client_id) WHERE state = active`. Index `(business_id, client_id, date, id)` and the shared change-discovery index. Planned requires all three provenance fields; freestyle requires all three null. Active requires null `closed_at`; terminal states require nonnull `closed_at >= started_at`. Explicitly include every null check in SQL rather than relying on SQL's nullable boolean evaluation.

Plan/revision references use restrictive deletion. A referenced plan is retained and archived. If preserving physical plan deletion is required, retain the session snapshot instead; deleting its only authoritative prescription is invalid. This retention change needs approval before replacing snapshots.

Only date, notes, soreness, actual sets, and the one-way state transition are editable. Date correction does not rebuild guidance or re-evaluate whether the workout was eligible on the corrected date. The captured timezone stays fixed; the date is the client's corrected assertion, not a value that must always equal `started_at` converted to that timezone. Completion with no sets remains permitted and records completion, not target attainment. Repeating the same close action returns the existing terminal session; attempting the other terminal state conflicts.

A planned session captures the exact published revision under the plan lock and validates workout membership. A freestyle session has no prescription object. The session start API continues to use current local date and server start time. Existing one-active-session conflict/recovery behavior remains; session creation does not acquire a new idempotency contract by analogy with Performed Sets.

## 9. `training_performed_sets`

| Field | Type | Rule |
|---|---|---|
| `business_id` | uuid | Tenant |
| `training_session_id` | uuid | Composite session/business FK |
| `position` | integer | Nonnegative append order, allocated under session lock |
| `exercise_id` | uuid? | Actual library exercise, visible when selected; restricted deletion once used |
| `exercise_name` | text | Frozen actual name, nonblank |
| `tracking_type` | enum | Frozen actual interpretation; explicitly selected for a free-text exercise |
| `prescribed_exercise_id` | uuid? | Occurrence inside this session's frozen workout |
| `prescribed_set_id` | uuid? | Set inside that occurrence; null for an extra set |
| `set_type` | enum | `working`, `warmup`, `dropset` |
| `reps` | integer? | Nonnegative actual repetitions |
| `load_value` | numeric? | Nonnegative; interpretation comes from captured `tracking_type` |
| `load_unit` | enum? | `kg`, `lb` |
| `duration_seconds` | integer? | Nonnegative |
| `distance_value` | numeric? | Nonnegative |
| `distance_unit` | enum? | `m`, `km`, `mi` |
| `rpe` | numeric? | 1–10 |
| `notes` | text? | Maximum 5,000 |

Unique `(training_session_id, position)` and `(id, business_id, training_session_id)`; index `(business_id, training_session_id)`. Paired units/values and the exercise-field compatibility matrix are database checks as well as changeset validation. One nonnull primary measurement is recommended for an actual set; null remains unknown and zero remains an explicit result. This strengthens the permissive write contract and needs approval. Sessions may still complete without sets.

Both prescribed references are null for freestyle. A prescribed set requires its occurrence reference; an occurrence reference alone denotes an extra set for that occurrence. The context validates membership against the session's immutable revision/workout. A substitution can point to a prescribed set while capturing another actual exercise and interpretation. Do not force exercise equality. Do not make `prescribed_set_id` unique: repeated attempts or additional recorded work may reference the same target. No automatic skipped or failed outcome is inferred from missing or zero measurements.

Measurements, set type, and notes may be corrected. A free-text exercise name may be corrected, preserving the existing capability. Exercise identity, captured interpretation, prescribed links, session, and position are immutable after creation. Correct a mistaken identity by deleting and recreating the set with a different retry key. Library names never overwrite recorded names. Parent session revision and change marker advance atomically for every child create, update, or deletion.

## 10. `training_set_requests`

Retain the proven retry ledger. Eliminating this one table would require permanent set tombstones and immutable creation fingerprints on every set; it would not eliminate the retry state.

| Field | Type | Rule |
|---|---|---|
| `business_id` | uuid | Tenant |
| `training_session_id` | uuid | Composite session/business FK |
| `idempotency_key` | uuid | Client request identity; API may retain `request_id` name during transition |
| `fingerprint_version` | integer | Positive canonical request format version |
| `creation_fingerprint` | bytea | Immutable 32-byte SHA-256 of canonical original creation payload |
| `performed_set_id` | uuid? | Composite set/session/business FK; deletion sets only this column null |

Unique `(business_id, training_session_id, idempotency_key)`, including entries with a null result. Index `performed_set_id`. The only mutation is nulling the result after deletion; never delete the ledger while its session is retained. No separate business concept of a training request is exposed.

Creation canonicalization includes actual exercise/reference, frozen-link request identities, explicit free-text interpretation, and all client-supplied creation measurements. Exclude expected revision, server-assigned order/time, and names ignored because a library exercise was selected. Normalize numeric and enum representations before hashing. Preserve version-1 fingerprint validation for legacy requests rather than recomputing their hashes from corrected records.

Under the session lock, check for this key before mutation preconditions. Same key and same original fingerprint returns the surviving set, including corrections; different fingerprint conflicts. A null result conflicts and cannot recreate the deleted set. Different keys may create identical deliberate sets. Replays do not increment the session revision or publish another note. Keep optional keys for compatibility; the maintained client sends them for every create.

## Transactions and concurrency

1. Plan publication locks the client when coverage changes and locks the plan in the shared prescribed order. Validate `expected_revision`, node identity/reference membership, and library visibility; publish immutable content, update shell, and record the shared coverage/timeline fact in one transaction. Assignment locks source, validates its expected revision, creates the client plan and fresh document identities atomically.
2. Planned session start serializes against plan publication so source revision, workout and coverage decision cannot straddle edits. Unique active-session enforcement resolves competing starts. Freeze client-local timezone once.
3. Every performed-set mutation locks the parent session. A create writes the set, optional retry ledger, session revision, and change marker atomically. Deletes preserve the retry ledger. Completed-session corrections require `expected_revision`; retain active-session optional revision behavior unless separately approved. Discarded sessions reject changes.
4. Completion and note correction commit state/revision/change discovery and chat record-reference publication together using the established chat transaction boundary. Retries must not duplicate the note. The chat preview remains frozen after later record corrections.
5. The shared Review cursor design must make committed child mutations discoverable even across equal timestamps and concurrent reads. A wall-clock `changed_at` column alone is not a proof of lossless discovery. Training supplies one aggregate change on the session per accepted mutation and retains the parent after child deletion.

## Dated expectations and off-schedule sessions

A revision preserves what the session used. It does not establish what was expected on every date, choose a same-day cutoff, remember mutable Coaching terms, or match an off-schedule completion.

The shared historical resolver must return, for one client/local date: applied timezone, historical Coverage result, the chosen expectation revision, and that date's scheduled workout identity (or an explicit rest/no-coverage/unknown result). It must be able to return these facts for an unrecorded date after later plan archival, date changes, Coaching term edits, or timezone changes. A second independently editable training coverage table is not proposed here. If the shared resolver instead materializes dated expectations, Training consumes that authoritative occurrence identity; the shared design must settle its capture transaction and day-boundary behavior.

Recommended product choices, pending approval:

* Capture one final expectation per local date using end-of-day guidance. Today's expectation is provisional. A workout session always keeps the guidance it used at start, even if the end-of-day expectation differs. Historical corrections to actual sessions do not rewrite that expectation. Shared historical Coverage must support this choice before comparisons ship.
* Match a completed planned session only to the expectation on its recorded local date with the same Client Plan and stable workout identity. Different revisions of that workout can match, but the comparison must show that guidance changed if relevant. One expected workout receives at most one completion credit; additional completions remain visible.
* A Monday workout performed Tuesday remains a valid planned session. Unless Tuesday expected that same workout, show it as an off-schedule planned completion and leave Monday as Not recorded. Do not silently count it against Monday or label it freestyle. Cross-date credit would need explicit matching policy or a separate assignment relation.
* Freestyle completions are counted separately. Rest, no Coverage, unknown historical expectation, not recorded, and discarded are distinct facts. A completed session with no sets can count as a completed session; it proves no set target was met.
* Correcting a session date recomputes its derived matching under these rules. It does not mutate the original revision or create a second completion credit.

These choices resolve a concrete summary policy rather than promising that revision IDs alone solve matching. Until the user settles them and the shared history representation exists, show completed sessions without a fabricated historical denominator.

## Migration treatment

This is a schema proposal, not an instruction to run a migration. Before implementation, inspect real rows and resolve compatibility with the maintained clients.

* Copy each live prescription to one baseline revision at cutover. Keep workout and occurrence UUIDs; generate prescribed-set UUIDs once. This baseline proves cutover guidance only. Do not backdate it to plan creation or invent expectations for earlier unrecorded days.
* Keep existing session snapshots authoritative for legacy sessions. They capture only a workout, so they cannot be expanded honestly into a full historic plan revision or weekly schedule. Transitional session storage must permit either a legacy snapshot or a new revision, exactly one for planned sessions. Removing snapshot columns is conditional on an explicit historical retention design, not part of the first conversion.
* Existing performed sets have no prescribed-set identity. Preserve null links. Positional similarity is not enough to assign them. Existing snapshot occurrence links can stay within the retained legacy snapshot.
* Convert integer-looking actual reps only when conversion is lossless. Preserve other original strings in a compatibility payload or retained legacy column and mark them unstructured. Never convert `8-12` to an invented actual count. Parse prescribed exact/range/AMRAP targets only when unambiguous; preserve other instructions for manual review.
* Map `lbs` to `lb`, `meters` to `m`, and `miles` to `mi` without numerical conversion. Interpret `bodyweight` or `none` only with trustworthy captured tracking type; do not guess whether a legacy number was total mass, assistance, or added load. Inconsistent rows need explicit legacy handling before stronger checks validate.
* Actual set interpretation was not independently captured. A snapshot's prescribed exercise is insufficient for a substituted exercise. Retain unknown legacy interpretation rather than copying today's library meaning as historical truth. New rows require the complete captured interpretation.
* Training sessions did not store timezone. Do not present today's timezone as an observed historical fact. Preserve an unknown/provenance marker in transitional storage. Historic Review denominators remain unknown where applied dates or eligibility cannot be proven.
* Preserve retry identities, creation fingerprints, null deletion pointers, and their original canonicalization version exactly. Existing retries must behave identically through a deployment and after a correction.
* Rehome creator references from coaches to users only through a verified join; preserve deleted-actor nulls. Keep soreness on sessions until the user approves a Tracker mapping, identity, and migration that prevents duplicate display or counting.
* Retire live workout, prescribed-exercise, and weekly-schedule tables only after all writers/readers use revision content and assignment preserves its identity rules. Retain historical revisions and referenced plans. Strong constraints can be validated after legacy exceptions have an explicit representation; do not silently discard malformed history.

## Decisions for table-by-table approval

| Decision | Recommendation | Why it needs approval |
|---|---|---|
| Historical prescription representation | Immutable revisions with captured exercise names and interpretations | Changes edit/deletion storage; shared timeline still needs its historical Coverage contract |
| Exercise interpretation | Retain closed tracking types; derive fields | Prevents bodyweight/assistance ambiguity without arbitrary measure combinations |
| Actual reps and targets | Integer actual reps; exact/range/AMRAP prescribed reps | Stronger API contract; legacy free text needs preservation |
| Empty actual set | Require at least one primary measurement on newly created sets | Tightens permissive behavior; completion without sets stays allowed |
| Stable prescribed-set identity | UUIDs in the revision document; actual sets may refer to them | Enables precise target association without a set table |
| Historical plan/exercise removal | Archive anything referenced by retained history | Replaces some physical-delete behavior |
| Dated comparison | End-of-day expectation; same-date/same-workout matching; off-schedule shown separately | Check-ins explicitly deferred capture timing and matching |
| Soreness | Retain session field until a deliberate Tracker migration | Existing vocabulary and storage do not authorize its silent removal |

Evidence: [training inventory](training-report.md), [proposal validation](spec-validation.md), [current glossary](../../CONTEXT.md), and [agreed check-ins contract](../check-ins/spec.md). Exact bounded source checks covered `training_prescription_snapshot.ex`, `training_performed_sets.ex`, `training/training_performed_set.ex`, and `training/training_set_request.ex`; parent supplied checks of PlanCoverage and TrainingPlan coverage queries. Graph tools were unavailable, so project, generation, and coverage are unknown. No runtime database inspection or tests ran. Current-behavior claims elsewhere in this document rely on the cited source inventory, not independently rerun tests.
