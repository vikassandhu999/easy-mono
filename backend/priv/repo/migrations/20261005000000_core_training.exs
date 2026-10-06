defmodule Easy.Repo.Migrations.CoreTraining do
  use Ecto.Migration

  def up do
    execute("ALTER TABLE nutrition_plans ADD COLUMN created_local_date date")

    execute(
      "UPDATE nutrition_plans p SET created_local_date = ((p.inserted_at AT TIME ZONE 'UTC') AT TIME ZONE COALESCE(NULLIF(c.timezone,''),b.timezone))::date FROM clients c JOIN businesses b ON b.id=c.business_id WHERE p.client_id=c.id"
    )

    execute("""
    DROP TABLE training_set_requests, training_performed_sets, training_sessions, training_workout_schedule, training_prescribed_exercises, training_workouts, training_plans CASCADE
    """)

    execute("""
    ALTER TABLE training_exercises RENAME TO exercises
    """)

    execute("""
    ALTER TABLE exercises DROP CONSTRAINT training_exercises_business_media_check
    """)

    execute("""
    ALTER TABLE exercises DROP CONSTRAINT training_exercises_source_check
    """)

    execute("""
    ALTER TABLE exercises DROP CONSTRAINT training_exercises_tracking_type_check
    """)

    execute("""
    ALTER TABLE exercises DROP COLUMN source, DROP COLUMN tracking_type, DROP COLUMN images
    """)

    execute("""
    ALTER TABLE exercises ADD COLUMN measures text[] NOT NULL DEFAULT ARRAY['reps','load'], ADD COLUMN bodyweight boolean NOT NULL DEFAULT false, ADD COLUMN archived_at timestamp
    """)

    execute("""
    ALTER TABLE exercises ADD CONSTRAINT exercises_measures CHECK (cardinality(measures)>0 AND measures <@ ARRAY['reps','load','duration','distance'])
    """)

    execute("""
    create function forbid_update() returns trigger language plpgsql as $$
    begin
      raise exception '% rows never change', tg_table_name;
    end $$
    """)

    execute("""
    create table templates (
      id           uuid primary key,
      business_id  uuid not null references businesses on delete cascade,
      domain       text not null check (domain in ('training','nutrition','trackers')),
      name         text not null check (btrim(name) <> ''),
      description  text,
      content      jsonb not null,
      archived_at  timestamptz,
      created_by   uuid references coaches on delete set null,
      revision     integer not null default 1 check (revision > 0),  
      inserted_at  timestamptz not null,
      updated_at   timestamptz not null
    )
    """)

    execute("""
    create table plans (
      id                  uuid primary key,
      business_id         uuid not null references businesses on delete cascade,
      client_id           uuid not null,
      domain              text not null check (domain in ('training','nutrition')),
      source_template_id  uuid references templates on delete set null,
      name                text not null check (btrim(name) <> ''),
      description         text,
      start_date          date,                     
      end_date            date,                     
      created_local_date  date not null,            
      archived_at         timestamptz,
      created_by          uuid references coaches on delete set null,
      revision            integer not null default 1 check (revision > 0),  
      inserted_at         timestamptz not null,
      updated_at          timestamptz not null,
      foreign key (client_id, business_id) references clients (id, business_id) on delete cascade,
      check (end_date is null or (start_date is not null and end_date >= start_date)),
      unique (id, domain)
    )
    """)

    execute("""
    create unique index plans_one_unscheduled
      on plans (client_id, domain) where start_date is null and archived_at is null
    """)

    execute("""
    create index plans_client_domain on plans (client_id, domain, start_date)
    """)

    execute("""
    create table plan_revisions (
      id            uuid primary key,
      plan_id       uuid not null,
      domain        text not null,
      number        integer not null check (number > 0),
      effective_on  date,                           
      content       jsonb not null,
      created_by    uuid references coaches on delete set null,
      inserted_at   timestamptz not null,
      foreign key (plan_id, domain) references plans (id, domain) on delete cascade,
      unique (plan_id, number),
      unique (id, domain),
      check ((number = 1) = (effective_on is null))
    )
    """)

    execute("""
    create index plan_revisions_in_force on plan_revisions (plan_id, effective_on, number)
    """)

    execute("""
    create trigger plan_revisions_never_change
      before update on plan_revisions for each row execute function forbid_update()
    """)

    execute("""
    alter table clients add column last_change_seq bigint not null default 0
    """)

    execute("""
    create table training_sessions (
      id                 uuid primary key,
      business_id        uuid not null references businesses on delete cascade,
      client_id          uuid not null,
      
      local_date         date not null,             
      timezone           text not null,
      recorded_by_type   text not null check (recorded_by_type in ('client','coach')),
      recorded_by_id     uuid not null,
      request_id         uuid,                      
      revision           integer not null default 1 check (revision > 0),
      inserted_at        timestamptz not null,
      updated_at         timestamptz not null,
      
      domain             text generated always as ('training') stored,
      plan_revision_id   uuid,
      workout_id         uuid,                      
      
      schedule_entry_id  uuid,
      occurrence_date    date,
      
      state              text not null default 'active'
                         check (state in ('active','completed','discarded')),
      started_at         timestamptz not null,
      ended_at           timestamptz,
      notes              text,
      foreign key (client_id, business_id) references clients (id, business_id) on delete cascade,
      foreign key (plan_revision_id, domain) references plan_revisions (id, domain),
      check ((plan_revision_id is null) = (workout_id is null)),         
      check ((schedule_entry_id is null) = (occurrence_date is null)),
      check (schedule_entry_id is null or plan_revision_id is not null),
      check ((state = 'active') = (ended_at is null)),
      check (ended_at is null or ended_at >= started_at),
      unique (id, business_id),
      unique (client_id, request_id)
    )
    """)

    execute("""
    create unique index training_sessions_one_active
      on training_sessions (client_id) where state = 'active'
    """)

    execute("""
    create index training_sessions_client_date on training_sessions (client_id, local_date desc)
    """)

    execute("""
    create index training_sessions_occurrence on training_sessions (schedule_entry_id, occurrence_date)
      where schedule_entry_id is not null and state = 'completed'
    """)

    execute("""
    create table performed_sets (
      id                     uuid primary key,
      business_id            uuid not null,
      session_id             uuid not null,
      position               integer not null check (position >= 0),
      request_id             uuid,
      
      item_id                uuid,
      set_id                 uuid,
      
      exercise_id            uuid references exercises on delete restrict,
      exercise_name          text,                  
      kind                   text not null default 'working'
                             check (kind in ('warmup','working','drop')),
      outcome                text not null default 'done'
                             check (outcome in ('done','failed','skipped')),
      reps                   integer check (reps >= 0),
      load_kg                numeric(8,3),          
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
    )
    """)

    execute("""
    create index performed_sets_exercise on performed_sets (exercise_id, session_id)
      where deleted_at is null
    """)

    execute("""
    create table record_changes (
      id               uuid primary key,
      business_id      uuid not null,
      client_id        uuid not null,
      seq              bigint not null,             
      record_type      text not null check (record_type in ('workout','meal','tracker_entry')),
      record_id        uuid not null,               
      row_type         text not null
                       check (row_type in ('session','set','meal','entry','tracker_entry','attachment')),
      row_id           uuid not null,
      action           text not null check (action in ('added','changed','removed')),
      old_value        jsonb,                       
      new_value        jsonb,                       
      changed_by_type  text not null check (changed_by_type in ('client','coach')),
      changed_by_id    uuid not null,
      changed_at       timestamptz not null,
      foreign key (client_id, business_id) references clients (id, business_id) on delete cascade,
      unique (client_id, seq, row_id)
    )
    """)

    execute("""
    create index record_changes_client_seq on record_changes (client_id, seq)
    """)

    execute("""
    create trigger record_changes_never_change
      before update on record_changes for each row execute function forbid_update()
    """)

    execute("""
    create view records as select 'workout'::text as kind, id, business_id, client_id, local_date, timezone, recorded_by_type, recorded_by_id, revision, inserted_at, updated_at from training_sessions where state <> 'discarded'
    """)

    execute("""
    create function plan_coverage_end(client uuid, created date, ending date) returns date language sql stable as $$
     select least(ending, (select min(t.ends_on) from coaching_terms t where t.client_id=client and t.ends_on>=created));
    $$
    """)

    execute("""
    create function plan_period_covers(client uuid, starting date, ending date, created date, on_date date) returns boolean language sql stable as $$
     select starting <= on_date and (plan_coverage_end(client,created,ending) is null or plan_coverage_end(client,created,ending)>=on_date)
     and exists(select 1 from coaching_terms t where t.client_id=client and t.starts_on<=on_date and (t.ends_on is null or t.ends_on>=on_date));
    $$
    """)

    execute("""
    create function plan_covers(wanted uuid, on_date date) returns boolean language sql stable as $$
     select exists(select 1 from plans p where p.id=wanted and plan_period_covers(p.client_id,p.start_date,p.end_date,p.created_local_date,on_date));
    $$
    """)

    execute("""
    create function expected_workouts(client_ids uuid[], from_date date, to_date date)
    returns table(client_id uuid,plan_id uuid,plan_revision_id uuid,schedule_entry_id uuid,occurrence_date date,workout_id uuid,workout_name text)
    language sql stable as $$
     select p.client_id,p.id,r.id,(e->>'id')::uuid,d::date,(e->>'ref')::uuid,w->>'name'
     from generate_series(from_date,to_date,'1 day'::interval) d
     join plans p on p.client_id=any(client_ids) and p.domain='training' and plan_covers(p.id,d::date)
     cross join lateral (select * from plan_revisions r where r.plan_id=p.id and (r.effective_on is null or r.effective_on<=d::date) order by r.effective_on desc nulls last,r.number desc limit 1) r
     cross join lateral jsonb_array_elements(r.content->'schedule'->'entries') e
     cross join lateral jsonb_array_elements(r.content->'workouts') w
     where (e->>'day')::integer = extract(isodow from d)::integer-1 and w->>'id'=e->>'ref';
    $$
    """)
  end

  def down do
    raise "Prototype reset required"
  end
end
