defmodule Easy.Repo.Migrations.WorkoutIntegrity do
  use Ecto.Migration

  def up do
    statements("""
    CREATE FUNCTION workout_tags_valid(tags text[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
      SELECT cardinality(tags)=(SELECT count(DISTINCT tag) FROM unnest(tags) tag WHERE tag IS NOT NULL AND btrim(tag)<>'')
    $$;
    ALTER TABLE exercises ADD CONSTRAINT exercises_tags CHECK(workout_tags_valid(goals) AND workout_tags_valid(places) AND workout_tags_valid(metrics) AND workout_tags_valid(grade_scale) AND workout_tags_valid(equipment) AND workout_tags_valid(muscles) AND (NOT 'grade'=ANY(metrics) OR cardinality(grade_scale)>0));
    ALTER TABLE workouts ADD CONSTRAINT workouts_video CHECK((type='video' AND video IS NOT NULL AND video ~ '^https?://[^[:space:]]+$') OR (type<>'video' AND video IS NULL));
    CREATE FUNCTION workout_target_valid(target jsonb, metric text, snapshot jsonb, rest boolean) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE value jsonb; n numeric; lo numeric; hi numeric;
    BEGIN
      IF target IS NULL THEN RETURN rest; END IF;
      IF jsonb_typeof(target) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
      IF target->>'mode'='max' THEN RETURN NOT rest AND metric NOT IN ('result','grade','tempo') AND target='{"mode":"max"}'::jsonb; END IF;
      IF target->>'mode'='exact' THEN
        IF (target-'mode'-'value')<>'{}' OR NOT target ? 'value' THEN RETURN false; END IF;
        value=target->'value';
        IF metric='result' THEN RETURN NOT rest AND value IN ('"win"','"draw"','"loss"'); END IF;
        IF metric='grade' THEN RETURN NOT rest AND jsonb_typeof(value)='string' AND snapshot->'grade_scale' ? (target->>'value'); END IF;
        IF metric='tempo' THEN RETURN NOT rest AND jsonb_typeof(value)='string' AND length(target->>'value') BETWEEN 1 AND 100; END IF;
        IF jsonb_typeof(value) IS DISTINCT FROM 'number' THEN RETURN false; END IF;
        lo=(value::text)::numeric;hi=lo;
      ELSIF target->>'mode'='range' THEN
        IF (target-'mode'-'min'-'max')<>'{}' OR jsonb_typeof(target->'min') IS DISTINCT FROM 'number' OR jsonb_typeof(target->'max') IS DISTINCT FROM 'number' OR metric IN ('result','grade','tempo') THEN RETURN false; END IF;
        lo=(target->>'min')::numeric;hi=(target->>'max')::numeric;
      ELSE RETURN false;
      END IF;
      IF lo>hi OR lo<=-1e15 OR hi>=1e15 THEN RETURN false; END IF;
      IF metric IN ('reps','level','cadence','heart_rate','successes','attempts') AND (lo<>trunc(lo) OR hi<>trunc(hi)) THEN RETURN false; END IF;
      IF metric IN ('reps','duration','distance','elevation_gain','height','calories','speed','level','power','cadence','heart_rate','successes','attempts') AND lo<0 THEN RETURN false; END IF;
      IF metric='level' AND lo<1 THEN RETURN false; END IF;
      IF metric='effort' AND (lo<1 OR hi>10) THEN RETURN false; END IF;
      IF metric='reserve' AND (lo<0 OR hi>10) THEN RETURN false; END IF;
      RETURN true;
    END $$;
    CREATE FUNCTION workout_targets_valid(targets jsonb[], rest jsonb[], snapshot jsonb, exercise uuid) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE round jsonb; entry record;
    BEGIN
      IF snapshot->>'id' IS DISTINCT FROM exercise::text OR jsonb_typeof(snapshot->'metrics') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      FOREACH round IN ARRAY targets LOOP
        IF jsonb_typeof(round) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
        FOR entry IN SELECT * FROM jsonb_each(round) LOOP
          IF NOT snapshot->'metrics' ? entry.key OR NOT workout_target_valid(entry.value,entry.key,snapshot,false) THEN RETURN false; END IF;
        END LOOP;
      END LOOP;
      FOREACH round IN ARRAY rest LOOP
        IF NOT workout_target_valid(round,'duration',snapshot,true) THEN RETURN false; END IF;
      END LOOP;
      RETURN true;
    END $$;
    ALTER TABLE workout_exercises ADD CONSTRAINT workout_exercises_targets_valid CHECK(workout_targets_valid(targets,rest,exercise_snapshot,exercise_id));
    """)
  end

  defp statements(sql) do
    ~r/(?:\$\$.*?\$\$|[^;])+;?/s
    |> Regex.scan(sql)
    |> Enum.map(fn [s] -> String.trim(s) end)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end

  def down do
    execute("ALTER TABLE workout_exercises DROP CONSTRAINT workout_exercises_targets_valid")
    execute("ALTER TABLE workouts DROP CONSTRAINT workouts_video")
    execute("ALTER TABLE exercises DROP CONSTRAINT exercises_tags")

    execute(
      "DROP FUNCTION workout_targets_valid(jsonb[],jsonb[],jsonb,uuid),workout_target_valid(jsonb,text,jsonb,boolean),workout_tags_valid(text[])"
    )
  end
end
