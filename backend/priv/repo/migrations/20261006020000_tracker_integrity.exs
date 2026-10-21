defmodule Easy.Repo.Migrations.TrackerIntegrity do
  use Ecto.Migration

  def up do
    execute("ALTER TABLE tracker_assignments DROP CONSTRAINT tracker_assignments_weekday")

    execute(
      "ALTER TABLE tracker_assignments ADD CONSTRAINT tracker_assignments_weekday CHECK ((timing='weekly' AND weekday IS NOT NULL AND weekday BETWEEN 0 AND 6) OR (timing<>'weekly' AND weekday IS NULL))"
    )

    execute("ALTER TABLE trackers DROP CONSTRAINT trackers_shape")

    execute("""
    ALTER TABLE trackers ADD CONSTRAINT trackers_shape CHECK (
      (kind='number' AND base_unit IS NOT NULL AND btrim(base_unit)<>'' AND scale_max IS NULL) OR
      (kind='rating' AND scale_max IS NOT NULL AND scale_max BETWEEN 2 AND 10 AND base_unit IS NULL) OR
      (kind NOT IN ('number','rating') AND base_unit IS NULL AND scale_max IS NULL))
    """)

    execute(
      "ALTER TABLE tracker_requests ADD FOREIGN KEY(requested_by,business_id) REFERENCES coaches(id,business_id)"
    )

    execute("ALTER TABLE templates ADD UNIQUE(id,business_id)")

    execute(
      "ALTER TABLE businesses ADD CONSTRAINT businesses_default_tracker_tenant FOREIGN KEY(default_tracker_template_id,id) REFERENCES templates(id,business_id)"
    )

    execute("""
    CREATE FUNCTION tracker_default_domain() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.default_tracker_template_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM templates WHERE id=NEW.default_tracker_template_id AND business_id=NEW.id AND domain='trackers'
      ) THEN
        RAISE EXCEPTION 'default must be a Tracker template in the business' USING ERRCODE='23514', CONSTRAINT='businesses_default_tracker_domain';
      END IF;
      RETURN NEW;
    END $$
    """)

    execute(
      "CREATE TRIGGER businesses_default_tracker_domain BEFORE INSERT OR UPDATE OF default_tracker_template_id ON businesses FOR EACH ROW EXECUTE FUNCTION tracker_default_domain()"
    )

    execute("""
    CREATE FUNCTION tracker_builtin_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF OLD.business_id IS NULL THEN
        RAISE EXCEPTION 'built-in trackers cannot be deleted' USING ERRCODE='23514', CONSTRAINT='trackers_builtin_delete';
      END IF;
      RETURN OLD;
    END $$
    """)

    execute(
      "CREATE TRIGGER trackers_builtin_delete BEFORE DELETE ON trackers FOR EACH ROW EXECUTE FUNCTION tracker_builtin_delete()"
    )

    execute("""
    CREATE FUNCTION tracker_entry_value() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE t trackers;
    BEGIN
      SELECT * INTO t FROM trackers WHERE id=NEW.tracker_id;
      IF (
        (t.kind='number' AND NEW.number_value IS NOT NULL AND NEW.entered_unit IS NOT NULL AND NEW.rating_value IS NULL AND NEW.yes_no_value IS NULL AND NEW.text_value IS NULL) OR
        (t.kind='rating' AND NEW.rating_value BETWEEN 1 AND t.scale_max AND NEW.number_value IS NULL AND NEW.entered_unit IS NULL AND NEW.yes_no_value IS NULL AND NEW.text_value IS NULL) OR
        (t.kind='yes_no' AND NEW.yes_no_value IS NOT NULL AND NEW.number_value IS NULL AND NEW.entered_unit IS NULL AND NEW.rating_value IS NULL AND NEW.text_value IS NULL) OR
        (t.kind='text' AND NEW.text_value IS NOT NULL AND btrim(NEW.text_value)<>'' AND NEW.number_value IS NULL AND NEW.entered_unit IS NULL AND NEW.rating_value IS NULL AND NEW.yes_no_value IS NULL) OR
        (t.kind IN ('photo','document') AND NEW.number_value IS NULL AND NEW.entered_unit IS NULL AND NEW.rating_value IS NULL AND NEW.yes_no_value IS NULL AND NEW.text_value IS NULL)
      ) IS NOT TRUE THEN
        RAISE EXCEPTION 'entry value does not match tracker kind' USING ERRCODE='23514', CONSTRAINT='tracker_entries_value';
      END IF;
      RETURN NEW;
    END $$
    """)

    execute(
      "CREATE TRIGGER tracker_entries_value BEFORE INSERT OR UPDATE ON tracker_entries FOR EACH ROW EXECUTE FUNCTION tracker_entry_value()"
    )
  end

  def down do
    raise "Prototype migration; reset the database to roll back"
  end
end
