# Training: final model in Postgres

Status: final design, 5 October 2026. Not implemented. Part of `overview.md`.

## 1. Tables

| Table | Group | One row is | Changes? |
|---|---|---|---|
| `exercises` | Library | one movement | yes; `measures`, `bodyweight` fixed at creation |
| `exercise_muscles`, `exercise_equipment` | Library | one tag (unchanged) | yes |
| `templates` | Plans (shared) | one reusable plan | yes, the coach edits it |
| `plans` | Plans (shared) | one client plan (identity) | name, archive; dates only in the future |
| `plan_revisions` | Plans (shared) | one published version of the contents (value) | never; a future one can be deleted |
| `training_sessions` | Records | one workout the client did | yes, journaled |
| `performed_sets` | Records | one set the client did | yes, journaled |
| `record_changes` | History (shared) | one change to one record row | never (append only) |
| view `records` | History (shared) | one current record | — |

Workouts, blocks, items, sets, and the schedule are JSON in `templates.content` and `plan_revisions.content`.

## 2. DDL

Conventions from the current schema stay: UUID keys, `business_id` on tenant tables, composite foreign keys for tenant safety, `timestamptz`.

```sql
-- Shared helper: rows that never change.
create function forbid_update() returns trigger language plpgsql as $$
begin
  raise exception '% rows never change', tg_table_name;
end $$;

-- ───────────── Library ─────────────

create table exercises (
  id            uuid primary key,
  business_id   uuid references businesses on delete cascade,   -- null = built-in
  name          text not null check (btrim(name) <> ''),
  instructions  text,
  media_id      uuid references library_media on delete set null,
  measures      text[] not null
                check (cardinality(measures) > 0
                   and measures <@ array['reps','load','duration','distance']),
  bodyweight    boolean not null default false,                 -- load adds to body weight
  mechanics     text check (mechanics in ('compound','isolation','isometric')),
  force         text check (force in ('push','pull','static')),
  import_id     text unique,                                    -- seed upsert key
  archived_at   timestamptz,
  inserted_at   timestamptz not null,
  updated_at    timestamptz not null,
  unique nulls not distinct (business_id, name)
);
-- measures and bodyweight are fixed at creation: the update changeset does not cast them.
-- exercise_muscles, exercise_equipment, training_muscles, training_equipment: unchanged.

-- ───────────── Plans (shared by training and nutrition) ─────────────

create table templates (
  id           uuid primary key,
  business_id  uuid not null references businesses on delete cascade,
  domain       text not null check (domain in ('training','nutrition','trackers')),
  name         text not null check (btrim(name) <> ''),
  description  text,
  content      jsonb not null,
  archived_at  timestamptz,
  created_by   uuid references coaches on delete set null,
  revision     integer not null default 1 check (revision > 0),  -- edit lock
  inserted_at  timestamptz not null,
  updated_at   timestamptz not null
);

create table plans (
  id                  uuid primary key,
  business_id         uuid not null references businesses on delete cascade,
  client_id           uuid not null,
  domain              text not null check (domain in ('training','nutrition')),
  source_template_id  uuid references templates on delete set null,
  name                text not null check (btrim(name) <> ''),
  description         text,
  start_date          date,                     -- null = not scheduled; changes only while in the future
  end_date            date,                     -- set only to today or later
  created_local_date  date not null,            -- creation date in the client's time zone then (E6)
  archived_at         timestamptz,
  created_by          uuid references coaches on delete set null,
  revision            integer not null default 1 check (revision > 0),  -- edit lock
  inserted_at         timestamptz not null,
  updated_at          timestamptz not null,
  foreign key (client_id, business_id) references clients (id, business_id) on delete cascade,
  check (end_date is null or (start_date is not null and end_date >= start_date)),
  unique (id, domain)
);
create unique index plans_one_unscheduled
  on plans (client_id, domain) where start_date is null and archived_at is null;
create index plans_client_domain on plans (client_id, domain, start_date);
-- No overlap per (client, domain): checked in Elixir under the client row lock (PlanOverlap).
-- "Dates change only in the future" is checked in the plan write function.

create table plan_revisions (
  id            uuid primary key,
  plan_id       uuid not null,
  domain        text not null,
  number        integer not null check (number > 0),
  effective_on  date,                           -- null only for revision 1 (= plan start)
  content       jsonb not null,
  created_by    uuid references coaches on delete set null,
  inserted_at   timestamptz not null,
  foreign key (plan_id, domain) references plans (id, domain) on delete cascade,
  unique (plan_id, number),
  unique (id, domain),
  check ((number = 1) = (effective_on is null))
);
create index plan_revisions_in_force on plan_revisions (plan_id, effective_on, number);
create trigger plan_revisions_never_change
  before update on plan_revisions for each row execute function forbid_update();
-- Delete is allowed only for a revision whose effective_on is after today (withdraw a
-- scheduled change); the write function checks it. No record can point to such a revision.

-- ───────────── Records ─────────────

alter table clients add column last_change_seq bigint not null default 0;

create table training_sessions (
  id                 uuid primary key,
  business_id        uuid not null references businesses on delete cascade,
  client_id          uuid not null,
  -- shared record fields
  local_date         date not null,             -- the date the client did it
  timezone           text not null,
  recorded_by_type   text not null check (recorded_by_type in ('client','coach')),
  recorded_by_id     uuid not null,
  request_id         uuid,                      -- safe retries
  revision           integer not null default 1 check (revision > 0),
  inserted_at        timestamptz not null,
  updated_at         timestamptz not null,
  -- the prescription used
  domain             text generated always as ('training') stored,
  plan_revision_id   uuid,
  workout_id         uuid,                      -- id inside the revision content
  -- the occurrence it completes: (plan, schedule entry, original date)
  schedule_entry_id  uuid,
  occurrence_date    date,
  -- what happened
  state              text not null default 'active'
                     check (state in ('active','completed','discarded')),
  started_at         timestamptz not null,
  ended_at           timestamptz,
  notes              text,
  foreign key (client_id, business_id) references clients (id, business_id) on delete cascade,
  foreign key (plan_revision_id, domain) references plan_revisions (id, domain),
  check ((plan_revision_id is null) = (workout_id is null)),         -- both empty = free workout
  check ((schedule_entry_id is null) = (occurrence_date is null)),
  check (schedule_entry_id is null or plan_revision_id is not null),
  check ((state = 'active') = (ended_at is null)),
  check (ended_at is null or ended_at >= started_at),
  unique (id, business_id),
  unique (client_id, request_id)
);
create unique index training_sessions_one_active
  on training_sessions (client_id) where state = 'active';
create index training_sessions_client_date on training_sessions (client_id, local_date desc);
create index training_sessions_occurrence on training_sessions (schedule_entry_id, occurrence_date)
  where schedule_entry_id is not null and state = 'completed';

create table performed_sets (
  id                     uuid primary key,
  business_id            uuid not null,
  session_id             uuid not null,
  position               integer not null check (position >= 0),
  request_id             uuid,
  -- what was prescribed (ids inside the session's revision content)
  item_id                uuid,
  set_id                 uuid,
  -- what was done
  exercise_id            uuid references exercises on delete restrict,
  exercise_name          text,                  -- only for a free-text exercise
  kind                   text not null default 'working'
                         check (kind in ('warmup','working','drop')),
  outcome                text not null default 'done'
                         check (outcome in ('done','failed','skipped')),
  reps                   integer check (reps >= 0),
  load_kg                numeric(8,3),          -- negative = assistance
  entered_load_unit      text check (entered_load_unit in ('kg','lb')),
  duration_s             integer check (duration_s >= 0),
  distance_m             numeric(10,2) check (distance_m >= 0),
  entered_distance_unit  text check (entered_distance_unit in ('m','km','mi')),
  rpe                    numeric(3,1) check (rpe between 1 and 10),
  rir                    smallint check (rir between 0 and 10),
  notes                  text,
  deleted_at             timestamptz,
  inserted_at            timestamptz not null,
  updated_at             timestamptz not null,
  foreign key (session_id, business_id) references training_sessions (id, business_id) on delete cascade,
  check ((exercise_id is null) <> (exercise_name is null)),
  check (set_id is null or item_id is not null),
  check ((load_kg is null) = (entered_load_unit is null)),
  check ((distance_m is null) = (entered_distance_unit is null)),
  unique (session_id, position),
  unique (session_id, request_id)
);
create index performed_sets_exercise on performed_sets (exercise_id, session_id)
  where deleted_at is null;

-- ───────────── History (shared by all record types) ─────────────

create table record_changes (
  id               uuid primary key,
  business_id      uuid not null,
  client_id        uuid not null,
  seq              bigint not null,             -- the client's change number
  record_type      text not null check (record_type in ('workout','meal','tracker_entry')),
  record_id        uuid not null,               -- session, diary meal, or tracker entry
  row_type         text not null
                   check (row_type in ('session','set','meal','entry','tracker_entry','attachment')),
  row_id           uuid not null,
  action           text not null check (action in ('added','changed','removed')),
  old_value        jsonb,                       -- null when added
  new_value        jsonb,                       -- null when removed
  changed_by_type  text not null check (changed_by_type in ('client','coach')),
  changed_by_id    uuid not null,
  changed_at       timestamptz not null,
  foreign key (client_id, business_id) references clients (id, business_id) on delete cascade,
  unique (client_id, seq, row_id)
);
create index record_changes_client_seq on record_changes (client_id, seq);
create trigger record_changes_never_change
  before update on record_changes for each row execute function forbid_update();
```

### The write protocol for every record

One helper does each record write, for all record types:

1. `update clients set last_change_seq = last_change_seq + 1 where id = $client returning last_change_seq` → locks the client row and gives `seq`.
2. Write the record rows (session and sets, or meal and entries, or tracker entry).
3. Write one `record_changes` row for each row that was added, changed, or removed, all with that `seq`.
4. Commit.

Writes for one client are thus serialized. A review reads `clients.last_change_seq` in the same snapshot as its data, and saves it as `reviews.reviewed_through_seq`. "New since the last review" = `record_changes where client_id = $c and seq > $reviewed_through_seq`. No change can be missed, because a change gets its `seq` and commits under the same row lock.

## 3. The records view (training part)

```sql
create view records as
  select 'workout' as kind, id, business_id, client_id, local_date, timezone,
         recorded_by_type, recorded_by_id, revision, inserted_at, updated_at
    from training_sessions where state <> 'discarded'
  union all
  select 'meal', id, business_id, client_id, local_date, timezone,
         recorded_by_type, recorded_by_id, revision, inserted_at, updated_at
    from diary_meals
  union all
  select 'tracker_entry', id, business_id, client_id, local_date, timezone,
         recorded_by_type, recorded_by_id, revision, inserted_at, updated_at
    from tracker_entries where deleted_at is null;
```

The view gives the current timeline. `record_changes` gives the change history, including removals.

## 4. Training content (JSON)

The same shape is in `templates.content` and `plan_revisions.content`. Ecto embedded schemas validate it. Each id stays the same in later revisions when the coach does not delete the node.

```
workouts[]   { id, name, notes, blocks[] }
blocks[]     { id, format: straight | superset | circuit, rounds?, rest_s?, notes?, items[] }
items[]      { id, exercise_id, exercise_name, notes?, sets[] }      ← name copied at publish
sets[]       { id, kind: warmup | working | drop,
               reps: {type: exact, value} | {type: range, min, max} | {type: amrap} | null,
               load: {kg, entered_unit} | null,
               rpe?, rir?, tempo?, duration_s?, distance: {m, entered_unit} | null, rest_s?, notes? }
schedule     { cycle_weeks: 1, entries: [{ id, day: 0..6, ref: workout_id }] }
```

Example schedule: Lower A on Monday and Friday, Upper A on Wednesday.

```json
{ "cycle_weeks": 1,
  "entries": [
    { "id": "e-mon", "day": 0, "ref": "w-lower-a" },
    { "id": "e-wed", "day": 2, "ref": "w-upper-a" },
    { "id": "e-fri", "day": 4, "ref": "w-lower-a" } ] }
```

Lower A is on two entries. Monday's Lower A and Friday's Lower A are two different occurrences: `(plan, e-mon, 2026-10-12)` and `(plan, e-fri, 2026-10-16)`.

## 5. How each question is answered

**Revision in force on a date**

```sql
select * from plan_revisions
 where plan_id = $plan and (effective_on is null or effective_on <= $date)
 order by effective_on desc nulls last, number desc
 limit 1;
```

The plan for the date comes first from the coverage rule (plan dates, coaching terms, E6 with `created_local_date`).

**Expected occurrences for a date range**: for each date, take the plan in force and its revision in force. Take the entries whose `day` = `(weeks since the plan start week mod cycle_weeks) × 7 + weekday`. Each gives `(plan, entry id, date)`. An Elixir function does it.

**Fulfilled**: an occurrence is fulfilled when a completed session has the same `schedule_entry_id` and `occurrence_date`. Two sessions on one occurrence count one time.

**Squat PR for each rep count**

```sql
select ps.reps, max(ps.load_kg) as best_kg
  from performed_sets ps
  join training_sessions s on s.id = ps.session_id
 where s.client_id = $client and s.state = 'completed'
   and ps.exercise_id = $squat and ps.kind = 'working'
   and ps.outcome = 'done' and ps.deleted_at is null
 group by ps.reps;
```

**Done against expected for one session**: join the sets of the session to the sets of its revision content by `set_id`. A prescribed set with no performed set is "Not recorded". A performed set with no `set_id` is extra work.

**New since the last review**: `record_changes` with `seq` greater than the review's `reviewed_through_seq`.

## 6. What changes from today

| Today | Final |
|---|---|
| `training_plans` (template and client plan) | `templates` + `plans` (shared) |
| `training_workouts`, `training_prescribed_exercises`, `training_workout_schedule`, embedded sets | JSON content in templates and revisions |
| Schedule: weekday → one workout | Schedule entries with stable ids; zero or more per day |
| `prescription_snapshot`, `source_plan_id`, `source_workout_id`, `kind`, `snapshot_version` | `plan_revision_id` + `workout_id` |
| — | `schedule_entry_id` + `occurrence_date` |
| `soreness_rating` | a Tracker entry with `about_session_id` |
| `training_set_requests` | `request_id` + `deleted_at` |
| `reps` text, `load_value` + `load_unit`, `distance_value` + `distance_unit` | `reps` integer, `load_kg`, `distance_m` + entered units |
| `snapshot_exercise_ref` | `item_id` + `set_id` |
| `tracking_type`, `images[]`, `source` | `measures` + `bodyweight`, media only, `business_id is null` |
| `revision` counter only | counter + `record_changes` with old values |

The seed must map `tracking_type` to `measures` + `bodyweight`, and fix the "(Weighted)" exercises. The seeded mechanics and force values need a clean-up pass.
