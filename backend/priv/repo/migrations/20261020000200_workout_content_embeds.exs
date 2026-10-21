defmodule Easy.Repo.Migrations.WorkoutContentEmbeds do
  use Ecto.Migration

  @spec up() :: :ok
  def up do
    statements("""
    DROP TRIGGER workouts_content ON workouts;
    DROP TRIGGER exercise_groups_content ON exercise_groups;
    DROP TRIGGER workout_exercises_content ON workout_exercises;
    DROP TRIGGER workout_exercises_tenant ON workout_exercises;
    ALTER TABLE workout_exercises DROP CONSTRAINT workout_exercises_targets_valid;
    ALTER TABLE workouts DROP CONSTRAINT workouts_video;
    DROP FUNCTION workout_content_valid(),workout_exercise_tenant(),workout_targets_valid(jsonb[],jsonb[],jsonb,uuid),workout_target_valid(jsonb,text,jsonb,boolean);
    ALTER TABLE exercise_sets DROP CONSTRAINT exercise_sets_workout_exercise_id_business_id_fkey;
    DROP TRIGGER exercise_sets_links ON exercise_sets;
    CREATE OR REPLACE FUNCTION client_log_links_valid() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_TABLE_NAME='workout_logs' THEN
        IF NEW.schedule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM workout_schedules WHERE id=NEW.schedule_id AND workout_id=NEW.workout_id AND business_id=NEW.business_id AND client_id=NEW.client_id) THEN
          RAISE foreign_key_violation USING CONSTRAINT='workout_logs_schedule_workout',MESSAGE='schedule and workout do not match';
        END IF;
      ELSE
        IF NEW.nutrition_schedule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM nutrition_schedules WHERE id=NEW.nutrition_schedule_id AND nutrition_preset_id=NEW.nutrition_preset_id AND business_id=NEW.business_id AND client_id=NEW.client_id) THEN
          RAISE foreign_key_violation USING CONSTRAINT='nutrition_logs_schedule_preset',MESSAGE='schedule and preset do not match';
        END IF;
      END IF;
      RETURN NEW;
    END $$;
    ALTER TABLE exercise_groups RENAME TO legacy_exercise_groups;
    ALTER TABLE workout_exercises RENAME TO legacy_workout_entries;
    ALTER TABLE workouts ADD COLUMN groups jsonb NOT NULL DEFAULT '[]',
      ADD COLUMN video_id uuid REFERENCES attachments ON DELETE RESTRICT;
    UPDATE workouts workout SET groups=COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',group_row.id,'name',group_row.name,'rounds',group_row.rounds,
        'exercises',COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id',entry.id,'exercise_id',entry.exercise_id,'targets_mode',entry.targets_mode,
            'side_mode',CASE WHEN COALESCE((entry.exercise_snapshot->>'unilateral')::boolean,exercise.unilateral,false) THEN 'per_side' ELSE 'combined' END,
            'targets',(
              SELECT jsonb_agg(entry.targets[target_index.i] || jsonb_build_object('rest',
                CASE entry.rest[target_index.i]->>'mode'
                  WHEN 'exact' THEN jsonb_build_object('mode','exact','value_s',entry.rest[target_index.i]->'value')
                  WHEN 'range' THEN jsonb_build_object('mode','range','min_s',entry.rest[target_index.i]->'min','max_s',entry.rest[target_index.i]->'max')
                  ELSE '{"mode":"none"}'::jsonb
                END) ORDER BY target_index.i)
              FROM generate_subscripts(entry.targets,1) AS target_index(i)
            )
          ) ORDER BY entry.position,entry.id)
          FROM legacy_workout_entries entry JOIN exercises exercise ON exercise.id=entry.exercise_id
          WHERE entry.exercise_group_id=group_row.id
        ),'[]'::jsonb)
      ) ORDER BY group_row.position,group_row.id)
      FROM legacy_exercise_groups group_row WHERE group_row.workout_id=workout.id
    ),'[]'::jsonb);
    DO $$ DECLARE row workouts; asset uuid; BEGIN
      FOR row IN SELECT * FROM workouts WHERE video IS NOT NULL LOOP
        asset=gen_random_uuid();
        INSERT INTO attachments(id,business_id,source,external_url,uploaded_by_type,inserted_at,updated_at)
          VALUES(asset,row.business_id,'external_link',row.video,'system',row.inserted_at,row.updated_at);
        UPDATE workouts SET video_id=asset WHERE id=row.id;
      END LOOP;
    END $$;
    ALTER TABLE workouts ADD CONSTRAINT workouts_content_valid CHECK(jsonb_typeof(groups)='array'
      AND ((type='video')=(video_id IS NOT NULL)) AND (type='prescribed' OR groups='[]'::jsonb));
    CREATE TABLE workout_exercises (
      business_id uuid NOT NULL,workout_id uuid NOT NULL,
      exercise_id uuid NOT NULL REFERENCES exercises ON DELETE RESTRICT,
      CONSTRAINT workout_exercise_references_pkey PRIMARY KEY(workout_id,exercise_id),
      FOREIGN KEY(workout_id,business_id) REFERENCES workouts(id,business_id) ON DELETE CASCADE
    );
    CREATE INDEX workout_exercises_business_exercise ON workout_exercises(business_id,exercise_id,workout_id);
    CREATE FUNCTION workout_exercise_reference_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT EXISTS(SELECT 1 FROM exercises WHERE id=NEW.exercise_id AND (business_id IS NULL OR business_id=NEW.business_id)) THEN
        RAISE foreign_key_violation USING CONSTRAINT='workout_exercises_exercise_tenant',MESSAGE='exercise belongs to another business';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER workout_exercise_references_tenant BEFORE INSERT OR UPDATE ON workout_exercises FOR EACH ROW EXECUTE FUNCTION workout_exercise_reference_tenant();
    INSERT INTO workout_exercises(business_id,workout_id,exercise_id)
      SELECT DISTINCT group_row.business_id,group_row.workout_id,entry.exercise_id
      FROM legacy_exercise_groups group_row JOIN legacy_workout_entries entry ON entry.exercise_group_id=group_row.id;
    CREATE FUNCTION workout_schedule_has_weekday(from_date date,until_date date,mask int) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
      SELECT EXISTS(
        SELECT 1 FROM generate_series(0,LEAST(COALESCE(until_date,from_date+6),from_date+6)-from_date) AS days(day_offset)
        WHERE (mask & (1 << (extract(isodow FROM from_date+day_offset)::integer-1)))<>0
      )
    $$;
    DO $$ DECLARE ids text; BEGIN
      SELECT string_agg(id::text, ', ' ORDER BY id) INTO ids FROM workout_schedules
        WHERE NOT workout_schedule_has_weekday(from_date,until_date,weekdays_mask);
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'workout schedules without a matching weekday: %', ids; END IF;
      SELECT string_agg(id::text, ', ' ORDER BY id) INTO ids FROM workout_schedules
        WHERE meeting_url IS NOT NULL AND meeting_url !~ '^https?://[^/[:space:]]+';
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'workout schedules with invalid meeting URLs: %', ids; END IF;
    END $$;
    ALTER TABLE workout_schedules
      ADD CONSTRAINT workout_schedules_matching_weekday CHECK(workout_schedule_has_weekday(from_date,until_date,weekdays_mask)),
      ADD CONSTRAINT workout_schedules_meeting_url_valid CHECK(meeting_url IS NULL OR meeting_url ~ '^https?://[^/[:space:]]+');
    """)
  end

  @spec down() :: no_return()
  def down, do: raise("Workout content conversion is irreversible")

  defp statements(sql) do
    ~r/(?:\$\$.*?\$\$|[^;])+;?/s
    |> Regex.scan(sql)
    |> Enum.map(fn [statement] -> String.trim(statement) end)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end
end
