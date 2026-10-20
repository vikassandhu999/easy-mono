defmodule Easy.Repo.Migrations.ExerciseDefinitions do
  use Ecto.Migration

  def up do
    statements("""
    DO $$ DECLARE ids text; BEGIN
      SELECT string_agg(id::text, ', ' ORDER BY id) INTO ids FROM exercises WHERE 'grade'=ANY(metrics);
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'exercises selecting grade: %', ids; END IF;
      SELECT string_agg(id::text, ', ' ORDER BY id) INTO ids FROM exercises WHERE media IS NOT NULL AND media !~ '^https?://[^/[:space:]]+';
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'exercises with invalid media URLs: %', ids; END IF;
      SELECT string_agg(id::text, ', ' ORDER BY id) INTO ids FROM exercises WHERE business_id IS NULL AND media IS NOT NULL;
      IF ids IS NOT NULL THEN RAISE EXCEPTION 'built-in exercises with media: %', ids; END IF;
    END $$;
    ALTER TABLE attachments ADD COLUMN source text NOT NULL DEFAULT 'upload', ADD COLUMN external_url text,
      ALTER COLUMN client_id DROP NOT NULL, ALTER COLUMN storage_key DROP NOT NULL,
      ALTER COLUMN content_type DROP NOT NULL, ALTER COLUMN byte_size DROP NOT NULL,
      ALTER COLUMN uploaded_by_id DROP NOT NULL;
    ALTER TABLE attachments ADD CONSTRAINT attachments_source_valid CHECK (((source='upload' AND storage_key IS NOT NULL
      AND content_type IS NOT NULL AND byte_size>0 AND external_url IS NULL)
      OR (source='external_link' AND storage_key IS NULL AND external_url ~ '^https?://[^/[:space:]]+')) IS TRUE);
    ALTER TABLE exercises DROP CONSTRAINT exercises_taxonomy, DROP CONSTRAINT exercises_tags;
    CREATE FUNCTION exercise_metric_entries(keys text[], label text) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
      SELECT COALESCE(jsonb_agg(jsonb_build_object('key', key, 'label', CASE
        WHEN label IS NULL THEN NULL WHEN key='reps' THEN label
        WHEN key='successes' THEN label || ' · Successes'
        WHEN key='attempts' THEN label || ' · Attempts' ELSE NULL END) ORDER BY n), '[]'::jsonb)
      FROM unnest(keys) WITH ORDINALITY AS entries(key,n)
    $$;
    ALTER TABLE exercises ADD COLUMN instructions text, ADD COLUMN archived_at timestamptz,
      ALTER COLUMN metrics TYPE jsonb USING exercise_metric_entries(metrics,NULLIF(btrim(count_label),'')),
      ALTER COLUMN equipment DROP DEFAULT, ALTER COLUMN equipment DROP NOT NULL;
    ALTER TABLE exercises ALTER COLUMN equipment TYPE text USING NULLIF(btrim(array_to_string(equipment, ', ')), '');
    UPDATE exercises SET muscles=ARRAY(SELECT btrim(name) FROM unnest(muscles) WITH ORDINALITY AS muscle(name,position) GROUP BY btrim(name) ORDER BY min(position));
    ALTER TABLE exercises ALTER COLUMN metrics SET DEFAULT '[]'::jsonb;
    DROP FUNCTION exercise_metric_entries(text[],text);
    CREATE FUNCTION exercise_metrics_valid(metrics jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE item jsonb; keys text[] := '{}'; key text;
    BEGIN
      IF jsonb_typeof(metrics) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      FOR item IN SELECT value FROM jsonb_array_elements(metrics) LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
        key=item->>'key';
        IF jsonb_typeof(item->'key') IS DISTINCT FROM 'string' OR key IS NULL OR key=ANY(keys)
          OR key NOT IN ('reps','weight','duration','distance','elevation_gain','height','calories','speed','incline','level','power','cadence','heart_rate','effort','reserve','successes','attempts','score','result','tempo')
          OR item-'key'-'label'<>'{}'::jsonb OR NOT item ? 'label' THEN RETURN false; END IF;
        IF item->'label'<>'null'::jsonb AND (jsonb_typeof(item->'label') IS DISTINCT FROM 'string'
          OR btrim(item->>'label')='' OR btrim(item->>'label')<>item->>'label') THEN RETURN false; END IF;
        keys=array_append(keys,key);
      END LOOP;
      RETURN true;
    END $$;
    CREATE FUNCTION exercise_names_valid(names text[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
      SELECT workout_tags_valid(names) AND NOT EXISTS(SELECT 1 FROM unnest(names) name WHERE name<>btrim(name))
        AND (cardinality(names)=0 OR (array_ndims(names)=1 AND array_lower(names,1)=1))
    $$;
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_name_valid CHECK (name=btrim(name) AND char_length(name) BETWEEN 1 AND 200),
      ADD CONSTRAINT exercises_instructions_valid CHECK (instructions IS NULL OR (instructions=btrim(instructions) AND instructions<>'')),
      ADD CONSTRAINT exercises_kind_valid CHECK (kind IN ('movement','activity','sport','practice')),
      ADD CONSTRAINT exercises_goals_valid CHECK (exercise_names_valid(goals) AND goals <@ ARRAY['strength','endurance','power','mobility','balance','skill','recovery']),
      ADD CONSTRAINT exercises_places_valid CHECK (exercise_names_valid(places) AND places <@ ARRAY['gym','home','outdoor','pool','court/field','studio']),
      ADD CONSTRAINT exercises_metrics_valid CHECK (exercise_metrics_valid(metrics)),
      ADD CONSTRAINT exercises_equipment_valid CHECK (equipment IS NULL OR (equipment=btrim(equipment) AND equipment<>'')),
      ADD CONSTRAINT exercises_muscles_valid CHECK (exercise_names_valid(muscles));
    CREATE TABLE exercise_media (
      id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
      exercise_id uuid NOT NULL REFERENCES exercises ON DELETE CASCADE,
      attachment_id uuid NOT NULL REFERENCES attachments ON DELETE RESTRICT,
      caption text CHECK(caption IS NULL OR btrim(caption)<>''), position int NOT NULL CHECK(position>=0),
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      CONSTRAINT exercise_media_position UNIQUE(exercise_id,position) DEFERRABLE INITIALLY IMMEDIATE
    );
    CREATE INDEX exercise_media_business_parent ON exercise_media(business_id,exercise_id);
    DO $$ DECLARE row exercises; asset uuid; BEGIN
      FOR row IN SELECT * FROM exercises WHERE media IS NOT NULL LOOP
        asset=gen_random_uuid();
        INSERT INTO attachments(id,business_id,source,external_url,uploaded_by_type,inserted_at,updated_at)
          VALUES(asset,row.business_id,'external_link',row.media,'system',row.inserted_at,row.updated_at);
        INSERT INTO exercise_media(id,business_id,exercise_id,attachment_id,position,inserted_at,updated_at)
          VALUES(gen_random_uuid(),row.business_id,row.id,asset,0,row.inserted_at,row.updated_at);
      END LOOP;
    END $$;
    """)
  end

  def down, do: raise("Exercise definition conversion is irreversible")

  defp statements(sql) do
    ~r/(?:\$\$.*?\$\$|[^;])+;?/s
    |> Regex.scan(sql)
    |> Enum.map(fn [statement] -> String.trim(statement) end)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end
end
