BEGIN;
INSERT INTO users(id,email,inserted_at,updated_at) VALUES
('30000000-0000-0000-0000-000000000001','migration-03-client@example.com','2026-10-01 06:00:00+00','2026-10-01 06:00:00+00'),
('30000000-0000-0000-0000-000000000002','migration-03-coach@example.com','2026-10-01 06:00:00+00','2026-10-01 06:00:00+00');
INSERT INTO businesses(id,name,handle,owner_user_id,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000003','Migration 03','migration-03','30000000-0000-0000-0000-000000000002','2026-10-01 06:00:00+00','2026-10-01 06:00:00+00');
INSERT INTO coaches(id,business_id,user_id,full_name,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002','Recording coach','2026-10-01 06:00:00+00','2026-10-01 06:00:00+00');
INSERT INTO clients(id,business_id,user_id,coach_id,full_name,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000004','Client','2026-10-01 06:00:00+00','2026-10-01 06:00:00+00');
INSERT INTO exercises(id,business_id,name,kind,goals,places,metrics,inserted_at,updated_at) VALUES
('30000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000003','Back squat','movement','{}','{}','[{"key":"reps","label":null},{"key":"weight","label":null}]','2026-10-01 06:00:00+00','2026-10-01 06:00:00+00'),
('30000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000003','Goblet squat','movement','{}','{}','[{"key":"reps","label":null},{"key":"weight","label":null}]','2026-10-01 06:00:00+00','2026-10-01 06:00:00+00'),
('30000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000003','Plank','movement','{}','{}','[{"key":"duration","label":null}]','2026-10-01 06:00:00+00','2026-10-01 06:00:00+00');
INSERT INTO workouts(id,business_id,client_id,name,type,groups,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','W','prescribed',
'[{"id":"30000000-0000-0000-0000-00000000000a","name":"Main","rounds":3,"exercises":[{"id":"30000000-0000-0000-0000-00000000000b","exercise_id":"30000000-0000-0000-0000-000000000006","side_mode":"combined","targets_mode":"per_round","targets":[{"reps":{"mode":"exact","value":5},"rest":{"mode":"exact","value_s":90}},{"reps":{"mode":"range","min":3,"max":5},"rest":{"mode":"none"}},{"weight":{"mode":"exact","value":60},"rest":{"mode":"range","min_s":60,"max_s":120}}]}]}]',
'2026-10-01 06:00:00+00','2026-10-01 06:00:00+00');
INSERT INTO workout_exercises(business_id,workout_id,exercise_id)
VALUES ('30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000006');

-- L1 has saved work, L2 has only a swap, and L3 was started by the coach.
INSERT INTO workout_logs(id,business_id,client_id,workout_id,state,date,time,at_utc,recorded_by,difficulty,pain,pain_note,text,swaps,inserted_at,updated_at) VALUES
('30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000009','completed','2026-10-01','06:10','2026-10-01 06:10:00+00','30000000-0000-0000-0000-000000000001','just_right',true,'Left knee, after round two',E'Kept the original note.\nSecond line.','{"30000000-0000-0000-0000-00000000000b":{"id":"30000000-0000-0000-0000-000000000007","name":"Goblet squat"}}','2026-10-01 06:10:00+00','2026-10-01 06:20:00+00'),
('30000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000009','discarded','2026-10-02',NULL,'2026-10-02 06:00:00+00','30000000-0000-0000-0000-000000000001','too_easy',false,NULL,'Swap saved before recording.','{"30000000-0000-0000-0000-00000000000b":{"id":"30000000-0000-0000-0000-000000000007","name":"Goblet squat"}}','2026-10-02 06:00:00+00','2026-10-02 06:01:00+00'),
('30000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000009','active','2026-10-03','00:00','2026-10-03 06:00:00+00','30000000-0000-0000-0000-000000000002','too_hard',true,'Coach-entered pain context','Coach-entered session note.','{}','2026-10-03 06:00:00+00','2026-10-03 06:02:00+00');

-- All old measurement columns are populated on the first set. Historical
-- statistics and grade must survive without being relabeled as averages.
INSERT INTO exercise_sets(id,business_id,workout_log_id,workout_exercise_id,exercise_id,round,
  reps,weight_kg,duration_s,distance_m,elevation_gain_m,height_cm,calories_kcal,speed_m_s,incline_pct,level,
  power_w,cadence_rpm,heart_rate_bpm,effort,reserve,successes,attempts,score,result,grade,
  entered_units,exercise_snapshot,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000020','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-00000000000b','30000000-0000-0000-0000-000000000006',1,
  5,-2.5,45,100.25,2.5,30.5,12.25,3.75,-1.5,2,120.5,83,142,7.5,1.25,2,3,-2.25,'win','V2',
  '{"weight":"lb","duration":"s","distance":"km","speed":"km/h","power":"W","cadence":"rpm","heart_rate":"bpm","effort":"RPE","reserve":"RIR"}',
  '{"id":"30000000-0000-0000-0000-000000000006","metrics":["reps","weight","duration","distance","elevation_gain","height","calories","speed","incline","level","power","cadence","heart_rate","effort","reserve","successes","attempts","score","result","grade"],"unilateral":false}',
  '2026-10-01 06:11:00+00','2026-10-01 06:11:30+00');
INSERT INTO exercise_sets(id,business_id,workout_log_id,workout_exercise_id,exercise_id,round,reps,weight_kg,duration_s,entered_units,exercise_snapshot,inserted_at,updated_at) VALUES
('30000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-00000000000b','30000000-0000-0000-0000-000000000006',2,4,60,NULL,'{}','{"id":"30000000-0000-0000-0000-000000000006","metrics":["reps","weight"],"unilateral":false}','2026-10-01 06:12:00+00','2026-10-01 06:12:30+00'),
('30000000-0000-0000-0000-000000000022','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-00000000000b','30000000-0000-0000-0000-000000000007',3,8,20,NULL,'{"weight":"kg"}','{"id":"30000000-0000-0000-0000-000000000007","metrics":["reps","weight"],"unilateral":false}','2026-10-01 06:13:00+00','2026-10-01 06:13:30+00'),
('30000000-0000-0000-0000-000000000023','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000010',NULL,'30000000-0000-0000-0000-000000000008',1,NULL,NULL,30,'{"duration":"s"}','{"id":"30000000-0000-0000-0000-000000000008","metrics":["duration"],"unilateral":false}','2026-10-01 06:05:00+00','2026-10-01 06:05:30+00');
-- The legacy schema permits two added sets in the same exercise/round/side slot.
INSERT INTO exercise_sets(id,business_id,workout_log_id,exercise_id,round,duration_s,entered_units,exercise_snapshot,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000024','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000008',1,40,'{"duration":"s"}','{"id":"30000000-0000-0000-0000-000000000008","metrics":["duration"],"unilateral":false}','2026-10-01 06:06:00+00','2026-10-01 06:06:30+00');

INSERT INTO users(id,email,inserted_at,updated_at) VALUES
('30000000-0000-0000-0000-000000000030','migration-03-former-coach@example.com',now(),now()),
('30000000-0000-0000-0000-000000000041','migration-03-swap-client@example.com',now(),now());
INSERT INTO coaches(id,business_id,user_id,full_name,removed_on,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000031','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000030','Former recording coach','2026-09-30',now(),now());
INSERT INTO clients(id,business_id,user_id,coach_id,full_name,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000040','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000041','30000000-0000-0000-0000-000000000004','Active swap-only client',now(),now());
INSERT INTO workouts(id,business_id,client_id,name,type,groups,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-000000000036','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','Each side','prescribed',
'[{"id":"30000000-0000-0000-0000-000000000037","name":null,"rounds":2,"exercises":[{"id":"30000000-0000-0000-0000-000000000038","exercise_id":"30000000-0000-0000-0000-000000000006","side_mode":"per_side","targets_mode":"same_for_all","targets":[{"reps":{"mode":"exact","value":5},"rest":{"mode":"none"}}]}]}]',now(),now());
INSERT INTO workouts(id,business_id,client_id,name,type,groups,inserted_at,updated_at)
SELECT '30000000-0000-0000-0000-000000000043',business_id,'30000000-0000-0000-0000-000000000040','Active swap-only','prescribed',
  jsonb_set(jsonb_set(groups,'{0,id}','"30000000-0000-0000-0000-000000000044"'),'{0,exercises,0,id}','"30000000-0000-0000-0000-000000000045"'),now(),now()
FROM workouts WHERE id='30000000-0000-0000-0000-000000000009';
INSERT INTO workout_exercises(business_id,workout_id,exercise_id) VALUES
('30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000036','30000000-0000-0000-0000-000000000006'),
('30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000043','30000000-0000-0000-0000-000000000006');

-- Former coach, extra rounds, per-side results, and an active swap without sets.
INSERT INTO workout_logs(id,business_id,client_id,workout_id,state,date,at_utc,recorded_by,difficulty,pain,swaps,inserted_at,updated_at) VALUES
('30000000-0000-0000-0000-000000000032','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000009','completed','2026-09-29',now(),'30000000-0000-0000-0000-000000000030','just_right',false,'{}',now(),now()),
('30000000-0000-0000-0000-000000000033','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000009','completed','2026-10-05',now(),'30000000-0000-0000-0000-000000000001','just_right',false,'{"30000000-0000-0000-0000-00000000000b":{"id":"30000000-0000-0000-0000-000000000007"}}',now(),now()),
('30000000-0000-0000-0000-000000000039','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000036','completed','2026-10-06',now(),'30000000-0000-0000-0000-000000000001','just_right',false,'{}',now(),now()),
('30000000-0000-0000-0000-000000000042','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000040','30000000-0000-0000-0000-000000000043','active','2026-10-07',now(),'30000000-0000-0000-0000-000000000041',NULL,NULL,'{"30000000-0000-0000-0000-000000000045":{"id":"30000000-0000-0000-0000-000000000007"}}',now(),now());
INSERT INTO exercise_sets(id,business_id,workout_log_id,workout_exercise_id,exercise_id,round,side,reps,weight_kg,exercise_snapshot,inserted_at,updated_at) VALUES
('30000000-0000-0000-0000-000000000034','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000033','30000000-0000-0000-0000-00000000000b','30000000-0000-0000-0000-000000000006',5,NULL,2,70,'{"id":"30000000-0000-0000-0000-000000000006","metrics":["reps","weight"],"unilateral":false}','2026-10-05 06:00:00+00','2026-10-05 06:00:30+00'),
('30000000-0000-0000-0000-000000000035','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000033','30000000-0000-0000-0000-00000000000b','30000000-0000-0000-0000-000000000007',4,NULL,6,16,'{"id":"30000000-0000-0000-0000-000000000007","metrics":["reps","weight"],"unilateral":false}','2026-10-05 06:01:00+00','2026-10-05 06:01:30+00'),
('30000000-0000-0000-0000-00000000003a','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000039','30000000-0000-0000-0000-000000000038','30000000-0000-0000-0000-000000000006',1,'left',5,NULL,'{"id":"30000000-0000-0000-0000-000000000006","metrics":["reps"],"unilateral":true}','2026-10-06 06:00:00+00','2026-10-06 06:00:30+00'),
('30000000-0000-0000-0000-00000000003b','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000039','30000000-0000-0000-0000-000000000038','30000000-0000-0000-0000-000000000006',1,'right',4,NULL,'{"id":"30000000-0000-0000-0000-000000000006","metrics":["reps"],"unilateral":true}','2026-10-06 06:01:00+00','2026-10-06 06:01:30+00');
COMMIT;
