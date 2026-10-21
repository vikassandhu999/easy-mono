defmodule Easy.Repo.Migrations.CoreTrackers do
  use Ecto.Migration

  def up do
    execute("""
    CREATE TABLE trackers (
      id uuid PRIMARY KEY, business_id uuid REFERENCES businesses ON DELETE CASCADE,
      name text NOT NULL CHECK (btrim(name) <> ''),
      kind text NOT NULL CHECK (kind IN ('number','rating','yes_no','text','photo','document')),
      base_unit text, scale_max integer, archived_at timestamptz,
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      CONSTRAINT trackers_shape CHECK ((kind='number' AND base_unit IS NOT NULL AND btrim(base_unit)<>'' AND scale_max IS NULL) OR
        (kind='rating' AND scale_max BETWEEN 2 AND 10 AND base_unit IS NULL) OR
        (kind NOT IN ('number','rating') AND base_unit IS NULL AND scale_max IS NULL)),
      CHECK (business_id IS NOT NULL OR archived_at IS NULL)
    )
    """)

    execute("CREATE INDEX trackers_business ON trackers(business_id)")

    execute("""
    CREATE FUNCTION tracker_fixed_definition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF ROW(NEW.kind,NEW.base_unit,NEW.scale_max,NEW.business_id) IS DISTINCT FROM ROW(OLD.kind,OLD.base_unit,OLD.scale_max,OLD.business_id)
        OR OLD.business_id IS NULL THEN
        RAISE EXCEPTION 'tracker definition is fixed' USING ERRCODE='23514', CONSTRAINT='trackers_fixed_definition';
      END IF;
      RETURN NEW;
    END $$
    """)

    execute(
      "CREATE TRIGGER trackers_fixed_definition BEFORE UPDATE ON trackers FOR EACH ROW EXECUTE FUNCTION tracker_fixed_definition()"
    )

    execute("""
    CREATE TABLE tracker_assignments (
      id uuid PRIMARY KEY, business_id uuid NOT NULL, client_id uuid NOT NULL,
      tracker_id uuid NOT NULL REFERENCES trackers ON DELETE CASCADE,
      timing text NOT NULL CHECK (timing IN ('daily','weekly','after_workout','after_meal')),
      weekday integer, starts_on date NOT NULL, ends_on date,
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      CONSTRAINT tracker_assignments_weekday CHECK ((timing='weekly' AND weekday BETWEEN 0 AND 6) OR (timing<>'weekly' AND weekday IS NULL)),
      CONSTRAINT tracker_assignments_dates CHECK (ends_on IS NULL OR ends_on >= starts_on - 1),
      CONSTRAINT tracker_assignments_no_overlap EXCLUDE USING gist (client_id WITH =, tracker_id WITH =, daterange(starts_on,ends_on + 1,'[)') WITH &&)
    )
    """)

    execute(
      "CREATE INDEX tracker_assignments_client ON tracker_assignments(business_id,client_id)"
    )

    execute("ALTER TABLE training_sessions ADD UNIQUE(id,client_id,business_id)")
    execute("ALTER TABLE diary_meals ADD UNIQUE(id,client_id,business_id)")
    execute("ALTER TABLE attachments ADD captured_on date")
    execute("ALTER TABLE attachments ADD UNIQUE(id,client_id,business_id)")

    execute("""
    CREATE TABLE tracker_entries (
      id uuid PRIMARY KEY, business_id uuid NOT NULL, client_id uuid NOT NULL,
      tracker_id uuid NOT NULL REFERENCES trackers,
      local_date date NOT NULL, timezone text NOT NULL,
      recorded_by_type text NOT NULL CHECK(recorded_by_type IN ('coach','client')), recorded_by_id uuid NOT NULL,
      request_id uuid NOT NULL, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
      number_value numeric, entered_unit text, rating_value integer, yes_no_value boolean, text_value text,
      about_session_id uuid, about_meal_id uuid, deleted_at timestamptz,
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(about_session_id,client_id,business_id) REFERENCES training_sessions(id,client_id,business_id),
      FOREIGN KEY(about_meal_id,client_id,business_id) REFERENCES diary_meals(id,client_id,business_id),
      CONSTRAINT tracker_entries_one_event CHECK (about_session_id IS NULL OR about_meal_id IS NULL),
      UNIQUE(client_id,request_id), UNIQUE(id,client_id,business_id)
    )
    """)

    execute(
      "CREATE INDEX tracker_entries_client_date ON tracker_entries(business_id,client_id,tracker_id,local_date)"
    )

    execute("""
    CREATE TABLE tracker_entry_attachments (
      id uuid PRIMARY KEY, business_id uuid NOT NULL, client_id uuid NOT NULL, entry_id uuid NOT NULL,
      attachment_id uuid NOT NULL, position integer NOT NULL CHECK(position>=0),
      FOREIGN KEY(entry_id,client_id,business_id) REFERENCES tracker_entries(id,client_id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(attachment_id,client_id,business_id) REFERENCES attachments(id,client_id,business_id),
      UNIQUE(entry_id,attachment_id), UNIQUE(entry_id,position)
    )
    """)

    execute("""
    CREATE TABLE tracker_requests (
      id uuid PRIMARY KEY, business_id uuid NOT NULL, client_id uuid NOT NULL,
      tracker_id uuid NOT NULL REFERENCES trackers ON DELETE CASCADE,
      requested_by uuid NOT NULL REFERENCES coaches, requested_at timestamptz NOT NULL, cancelled_at timestamptz,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE
    )
    """)

    execute(
      "CREATE INDEX tracker_requests_client ON tracker_requests(business_id,client_id,requested_at)"
    )

    execute(
      "ALTER TABLE businesses ADD default_tracker_template_id uuid REFERENCES templates ON DELETE SET NULL"
    )

    execute("""
    CREATE FUNCTION tracker_tenant_reference() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM trackers t WHERE t.id=NEW.tracker_id AND (t.business_id IS NULL OR t.business_id=NEW.business_id)) THEN
        RAISE EXCEPTION 'tracker outside business' USING ERRCODE='23503', CONSTRAINT='tracker_tenant_reference';
      END IF;
      RETURN NEW;
    END $$
    """)

    for table <- ["tracker_assignments", "tracker_entries", "tracker_requests"] do
      execute(
        "CREATE TRIGGER tracker_tenant_reference BEFORE INSERT OR UPDATE ON #{table} FOR EACH ROW EXECUTE FUNCTION tracker_tenant_reference()"
      )
    end

    execute("""
    CREATE OR REPLACE VIEW records AS
      SELECT 'workout'::text AS kind,id,business_id,client_id,local_date,timezone,recorded_by_type,recorded_by_id,revision,inserted_at,updated_at FROM training_sessions WHERE state <> 'discarded'
      UNION ALL SELECT 'meal'::text,id,business_id,client_id,local_date,timezone,recorded_by_type,recorded_by_id,revision,inserted_at,updated_at FROM diary_meals
      UNION ALL SELECT 'tracker_entry'::text,id,business_id,client_id,local_date,timezone,recorded_by_type,recorded_by_id,revision,inserted_at,updated_at FROM tracker_entries WHERE deleted_at IS NULL
    """)
  end

  def down do
    raise "Prototype migration; reset the database to roll back"
  end
end
