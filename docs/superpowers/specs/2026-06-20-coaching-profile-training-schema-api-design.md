# Coaching profile and training schema/API design

## Goal

Prepare the coaching training backend model for production, as a sibling to the
nutrition spec (`2026-06-20-coaching-profile-nutrition-schema-api-design.md`).
Same conventions, same template/copy model, same logging-snapshot discipline.

This spec covers backend schema and API shape only. Coach and client UX flows
are covered separately.

The shared layers — client profile, forms, threads, attention — are defined in
the nutrition spec and are **not** re-specified here. Training reuses them
(`module = training`).

## Naming conventions

Mirror the nutrition spec:

* Tables are `training_`-prefixed (`training_workouts`, `training_exercises`,
  `training_sessions`).
* Structural foreign keys keep the prefix (`training_plan_id`,
  `training_workout_id`, `training_session_id`).
* The library foreign key stays bare — `exercise_id`, exactly as nutrition uses
  `food_id` for table `nutrition_foods`.
* Public API paths are kebab-case and `training-`-prefixed (`/training-plans`,
  `/training-exercises`, `/training-sessions`).

## Product rules

* Plans are personalized copies. Assigning a template creates a client-owned
  copy via `source_template_id`. Template edits do not propagate to assigned
  plans.
* Assigned plan edits are allowed for normal adjustments. A coach assigns a
  separate plan for a phase change.
* A plan is a single repeating week. No multi-week cycles, no A/B rotation —
  identical to nutrition.
* One workout per weekday. A day with no schedule entry **is** a rest day.
  There is no separate `rest_days` field.
* Exercises are business/system reference data. System and imported exercises
  are read-only; editing one creates a business-owned copy through the copy
  endpoint. Editing an exercise changes only descriptive metadata (name, cues,
  muscles) — it never recomputes prescribed sets, so there is no impact
  endpoint.
* Sessions snapshot at log time. `training_sessions.planned_snapshot` stores the
  prescribed workout as names and values only (no references), and each
  `training_performed_sets` row carries `exercise_name`. History never changes
  when a plan or exercise is edited later.

## Database guarantees

Use database constraints for invariants that must survive concurrent writes:

* one active assigned `training_plans` row per client overlapping date range
* one `training_schedule_entries` row per `(plan, day_of_week)`
* unique `(name, business_id)` on `training_exercises`
* one `training_workout_exercises` row per `(workout, position)`
* one active `training_sessions` row per client
* one `training_performed_sets` row per `(session, position)`

## Training schema

### Tables

```text
training_plans
  id
  business_id
  creator_id
  client_id
  source_template_id
  name
  description
  status
  start_date
  end_date
  inserted_at
  updated_at
```

`client_id IS NULL` means template. `client_id` set means assigned client copy.

`status` values:

```text
active
archived
```

For assigned plans, prevent overlapping active date ranges for the same client.
This makes "today's plan" deterministic — identical to nutrition.

```text
training_schedule_entries
  id
  business_id
  creator_id
  training_plan_id
  day_of_week
  training_workout_id
  inserted_at
  updated_at
```

Unique index:

```text
training_plan_id, day_of_week
```

Weekdays:

```text
monday
tuesday
wednesday
thursday
friday
saturday
sunday
```

One workout per weekday. A day with no entry is a rest day. There is no
`workout_type` (primary/alternative) — that was a disguised 2-week rotation and
is removed with multi-week support.

```text
training_workouts
  id
  business_id
  creator_id
  training_plan_id
  name
  notes
  inserted_at
  updated_at
```

Workouts are plan-scoped. They are copied when a template is assigned. There is
no standalone reusable workout library in v1; reuse happens by duplicating a
plan.

```text
training_workout_exercises
  id
  business_id
  training_workout_id
  exercise_id
  position
  superset_group_id
  notes
  planned_sets
  inserted_at
  updated_at
```

Unique index:

```text
training_workout_id, position
```

A workout exercise is one exercise as it appears in a workout: the exercise
reference, its order, an optional superset grouping, and its embedded
`planned_sets`.

### Set vocabulary

Planned and performed sets share **one vocabulary**. The fields are identical;
the table tells you whether a value is a target (planned) or an actual
(performed). Each row is **one physical set** — a "3×8" is three rows, a pyramid
(12/10/8) is three different rows, a drop set is consecutive rows. This is the
model the logging tier (Strong, Hevy, FitNotes) converged on, proven by their
one-row-per-set CSV exports, and it makes planned↔logged a clean 1:1 join.

```text
planned_sets (embedded in training_workout_exercises)
  set_type
  reps
  load_value
  load_unit
  duration_seconds
  distance_value
  distance_unit
  rpe
  rest_seconds
  notes
```

Planned sets have no `position` — order is the embedded array order.

```text
training_performed_sets
  id
  business_id
  training_session_id
  exercise_id
  exercise_name
  set_type
  position
  reps
  load_value
  load_unit
  duration_seconds
  distance_value
  distance_unit
  rpe
  completed
  notes
  inserted_at
  updated_at
```

Unique index:

```text
training_session_id, position
```

`set_type` values:

```text
working
warmup
dropset
```

`warmup` sets are excluded from PR and working-volume calculations. AMRAP and
failure are expressed in the `reps` string (`"AMRAP"`, `"Max"`, `"Failure"`),
not as set types.

`load_unit` values:

```text
kg
lbs
bodyweight
none
```

`bodyweight` means the load is added to (or, with a negative value, subtracted
as assistance from) body weight. Load is *only* "how heavy" — RPE is not a load
unit and lives in its own field.

`distance_unit` values:

```text
meters
km
miles
none
```

Field rules:

* At least one of the fields required by the exercise's `tracking_type` must be
  present (see Exercises).
* `rpe` is the one effort field, 1–10, on both planned and performed.
* `rest_seconds` is planned-only (you prescribe rest; you do not log it).
* `position`, `completed`, and the snapshot fields are performed-only.
* Anything that is advice rather than a measurement — tempo, cues, intensity
  phrasing, `%1RM` targets — goes in `notes`, not a column.

### Exercises

```text
training_exercises
  id
  business_id
  creator_id
  source
  tracking_type
  name
  description
  instructions
  mechanics
  force
  images
  import_id
  inserted_at
  updated_at
```

`source` values:

```text
system
imported
custom
```

System and imported exercises are read-only. Editing one creates a
business-owned copy through the copy endpoint.

`tracking_type` values:

```text
weight_reps
bodyweight_reps
weighted_bodyweight
assisted_bodyweight
reps_only
duration
weight_duration
distance_duration
weight_distance
```

`tracking_type` is a single enum per exercise (one mode each; duplicate the
exercise for a different mode). It drives which set fields the logger shows and
which are required. It adds no columns to the set — the set already carries
every field; the type just selects them.

```text
tracking_type        required / shown fields
weight_reps          load + reps
bodyweight_reps      reps
weighted_bodyweight  reps + load (added)
assisted_bodyweight  reps + load (assist, negative)
reps_only            reps
duration             duration
weight_duration      load + duration
distance_duration    distance + duration
weight_distance      load + distance
```

`mechanics` values:

```text
compound
isolation
isometric
```

`force` values:

```text
push
pull
static
```

```text
training_muscles            -- reference
training_equipment          -- reference
training_exercise_muscles   -- many-to-many join
training_exercise_equipment -- many-to-many join
```

Exercises link to muscles and equipment through the join tables. These are
reference data.

### Logging

```text
training_sessions
  id
  business_id
  client_id
  training_workout_id
  training_schedule_entry_id
  date
  started_at
  ended_at
  state
  soreness_rating
  notes
  planned_snapshot
  inserted_at
  updated_at
```

One active session per client.

`state` values:

```text
active
completed
discarded
```

`training_schedule_entry_id` is nullable: a scheduled workout sets it; an ad-hoc
workout leaves it null. `date` keys the session for adherence — adherence is
scheduled entries with no completed session for that date.

`planned_snapshot` is a frozen copy of the prescribed workout as **names and
values only, no references**, captured at session start:

```json
{
  "exercises": [
    {
      "name": "Back Squat",
      "position": 0,
      "sets": [
        {"set_type": "working", "reps": "8-12", "load_value": 100,
         "load_unit": "kg", "rpe": 8}
      ]
    }
  ]
}
```

`training_performed_sets` is a flat list under the session. Each set carries
`exercise_id` (a soft reference — nilify on delete — kept solely as the
aggregation key for PRs and progression, which are computed against exercises
only) and `exercise_name` (the display snapshot, so a deleted exercise does not
blank history). The planned side is two levels (exercise → sets); the performed
side is flat because clients log sets live, out of order, supersetting. Grouping
on read is reconstructed from `exercise_id` and `position`.

Progression and PR detection are out of scope for v1, but the shape does not
block them: `MAX(load_value)` by `exercise_id` over `working` sets is all a PR
needs later. No table, no work now.

## Training API

Use kebab-case `training-`-prefixed public paths.

### Plans

Coach:

```text
GET    /v1/coach/training-plans
POST   /v1/coach/training-plans
GET    /v1/coach/training-plans/:id
PATCH  /v1/coach/training-plans/:id
DELETE /v1/coach/training-plans/:id
POST   /v1/coach/training-plans/:id/duplicate
POST   /v1/coach/training-plans/:id/assign
```

Client:

```text
GET /v1/client/training-plans
GET /v1/client/training-plans/:id
GET /v1/client/training-plans/today?date=YYYY-MM-DD
```

### Workouts and schedule

Coach:

```text
GET    /v1/coach/training-plans/:plan_id/training-workouts
POST   /v1/coach/training-plans/:plan_id/training-workouts
GET    /v1/coach/training-workouts/:id
PATCH  /v1/coach/training-workouts/:id
DELETE /v1/coach/training-workouts/:id
POST   /v1/coach/training-workouts/:workout_id/exercises
PATCH  /v1/coach/training-workout-exercises/:id
DELETE /v1/coach/training-workout-exercises/:id
GET    /v1/coach/training-plans/:plan_id/schedule
PUT    /v1/coach/training-plans/:plan_id/schedule/:day
```

Adding a workout exercise includes its `planned_sets` in the request body.
There is no separate planned-set CRUD.

`PUT /schedule/:day` replaces that day as desired state:

```json
{"training_workout_id": "workout-id"}
```

An empty body clears the day (rest). This mirrors the nutrition schedule PUT.

### Exercises and reference data

Coach:

```text
GET    /v1/coach/training-exercises
POST   /v1/coach/training-exercises
GET    /v1/coach/training-exercises/:id
PATCH  /v1/coach/training-exercises/:id
DELETE /v1/coach/training-exercises/:id
POST   /v1/coach/training-exercises/:id/copy
GET    /v1/coach/training-muscles
GET    /v1/coach/training-equipment
```

There is no `/impact` endpoint — editing an exercise recomputes no plan math.

Client:

```text
GET /v1/client/training-exercises
GET /v1/client/training-exercises/:id
```

Clients can read the exercise library. Clients cannot mutate exercises.

### Logging

Client:

```text
GET    /v1/client/training-sessions?from=YYYY-MM-DD&to=YYYY-MM-DD
GET    /v1/client/training-sessions/:id
POST   /v1/client/training-sessions
PATCH  /v1/client/training-sessions/:id
POST   /v1/client/training-sessions/:id/performed-sets
PATCH  /v1/client/training-performed-sets/:id
DELETE /v1/client/training-performed-sets/:id
```

`POST /training-sessions` starts a session (one active per client) and captures
`planned_snapshot`. `PATCH` ends, discards, or updates soreness/notes.

Coach:

```text
GET /v1/coach/clients/:client_id/training-sessions?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /v1/coach/clients/:client_id/training-sessions/:id
```

Coach access to client sessions is read-only.

## Threads and attention

Defined in the nutrition spec; training reuses them.

* Threads: `module = training`. Subject examples: `workout_session`,
  `training_day`.
* Attention signals (training): missed scheduled workouts (scheduled entry with
  no completed session for the date), and open attention-priority training
  threads.

## Out of scope

* Multi-week training cycles and A/B rotation
* Standalone reusable workout library
* Progression, periodization, auto progressive-overload, e1RM/1RM, PR detection
* Body metrics / weight log (its own module; only referenced as a thread
  subject)
* `/impact` endpoint for exercises
* Separate planned-set CRUD endpoints
* Tempo, RIR, `%1RM`, and free-text intensity as columns (use `notes`)
* `failure` as a set type (use the `reps` string)
</content>
