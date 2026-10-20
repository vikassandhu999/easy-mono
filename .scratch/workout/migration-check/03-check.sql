DO $$
DECLARE
  original_id uuid;
  replacement_id uuid;
  added_id uuid;
  second_added_id uuid;
  swap_only_id uuid;
  expected jsonb;
  actual jsonb;
  prescribed_targets jsonb := '[{"reps":{"mode":"exact","value":5},"rest":{"mode":"exact","value_s":90}},{"reps":{"mode":"range","min":3,"max":5},"rest":{"mode":"none"}},{"weight":{"mode":"exact","value":60},"rest":{"mode":"range","min_s":60,"max_s":120}}]';
  replacement_targets jsonb := '[{"rest":{"mode":"exact","value_s":90}},{"rest":{"mode":"none"}},{"rest":{"mode":"range","min_s":60,"max_s":120}}]';
BEGIN
  SELECT id INTO original_id FROM exercise_logs
    WHERE workout_log_id='30000000-0000-0000-0000-000000000010' AND position=0;
  SELECT id INTO replacement_id FROM exercise_logs
    WHERE workout_log_id='30000000-0000-0000-0000-000000000010' AND position=1;
  SELECT id INTO added_id FROM exercise_logs
    WHERE workout_log_id='30000000-0000-0000-0000-000000000010' AND position=2;
  SELECT id INTO second_added_id FROM exercise_logs
    WHERE workout_log_id='30000000-0000-0000-0000-000000000010' AND position=3;
  SELECT id INTO swap_only_id FROM exercise_logs
    WHERE workout_log_id='30000000-0000-0000-0000-000000000011' AND position=0;

  IF (SELECT count(*) FROM exercise_logs WHERE workout_log_id='30000000-0000-0000-0000-000000000010')<>4
    OR NOT EXISTS(SELECT 1 FROM exercise_logs WHERE id=original_id
      AND exercise_id='30000000-0000-0000-0000-000000000006'
      AND workout_exercise_id='30000000-0000-0000-0000-00000000000b'
      AND rounds=3 AND side_mode='combined' AND targets_mode='per_round' AND targets=prescribed_targets)
    OR NOT EXISTS(SELECT 1 FROM exercise_logs WHERE id=replacement_id
      AND exercise_id='30000000-0000-0000-0000-000000000007'
      AND workout_exercise_id='30000000-0000-0000-0000-00000000000b'
      AND rounds=3 AND side_mode='combined' AND targets_mode='per_round' AND targets=replacement_targets)
    OR NOT EXISTS(SELECT 1 FROM exercise_logs WHERE id=added_id
      AND exercise_id='30000000-0000-0000-0000-000000000008' AND workout_exercise_id IS NULL
      AND rounds=1 AND side_mode='combined' AND targets_mode='same_for_all'
      AND targets='[{"rest":{"mode":"client_chooses"}}]'::jsonb)
    OR NOT EXISTS(SELECT 1 FROM exercise_logs WHERE id=second_added_id
      AND exercise_id='30000000-0000-0000-0000-000000000008' AND workout_exercise_id IS NULL
      AND rounds=1 AND side_mode='combined' AND targets_mode='same_for_all'
      AND targets='[{"rest":{"mode":"client_chooses"}}]'::jsonb)
    OR added_id=second_added_id THEN
    RAISE EXCEPTION 'L1 activity order, references, or instructions changed';
  END IF;

  IF (SELECT count(*) FROM exercise_logs WHERE workout_log_id='30000000-0000-0000-0000-000000000011')<>1
    OR NOT EXISTS(SELECT 1 FROM exercise_logs WHERE id=swap_only_id
      AND exercise_id='30000000-0000-0000-0000-000000000007'
      AND workout_exercise_id='30000000-0000-0000-0000-00000000000b'
      AND rounds=3 AND side_mode='combined' AND targets_mode='per_round' AND targets=replacement_targets)
    OR EXISTS(SELECT 1 FROM exercise_sets WHERE exercise_log_id=swap_only_id)
    OR EXISTS(SELECT 1 FROM exercise_logs WHERE workout_log_id='30000000-0000-0000-0000-000000000012') THEN
    RAISE EXCEPTION 'swap-only or untouched log activity conversion failed';
  END IF;

  IF EXISTS(SELECT 1 FROM exercise_logs WHERE workout_log_id IN (
      '30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000011')
    AND (business_id<>'30000000-0000-0000-0000-000000000003' OR state<>'active'
      OR num_nonnulls(reps,weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,
        avg_speed_m_s,incline_pct,level,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,
        effort,successes,attempts,score,result)<>0)) THEN
    RAISE EXCEPTION 'conversion invented an activity outcome or overall result';
  END IF;

  IF (SELECT count(*) FROM exercise_sets WHERE workout_log_id='30000000-0000-0000-0000-000000000010')<>5
    OR EXISTS(SELECT 1 FROM exercise_sets WHERE workout_log_id='30000000-0000-0000-0000-000000000010'
      AND (state<>'completed' OR business_id<>'30000000-0000-0000-0000-000000000003'
        OR num_nonnulls(avg_speed_m_s,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm)<>0))
    OR NOT EXISTS(SELECT 1 FROM exercise_sets WHERE id='30000000-0000-0000-0000-000000000020' AND exercise_log_id=original_id)
    OR NOT EXISTS(SELECT 1 FROM exercise_sets WHERE id='30000000-0000-0000-0000-000000000021' AND exercise_log_id=original_id)
    OR NOT EXISTS(SELECT 1 FROM exercise_sets WHERE id='30000000-0000-0000-0000-000000000022' AND exercise_log_id=replacement_id)
    OR NOT EXISTS(SELECT 1 FROM exercise_sets WHERE id='30000000-0000-0000-0000-000000000023' AND exercise_log_id=added_id)
    OR NOT EXISTS(SELECT 1 FROM exercise_sets WHERE id='30000000-0000-0000-0000-000000000024' AND exercise_log_id=second_added_id) THEN
    RAISE EXCEPTION 'set identity, ownership, state, or activity assignment changed';
  END IF;

  FOR expected IN SELECT value FROM jsonb_array_elements('[
    {"id":"30000000-0000-0000-0000-000000000020","workout_exercise_id":"30000000-0000-0000-0000-00000000000b","exercise_id":"30000000-0000-0000-0000-000000000006","round":1,"reps":5,"weight_kg":-2.5,"duration_s":45,"distance_m":100.25,"elevation_gain_m":2.5,"height_cm":30.5,"calories_kcal":12.25,"speed_m_s":3.75,"incline_pct":-1.5,"level":2,"power_w":120.5,"cadence_rpm":83,"heart_rate_bpm":142,"effort":7.5,"reserve":1.25,"successes":2,"attempts":3,"score":-2.25,"result":"win","grade":"V2","entered_units":{"weight":"lb","duration":"s","distance":"km","speed":"km/h","power":"W","cadence":"rpm","heart_rate":"bpm","effort":"RPE","reserve":"RIR"},"exercise_snapshot":{"id":"30000000-0000-0000-0000-000000000006","metrics":["reps","weight","duration","distance","elevation_gain","height","calories","speed","incline","level","power","cadence","heart_rate","effort","reserve","successes","attempts","score","result","grade"],"unilateral":false}},
    {"id":"30000000-0000-0000-0000-000000000021","workout_exercise_id":"30000000-0000-0000-0000-00000000000b","exercise_id":"30000000-0000-0000-0000-000000000006","round":2,"reps":4,"weight_kg":60,"entered_units":{},"exercise_snapshot":{"id":"30000000-0000-0000-0000-000000000006","metrics":["reps","weight"],"unilateral":false}},
    {"id":"30000000-0000-0000-0000-000000000022","workout_exercise_id":"30000000-0000-0000-0000-00000000000b","exercise_id":"30000000-0000-0000-0000-000000000007","round":3,"reps":8,"weight_kg":20,"entered_units":{"weight":"kg"},"exercise_snapshot":{"id":"30000000-0000-0000-0000-000000000007","metrics":["reps","weight"],"unilateral":false}},
    {"id":"30000000-0000-0000-0000-000000000023","exercise_id":"30000000-0000-0000-0000-000000000008","round":1,"duration_s":30,"entered_units":{"duration":"s"},"exercise_snapshot":{"id":"30000000-0000-0000-0000-000000000008","metrics":["duration"],"unilateral":false}},
    {"id":"30000000-0000-0000-0000-000000000024","exercise_id":"30000000-0000-0000-0000-000000000008","round":1,"duration_s":40,"entered_units":{"duration":"s"},"exercise_snapshot":{"id":"30000000-0000-0000-0000-000000000008","metrics":["duration"],"unilateral":false}}
  ]'::jsonb) LOOP
    SELECT jsonb_strip_nulls(to_jsonb(set_row)-ARRAY[
      'business_id','workout_log_id','inserted_at','updated_at','exercise_log_id','state',
      'avg_speed_m_s','avg_power_w','avg_cadence_per_min','avg_heart_rate_bpm'])
      INTO actual FROM exercise_sets set_row WHERE id::text=expected->>'id';
    IF actual IS DISTINCT FROM expected THEN
      RAISE EXCEPTION 'legacy set values changed for %: %', expected->>'id', actual;
    END IF;
  END LOOP;

  IF EXISTS(SELECT 1 FROM (VALUES
      ('30000000-0000-0000-0000-000000000020'::uuid,'2026-10-01 06:11:00+00'::timestamptz,'2026-10-01 06:11:30+00'::timestamptz),
      ('30000000-0000-0000-0000-000000000021'::uuid,'2026-10-01 06:12:00+00'::timestamptz,'2026-10-01 06:12:30+00'::timestamptz),
      ('30000000-0000-0000-0000-000000000022'::uuid,'2026-10-01 06:13:00+00'::timestamptz,'2026-10-01 06:13:30+00'::timestamptz),
      ('30000000-0000-0000-0000-000000000023'::uuid,'2026-10-01 06:05:00+00'::timestamptz,'2026-10-01 06:05:30+00'::timestamptz),
      ('30000000-0000-0000-0000-000000000024'::uuid,'2026-10-01 06:06:00+00'::timestamptz,'2026-10-01 06:06:30+00'::timestamptz)
    ) expected_set(id,inserted_at,updated_at) JOIN exercise_sets stored USING(id)
    WHERE (stored.inserted_at,stored.updated_at) IS DISTINCT FROM (expected_set.inserted_at,expected_set.updated_at)) THEN
    RAISE EXCEPTION 'legacy set timestamps changed';
  END IF;

  IF (SELECT count(*) FROM workout_logs WHERE id IN (
      '30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000011')
      AND recorded_by='client' AND coach_id IS NULL)<>2
    OR NOT EXISTS(SELECT 1 FROM workout_logs WHERE id='30000000-0000-0000-0000-000000000012'
      AND recorded_by='coach' AND coach_id='30000000-0000-0000-0000-000000000004') THEN
    RAISE EXCEPTION 'client or coach recorder mapping failed';
  END IF;

  FOR expected IN SELECT value FROM jsonb_array_elements('[
    {"id":"30000000-0000-0000-0000-000000000010","state":"completed","date":"2026-10-01","time":"06:10:00","difficulty":"just_right","pain":true,"pain_note":"Left knee, after round two","text":"Kept the original note.\nSecond line.","swaps":{"30000000-0000-0000-0000-00000000000b":{"id":"30000000-0000-0000-0000-000000000007","name":"Goblet squat"}}},
    {"id":"30000000-0000-0000-0000-000000000011","state":"discarded","date":"2026-10-02","difficulty":"too_easy","pain":false,"text":"Swap saved before recording.","swaps":{"30000000-0000-0000-0000-00000000000b":{"id":"30000000-0000-0000-0000-000000000007","name":"Goblet squat"}}},
    {"id":"30000000-0000-0000-0000-000000000012","state":"active","date":"2026-10-03","time":"00:00:00","difficulty":"too_hard","pain":true,"pain_note":"Coach-entered pain context","text":"Coach-entered session note.","swaps":{}}
  ]'::jsonb) LOOP
    SELECT jsonb_strip_nulls(jsonb_build_object('id',id,'state',state,'date',date,'time',time,
      'difficulty',difficulty,'pain',pain,'pain_note',pain_note,'text',text,'swaps',swaps))
      INTO actual FROM workout_logs WHERE id::text=expected->>'id';
    IF actual IS DISTINCT FROM expected THEN
      RAISE EXCEPTION 'legacy log metadata or feedback changed for %: %', expected->>'id', actual;
    END IF;
  END LOOP;

  IF NOT EXISTS(SELECT 1 FROM workout_logs log JOIN coaches coach ON coach.id=log.coach_id
    WHERE log.id='30000000-0000-0000-0000-000000000032' AND log.recorded_by='coach'
      AND coach.id='30000000-0000-0000-0000-000000000031' AND coach.removed_on='2026-09-30') THEN
    RAISE EXCEPTION 'former coach recorder was not mapped exactly';
  END IF;

  IF (SELECT count(*) FROM exercise_logs WHERE workout_log_id='30000000-0000-0000-0000-000000000033')<>2
    OR NOT EXISTS(SELECT 1 FROM exercise_logs activity JOIN exercise_sets set_row ON set_row.exercise_log_id=activity.id
      WHERE set_row.id='30000000-0000-0000-0000-000000000034' AND set_row.state='completed'
        AND set_row.round=5 AND set_row.reps=2 AND set_row.weight_kg=70
        AND activity.workout_log_id='30000000-0000-0000-0000-000000000033'
        AND activity.exercise_id='30000000-0000-0000-0000-000000000006'
        AND activity.position=0 AND activity.rounds=5 AND activity.targets_mode='per_round'
        AND activity.targets=prescribed_targets || '[{"rest":{"mode":"client_chooses"}},{"rest":{"mode":"client_chooses"}}]'::jsonb)
    OR NOT EXISTS(SELECT 1 FROM exercise_logs activity JOIN exercise_sets set_row ON set_row.exercise_log_id=activity.id
      WHERE set_row.id='30000000-0000-0000-0000-000000000035' AND set_row.state='completed'
        AND set_row.round=4 AND set_row.reps=6 AND set_row.weight_kg=16
        AND activity.workout_log_id='30000000-0000-0000-0000-000000000033'
        AND activity.exercise_id='30000000-0000-0000-0000-000000000007'
        AND activity.position=1 AND activity.rounds=4 AND activity.targets_mode='per_round'
        AND activity.targets=replacement_targets || '[{"rest":{"mode":"client_chooses"}}]'::jsonb) THEN
    RAISE EXCEPTION 'extra rounds did not preserve values and pad original/replacement instructions';
  END IF;

  IF (SELECT count(*) FROM exercise_logs WHERE workout_log_id='30000000-0000-0000-0000-000000000039')<>1
    OR NOT EXISTS(SELECT 1 FROM exercise_logs WHERE workout_log_id='30000000-0000-0000-0000-000000000039'
      AND workout_exercise_id='30000000-0000-0000-0000-000000000038'
      AND side_mode='per_side' AND rounds=2 AND targets_mode='same_for_all'
      AND targets='[{"reps":{"mode":"exact","value":5},"rest":{"mode":"none"}}]'::jsonb)
    OR (SELECT jsonb_agg(jsonb_build_array(set_row.id,set_row.side,set_row.reps,set_row.state) ORDER BY set_row.side)
      FROM exercise_sets set_row JOIN exercise_logs activity ON activity.id=set_row.exercise_log_id
      WHERE activity.workout_log_id='30000000-0000-0000-0000-000000000039') IS DISTINCT FROM
      '[["30000000-0000-0000-0000-00000000003a","left",5,"completed"],["30000000-0000-0000-0000-00000000003b","right",4,"completed"]]'::jsonb THEN
    RAISE EXCEPTION 'per-side activity or its distinct left/right results changed';
  END IF;

  IF (SELECT count(*) FROM exercise_logs WHERE workout_log_id='30000000-0000-0000-0000-000000000042')<>1
    OR NOT EXISTS(SELECT 1 FROM workout_logs log JOIN exercise_logs activity ON activity.workout_log_id=log.id
      WHERE log.id='30000000-0000-0000-0000-000000000042' AND log.state='active'
        AND log.recorded_by='client' AND log.coach_id IS NULL AND log.client_id='30000000-0000-0000-0000-000000000040'
        AND activity.workout_exercise_id='30000000-0000-0000-0000-000000000045'
        AND activity.exercise_id='30000000-0000-0000-0000-000000000007' AND activity.position=0
        AND activity.state='active' AND activity.side_mode='combined' AND activity.rounds=3
        AND activity.targets_mode='per_round' AND activity.targets=replacement_targets)
    OR EXISTS(SELECT 1 FROM exercise_sets WHERE workout_log_id='30000000-0000-0000-0000-000000000042') THEN
    RAISE EXCEPTION 'active swap-only log did not retain one untouched active replacement';
  END IF;

  IF EXISTS(SELECT 1 FROM exercise_logs WHERE business_id='30000000-0000-0000-0000-000000000003'
    AND (state<>'active' OR num_nonnulls(reps,weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,
      avg_speed_m_s,incline_pct,level,avg_power_w,avg_cadence_per_min,avg_heart_rate_bpm,effort,successes,attempts,score,result)<>0)) THEN
    RAISE EXCEPTION 'extra migration fixtures acquired an invented activity outcome or overall result';
  END IF;

  IF EXISTS(SELECT 1 FROM workout_logs WHERE id IN (
      '30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000012')
    AND (business_id<>'30000000-0000-0000-0000-000000000003'
      OR client_id<>'30000000-0000-0000-0000-000000000005'
      OR workout_id IS DISTINCT FROM '30000000-0000-0000-0000-000000000009'::uuid
      OR schedule_id IS NOT NULL OR scheduled_date IS NOT NULL OR effort IS NOT NULL)) THEN
    RAISE EXCEPTION 'legacy log references changed or effort was invented';
  END IF;
END $$;
