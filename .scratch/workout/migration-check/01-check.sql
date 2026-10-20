DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE id='10000000-0000-0000-0000-00000000000a'
    AND metrics='[{"key":"reps","label":"Moves"},{"key":"successes","label":"Moves · Successes"},{"key":"attempts","label":"Moves · Attempts"}]'::jsonb
    AND equipment='Barbell, Bench' AND muscles=ARRAY['Quadriceps','Glutes','Quads'] AND count_label='  Moves  ') THEN
    RAISE EXCEPTION 'A metric labels, equipment or retained count_label changed';
  END IF;
  IF (SELECT count(*) FROM exercise_media WHERE exercise_id='10000000-0000-0000-0000-00000000000a') <> 1
    OR NOT EXISTS (SELECT 1 FROM exercise_media m JOIN attachments a ON a.id=m.attachment_id
      WHERE m.exercise_id='10000000-0000-0000-0000-00000000000a' AND m.position=0
      AND a.source='external_link' AND a.external_url='https://example.com/a.mp4'
      AND a.business_id=m.business_id AND a.client_id IS NULL) THEN
    RAISE EXCEPTION 'A media conversion failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE id='10000000-0000-0000-0000-00000000000b'
    AND equipment IS NULL AND metrics='[{"key":"distance","label":null},{"key":"duration","label":null}]'::jsonb) THEN
    RAISE EXCEPTION 'B empty equipment or default labels changed';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM exercises WHERE id='10000000-0000-0000-0000-00000000000c'
    AND count_label='   ' AND metrics='[{"key":"reps","label":null},{"key":"successes","label":null},{"key":"attempts","label":null}]'::jsonb) THEN
    RAISE EXCEPTION 'blank legacy count label did not become null metric labels';
  END IF;
END $$;
