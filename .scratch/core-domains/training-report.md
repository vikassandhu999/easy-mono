Training currently separates **live prescriptions** from **recorded sessions**. Templates and client plans share one schema and one prescription structure. Assignment copies that structure; starting a planned session freezes one workout. That preserves the targets of a session that was started, but it does **not** preserve the historical schedule needed to calculate reliable “completed against expected” totals after plan edits. [Vocabulary](/Users/vikassandhu/Desktop/10x/easy-mono/CONTEXT.md:27), [assignment](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_copy.ex:61), [snapshot](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_snapshot.ex:8).

This is a read-only report of the checked-out source and migration definitions. I read the five requested documents first, inspected the training implementation, and followed its dependencies into the maintained coach and client apps. Graph tools were unavailable, so discovery and verification used source reads and bounded searches. I did not inspect a running database or execute tests. Test references below describe assertions present in source, not tests run during this investigation. `clientapp-v2` is excluded.

The main DDL source is [20260922000300_create_training.exs](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:1), called **training DDL** below. A later migration adds session revisions. The current exercise context is `Easy.Training.Library`; the exercise schemas are under `easy/training/`, rather than a separate `easy/exercises/` directory. [Library](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_library.ex:1), [revision migration](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922163000_record_corrections.exs:19).

**The database catalog contains 12 training tables, represented by 10 persisted Ecto schemas and one embedded set schema.**

The following conventions apply throughout the catalog:

- Every training table except the two exercise join tables has `id: binary_id`, a non-null UUID primary key, and non-null `inserted_at` and `updated_at` timestamps declared as `:utc_datetime`. Those ten Ecto schemas autogenerate UUIDs.
- The two join tables have neither a primary-key column nor timestamps.
- “Nullable” below means database-column nullability. Application requirements are stated separately.
- Ecto `:string` can correspond to migration `:string` or `:text`; both are identified where relevant. Enum columns use migration `:string`.
- Index lists below exclude the primary-key index and include all explicitly declared remaining indexes.

These conventions and the complete table set are visible in the [training DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:5).

`training_muscles` and `training_equipment` are global reference tables.

| Table / Ecto schema | Fields beyond common ID and timestamps | Constraints and indexes |
|---|---|---|
| `training_muscles` / `Easy.Training.TrainingMuscle` | `name`: string, non-null; `description`: Ecto string / DB text, nullable | Unique `name` |
| `training_equipment` / `Easy.Training.TrainingEquipment` | `name`: string, non-null; `description`: Ecto string / DB text, nullable | Unique `name` |

Neither carries `business_id`. Their schemas provide search and alphabetical query builders, without insert/update changesets. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:5), [muscle schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_muscle.ex:8), [equipment schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_equipment.ex:8).

`training_exercises` is the live exercise library, represented by `Easy.Training.TrainingExercise`.

| Field | Ecto type / DB type | Nullable; default | Relationship or constraint |
|---|---|---|---|
| `business_id` | `binary_id` / UUID | Yes | FK → `businesses`; no delete cascade specified |
| `source` | enum / string | No; `custom` | `system`, `imported`, `custom` |
| `tracking_type` | enum / string | No; `weight_reps` | Nine values listed below |
| `name` | string | No | Required by changeset; maximum 255 characters |
| `description` | string / text | Yes | Changeset maximum 5,000 |
| `instructions` | string / text | Yes | Changeset maximum 10,000 |
| `mechanics` | enum / string | Yes | `compound`, `isolation`, `isometric` |
| `force` | enum / string | Yes | `push`, `pull`, `static` |
| `images` | array of strings | Yes; `[]` | No URL/content validation in this changeset |
| `import_id` | string | Yes | Unique when non-null |
| `creator_id` | `binary_id` / UUID | Yes | FK → **coaches**, deletion sets null |
| `media_id` | `binary_id` / UUID | Yes | FK → `library_media`, deletion sets null |

The nine tracking types are `weight_reps`, `bodyweight_reps`, `weighted_bodyweight`, `assisted_bodyweight`, `reps_only`, `duration`, `weight_duration`, `distance_duration`, and `weight_distance`. Database checks enforce the enum vocabularies. Another check requires `business_id IS NOT NULL OR media_id IS NULL`, so a global exercise cannot carry `media_id`.

Indexes are:

- Non-unique: `(business_id)`, `(business_id, inserted_at, id)`, `(media_id)`.
- Unique: `(name, business_id)` and `(import_id) WHERE import_id IS NOT NULL`.

The schema has `belongs_to` associations for business, creator, and media, plus many-to-many muscles and equipment. Visibility is determined by `business_id = current_business OR business_id IS NULL`, **not** by `source`. There is no database check coupling `source` to business ownership. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:25), [schema and validation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_exercise.ex:47), [visibility](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_exercise.ex:178).

The two join tables store undifferentiated membership:

| Table | Complete fields | Constraints / relationships |
|---|---|---|
| `training_exercise_muscles` | `exercise_id`: UUID, non-null; `muscle_id`: UUID, non-null | FKs → exercise and muscle, both cascade on deletion; unique `(exercise_id, muscle_id)` |
| `training_exercise_equipment` | `exercise_id`: UUID, non-null; `equipment_id`: UUID, non-null | FKs → exercise and equipment, both cascade on deletion; unique `(exercise_id, equipment_id)` |

They have no separate Ecto schemas, ordering, muscle role, quantity, or tenant column. `TrainingExercise` uses `join_through` table names and `on_replace: :delete`. The importer explicitly combines primary and secondary muscle lists before storing membership. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:70), [associations](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_exercise.ex:62), [importer](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/seeds/training_seeds.exs:254).

`training_plans` represents both Training Templates and Client Plans through `Easy.Training.TrainingPlan`.

| Field | Ecto type / DB type | Nullable; default | Relationship or constraint |
|---|---|---|---|
| `business_id` | UUID | No | FK → business, cascade |
| `kind` | enum / string | No | `template` or `client_plan` |
| `name` | string | No | Trimmed, required, maximum 255 |
| `description` | string / text | Yes | Maximum 5,000 in changeset |
| `revision` | integer | No; `1` | DB check `revision > 0` |
| `archived_at` | UTC datetime | Yes | Archival fact |
| `start_date` | date | Yes | Client-plan coverage start |
| `end_date` | date | Yes | Client-plan coverage end |
| `creator_id` | UUID | Yes | FK → **users**, deletion sets null; required on application insertion |
| `client_id` | UUID | Yes at column level | Composite FK `(client_id, business_id)` → clients; cascade |
| `source_template_id` | UUID | Yes | Composite self-FK `(source_template_id, business_id)`; source deletion nulls only `source_template_id` |

Additional Ecto-only fields are virtual `status: active | archived`, default `active`, and virtual `lifecycle: incomplete | waiting | upcoming | current | ended | archived`. Associations include creator, business, client, source template, many workouts, and many schedule rows.

Database constraints require:

- A template has no client, source template, start date, or end date.
- A client plan has a client.
- When both dates exist, `start_date <= end_date`.
- A positive revision.

The database does **not** require a client plan’s source row to have `kind = template`; the assignment workflow supplies a template. Nor does it prohibit an end date without a start date.

Indexes are:

- `(business_id, client_id, start_date, end_date)`, partial to unarchived client plans with a start date.
- `(business_id, client_id)`.
- `(business_id, client_id, inserted_at, id)`.
- `(business_id, kind, archived_at)`.
- `(business_id, kind, inserted_at, id)`.
- Unique `(id, business_id)`.
- Unique `(business_id, client_id)`, partial to unarchived client plans **without** a start date: at most one incomplete plan per client.

There is no training-plan date-range exclusion constraint. Overlap protection is implemented by application code and locking, described below. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:90), [schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_plan.ex:25), [changesets](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_plan.ex:62).

`training_workouts` is an ordered workout collection within either kind of plan, represented by `Easy.Training.TrainingWorkout`.

| Field | Type | Nullable | Relationship or constraint |
|---|---|---|---|
| `business_id` | UUID | No | FK → business, cascade |
| `training_plan_id` | UUID | No | Composite FK with business → plan, cascade |
| `name` | string | No | Trimmed and required in changeset |
| `position` | integer | No | DB and changeset require `>= 0` |

Indexes: `(business_id)`; unique `(id, business_id)`; unique `(id, training_plan_id, business_id)`; unique `(training_plan_id, position)`.

The schema belongs to business and plan and has many prescribed exercises. Its `weekdays: array<string>` field is virtual. A workout does not store a date, week number, description, notes, duration, or group type. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:162), [schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_workout.ex:15).

`training_prescribed_exercises` is an ordered exercise occurrence inside a workout, represented by `Easy.Training.PrescribedExercise`.

| Field | Type | Nullable; default | Relationship or constraint |
|---|---|---|---|
| `business_id` | UUID | No | FK → business, cascade |
| `training_workout_id` | UUID | No | Composite FK with business → workout, cascade |
| `exercise_id` | UUID | No | FK → library exercise; deletion restricted |
| `position` | integer | No | DB and changeset require `>= 0` |
| `prescribed_sets` | `embeds_many PlannedSet`; migration `{:array, :map}` | No; `[]` | Replaced embedded collection, `on_replace: :delete` |

Indexes: `(business_id)`, `(exercise_id)`, and unique `(training_workout_id, position)`.

There is no unique `(workout, exercise)` constraint: the same library exercise may appear several times in one workout. The exercise FK is not composite with business; the prescription writer separately checks that every exercise is visible to the tenant. There are no exercise-occurrence notes or grouping fields. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:195), [schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/prescribed_exercise.ex:15), [visibility validation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_writer.ex:51).

`Easy.Training.PlannedSet` is the embedded schema for a Prescribed Set. It has **no ID, position field, timestamps, standalone table, or database indexes**. Array order supplies set order.

| Complete field list | Ecto type | Optionality and validation |
|---|---|---|
| `set_type` | enum | Defaults to `working`; may be null; values `working`, `warmup`, `dropset` |
| `reps` | string | Optional; no numeric or range parser |
| `load_value` | decimal | Optional; no magnitude validation |
| `load_unit` | enum | Optional; `kg`, `lbs`, `bodyweight`, `none` |
| `duration_seconds` | integer | Optional; changeset requires `>= 0` |
| `distance_value` | decimal | Optional; no magnitude validation |
| `distance_unit` | enum | Optional; `meters`, `km`, `miles`, `none` |
| `rpe` | decimal | Optional; changeset range 1–10 inclusive |
| `rest_seconds` | integer | Optional; changeset requires `>= 0` |
| `notes` | string | Optional; no length validation in this embedded changeset |

No field is `validate_required`. There is no requirement for a measurement, paired value/unit, compatibility with the exercise’s tracking type, or relationships between the measurements. The database validates the containing column’s presence, not the inner set fields. [Embedded schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/planned_set.ex:31), [vocabularies](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/set_vocab.ex:1).

`training_workout_schedule`, represented by `Easy.Training.WorkoutSchedule`, stores the repeating weekday mapping.

| Field | Type | Nullable | Relationship or constraint |
|---|---|---|---|
| `business_id` | UUID | No | FK → business, cascade |
| `training_plan_id` | UUID | No | Composite FK with business → plan, cascade |
| `training_workout_id` | UUID | No | Composite FK with plan and business → workout, cascade |
| `weekday` | enum / string | No | Monday through Sunday |

Indexes: `(business_id)` and unique `(training_plan_id, weekday)`.

The composite workout FK ensures that the scheduled workout belongs to the same plan and business. A rest day is **absence of a row**, not a row with a null workout. A workout can be used on multiple weekdays. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:232), [schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/workout_schedule.ex:17).

`training_sessions`, represented by `Easy.Training.TrainingSession`, is the execution record.

| Field | Type | Nullable; default | Relationship or constraint |
|---|---|---|---|
| `business_id` | UUID | No | FK → business, cascade |
| `client_id` | UUID | No | Composite FK with business → client, cascade |
| `kind` | enum / string | No | `planned`, `freestyle` |
| `state` | enum / string | No; `active` | `active`, `completed`, `discarded` |
| `date` | date | No | Recorded occurrence date |
| `started_at` | UTC datetime | No | Server start timestamp |
| `closed_at` | UTC datetime | Yes | Required by DB state check for terminal states |
| `notes` | string / text | Yes | Changeset maximum 4,000 |
| `soreness_rating` | integer | Yes | DB and changeset range 1–5 |
| `snapshot_version` | integer | Yes at column level | Planned-start workflow writes `1` |
| `prescription_snapshot` | map | Yes at column level | Frozen planned workout document |
| `source_plan_id` | UUID scalar | Yes at column level | **No FK or Ecto association** |
| `source_workout_id` | UUID scalar | Yes at column level | **No FK or Ecto association** |
| `revision` | integer | No; `1` | Added by later migration; DB check `> 0` |

The schema belongs to client and business and has many performed sets.

Database checks enforce:

- `closed_at IS NULL OR closed_at >= started_at`.
- Active sessions have no close timestamp; completed/discarded sessions have one.
- Closed kind/state vocabularies.
- For planned sessions, non-null snapshot and source IDs plus the expression `snapshot_version > 0`.
- For freestyle sessions, all four snapshot/source fields are null.
- Soreness and revision bounds.

Indexes:

- `(business_id, client_id, started_at)`.
- `(business_id, client_id, inserted_at DESC, id DESC)`.
- Unique `(id, business_id)`.
- Unique `(business_id, client_id) WHERE state = 'active'`.

There is no uniqueness by date or source workout, and no stored applied timezone. **Constraint inference:** the snapshot check does not explicitly require `snapshot_version IS NOT NULL` or wrap the expression in `IS TRUE`; SQL null-check semantics leave a weaker invariant than the planned-start workflow’s always-present version. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:269), [schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:29), [revision migration](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922163000_record_corrections.exs:19).

`training_performed_sets`, represented by `Easy.Training.TrainingPerformedSet`, stores actual work in session-wide append order.

| Field | Type | Nullable; default | Relationship or constraint |
|---|---|---|---|
| `business_id` | UUID | No | FK → business, cascade |
| `training_session_id` | UUID | No | Composite FK with business → session, cascade |
| `exercise_id` | UUID | Yes | FK → exercise, deletion sets null |
| `exercise_name` | string | No | Frozen on creation; DB rejects whitespace-only name |
| `snapshot_exercise_ref` | string | Yes | Application-validated reference into session snapshot; no FK |
| `position` | integer | No | Server-assigned; DB and changeset require `>= 0` |
| `set_type` | enum / string | No; `working` | `working`, `warmup`, `dropset` |
| `reps` | string | Yes | No numeric or range validation |
| `load_value` | decimal | Yes | No magnitude constraint |
| `load_unit` | enum / string | Yes | `kg`, `lbs`, `bodyweight`, `none` |
| `duration_seconds` | integer | Yes | No nonnegative DB or Ecto changeset constraint; typed HTTP input is nonnegative |
| `distance_value` | decimal | Yes | No magnitude constraint |
| `distance_unit` | enum / string | Yes | `meters`, `km`, `miles`, `none` |
| `rpe` | decimal | Yes | DB and changeset range 1–10 |
| `notes` | string / text | Yes | Changeset maximum 5,000 |

Indexes: `(business_id, training_session_id)`; unique `(id, business_id, training_session_id)`; unique `(training_session_id, position)`.

Database checks cover the enums, nonblank exercise name, nonnegative position, and RPE range. There is no minimum recorded work, unit/value pairing, tracking-type constraint, prescribed-set reference, actual-rest field, or per-set occurrence timestamp beyond row timestamps. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:343), [schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_performed_set.ex:16), [typed input](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training/performed_set.ex:27).

`training_set_requests`, represented by `Easy.Training.TrainingSetRequest`, is an idempotency ledger, unrelated to the proposed Tracker requests.

| Field | Ecto type / DB type | Nullable | Relationship or constraint |
|---|---|---|---|
| `business_id` | `Ecto.UUID` / UUID | No | FK → business, cascade |
| `training_session_id` | `Ecto.UUID` / UUID | No | Composite FK with business → session, cascade |
| `request_id` | `Ecto.UUID` / UUID | No | Client-supplied request identity |
| `fingerprint` | binary | No | SHA-256 of canonical creation fields |
| `performed_set_id` | `Ecto.UUID` / UUID | Yes | Composite FK with business and session → performed set; deletion nulls only this field |

Indexes: unique `(business_id, training_session_id, request_id)` and non-unique `(performed_set_id)`. These IDs are plain Ecto fields rather than `belongs_to` associations. The changeset requires `performed_set_id` at creation, even though deletion can subsequently null it. [DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:410), [schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_set_request.ex:14), [fingerprint](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_performed_set.ex:74).

Two shared tables materially participate in training, outside that 12-table count.

| Shared table / schema | Fields and constraints relevant to this map |
|---|---|
| `coaching_terms` / `Easy.CoachingTerms.CoachingTerm` | Common UUID ID/timestamps; `client_id: UUID NOT NULL`, FK to clients without a specified cascade; `starts_on: date NOT NULL`; `ends_on: date NULL`. Index `(client_id, starts_on)`. Check end ≥ start. GiST exclusion prevents overlapping inclusive date ranges for one client. No business column; tenant scope joins through client. |
| `library_media` / `Easy.LibraryMedia.Media` | UUID primary key, supplied rather than autogenerated by the schema; common timestamps. Nullable columns: `business_id: UUID` FK → business with cascade; `uploaded_by_type: enum/string` (`coach`, `client`, `system`); `uploaded_by_id: UUID`; `storage_key: string`; `content_type: string`; `byte_size: Ecto integer / DB bigint`; `external_url: Ecto string / DB text`. Index `(business_id)`; unique `(storage_key)`. A DB check requires either an HTTP(S) external URL with system uploader and no storage key, or a stored object with business, content type, positive byte size, and no external URL. |

Library upload changesets accept JPEG, PNG, WebP, MP4, and WebM; maximum sizes are 15 MiB for images and 50 MiB for videos. There is no training-session attachment relation. Exercise media is a library reference; chat attachments are a separate mechanism. [Coaching-term DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000000_create_identity_and_tenancy.exs:139), [term schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/coaching_terms/coaching_term.ex:8), [media DDL](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000200_create_media.exs:42), [media schema and limits](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/library_media/media.ex:19).

Client `timezone` and `unit_system` also affect training. The unit system is `metric | imperial`, default metric. Local dates use the client timezone, then business timezone; the calendar helper has an `Asia/Kolkata` fallback. [Client fields](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:20), [calendar](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/local_calendar.ex:9).

**The prescription lifecycle is copy, edit in place, then capture at session start.**

1. A coach creates a template containing name and optional description. Prescription authoring is a separate operation. Both operations use the same `training_plans` row; there is no separate program or assignment object. [Programming](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_programming.ex:11), [vocabulary](/Users/vikassandhu/Desktop/10x/easy-mono/CONTEXT.md:35).

2. Assignment authorizes the client, loads an unarchived template under `FOR UPDATE`, optionally checks its expected revision, creates a client plan at revision 1, and copies the prescription inside a transaction. Name and description are copied; requested start/end dates belong to the new client plan. [Assignment workflow](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_copy.ex:24).

3. Copied workouts, prescribed exercises, and schedule rows receive new IDs. Set values are copied into new embedded collections. Schedule workout references are remapped. Library `exercise_id` values remain the same. The only persisted template provenance is `source_template_id`; the source template’s revision and original child IDs are not stored on the copy. [Copy implementation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_copy.ex:114), [client-plan changeset](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_plan.ex:78).

4. Template edits do not update existing client plans. Client-plan edits do not update the template or other clients. Library exercise edits remain visible wherever that live exercise is referenced. A client plan may be prepared before coaching starts; assignment does not require a current coaching term. [Copy implementation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_copy.ex:38), [live exercise preload](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/prescribed_exercise.ex:80).

5. Metadata and prescription mutations lock the plan and check `expected_revision`. Successful changes increment the plan revision. Prescription replacement accepts the entire workout collection and all seven weekday entries. Existing nodes use IDs; new nodes use request-local references. Omitted workouts/exercises are deleted. Retained IDs survive, but set collections are replaced and all schedule rows are deleted/recreated. A prescribed-exercise ID cannot be moved to another workout. [Mutation lock](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_programming.ex:73), [input topology](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_input.ex:110), [replacement](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_writer.ex:67).

6. Plan archival records `archived_at`; restoration clears it and rechecks overlap. Deletion removes the live prescription through cascades. Deleting a source template only clears a client plan’s source link. Session snapshots and scalar source IDs survive plan/workout deletion. Library exercise deletion is blocked while any prescription references it; once deletable, existing performed-set exercise FKs become null while names and snapshots remain. [Lifecycle mutations](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_programming.ex:55), [exercise deletion](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_library.ex:165), [deletion-survival test assertions](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/training/rewrite_verification_test.exs:79).

There is no requirement that assignment contain workouts, that a workout contain exercises, or that a prescribed exercise contain sets. These collections can be empty. Their writers validate shape, identities, positions, visibility, and supplied values, rather than a “ready to deliver” state. [Prescription input](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_input.ex:45), [writer](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_writer.ex:14).

**Coverage combines plan dates, archival, and coaching-term history.**

A covering plan must be an unarchived client plan with a start date. Its dates are inclusive: `start_date <= requested_date`, with no upper bound when `end_date` is null. The term rule adds:

- Some coaching term covers the requested date.
- No term has an `ends_on` on or after the plan’s **creation date**, but before the requested date.
- The plan’s creation date is `inserted_at` converted using the client’s currently applied timezone.

There is no stored `coaching_term_id` on the plan. [Plan query](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_plan.ex:215), [exact SQL predicate](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex:5).

The consequences match coaching-terms E6:

- A plan created before acceptance can become current when coaching starts.
- A plan created during a term stops permanently after that term ends, including a plan whose start date was scheduled beyond the term’s end.
- A new plan created between terms can become current when coaching resumes.
- Ending a term does not rewrite plan dates.
- `effective_end` is the earlier of the plan’s own end and the first term end on or after its creation date.
- `stopped_on` identifies an already-passed term end that curtailed the plan before its own end.

These are implemented and also covered by test assertions for both training and nutrition. [Spec E6](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/coaching-terms/spec.md:66), [derived end](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex:42), [tests](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/plan_coverage_test.exs:9).

The displayed lifecycle follows this order:

| Condition | Lifecycle |
|---|---|
| Template | `nil` |
| Client plan archived | `archived` |
| No start date | `incomplete` |
| Effective end before today | `ended` |
| Start date after today | `upcoming` |
| Term covers today | `current` |
| Otherwise | `waiting` |

`status` is separately formatted as active/archived from `archived_at`. [Lifecycle](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_plan.ex:55), [coverage lifecycle](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex:32), [formatter](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training_plan.ex:330).

Overlap validation locks the client row and compares other unarchived, dated plans of the same schema. It clips their ranges using **already-ended terms only**; a future planned coaching end does not yet shorten overlap validation. Training and nutrition therefore maintain separate coverage timelines while sharing the implementation. The one-incomplete-plan invariant is enforced separately by a partial unique index. [PlanOverlap](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_overlap.ex:20).

For a requested date, coverage resolves the current weekday and looks up the schedule row. No row means a rest day; no covering plan returns `nil`. The schedule repeats every week without week numbers or date exceptions. **Starting a workout is allowed for any workout in the covering plan**, including on a rest day or on another workout’s scheduled day. [Coverage resolver](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_reader.ex:263), [start eligibility](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_reader.ex:139).

**A session starts against today’s live prescription and subsequently keeps its captured targets.**

- `start_client_session` obtains server UTC time and the client-local date. With no workout ID it creates freestyle. With a workout ID it resolves that workout from today’s covering plan and builds the snapshot.
- The client cannot supply a start timestamp or initial occurrence date through the create contract.
- The partial unique index allows only one active session per client/business. A competing start becomes a conflict.
- The maintained client app first checks for an active session and returns it; after uncertain creation or a conflict it checks again for recovery.

[Backend start](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:16), [start contract](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training/session.ex:94), [client recovery](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/training.ts:96).

The version-1 snapshot has this complete shape:

| Part | Captured fields |
|---|---|
| Root | `version` |
| Plan | `id`, `name`, `revision` |
| Workout | `id`, `name`, ordered `exercises` |
| Each exercise occurrence | `ref` = prescribed-exercise ID; `position`; library `exercise_id`; frozen `exercise_name`; frozen `tracking_type`; ordered `sets` |
| Each set | All ten `PlannedSet` fields listed above |

The snapshot does **not** include the weekly schedule, coverage dates, template provenance, coaching-term identity, applied timezone, plan description, workout position, exercise instructions, mechanics, force, muscles, equipment, images, or media. It captures only the selected workout. Snapshot version and captured plan revision are different concepts. [Snapshot builder](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_snapshot.ex:6), [set serialization](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/planned_set.ex:67).

While recording:

- Performed sets are appended at `max(position) + 1` under a session lock.
- A set can identify a visible library exercise or use a free-text name.
- With a library reference, its name is copied from the live exercise at set creation.
- An optional `snapshot_exercise_ref` must exist in this session’s snapshot. It need not identify the same library exercise: substitutions are explicitly supported.
- Update cannot change a set’s exercise ID, snapshot reference, or position. It can change measurements and notes; it can change the name only when `exercise_id` is null.
- Creating, changing, or deleting a set increments the **session** revision.

[Performed-set workflow](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_performed_sets.ex:81), [append position](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_performed_sets.ex:136), [field mutability](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_performed_set.ex:96), [substitution test](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/training/execution_performed_set_test.exs:132).

A creation `request_id` is optional at the backend and always supplied by the maintained client app. The ledger permits retrying the same request without adding another set. Reusing the ID with different creation fields conflicts. A retry after later edits returns the existing set; a deleted set leaves a null ledger pointer and is not recreated. Identical deliberate sets with different request IDs remain separate. [Request handling](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_performed_sets.ex:43), [client request creation](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/workout-draft.ts:7).

Finishing changes state to completed, stamps `closed_at`, increments revision, stamps client activity, and sends a nonblank session note to chat with a record reference. There is **no check that any set exists or that targets were achieved**. Discarding closes the session without stamping activity; performed rows remain. Repeating the same terminal action returns the existing session, while changing one terminal state into the other conflicts. [Close implementation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:180), [note publication](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_record_notes.ex:9).

Completed sessions remain correctable: date, notes, soreness, and performed sets can change with the current `expected_revision`. Active-session mutations may omit that precondition. Discarded sessions reject ordinary corrections. Corrections leave the prescription, source IDs, start timestamp, and close timestamp unchanged. A changed completed-session note sends a new revision-linked chat message; it does not rewrite the old message’s frozen preview. [Revision policy](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:56), [note correction](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:46), [chat reference fields](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_record_references.ex:30).

A session’s occurrence `date` can be moved to any non-future date. The correction does not re-resolve coverage or rebuild its snapshot. Thus a session started from today’s workout can be backdated while retaining today’s prescription. This behavior is explicitly asserted in a controller test. [Date validation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:56), [backdating test](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy_web/controllers/clients/workout_session_controller_test.exs:287).

Client HTTP writes require a term covering **today**; GETs remain available after coaching ends. This is a router plug rule. The training contexts themselves obtain the trusted client ID but do not independently enforce the current-term write gate. Coach routes expose session reads, with no coach-recording endpoints. [Router pipeline](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/router.ex:22), [write gate](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/plugs/require_coaching.ex:8), [coach routes](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/router.ex:172).

There is also a vocabulary/visibility distinction: although `CONTEXT.md` says completion “first shares” a session, coach history APIs and the coach screen allow active and discarded sessions, including their saved sets and notes. Completion gates chat record references, rather than all coach visibility. [Vocabulary](/Users/vikassandhu/Desktop/10x/easy-mono/CONTEXT.md:39), [coach read path](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:85), [coach screen](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-sessions/training-session.tsx:128).

**The prescription can express a flat ordered workout with independently described sets.**

| Capability | What exists today | Limit |
|---|---|---|
| Set types | Working, warm-up, drop set | A drop set is a label; no parent set or linked drop sequence |
| Set count/order | Number and order of embedded set objects | No stable set identity |
| Reps | Free-text `reps`; builder explicitly suggests `8–10` | No typed minimum/maximum, numeric repetitions, or AMRAP/failure semantics |
| Load | Decimal value plus kg/lbs/bodyweight/none | No percentage of 1RM, load range, intensity basis, or progression formula |
| Bodyweight variants | Exercise tracking types distinguish bodyweight, weighted bodyweight, and assisted bodyweight | Meaning depends on tracking type; no recorded body-mass snapshot |
| Effort | One decimal RPE, 1–10 | No RPE range or RIR field |
| Rest | Prescribed integer seconds per set | No actual rest recording or explicit between-exercise/between-round rest |
| Cardio/time | Integer duration seconds | No interval phases or separate work/recovery blocks |
| Cardio/distance | Decimal distance with meters/km/miles/none | No pace, speed, incline, cadence, heart-rate target, or zone |
| Notes | Plan description, library exercise instructions/description, prescribed-set notes | No workout notes or prescribed-exercise-specific notes |
| Media | Exercise `images[]` plus one `media_id`, image or video | No prescription-specific or performed-set/session media relation; no media in snapshot |
| Warm-ups | Warm-up set type and builder shortcut | No separate warm-up section or warm-up generation |
| Repeated exercise | Multiple occurrences allowed in a workout | No modeled superset/circuit relation between occurrences |
| Weekly programming | One optional workout for each weekday | No multi-week cycle, date exception, or multiple scheduled workouts per weekday |
| Variations | Coach can duplicate workouts/exercises and replace a chosen exercise | No formal alternative-selection or progression model |

The complete backend set shape, exercise tracking vocabulary, builder controls, and schedule schema support this table. [Set schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/planned_set.ex:31), [tracking types](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_exercise.ex:18), [builder targets](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/set-prescription.tsx:8), [builder variations](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/workout-editor.tsx:154), [schedule](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/workout_schedule.ex:17).

The following are **structural conclusions from the complete field lists and write contracts**, rather than claims that a coach could not describe them in prose. Training cannot currently represent these as structured prescription data:

- Supersets, circuits, rounds, nested groups, exercise stations, or group-level repetition/rest.
- Tempo phases, pauses, isometric-hold phases within repetitions, or eccentric/concentric timing.
- RIR, failure targets, structured rep ranges, or structured load/RPE ranges.
- Percentage-based loading, 1RM references, automatic progression, deload rules, blocks, phases, or week-specific prescriptions.
- Left/right side, per-side quantities, unilateral execution, or independent left/right results.
- Structured interval training, pace, speed, heart rate, zones, power, incline, cadence, calories, steps, or floors.
- Workout-specific coaching notes, exercise-occurrence instructions, or exercise alternatives offered to the client.
- A date-specific workout expectation, reschedule, skip reason, or stable match from an actual set to one prescribed set.

Those concepts have no fields or relations in the [prescription schemas](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/prescribed_exercise.ex:15), [set schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/planned_set.ex:31), or [typed prescription input](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training_plan.ex:95). The importer even maps `floors_duration` and `steps_duration` to generic duration tracking. [Import mapping](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/seeds/training_seeds.exs:306).

There is an additional authoring limitation: the Ecto exercise changeset supports `tracking_type`, but the public exercise create/update types and coach form omit it. Consequently, the maintained coach authoring path creates exercises with the default tracking type; duplication preserves the source’s tracking type. [Public exercise inputs](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training/exercise.ex:47), [coach form payload](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/exercises/exercise.ts:3), [copy changeset](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_exercise.ex:98).

**Performed work preserves many of the same measurements, but has a different identity and lifecycle.**

| Aspect | Prescription | Performed record |
|---|---|---|
| Exercise identity | Required live library exercise; distinct prescribed-exercise row | Optional library exercise, required frozen name, optional snapshot-exercise link |
| Set identity | Array position only | UUID and session-wide append position |
| Measurements | Reps, load/unit, duration, distance/unit, RPE | Same measurement fields |
| Rest | Prescribed `rest_seconds` | Absent |
| Notes | Per-set target notes | Independent per-set actual notes plus session notes |
| Tracking type | Live exercise; captured in planned snapshot | No performed-set tracking-type field |
| Lifecycle | Changes with the plan | Session active/completed/discarded; revisions permit corrections |
| Missing work | No actual record | No explicit skipped-set or skipped-exercise record |
| Expected-set match | No set ID available | Only an exercise-occurrence reference, not a set reference |

[Prescribed set](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/planned_set.ex:31), [performed set](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_performed_set.ex:16), [snapshot exercise reference](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_snapshot.ex:21).

For historical analysis, the distinction is:

| Question | Answer supported by current records |
|---|---|
| How many sessions are currently marked completed in a date range? | Computable from current `state` and corrected `date`; distinguish planned/freestyle using `kind`. |
| What targets were captured for a particular planned session? | Available after plan edits/deletion from its immutable application-level snapshot. |
| What was actually recorded for that session? | Available as the latest corrected performed sets and metadata. |
| Which actual sets belong to a captured exercise occurrence? | Available when `snapshot_exercise_ref` was supplied; substitutions are allowed. |
| Did a particular prescribed set get completed? | No unambiguous stored mapping; any pairing by order would be an inference. |
| What workouts were expected on every past date, including dates with no session? | Not reliably reconstructable after edits, archival, deletion, or coverage changes. |
| What did the session look like before a correction? | No complete revision history is stored; revisions are counters, and chat keeps only a summary reference. |

The historical-denominator limitation follows from three facts: schedule rows are replaced, coverage is resolved from current plan/term data, and snapshots are created only for selected workouts when sessions start. Even the covering-plan predicate does not require the requested date to be on or after plan creation, so a backdated live plan can answer retrospective coverage queries. [Schedule replacement](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_writer.ex:83), [coverage predicate](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex:5), [snapshot scope](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_snapshot.ex:8).

**Inference:** “completed against expected” can be calculated against today’s reconstruction of past guidance, but that result cannot be presented as the expectations that actually existed on those dates. Off-schedule sessions, repeated completions of one workout, backdated sessions, and sessions with zero sets also need explicit matching/completion rules.

The check-ins spec recognizes this missing layer: it calls for completed sessions against dated expectations, while deferring capture timing, same-day edits, and off-schedule matching to delivery step 4. Scheduled future plan changes are also listed as future work. [Review summary](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:52), [deferred expectation rules](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:113).

**The main awkwardness is between representations and temporal boundaries, rather than separate template/client schemas.**

| Finding | Evidence and implication |
|---|---|
| Templates and client plans already share storage | Both use `TrainingPlan`, workouts, prescribed exercises, and schedules. Duplication is intentional copied data, not parallel schema classes. [Plan schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_plan.ex:25) |
| Storage, write API, read API, and snapshot use different names | Ecto/write: `prescribed_exercises`, `prescribed_sets`; read API: `workout_elements`, `planned_sets`; snapshot: `exercises`, `sets`. The read names retain terms discouraged by `CONTEXT.md`. [Formatter](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training_plan.ex:356), [vocabulary](/Users/vikassandhu/Desktop/10x/easy-mono/CONTEXT.md:53) |
| Schedule is represented three ways | Relational rows; seven-entry write array; read weekday→workout map, plus redundant per-workout `weekdays`. [Input](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_input.ex:110), [formatter](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training_plan.ex:426) |
| Revision counters do not version content | Plan edits replace existing data; session corrections replace facts. Neither has a revision-content table. [Plan mutation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_programming.ex:36), [session mutation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:56) |
| Exercise changes sit outside plan revision control | Library updates change referenced content without touching plan revisions. The coach exercise form explicitly notes the absence of revision preconditions. [Library update](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_library.ex:148), [form update logic](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/exercises/exercise.ts:30) |
| Numeric validation is inconsistent across layers | Planned duration/rest have Ecto bounds; actual duration relies on HTTP typing/UI; load/distance lack backend magnitude rules; reps remain strings. Values and units are independent. [Planned validation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/planned_set.ex:58), [actual validation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_performed_set.ex:127) |
| Decimal transport differs by operation | Plan load/distance inputs are strings; performed inputs are numbers; stored decimal outputs are strings. Snapshot RPE is a number, whereas live-plan and performed RPE outputs are strings. [Generated plan types](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/api/schema.ts:819), [performed types](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/schema.ts:364), [snapshot types](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/schema.ts:468) |
| “Creator” has inconsistent identity meaning | Exercise creator references a coach; plan creator references a user. Both can become null after deletion, while the plan API declares creator ID non-null. [Exercise schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_exercise.ex:58), [plan API](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training_plan.ex:225) |
| Media has two parallel paths | `images[]` and `media_id` coexist. The full exercise endpoint exposes media/instructions, but embedded plan exercise responses omit both; session snapshots omit all media. [Exercise response](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training/exercise.ex:30), [plan exercise response](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/training_plan.ex:25) |
| Soreness is a hard-coded event rating | It is a session column and dedicated UI field, structurally similar to the proposed after-workout rating Tracker. This similarity is an inference, not an existing Tracker integration. [Session schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:37), [Tracker timing](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:70) |
| Archived-edit policy differs from nutrition | Training metadata/prescription mutation has no archived guard; the coach builder blocks unavailable plans. Nutrition explicitly rejects archived metadata/menu edits. [Training mutation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_programming.ex:36), [builder guard](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/training-plan-worksheet.tsx:66), [nutrition guards](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_programming.ex:86) |

One additional **concurrency inference** deserves verification during redesign: training start loads a plan and its preloaded children, builds a snapshot, and inserts the session without a surrounding repeatable-read transaction or plan lock. Concurrent prescription editing may therefore expose a mixed read across those queries. This is a static-code concern, not a reproduced failure. Nutrition already uses the repository’s repeatable-read `Repo.snapshot` helper in comparable multi-query readers. [Training start](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:18), [plan load](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_reader.ex:141), [snapshot helper](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/repo.ex:18).

**Training and nutrition share several existing structures, with meaningful differences in their documents and execution records.**

| Concern | Training | Nutrition | Shared-design implication — inference |
|---|---|---|---|
| Template/client ownership | One plan table, kind discriminator, source template, client, revision, archival, coverage dates | Same pattern | Plan ownership, copy provenance, lifecycle, and coverage can be designed together |
| Assignment | Transactionally copies relational workouts/exercises/schedule; new child IDs | Copies an embedded menu into an independent plan | Shared workflow; different identity scope and persistence |
| Prescription document | Ordered workouts → exercise occurrences → sets | Menu → meals/items and day patterns/slots | Both have reusable library references and ordered authored content |
| Weekly schedule | Weekday → zero/one workout | Weekday → one day pattern, whose slots offer ordered meal choices | Share date/weekday concepts; nutrition has an additional selection layer |
| Quantities | Set measurements, potentially several independent dimensions | Item portions and derived nutrients | Share explicit units/value semantics, without forcing identical item types |
| Coverage | `PlanCoverage`, `PlanOverlap` | Same modules | Already shared infrastructure |
| Frozen guidance | One selected workout captured at session start | Offered meal options/items frozen into a diary-slot document; day targets stored separately | Snapshot boundaries, versioning, and correction policy can be considered together |
| Actual-to-planned links | Actual set → optional snapshot exercise occurrence | Diary entry → optional frozen planned item | Both support extras; training’s link is less granular than its prescribed sets |
| Corrections/chat | Revisioned session, frozen chat summary | Revisioned slot, frozen chat summary | Existing shared record-reference mechanism |
| Applied timezone | Session stores date but no applied timezone | Diary slot stores `applied_timezone` | Historical local-date handling currently differs |

The nutrition side is supported by [plan schema/copy](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:38), [copy workflow](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_plan_copy.ex:24), [menu topology](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu.ex:38), [diary document](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/document.ex:14), [planned-item matching](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/document.ex:49), [slot schema](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot.ex:14), and [day targets](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_day.ex:20).

The Tracker spec places the Tracker list on the client, outside plans; allows coach-recorded Tracker entries while workouts/meals remain client-only; and proposes after-workout prompts. Therefore, similarity to training ratings does not establish that Trackers should inherit the plan-copy lifecycle. That is a design distinction explicitly present in the spec. [Tracker concepts](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:19), [recording rules](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:70).

**The maintained frontend depends directly on these shapes at the following points.**

| Surface | Current dependency |
|---|---|
| Coach template and client-plan builder | The same worksheet handles both contexts. `prescription.ts` converts read `workout_elements/planned_sets` into editable `prescribed_exercises/prescribed_sets`, then converts back to the whole-prescription write contract. Positions are regenerated from array order; new nodes use UUID local refs. [Adapter](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/prescription.ts:38) |
| Coach save flow | Saves name/description first, then prescription using the returned revision. These are separate HTTP transactions; the recovery message acknowledges that details may have saved while prescription failed. [Worksheet save](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/training-plan-worksheet.tsx:175) |
| Coach workout/exercise editing | Reorders array entries, duplicates exercises/workouts, and replaces a library exercise while optionally retaining its targets. Newly selected exercises receive three blank working sets. The draft exercise type does not retain tracking type. [Draft type](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/prescription.ts:15), [exercise insertion](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/workout-editor.tsx:190), [replacement](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/workout-editor.tsx:235) |
| Coach compact set editor | “One prescription for all sets” is a UI compression of equal set objects. Adding N sets creates N copies; warm-up prepends a labeled set. No grouped-set object exists in storage. [Uniformity](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/exercise-sets.tsx:20), [set operations](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/exercise-sets.tsx:280) |
| Coach weekly strip | Seven fixed weekdays each select one workout ID/local ref or rest. [Week strip](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-plans/week-strip.tsx:15) |
| Coach assignment and client overview | Loads template preview, sends dates and template revision, then displays lifecycle, coverage dates, stopped-on date, and independent personalization. [Assignment](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/clients/assign-training-plan.tsx:136), [client plans](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/clients/client-training-plans.tsx:73) |
| Coach plan management | Training and nutrition already share `PlanResource`, archive/restore/delete/date-edit hooks and screens. Some response/status and revision-parameter handling differs by resource. [Shared API](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/api/plan-management.ts:8) |
| Coach session history/detail and conversations | Reads state, date, timestamps, soreness, notes, and a flat performed-set list; separately renders original snapshot targets. Conversation record detail compares referenced and current revisions and opens the latest session. [Session detail](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/training-sessions/training-session.tsx:138), [conversation detail](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/conversations/record-detail.tsx:39) |
| Client Today | Uses coverage’s nullable plan/workout distinction for “no plan,” rest day, or scheduled workout; separately shows an active session. [Today](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/app-shell.tsx:135) |
| Client plan/workout screens | Uses `plan.workouts`, per-workout `weekdays`, `workout_elements`, and `planned_sets`. Displays all workouts, highlights today’s, and allows start when the plan lifecycle is current. [Plan list](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/training.tsx:234), [workout view](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/training.tsx:399) |
| Client session recording | Selects snapshot exercises by `ref`; groups performed sets by `snapshot_exercise_ref`; puts unreferenced sets under “Add another exercise.” Targets remain a separate list rather than one actual-entry row per prescribed set. [Session grouping](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/session.tsx:129), [target rendering](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/session.tsx:397) |
| Client measurement controls | Frozen exercise tracking type decides which fields are shown and sent. Irrelevant measurements become null. Freestyle permits choosing a tracking mode locally, but that mode is not persisted on the performed set and is reconstructed heuristically when editing. [Field selection](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/recording.ts:53), [reconstruction](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/recording.ts:82), [serialization](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/recording.ts:235) |
| Client units | New set load unit defaults from client `unit_system`; distance defaults to km. The code stores explicit units, without converting prescription values into the client’s preferred system here. [Load default](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/session.tsx:88), [set defaults](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/recording.ts:66) |
| Client drafts and retry recovery | Device draft is versioned and keyed by session/account; includes selected exercise, date, soreness, notes, set values, operation IDs, and expected revisions. Unsaved entries remain local when finishing/discarding. [Draft storage](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/workout-draft.ts:29), [draft shape](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/recording.ts:35), [finish behavior](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/session.tsx:687) |

Two client UI limits are narrower than backend capability. The set editor has no prescribed-exercise substitution picker, although the API supports substitutions; planned entries start with the snapshot’s exercise ID. It also displays existing per-set notes without offering a notes input, despite notes being writable in the API. The maintained training screens do not render the library’s full instructions/media. [New entry](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/workout-draft.ts:7), [set editor](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/set-editor.tsx:76), [notes display](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/set-editor.tsx:221).

My observations from this map are:

- The existing separation between independent client prescriptions and frozen session targets is valuable, but historical **dated expectations** are a missing model.
- Training and nutrition already share ownership, copying, revisions, coverage, and coaching-term rules; their scheduling and recording documents need distinct semantics.
- Prescribed-set identity, structured quantities, exercise grouping, and progression are the largest expressiveness gaps.
- Library content, snapshots, actual records, and corrected dates currently freeze at different moments. Those boundaries need explicit decisions before redesign.
- Soreness and notes create concrete contact points with Trackers and Reviews, while the Tracker spec deliberately gives them a different ownership and recording lifecycle.