DO $$ DECLARE content jsonb; BEGIN
  SELECT groups INTO content FROM workouts WHERE id='20000000-0000-0000-0000-000000000006';
  IF content->0->>'id'<>'20000000-0000-0000-0000-000000000008'
    OR content->0->'exercises'->0->>'id'<>'20000000-0000-0000-0000-000000000009'
    OR content->0->'exercises'->0->>'side_mode'<>'per_side' THEN
    RAISE EXCEPTION 'prescription identity or side mode changed';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM legacy_workout_entries entry JOIN exercises exercise ON exercise.id=entry.exercise_id
    WHERE entry.id='20000000-0000-0000-0000-000000000009' AND exercise.unilateral=false
      AND entry.exercise_snapshot->>'unilateral'='true') THEN
    RAISE EXCEPTION 'snapshot/current side-mode disagreement fixture changed';
  END IF;
  IF content->0->'exercises'->0->'targets'->0->'rest' IS DISTINCT FROM '{"mode":"exact","value_s":90}'::jsonb
    OR content->0->'exercises'->0->'targets'->1->'rest' IS DISTINCT FROM '{"mode":"none"}'::jsonb
    OR content->0->'exercises'->0->'targets'->1->'reps' IS DISTINCT FROM '{"mode":"range","min":3,"max":5}'::jsonb THEN
    RAISE EXCEPTION 'target or rest conversion failed';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM workouts w JOIN attachments a ON a.id=w.video_id
    WHERE w.id='20000000-0000-0000-0000-000000000007' AND a.source='external_link' AND a.external_url='https://example.com/v.mp4') THEN
    RAISE EXCEPTION 'video attachment missing';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM workout_exercises WHERE workout_id='20000000-0000-0000-0000-000000000006' AND exercise_id='20000000-0000-0000-0000-000000000005')
    OR NOT EXISTS(SELECT 1 FROM legacy_exercise_groups WHERE id='20000000-0000-0000-0000-000000000008')
    OR NOT EXISTS(SELECT 1 FROM legacy_workout_entries WHERE id='20000000-0000-0000-0000-000000000009')
    OR NOT EXISTS(SELECT 1 FROM exercise_sets WHERE id='20000000-0000-0000-0000-00000000000b' AND reps=5) THEN
    RAISE EXCEPTION 'membership or retained legacy data missing';
  END IF;
END $$;
