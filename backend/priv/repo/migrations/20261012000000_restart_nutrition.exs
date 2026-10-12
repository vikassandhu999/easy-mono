defmodule Easy.Repo.Migrations.RestartNutrition do
  use Ecto.Migration

  def up do
    execute(
      "ALTER TABLE tracker_entries DROP CONSTRAINT IF EXISTS tracker_entries_one_event, DROP COLUMN IF EXISTS about_meal_id CASCADE"
    )

    execute("DROP TABLE diary_entries, diary_meals, recipes, foods CASCADE")
    execute("DROP FUNCTION IF EXISTS expected_meals(uuid[],date,date)")
    execute("DROP FUNCTION IF EXISTS valid_nutrients(jsonb)")

    execute_statements("""
    CREATE VIEW records AS
      SELECT 'workout'::text AS kind,id,business_id,client_id,local_date,timezone,recorded_by_type,recorded_by_id,revision,inserted_at,updated_at FROM training_sessions WHERE state<>'discarded'
      UNION ALL
      SELECT 'tracker_entry'::text AS kind,id,business_id,client_id,local_date,timezone,recorded_by_type,recorded_by_id,revision,inserted_at,updated_at FROM tracker_entries WHERE deleted_at IS NULL;
    UPDATE chat_messages SET embed_type=NULL,embed_id=NULL,embed_snapshot=NULL WHERE embed_type='meal';
    ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_embed_type_check;
    ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_embed_type_check CHECK(embed_type IN ('training_session','review'));
    DELETE FROM record_changes WHERE record_type='meal';
    ALTER TABLE record_changes DROP CONSTRAINT IF EXISTS record_changes_record_type_check;
    ALTER TABLE record_changes ADD CONSTRAINT record_changes_record_type_check CHECK(record_type IN ('workout','tracker_entry'));
    ALTER TABLE record_changes DROP CONSTRAINT IF EXISTS record_changes_row_type_check;
    ALTER TABLE record_changes ADD CONSTRAINT record_changes_row_type_check CHECK(row_type IN ('session','set','tracker_entry','attachment'));
    """)

    execute("DELETE FROM plans WHERE domain='nutrition'")
    execute("DELETE FROM templates WHERE domain='nutrition'")

    execute_statements("""
    ALTER TABLE templates DROP CONSTRAINT templates_domain_check;
    ALTER TABLE templates ADD CONSTRAINT templates_domain_check CHECK(domain IN ('training','trackers'));
    ALTER TABLE plans DROP CONSTRAINT plans_domain_check;
    ALTER TABLE plans ADD CONSTRAINT plans_domain_check CHECK(domain='training');
    ALTER TABLE plan_revisions ADD CONSTRAINT plan_revisions_domain_check CHECK(domain='training');
    """)

    execute_statements("""
    CREATE TABLE nutrients (
      id uuid NOT NULL UNIQUE, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
      code text NOT NULL, name text NOT NULL, unit text NOT NULL,
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      PRIMARY KEY(business_id,code)
    );
    CREATE TABLE foods (
      id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
      name text NOT NULL CHECK(btrim(name)<>''), kind text NOT NULL CHECK(kind IN ('food','supplement')),
      basis text NOT NULL CHECK(basis IN ('100g','100ml','1unit')), unit_label text,
      nutrients jsonb NOT NULL DEFAULT '{}', servings jsonb NOT NULL DEFAULT '[]',
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      CHECK(jsonb_typeof(nutrients)='object'), CHECK(jsonb_typeof(servings)='array'),
      UNIQUE(id,business_id)
    );
    CREATE INDEX foods_business_newest ON foods(business_id,inserted_at DESC,id DESC);
    CREATE TABLE nutrition_presets (
      id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
      client_id uuid NOT NULL, type text NOT NULL CHECK(type IN ('meal','food','supplement')),
      name text, instructions text, food_id uuid, amount double precision, unit text, archived_at timestamptz,
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(food_id,business_id) REFERENCES foods(id,business_id),
      CONSTRAINT nutrition_presets_shape CHECK (
        (type='meal' AND name IS NOT NULL AND btrim(name)<>'' AND food_id IS NULL AND amount IS NULL AND unit IS NULL)
        OR (type IN ('food','supplement') AND food_id IS NOT NULL AND amount IS NOT NULL AND amount>0 AND amount<'Infinity'::float AND unit IS NOT NULL AND btrim(unit)<>'')
      ),
      UNIQUE(id,business_id), UNIQUE(id,client_id,business_id)
    );
    CREATE INDEX nutrition_presets_client ON nutrition_presets(business_id,client_id);
    CREATE TABLE meal_options (
      id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
      nutrition_preset_id uuid NOT NULL, name text, position integer NOT NULL CHECK(position>=0),
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      FOREIGN KEY(nutrition_preset_id,business_id) REFERENCES nutrition_presets(id,business_id) ON DELETE CASCADE,
      UNIQUE(id,business_id), UNIQUE(nutrition_preset_id,position)
    );
    CREATE INDEX meal_options_business_parent ON meal_options(business_id,nutrition_preset_id);
    CREATE TABLE meal_items (
      id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
      meal_option_id uuid NOT NULL, food_id uuid NOT NULL, amount double precision NOT NULL CHECK(amount>0 AND amount<'Infinity'::float),
      unit text NOT NULL CHECK(btrim(unit)<>''), position integer NOT NULL CHECK(position>=0),
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      FOREIGN KEY(meal_option_id,business_id) REFERENCES meal_options(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(food_id,business_id) REFERENCES foods(id,business_id), UNIQUE(meal_option_id,position)
    );
    CREATE INDEX meal_items_business_parent ON meal_items(business_id,meal_option_id);
    CREATE TABLE nutrition_targets (
      id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
      client_id uuid NOT NULL, name text NOT NULL CHECK(btrim(name)<>''), targets jsonb NOT NULL DEFAULT '{}',
      archived_at timestamptz, inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      UNIQUE(id,business_id), UNIQUE(id,client_id,business_id)
    );
    CREATE INDEX nutrition_targets_client ON nutrition_targets(business_id,client_id);
    """)

    for {table, parent, column} <- [
          {"nutrition_schedules", "nutrition_presets", "nutrition_preset_id"},
          {"target_schedules", "nutrition_targets", "nutrition_targets_id"}
        ] do
      extras =
        if table == "nutrition_schedules",
          do: ", time time, coach_id uuid REFERENCES coaches",
          else: ""

      execute_statements("""
      CREATE TABLE #{table} (
        id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
        client_id uuid NOT NULL, #{column} uuid NOT NULL,
        date date, weekdays_mask integer, from_date date, until_date date #{extras},
        inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
        FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
        FOREIGN KEY(#{column},client_id,business_id) REFERENCES #{parent}(id,client_id,business_id),
        CONSTRAINT #{table}_timing CHECK (
          (date IS NOT NULL AND weekdays_mask IS NULL AND from_date IS NULL AND until_date IS NULL)
          OR (date IS NULL AND weekdays_mask IS NOT NULL AND weekdays_mask BETWEEN 1 AND 127 AND from_date IS NOT NULL
              AND (until_date IS NULL OR until_date>=from_date))
        )
      );
      CREATE INDEX #{table}_client ON #{table}(business_id,client_id);
      """)
    end

    execute_statements("""
    CREATE FUNCTION nutrition_json_valid(value jsonb, tenant uuid, bounds boolean) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
    DECLARE entry record; lo numeric; hi numeric;
    BEGIN
      IF jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
      FOR entry IN SELECT * FROM jsonb_each(value) LOOP
        IF NOT EXISTS(SELECT 1 FROM nutrients WHERE business_id=tenant AND code=entry.key) THEN RETURN false; END IF;
        IF bounds THEN
          IF jsonb_typeof(entry.value)<>'object' OR entry.value='{}' OR (entry.value-'min'-'max')<>'{}' THEN RETURN false; END IF;
          IF entry.value ? 'min' AND (jsonb_typeof(entry.value->'min')<>'number' OR (entry.value->>'min')::numeric<0) THEN RETURN false; END IF;
          IF entry.value ? 'max' AND (jsonb_typeof(entry.value->'max')<>'number' OR (entry.value->>'max')::numeric<0) THEN RETURN false; END IF;
          lo=(entry.value->>'min')::numeric; hi=(entry.value->>'max')::numeric;
          IF lo IS NOT NULL AND hi IS NOT NULL AND lo>hi THEN RETURN false; END IF;
        ELSE
          IF jsonb_typeof(entry.value)<>'number' OR (entry.value::text)::numeric<0 THEN RETURN false; END IF;
        END IF;
      END LOOP;
      RETURN true;
    END $$;
    ALTER TABLE foods ADD CONSTRAINT foods_nutrients_valid CHECK(nutrition_json_valid(nutrients,business_id,false));
    ALTER TABLE nutrition_targets ADD CONSTRAINT nutrition_targets_values_valid CHECK(nutrition_json_valid(targets,business_id,true));
    CREATE FUNCTION nutrition_servings_valid(value jsonb, basis text, unit_label text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE entry jsonb; labels text[]=ARRAY['base',CASE basis WHEN '100g' THEN 'g' WHEN '100ml' THEN 'ml' ELSE 'unit' END,unit_label]; label text;
    BEGIN
      IF jsonb_typeof(value)<>'array' THEN RETURN false; END IF;
      FOR entry IN SELECT * FROM jsonb_array_elements(value) LOOP
        label=entry->>'label';
        IF jsonb_typeof(entry)<>'object' OR jsonb_typeof(entry->'label')<>'string' OR label IS NULL OR btrim(label)='' OR label=ANY(labels) OR jsonb_typeof(entry->'amount') IS DISTINCT FROM 'number' OR (entry->>'amount')::numeric<=0 THEN RETURN false; END IF;
        labels=array_append(labels,label);
      END LOOP;
      RETURN true;
    END $$;
    ALTER TABLE foods ADD CONSTRAINT foods_servings_valid CHECK(nutrition_servings_valid(servings,basis,unit_label));
    CREATE FUNCTION nutrition_item_valid(food uuid, tenant uuid, chosen_unit text, chosen_kind text) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS(SELECT 1 FROM foods f WHERE f.id=food AND f.business_id=tenant AND (chosen_kind IS NULL OR f.kind=chosen_kind)
        AND (chosen_unit='base' OR chosen_unit=CASE f.basis WHEN '100g' THEN 'g' WHEN '100ml' THEN 'ml' ELSE 'unit' END
          OR chosen_unit=f.unit_label OR EXISTS(SELECT 1 FROM jsonb_array_elements(f.servings) s WHERE s->>'label'=chosen_unit)))
    $$;
    CREATE FUNCTION nutrition_validate_content() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE preset uuid; row nutrition_presets; option record;
    BEGIN
      IF TG_TABLE_NAME='nutrition_presets' THEN preset=COALESCE(NEW.id,OLD.id);
      ELSIF TG_TABLE_NAME='meal_options' THEN preset=COALESCE(NEW.nutrition_preset_id,OLD.nutrition_preset_id);
      ELSE SELECT nutrition_preset_id INTO preset FROM meal_options WHERE id=COALESCE(NEW.meal_option_id,OLD.meal_option_id); END IF;
      SELECT * INTO row FROM nutrition_presets WHERE id=preset;
      IF NOT FOUND THEN RETURN NULL; END IF;
      IF row.type='meal' THEN
        IF NOT EXISTS(SELECT 1 FROM meal_options WHERE nutrition_preset_id=preset) THEN RAISE check_violation USING CONSTRAINT='nutrition_presets_options_required', MESSAGE='a meal needs an option'; END IF;
        FOR option IN SELECT * FROM meal_options WHERE nutrition_preset_id=preset LOOP
          IF NOT EXISTS(SELECT 1 FROM meal_items WHERE meal_option_id=option.id) THEN RAISE check_violation USING CONSTRAINT='meal_options_items_required', MESSAGE='an option needs an item'; END IF;
        END LOOP;
      ELSE
        IF EXISTS(SELECT 1 FROM meal_options WHERE nutrition_preset_id=preset) THEN RAISE check_violation USING CONSTRAINT='nutrition_presets_shape', MESSAGE='direct items cannot have options'; END IF;
        IF NOT nutrition_item_valid(row.food_id,row.business_id,row.unit,row.type) THEN RAISE check_violation USING CONSTRAINT='nutrition_presets_food_valid', MESSAGE='food kind or unit does not match'; END IF;
      END IF;
      IF EXISTS(SELECT 1 FROM meal_items i JOIN meal_options o ON o.id=i.meal_option_id WHERE o.nutrition_preset_id=preset AND NOT nutrition_item_valid(i.food_id,i.business_id,i.unit,NULL)) THEN RAISE check_violation USING CONSTRAINT='meal_items_food_valid', MESSAGE='invalid food unit'; END IF;
      RETURN NULL;
    END $$;
    CREATE CONSTRAINT TRIGGER nutrition_presets_content AFTER INSERT OR UPDATE OR DELETE ON nutrition_presets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nutrition_validate_content();
    CREATE CONSTRAINT TRIGGER meal_options_content AFTER INSERT OR UPDATE OR DELETE ON meal_options DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nutrition_validate_content();
    CREATE CONSTRAINT TRIGGER meal_items_content AFTER INSERT OR UPDATE OR DELETE ON meal_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nutrition_validate_content();
    CREATE FUNCTION nutrition_validate_food_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF EXISTS(SELECT 1 FROM nutrition_presets p WHERE p.food_id=NEW.id AND NOT nutrition_item_valid(NEW.id,NEW.business_id,p.unit,p.type))
        OR EXISTS(SELECT 1 FROM meal_items i WHERE i.food_id=NEW.id AND NOT nutrition_item_valid(NEW.id,NEW.business_id,i.unit,NULL)) THEN
        RAISE check_violation USING CONSTRAINT='foods_prescribed_shape', MESSAGE='the food kind or unit is used by a prescription';
      END IF;
      RETURN NULL;
    END $$;
    CREATE CONSTRAINT TRIGGER foods_prescribed_shape AFTER UPDATE ON foods FOR EACH ROW EXECUTE FUNCTION nutrition_validate_food_update();
    """)
  end

  defp execute_statements(sql) do
    ~r/(?:\$\$.*?\$\$|[^;])+;?/s
    |> Regex.scan(sql)
    |> Enum.map(fn [statement] -> String.trim(statement) end)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end

  def down, do: raise("Nutrition restart is irreversible")
end
