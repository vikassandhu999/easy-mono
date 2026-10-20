defmodule Easy.Repo.Migrations.ActivityLogging do
  use Ecto.Migration

  def up do
    statements("""
    ALTER TABLE workout_logs ADD COLUMN recorded_kind text,ADD COLUMN coach_id uuid;
    UPDATE workout_logs log SET recorded_kind='client'
      FROM clients client WHERE client.id=log.client_id AND client.business_id=log.business_id AND client.user_id=log.recorded_by;
    UPDATE workout_logs log SET recorded_kind='coach',coach_id=coach.id
      FROM coaches coach WHERE log.recorded_kind IS NULL AND coach.business_id=log.business_id AND coach.user_id=log.recorded_by;
    DO $$ DECLARE ids text; BEGIN
      SELECT string_agg(id::text, ', ' ORDER BY id) INTO ids FROM workout_logs WHERE recorded_kind IS NULL;
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'unresolved workout log recorders: %', ids; END IF;
    END $$;
    ALTER TABLE workout_logs DROP COLUMN recorded_by;
    ALTER TABLE workout_logs RENAME COLUMN recorded_kind TO recorded_by;
    ALTER TABLE workout_logs ALTER COLUMN recorded_by SET NOT NULL,ALTER COLUMN swaps DROP NOT NULL,
      ADD COLUMN effort smallint,DROP COLUMN at_utc,
      DROP CONSTRAINT workout_logs_values,DROP CONSTRAINT workout_logs_difficulty_check,
      ADD CONSTRAINT workout_logs_recorded_by_valid CHECK(recorded_by IN ('client','coach')),
      ADD CONSTRAINT workout_logs_coach_id_business_id_fkey FOREIGN KEY(coach_id,business_id) REFERENCES coaches(id,business_id),
      ADD CONSTRAINT workout_logs_recorder_valid CHECK((recorded_by='client' AND coach_id IS NULL) OR (recorded_by='coach' AND coach_id IS NOT NULL)),
      ADD CONSTRAINT workout_logs_effort_valid CHECK(effort IS NULL OR effort BETWEEN 1 AND 5),
      ADD CONSTRAINT workout_logs_text_length CHECK(text IS NULL OR char_length(text)<=10000),
      ADD CONSTRAINT workout_logs_values CHECK(state IN ('active','completed','discarded')
        AND (schedule_id IS NULL)=(scheduled_date IS NULL) AND (schedule_id IS NULL OR workout_id IS NOT NULL));

    CREATE TABLE exercise_logs (
      id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,workout_log_id uuid NOT NULL,
      exercise_id uuid NOT NULL REFERENCES exercises ON DELETE RESTRICT,workout_exercise_id uuid,
      state text NOT NULL DEFAULT 'active',side_mode text NOT NULL DEFAULT 'combined',rounds integer NOT NULL DEFAULT 1,
      targets_mode text NOT NULL DEFAULT 'same_for_all',targets jsonb NOT NULL,position integer NOT NULL,
      reps integer,weight_kg numeric,duration_s numeric,distance_m numeric,elevation_gain_m numeric,height_cm numeric,calories_kcal numeric,
      avg_speed_m_s numeric,incline_pct numeric,level integer,avg_power_w numeric,avg_cadence_per_min numeric,avg_heart_rate_bpm numeric,
      effort numeric,successes integer,attempts integer,score numeric,result text,entered_units jsonb,
      inserted_at timestamptz NOT NULL,updated_at timestamptz NOT NULL,
      CONSTRAINT exercise_logs_workout_log_business_fkey FOREIGN KEY(workout_log_id,business_id) REFERENCES workout_logs(id,business_id) ON DELETE CASCADE,
      CONSTRAINT exercise_logs_session_position UNIQUE(workout_log_id,position),UNIQUE(id,business_id),
      CONSTRAINT exercise_logs_values CHECK(state IN ('active','completed','skipped') AND side_mode IN ('combined','per_side')
        AND rounds BETWEEN 1 AND 10000 AND targets_mode IN ('same_for_all','per_round') AND position>=0
        AND CASE WHEN jsonb_typeof(targets)='array'
          THEN jsonb_array_length(targets)=CASE targets_mode WHEN 'same_for_all' THEN 1 ELSE rounds END ELSE false END
        AND 0<=ALL(ARRAY[reps,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,avg_speed_m_s,
          avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,successes,attempts])
        AND (level IS NULL OR level>=1) AND (effort IS NULL OR effort BETWEEN 1 AND 10)
        AND (successes IS NULL OR attempts IS NULL OR successes<=attempts)
        AND (result IS NULL OR result IN ('win','draw','loss'))
        AND (entered_units IS NULL OR jsonb_typeof(entered_units)='object')
        AND '-Infinity'::numeric<ALL(ARRAY[weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,
          avg_speed_m_s,incline_pct,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,effort,score])
        AND 'Infinity'::numeric>ALL(ARRAY[weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,
          avg_speed_m_s,incline_pct,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,effort,score])
        AND (state<>'skipped' OR num_nonnulls(reps,weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,
          avg_speed_m_s,incline_pct,level,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,effort,successes,attempts,score,result)=0))
    );
    CREATE INDEX exercise_logs_business_parent ON exercise_logs(business_id,workout_log_id);
    CREATE INDEX exercise_logs_business_exercise ON exercise_logs(business_id,exercise_id);
    CREATE FUNCTION exercise_log_exercise_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT EXISTS(SELECT 1 FROM exercises WHERE id=NEW.exercise_id AND (business_id IS NULL OR business_id=NEW.business_id)) THEN
        RAISE foreign_key_violation USING CONSTRAINT='exercise_logs_exercise_tenant',MESSAGE='exercise belongs to another business';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER exercise_logs_exercise_tenant BEFORE INSERT OR UPDATE ON exercise_logs FOR EACH ROW EXECUTE FUNCTION exercise_log_exercise_tenant();

    ALTER TABLE exercise_sets ADD COLUMN exercise_log_id uuid,ADD COLUMN state text,
      ADD COLUMN avg_speed_m_s numeric,ADD COLUMN avg_power_w numeric,
      ADD COLUMN avg_cadence_per_min numeric,ADD COLUMN avg_heart_rate_bpm numeric,
      ALTER COLUMN duration_s TYPE numeric,ALTER COLUMN exercise_snapshot DROP NOT NULL,
      ALTER COLUMN entered_units DROP NOT NULL,ALTER COLUMN entered_units DROP DEFAULT;

    DO $$ DECLARE ids text; BEGIN
      SELECT string_agg(workout_log_id::text || '/' || COALESCE(workout_exercise_id::text,'added') || '/' || exercise_id::text, ', ' ORDER BY workout_log_id,workout_exercise_id,exercise_id)
        INTO ids FROM (
          SELECT workout_log_id,workout_exercise_id,exercise_id FROM exercise_sets
          GROUP BY workout_log_id,workout_exercise_id,exercise_id HAVING bool_or(side IS NULL) AND bool_or(side IS NOT NULL)
        ) mixed;
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'legacy activity groups mixing sided and unsided sets: %', ids; END IF;
      SELECT string_agg(workout_log_id::text || '/' || workout_exercise_id::text, ', ' ORDER BY workout_log_id,workout_exercise_id)
        INTO ids FROM (
          SELECT workout_log_id,workout_exercise_id FROM exercise_sets WHERE workout_exercise_id IS NOT NULL
          GROUP BY workout_log_id,workout_exercise_id HAVING bool_or(side IS NULL) AND bool_or(side IS NOT NULL)
        ) mixed;
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'legacy prescribed entries with inconsistent side modes: %', ids; END IF;
    END $$;

    CREATE TEMP TABLE migration_workout_entries ON COMMIT DROP AS
      SELECT workout.id AS workout_id,(entry.content->>'id')::uuid AS workout_exercise_id,
        (entry.content->>'exercise_id')::uuid AS exercise_id,(group_row.content->>'rounds')::integer AS rounds,
        entry.content->>'side_mode' AS side_mode,entry.content->>'targets_mode' AS targets_mode,
        entry.content->'targets' AS targets,group_row.position AS group_position,entry.position AS entry_position
      FROM workouts workout
      CROSS JOIN LATERAL jsonb_array_elements(workout.groups) WITH ORDINALITY AS group_row(content,position)
      CROSS JOIN LATERAL jsonb_array_elements(group_row.content->'exercises') WITH ORDINALITY AS entry(content,position);
    DO $$ DECLARE ids text; BEGIN
      SELECT string_agg(set_row.id::text, ', ' ORDER BY set_row.id) INTO ids
        FROM exercise_sets set_row JOIN workout_logs log ON log.id=set_row.workout_log_id
        WHERE set_row.workout_exercise_id IS NOT NULL AND NOT EXISTS(
          SELECT 1 FROM migration_workout_entries entry
          WHERE entry.workout_id=log.workout_id AND entry.workout_exercise_id=set_row.workout_exercise_id);
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'legacy sets with unresolved prescribed entries: %', ids; END IF;
      SELECT string_agg(log.id::text || '/' || swap.entry_id, ', ' ORDER BY log.id,swap.entry_id) INTO ids
        FROM workout_logs log CROSS JOIN LATERAL jsonb_each(log.swaps) AS swap(entry_id,selection)
        WHERE NOT EXISTS(SELECT 1 FROM migration_workout_entries entry
          WHERE entry.workout_id=log.workout_id AND entry.workout_exercise_id::text=swap.entry_id);
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'legacy swaps with unresolved prescribed entries: %', ids; END IF;
    END $$;
    CREATE TEMP TABLE migration_set_occurrences ON COMMIT DROP AS
      SELECT id,row_number() OVER(PARTITION BY workout_log_id,exercise_id,round,COALESCE(side,'') ORDER BY inserted_at,id) AS occurrence
        FROM exercise_sets WHERE workout_exercise_id IS NULL
      UNION ALL SELECT id,1::bigint FROM exercise_sets WHERE workout_exercise_id IS NOT NULL;
    CREATE TEMP TABLE migration_exercise_activities ON COMMIT DROP AS
      SELECT gen_random_uuid() AS id,log.business_id,set_row.workout_log_id,set_row.workout_exercise_id,set_row.exercise_id,
        CASE WHEN bool_or(set_row.side IS NOT NULL) THEN 'per_side' ELSE 'combined' END AS side_mode,
        GREATEST(COALESCE(entry.rounds,1),max(set_row.round)) AS rounds,
        COALESCE(entry.targets_mode,'same_for_all') AS targets_mode,
        CASE WHEN entry.exercise_id=set_row.exercise_id THEN entry.targets
          ELSE COALESCE((SELECT jsonb_agg(jsonb_build_object('rest',target.content->'rest') ORDER BY target.position)
            FROM jsonb_array_elements(entry.targets) WITH ORDINALITY AS target(content,position)),
            '[{"rest":{"mode":"client_chooses"}}]'::jsonb) END AS targets,
        entry.group_position,entry.entry_position,entry.exercise_id AS prescribed_exercise_id,false AS swap_only,occurrence.occurrence,
        min(set_row.inserted_at) AS inserted_at,max(set_row.updated_at) AS updated_at
      FROM exercise_sets set_row JOIN workout_logs log ON log.id=set_row.workout_log_id
      JOIN migration_set_occurrences occurrence ON occurrence.id=set_row.id
      LEFT JOIN migration_workout_entries entry ON entry.workout_id=log.workout_id AND entry.workout_exercise_id=set_row.workout_exercise_id
      GROUP BY log.business_id,set_row.workout_log_id,set_row.workout_exercise_id,set_row.exercise_id,
        entry.rounds,entry.targets_mode,entry.exercise_id,entry.targets,entry.group_position,entry.entry_position,occurrence.occurrence;
    INSERT INTO migration_exercise_activities
      SELECT gen_random_uuid(),log.business_id,log.id,entry.workout_exercise_id,(swap.selection->>'id')::uuid,
        COALESCE((SELECT max(activity.side_mode) FROM migration_exercise_activities activity
          WHERE activity.workout_log_id=log.id AND activity.workout_exercise_id=entry.workout_exercise_id),entry.side_mode),
        GREATEST(entry.rounds,COALESCE((SELECT max(activity.rounds) FROM migration_exercise_activities activity
          WHERE activity.workout_log_id=log.id AND activity.workout_exercise_id=entry.workout_exercise_id),entry.rounds)),
        entry.targets_mode,
        (SELECT jsonb_agg(jsonb_build_object('rest',target.content->'rest') ORDER BY target.position)
          FROM jsonb_array_elements(entry.targets) WITH ORDINALITY AS target(content,position)),
        entry.group_position,entry.entry_position,entry.exercise_id,true,1::bigint,log.inserted_at,log.updated_at
      FROM workout_logs log CROSS JOIN LATERAL jsonb_each(log.swaps) AS swap(entry_id,selection)
      JOIN migration_workout_entries entry ON entry.workout_id=log.workout_id AND entry.workout_exercise_id::text=swap.entry_id
      WHERE NOT EXISTS(SELECT 1 FROM exercise_sets set_row WHERE set_row.workout_log_id=log.id
        AND set_row.workout_exercise_id=entry.workout_exercise_id AND set_row.exercise_id::text=swap.selection->>'id');
    UPDATE migration_exercise_activities activity SET targets=activity.targets || (
      SELECT jsonb_agg('{"rest":{"mode":"client_chooses"}}'::jsonb)
      FROM generate_series(jsonb_array_length(activity.targets)+1,activity.rounds)
    ) WHERE activity.targets_mode='per_round' AND jsonb_array_length(activity.targets)<activity.rounds;
    INSERT INTO exercise_logs(id,business_id,workout_log_id,workout_exercise_id,exercise_id,side_mode,rounds,
      targets_mode,targets,position,inserted_at,updated_at)
      SELECT id,business_id,workout_log_id,workout_exercise_id,exercise_id,side_mode,rounds,targets_mode,targets,
        (row_number() OVER(PARTITION BY workout_log_id ORDER BY (workout_exercise_id IS NULL),group_position,entry_position,
          CASE WHEN swap_only THEN 2 WHEN exercise_id=prescribed_exercise_id THEN 0 ELSE 1 END,inserted_at,exercise_id,occurrence)-1)::integer,
        inserted_at,updated_at FROM migration_exercise_activities;
    UPDATE exercise_sets set_row SET exercise_log_id=activity.id,state='completed'
      FROM migration_exercise_activities activity,migration_set_occurrences occurrence
      WHERE NOT activity.swap_only AND occurrence.id=set_row.id AND occurrence.occurrence=activity.occurrence
        AND set_row.workout_log_id=activity.workout_log_id AND set_row.exercise_id=activity.exercise_id
        AND set_row.workout_exercise_id IS NOT DISTINCT FROM activity.workout_exercise_id;

    ALTER TABLE exercise_sets ALTER COLUMN exercise_log_id SET NOT NULL,ALTER COLUMN state SET NOT NULL,
      ADD CONSTRAINT exercise_sets_activity_business_fkey FOREIGN KEY(exercise_log_id,business_id) REFERENCES exercise_logs(id,business_id) ON DELETE CASCADE,
      ADD CONSTRAINT exercise_sets_outcome_values CHECK(state IN ('completed','skipped') AND (state='completed'
        OR num_nonnulls(reps,weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,avg_speed_m_s,
          incline_pct,level,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,effort,reserve,successes,attempts,score,result,
          speed_m_s,power_w,cadence_rpm,heart_rate_bpm,grade)=0)),
      DROP CONSTRAINT exercise_sets_values,
      ADD CONSTRAINT exercise_sets_values CHECK(round BETWEEN 1 AND 10000
        AND 0<=ALL(ARRAY[reps,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,avg_speed_m_s,
          avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,successes,attempts,speed_m_s,power_w,cadence_rpm,heart_rate_bpm])
        AND (level IS NULL OR level>=1) AND (effort IS NULL OR effort BETWEEN 1 AND 10)
        AND (reserve IS NULL OR reserve BETWEEN 0 AND 10)
        AND (successes IS NULL OR attempts IS NULL OR successes<=attempts)
        AND (entered_units IS NULL OR jsonb_typeof(entered_units)='object')
        AND '-Infinity'::numeric<ALL(ARRAY[weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,
          avg_speed_m_s,incline_pct,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,effort,reserve,score,speed_m_s,power_w])
        AND 'Infinity'::numeric>ALL(ARRAY[weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,
          avg_speed_m_s,incline_pct,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,effort,reserve,score,speed_m_s,power_w]));
    CREATE FUNCTION exercise_set_inherit() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE parent exercise_logs;
    BEGIN
      SELECT * INTO parent FROM exercise_logs WHERE id=NEW.exercise_log_id AND business_id=NEW.business_id;
      IF NOT FOUND THEN
        RAISE foreign_key_violation USING CONSTRAINT='exercise_sets_activity_business_fkey',MESSAGE='activity belongs to another business or does not exist';
      END IF;
      NEW.workout_log_id=parent.workout_log_id;
      NEW.workout_exercise_id=parent.workout_exercise_id;
      NEW.exercise_id=parent.exercise_id;
      IF (parent.side_mode='combined' AND NEW.side IS NOT NULL)
        OR (parent.side_mode='per_side' AND (NEW.side IS NULL OR NEW.side NOT IN ('left','right'))) THEN
        RAISE check_violation USING CONSTRAINT='exercise_sets_side_valid',MESSAGE='set side must match its activity';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER exercise_sets_inherit BEFORE INSERT OR UPDATE ON exercise_sets FOR EACH ROW EXECUTE FUNCTION exercise_set_inherit();
    DROP INDEX exercise_sets_prescribed_round;
    CREATE UNIQUE INDEX exercise_sets_prescribed_slot ON exercise_sets(workout_log_id,workout_exercise_id,round,COALESCE(side,'')) WHERE workout_exercise_id IS NOT NULL;
    CREATE UNIQUE INDEX exercise_sets_activity_round_side ON exercise_sets(exercise_log_id,round,COALESCE(side,'')) WHERE workout_exercise_id IS NULL;
    CREATE FUNCTION exercise_log_source_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.workout_log_id IS DISTINCT FROM OLD.workout_log_id OR NEW.workout_exercise_id IS DISTINCT FROM OLD.workout_exercise_id THEN
        RAISE check_violation USING CONSTRAINT='exercise_logs_source_immutable',MESSAGE='activity session and prescribed entry cannot change';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER exercise_logs_source_immutable BEFORE UPDATE ON exercise_logs FOR EACH ROW EXECUTE FUNCTION exercise_log_source_immutable();
    """)
  end

  def down, do: raise("Activity logging conversion is irreversible")

  defp statements(sql) do
    ~r/(?:\$\$.*?\$\$|[^;])+;?/s
    |> Regex.scan(sql)
    |> Enum.map(fn [statement] -> String.trim(statement) end)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end
end
