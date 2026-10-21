defmodule Easy.Repo.Migrations.RebuildWorkouts do
  use Ecto.Migration

  def up do
    execute("DROP VIEW IF EXISTS records")
    execute("ALTER TABLE tracker_entries DROP COLUMN IF EXISTS about_session_id CASCADE")

    execute(
      "DROP TABLE IF EXISTS performed_sets, exercises, training_performed_sets, training_sessions, training_exercise_equipment, training_exercise_muscles, training_exercises, training_muscles, training_equipment, plan_revisions, plans CASCADE"
    )

    execute("DELETE FROM templates WHERE domain='training'")
    execute("ALTER TABLE templates DROP CONSTRAINT templates_domain_check")

    execute(
      "ALTER TABLE templates ADD CONSTRAINT templates_domain_check CHECK(domain='trackers')"
    )

    execute(
      "UPDATE chat_messages SET embed_type=NULL,embed_id=NULL,embed_snapshot=NULL WHERE embed_type='training_session'"
    )

    execute("ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_embed_type_check")

    execute(
      "ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_embed_type_check CHECK(embed_type='review')"
    )

    execute("DELETE FROM record_changes WHERE record_type='workout'")
    execute("ALTER TABLE record_changes DROP CONSTRAINT record_changes_record_type_check")

    execute(
      "ALTER TABLE record_changes ADD CONSTRAINT record_changes_record_type_check CHECK(record_type='tracker_entry')"
    )

    execute("ALTER TABLE record_changes DROP CONSTRAINT record_changes_row_type_check")

    execute(
      "ALTER TABLE record_changes ADD CONSTRAINT record_changes_row_type_check CHECK(row_type IN ('tracker_entry','attachment'))"
    )

    execute(
      "CREATE VIEW records AS SELECT 'tracker_entry'::text AS kind,id,business_id,client_id,local_date,timezone,recorded_by_type,recorded_by_id,revision,inserted_at,updated_at FROM tracker_entries WHERE deleted_at IS NULL"
    )

    statements("""
    CREATE TABLE exercises (
      id uuid PRIMARY KEY, business_id uuid REFERENCES businesses ON DELETE CASCADE,
      name text NOT NULL CHECK(btrim(name)<>''),kind text NOT NULL,
      goals text[] NOT NULL,places text[] NOT NULL,metrics text[] NOT NULL,
      count_label text,grade_scale text[] NOT NULL DEFAULT '{}',unilateral boolean NOT NULL DEFAULT false,
      equipment text[] NOT NULL DEFAULT '{}',muscles text[] NOT NULL DEFAULT '{}',media text,
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      CONSTRAINT exercises_taxonomy CHECK(kind IN ('movement','activity','sport','practice')
        AND cardinality(goals)>0 AND goals <@ ARRAY['strength','endurance','power','mobility','balance','skill','recovery']
        AND cardinality(places)>0 AND places <@ ARRAY['gym','home','outdoor','pool','court/field','studio']
        AND cardinality(metrics)>0 AND metrics <@ ARRAY['reps','weight','duration','distance','elevation_gain','height','calories','speed','incline','level','power','cadence','heart_rate','effort','reserve','successes','attempts','score','result','grade','tempo'])
    );
    CREATE INDEX exercises_business_newest ON exercises(business_id,inserted_at DESC,id DESC);
    CREATE TABLE workouts (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,client_id uuid,
      name text NOT NULL CHECK(btrim(name)<>''),description text,type text NOT NULL CHECK(type IN ('prescribed','video','open')),
      video text,archived_at timestamptz,inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      UNIQUE(id,business_id),UNIQUE(id,client_id,business_id)
    );
    CREATE INDEX workouts_business_owner ON workouts(business_id,client_id,inserted_at DESC,id DESC);
    CREATE TABLE exercise_groups (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,workout_id uuid NOT NULL,
      name text,rounds integer NOT NULL,position integer NOT NULL,
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      CONSTRAINT exercise_groups_values CHECK(rounds BETWEEN 1 AND 100 AND position>=0),
      FOREIGN KEY(workout_id,business_id) REFERENCES workouts(id,business_id) ON DELETE CASCADE,
      UNIQUE(id,business_id),UNIQUE(workout_id,position)
    );
    CREATE INDEX exercise_groups_business_parent ON exercise_groups(business_id,workout_id);
    CREATE TABLE workout_exercises (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,exercise_group_id uuid NOT NULL,
      exercise_id uuid NOT NULL REFERENCES exercises,position integer NOT NULL CHECK(position>=0),
      targets_mode text NOT NULL CHECK(targets_mode IN ('same_for_all','per_round')),
      targets jsonb[] NOT NULL DEFAULT ARRAY['{}'::jsonb],rest jsonb[] NOT NULL DEFAULT '{}',exercise_snapshot jsonb NOT NULL,
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      FOREIGN KEY(exercise_group_id,business_id) REFERENCES exercise_groups(id,business_id) ON DELETE CASCADE,
      UNIQUE(exercise_group_id,position)
    );
    CREATE INDEX workout_exercises_business_parent ON workout_exercises(business_id,exercise_group_id);
    CREATE TABLE workout_schedules (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,client_id uuid NOT NULL,workout_id uuid NOT NULL,
      weekdays_mask integer NOT NULL,from_date date NOT NULL,until_date date,time time,place text,meeting_url text,coach_id uuid,
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      FOREIGN KEY(client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY(workout_id,client_id,business_id) REFERENCES workouts(id,client_id,business_id),
      FOREIGN KEY(coach_id,business_id) REFERENCES coaches(id,business_id),
      CONSTRAINT workout_schedules_values CHECK(weekdays_mask BETWEEN 1 AND 127 AND (until_date IS NULL OR until_date>=from_date) AND (place IS NULL OR meeting_url IS NULL))
    );
    CREATE INDEX workout_schedules_business_client ON workout_schedules(business_id,client_id);
    CREATE FUNCTION workout_exercise_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT EXISTS(SELECT 1 FROM exercises WHERE id=NEW.exercise_id AND (business_id IS NULL OR business_id=NEW.business_id)) THEN
        RAISE foreign_key_violation USING CONSTRAINT='workout_exercises_exercise_tenant',MESSAGE='exercise belongs to another business';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER workout_exercises_tenant BEFORE INSERT OR UPDATE ON workout_exercises FOR EACH ROW EXECUTE FUNCTION workout_exercise_tenant();
    CREATE FUNCTION workout_content_valid() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE group_row exercise_groups; workout_row workouts; selected uuid;
    BEGIN
      IF TG_TABLE_NAME='workouts' THEN selected=COALESCE(NEW.id,OLD.id);
      ELSIF TG_TABLE_NAME='exercise_groups' THEN selected=COALESCE(NEW.workout_id,OLD.workout_id);
      ELSE SELECT workout_id INTO selected FROM exercise_groups WHERE id=COALESCE(NEW.exercise_group_id,OLD.exercise_group_id); END IF;
      SELECT * INTO workout_row FROM workouts WHERE id=selected;
      IF NOT FOUND THEN RETURN NULL; END IF;
      IF workout_row.type<>'prescribed' AND EXISTS(SELECT 1 FROM exercise_groups WHERE workout_id=selected) THEN RAISE check_violation USING CONSTRAINT='workouts_content',MESSAGE='only prescribed workouts contain exercises'; END IF;
      FOR group_row IN SELECT * FROM exercise_groups WHERE workout_id=selected LOOP
        IF NOT EXISTS(SELECT 1 FROM workout_exercises WHERE exercise_group_id=group_row.id) THEN RAISE check_violation USING CONSTRAINT='exercise_groups_not_empty',MESSAGE='a group needs an exercise'; END IF;
        IF EXISTS(SELECT 1 FROM workout_exercises WHERE exercise_group_id=group_row.id AND (cardinality(targets)<>CASE targets_mode WHEN 'same_for_all' THEN 1 ELSE group_row.rounds END OR cardinality(rest) NOT IN (0,CASE targets_mode WHEN 'same_for_all' THEN 1 ELSE group_row.rounds END))) THEN RAISE check_violation USING CONSTRAINT='workout_exercises_rounds',MESSAGE='targets must match rounds'; END IF;
      END LOOP;
      RETURN NULL;
    END $$;
    CREATE CONSTRAINT TRIGGER workouts_content AFTER INSERT OR UPDATE OR DELETE ON workouts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workout_content_valid();
    CREATE CONSTRAINT TRIGGER exercise_groups_content AFTER INSERT OR UPDATE OR DELETE ON exercise_groups DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workout_content_valid();
    CREATE CONSTRAINT TRIGGER workout_exercises_content AFTER INSERT OR UPDATE OR DELETE ON workout_exercises DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workout_content_valid();
    """)

    for {name, kind, goals, places, metrics, equipment, unilateral} <- [
          {"Bench press", "movement", ["strength"], ["gym"], ["reps", "weight"],
           ["Barbell", "Bench"], false},
          {"Pull-up", "movement", ["strength"], ["gym", "home"], ["reps", "weight"],
           ["Pull-up bar"], false},
          {"Plank", "movement", ["strength"], ["gym", "home"], ["duration"], [], false},
          {"Back squat", "movement", ["strength"], ["gym"], ["reps", "weight"], ["Barbell"],
           false},
          {"Split squat", "movement", ["strength", "balance"], ["gym", "home"],
           ["reps", "weight"], [], true},
          {"Running", "activity", ["endurance"], ["outdoor"], ["distance", "duration"], [],
           false},
          {"Swimming", "activity", ["endurance"], ["pool"], ["distance", "duration"], [], false},
          {"Tennis", "sport", ["skill", "endurance"], ["court/field"],
           ["duration", "result", "score"], ["Racket"], false},
          {"Yoga", "practice", ["mobility", "recovery"], ["home", "studio"], ["duration"],
           ["Mat"], false}
        ] do
      now = DateTime.utc_now(:second)

      execute(fn ->
        Easy.Repo.insert_all("exercises", [
          %{
            id: Ecto.UUID.dump!(Ecto.UUID.generate()),
            name: name,
            kind: kind,
            goals: goals,
            places: places,
            metrics: metrics,
            equipment: equipment,
            unilateral: unilateral,
            inserted_at: now,
            updated_at: now
          }
        ])
      end)
    end
  end

  defp statements(sql) do
    ~r/(?:\$\$.*?\$\$|[^;])+;?/s
    |> Regex.scan(sql)
    |> Enum.map(fn [s] -> String.trim(s) end)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end

  def down, do: raise("Workout rebuild is irreversible")
end
