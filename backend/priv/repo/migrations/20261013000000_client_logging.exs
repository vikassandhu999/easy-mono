defmodule Easy.Repo.Migrations.ClientLogging do
  use Ecto.Migration

  def up do
    statements("""
    ALTER TABLE workout_schedules ADD UNIQUE(id,client_id,business_id);
    ALTER TABLE workout_exercises ADD UNIQUE(id,business_id);
    ALTER TABLE nutrition_schedules ADD UNIQUE(id,client_id,business_id);
    ALTER TABLE meal_options ADD UNIQUE(id,nutrition_preset_id,business_id);
    ALTER TABLE meal_items ADD UNIQUE(id,business_id);
    CREATE TABLE nutrition_logs (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,client_id uuid NOT NULL,
      type text NOT NULL CHECK(type IN ('meal','food','supplement')),logged_on date NOT NULL,logged_at time,
      recorded_by uuid NOT NULL REFERENCES users,nutrition_schedule_id uuid,scheduled_date date,nutrition_preset_id uuid,meal_option_id uuid,
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(nutrition_schedule_id,client_id,business_id) REFERENCES nutrition_schedules(id,client_id,business_id),
      FOREIGN KEY(nutrition_preset_id,client_id,business_id) REFERENCES nutrition_presets(id,client_id,business_id),
      FOREIGN KEY(meal_option_id,nutrition_preset_id,business_id) REFERENCES meal_options(id,nutrition_preset_id,business_id),
      CONSTRAINT nutrition_logs_occurrence CHECK((nutrition_schedule_id IS NULL)=(scheduled_date IS NULL) AND (meal_option_id IS NULL OR nutrition_preset_id IS NOT NULL)),
      UNIQUE(id,business_id)
    );
    CREATE UNIQUE INDEX nutrition_logs_current_occurrence ON nutrition_logs(business_id,client_id,nutrition_schedule_id,scheduled_date) WHERE nutrition_schedule_id IS NOT NULL;
    CREATE INDEX nutrition_logs_client_date ON nutrition_logs(business_id,client_id,logged_on,id);
    CREATE TABLE food_logs (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,nutrition_log_id uuid NOT NULL,
      meal_item_id uuid,food_id uuid NOT NULL,amount double precision NOT NULL,unit text NOT NULL,position integer NOT NULL,
      name text NOT NULL,kind text NOT NULL CHECK(kind IN ('food','supplement')),basis text NOT NULL CHECK(basis IN ('100g','100ml','1unit')),
      unit_label text,servings jsonb NOT NULL DEFAULT '[]',nutrients jsonb NOT NULL DEFAULT '{}',
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      FOREIGN KEY(nutrition_log_id,business_id) REFERENCES nutrition_logs(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(food_id,business_id) REFERENCES foods(id,business_id),
      FOREIGN KEY(meal_item_id,business_id) REFERENCES meal_items(id,business_id),
      CONSTRAINT food_logs_values CHECK(amount>0 AND amount<'Infinity'::float AND btrim(unit)<>'' AND position>=0 AND jsonb_typeof(servings)='array' AND jsonb_typeof(nutrients)='object'),
      UNIQUE(nutrition_log_id,position)
    );
    CREATE UNIQUE INDEX food_logs_prescribed_item ON food_logs(nutrition_log_id,meal_item_id) WHERE meal_item_id IS NOT NULL;
    CREATE INDEX food_logs_business_parent ON food_logs(business_id,nutrition_log_id);
    CREATE TABLE workout_logs (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,client_id uuid NOT NULL,
      state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','completed','discarded')),
      date date NOT NULL,time time,at_utc timestamptz NOT NULL,text text,recorded_by uuid NOT NULL REFERENCES users,
      difficulty text CHECK(difficulty IN ('too_easy','just_right','too_hard')),pain boolean,pain_note text,
      workout_id uuid,schedule_id uuid,scheduled_date date,swaps jsonb NOT NULL DEFAULT '{}',
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(workout_id,client_id,business_id) REFERENCES workouts(id,client_id,business_id),
      FOREIGN KEY(schedule_id,client_id,business_id) REFERENCES workout_schedules(id,client_id,business_id),
      CONSTRAINT workout_logs_values CHECK((schedule_id IS NULL)=(scheduled_date IS NULL) AND (schedule_id IS NULL OR workout_id IS NOT NULL) AND (pain_note IS NULL OR pain IS TRUE) AND (state<>'completed' OR (difficulty IS NOT NULL AND pain IS NOT NULL)) AND jsonb_typeof(swaps)='object'),
      UNIQUE(id,business_id)
    );
    CREATE UNIQUE INDEX workout_logs_one_active ON workout_logs(business_id,client_id) WHERE state='active';
    CREATE UNIQUE INDEX workout_logs_current_occurrence ON workout_logs(business_id,client_id,schedule_id,scheduled_date) WHERE state<>'discarded' AND schedule_id IS NOT NULL;
    CREATE INDEX workout_logs_client_date ON workout_logs(business_id,client_id,date,id);
    CREATE TABLE exercise_sets (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,workout_log_id uuid NOT NULL,
      workout_exercise_id uuid,exercise_id uuid NOT NULL REFERENCES exercises,round integer NOT NULL,side text CHECK(side IN ('left','right')),
      reps integer,weight_kg numeric,duration_s integer,distance_m numeric,elevation_gain_m numeric,height_cm numeric,calories_kcal numeric,
      speed_m_s numeric,incline_pct numeric,level integer,power_w numeric,cadence_rpm integer,heart_rate_bpm integer,
      effort numeric,reserve numeric,successes integer,attempts integer,score numeric,result text CHECK(result IN ('win','draw','loss')),grade text,
      entered_units jsonb NOT NULL DEFAULT '{}',exercise_snapshot jsonb NOT NULL,
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      FOREIGN KEY(workout_log_id,business_id) REFERENCES workout_logs(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(workout_exercise_id,business_id) REFERENCES workout_exercises(id,business_id),
      CONSTRAINT exercise_sets_values CHECK(round>0 AND COALESCE(reps,0)>=0 AND COALESCE(duration_s,0)>=0 AND COALESCE(distance_m,0)>=0 AND COALESCE(elevation_gain_m,0)>=0 AND COALESCE(height_cm,0)>=0 AND COALESCE(calories_kcal,0)>=0 AND COALESCE(speed_m_s,0)>=0 AND COALESCE(level,1)>=1 AND COALESCE(power_w,0)>=0 AND COALESCE(cadence_rpm,0)>=0 AND COALESCE(heart_rate_bpm,0)>=0 AND COALESCE(effort,1) BETWEEN 1 AND 10 AND COALESCE(reserve,0) BETWEEN 0 AND 10 AND COALESCE(successes,0)>=0 AND COALESCE(attempts,0)>=0 AND (successes IS NULL OR attempts IS NULL OR successes<=attempts) AND jsonb_typeof(entered_units)='object')
    );
    CREATE UNIQUE INDEX exercise_sets_prescribed_round ON exercise_sets(workout_log_id,workout_exercise_id,round,COALESCE(side,'')) WHERE workout_exercise_id IS NOT NULL;
    CREATE INDEX exercise_sets_business_parent ON exercise_sets(business_id,workout_log_id);
    CREATE FUNCTION client_log_links_valid() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE metric record; entry record;
    BEGIN
      IF TG_TABLE_NAME='workout_logs' THEN
        IF NEW.schedule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workout_schedules WHERE id=NEW.schedule_id AND workout_id=NEW.workout_id AND business_id=NEW.business_id AND client_id=NEW.client_id) THEN
          RAISE foreign_key_violation USING CONSTRAINT='workout_logs_schedule_workout',MESSAGE='schedule and workout do not match';
        END IF;
        FOR entry IN SELECT * FROM jsonb_each(NEW.swaps) LOOP
          IF NOT EXISTS(SELECT 1 FROM workout_exercises e JOIN exercise_groups g ON g.id=e.exercise_group_id WHERE e.id::text=entry.key AND g.workout_id=NEW.workout_id AND e.business_id=NEW.business_id)
            OR NOT EXISTS(SELECT 1 FROM exercises WHERE id::text=entry.value->>'id' AND (business_id IS NULL OR business_id=NEW.business_id)) THEN
            RAISE check_violation USING CONSTRAINT='workout_logs_swaps_valid',MESSAGE='swap must follow this workout and a visible exercise';
          END IF;
        END LOOP;
      ELSIF TG_TABLE_NAME='exercise_sets' THEN
        IF NOT EXISTS(SELECT 1 FROM exercises WHERE id=NEW.exercise_id AND (business_id IS NULL OR business_id=NEW.business_id)) THEN
          RAISE foreign_key_violation USING CONSTRAINT='exercise_sets_exercise_tenant',MESSAGE='exercise belongs to another business';
        END IF;
        IF NEW.workout_exercise_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workout_exercises e JOIN exercise_groups g ON g.id=e.exercise_group_id JOIN workout_logs l ON l.workout_id=g.workout_id WHERE e.id=NEW.workout_exercise_id AND l.id=NEW.workout_log_id AND l.business_id=NEW.business_id) THEN
          RAISE foreign_key_violation USING CONSTRAINT='exercise_sets_prescribed_workout',MESSAGE='prescribed exercise belongs to another workout';
        END IF;
        IF NEW.exercise_snapshot->>'id' IS DISTINCT FROM NEW.exercise_id::text OR ((NEW.exercise_snapshot->>'unilateral')::boolean IS TRUE)<>(NEW.side IS NOT NULL) THEN
          RAISE check_violation USING CONSTRAINT='exercise_sets_snapshot_valid',MESSAGE='set identity and side must match its exercise';
        END IF;
        FOR metric IN SELECT * FROM jsonb_each_text('{"reps":"reps","weight_kg":"weight","duration_s":"duration","distance_m":"distance","elevation_gain_m":"elevation_gain","height_cm":"height","calories_kcal":"calories","speed_m_s":"speed","incline_pct":"incline","level":"level","power_w":"power","cadence_rpm":"cadence","heart_rate_bpm":"heart_rate","effort":"effort","reserve":"reserve","successes":"successes","attempts":"attempts","score":"score","result":"result","grade":"grade"}') LOOP
          IF to_jsonb(NEW)->metric.key <> 'null'::jsonb AND NOT NEW.exercise_snapshot->'metrics' ? metric.value THEN
            RAISE check_violation USING CONSTRAINT='exercise_sets_metrics_valid',MESSAGE='metric must belong to the performed exercise';
          END IF;
        END LOOP;
      ELSE
        IF NEW.nutrition_schedule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM nutrition_schedules WHERE id=NEW.nutrition_schedule_id AND nutrition_preset_id=NEW.nutrition_preset_id AND business_id=NEW.business_id AND client_id=NEW.client_id) THEN
          RAISE foreign_key_violation USING CONSTRAINT='nutrition_logs_schedule_preset',MESSAGE='schedule and preset do not match';
        END IF;
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER workout_logs_links BEFORE INSERT OR UPDATE ON workout_logs FOR EACH ROW EXECUTE FUNCTION client_log_links_valid();
    CREATE TRIGGER exercise_sets_links BEFORE INSERT OR UPDATE ON exercise_sets FOR EACH ROW EXECUTE FUNCTION client_log_links_valid();
    CREATE TRIGGER nutrition_logs_links BEFORE INSERT OR UPDATE ON nutrition_logs FOR EACH ROW EXECUTE FUNCTION client_log_links_valid();
    CREATE FUNCTION nutrition_log_items_valid() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE selected uuid; log_row nutrition_logs; item_count integer;
    BEGIN
      IF TG_TABLE_NAME='nutrition_logs' THEN selected=COALESCE(NEW.id,OLD.id); ELSE selected=COALESCE(NEW.nutrition_log_id,OLD.nutrition_log_id); END IF;
      SELECT * INTO log_row FROM nutrition_logs WHERE id=selected;
      IF NOT FOUND THEN RETURN NULL; END IF;
      SELECT count(*) INTO item_count FROM food_logs WHERE nutrition_log_id=selected;
      IF item_count=0 OR (log_row.type<>'meal' AND (item_count<>1 OR EXISTS(SELECT 1 FROM food_logs WHERE nutrition_log_id=selected AND kind<>log_row.type))) THEN
        RAISE check_violation USING CONSTRAINT='nutrition_logs_items_valid',MESSAGE='log needs items that match its occasion';
      END IF;
      IF EXISTS(SELECT 1 FROM food_logs f LEFT JOIN meal_items i ON i.id=f.meal_item_id WHERE f.nutrition_log_id=selected AND f.meal_item_id IS NOT NULL AND i.meal_option_id IS DISTINCT FROM log_row.meal_option_id) THEN
        RAISE check_violation USING CONSTRAINT='food_logs_prescribed_option',MESSAGE='item must belong to the selected meal option';
      END IF;
      RETURN NULL;
    END $$;
    CREATE CONSTRAINT TRIGGER nutrition_logs_items AFTER INSERT OR UPDATE OR DELETE ON nutrition_logs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nutrition_log_items_valid();
    CREATE CONSTRAINT TRIGGER food_logs_items AFTER INSERT OR UPDATE OR DELETE ON food_logs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nutrition_log_items_valid();
    """)
  end

  def down do
    execute("DROP TABLE exercise_sets,workout_logs,food_logs,nutrition_logs")
    execute("DROP FUNCTION client_log_links_valid()")
    execute("DROP FUNCTION IF EXISTS nutrition_log_items_valid()")

    execute(
      "ALTER TABLE workout_schedules DROP CONSTRAINT workout_schedules_id_client_id_business_id_key"
    )

    execute("ALTER TABLE workout_exercises DROP CONSTRAINT workout_exercises_id_business_id_key")

    execute(
      "ALTER TABLE nutrition_schedules DROP CONSTRAINT nutrition_schedules_id_client_id_business_id_key"
    )

    execute(
      "ALTER TABLE meal_options DROP CONSTRAINT meal_options_id_nutrition_preset_id_business_id_key"
    )

    execute("ALTER TABLE meal_items DROP CONSTRAINT meal_items_id_business_id_key")
  end

  defp statements(sql) do
    ~r/(?:\$\$.*?\$\$|[^;])+;?/s
    |> Regex.scan(sql)
    |> Enum.map(fn [s] -> String.trim(s) end)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end
end
