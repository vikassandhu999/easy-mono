BEGIN;
INSERT INTO users(id,email,inserted_at,updated_at) VALUES ('20000000-0000-0000-0000-000000000001','migration-02@example.com',now(),now());
INSERT INTO businesses(id,name,handle,owner_user_id,inserted_at,updated_at)
VALUES ('20000000-0000-0000-0000-000000000002','Migration 02','migration-02','20000000-0000-0000-0000-000000000001',now(),now());
INSERT INTO coaches(id,business_id,user_id,full_name,inserted_at,updated_at)
VALUES ('20000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Coach',now(),now());
INSERT INTO clients(id,business_id,user_id,coach_id,full_name,inserted_at,updated_at)
VALUES ('20000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','Client',now(),now());
INSERT INTO exercises(id,business_id,name,kind,goals,places,metrics,unilateral,inserted_at,updated_at)
VALUES ('20000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000002','X','movement','{}','{}','[{"key":"reps","label":null}]',false,now(),now());
INSERT INTO workouts(id,business_id,client_id,name,type,video,inserted_at,updated_at) VALUES
('20000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000004','Prescribed','prescribed',NULL,now(),now()),
('20000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000002',NULL,'Video','video','https://example.com/v.mp4',now(),now());
INSERT INTO exercise_groups(id,business_id,workout_id,name,rounds,position,inserted_at,updated_at)
VALUES ('20000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000006','Main',2,0,now(),now());
INSERT INTO workout_exercises(id,business_id,exercise_group_id,exercise_id,position,targets_mode,targets,rest,exercise_snapshot,inserted_at,updated_at)
VALUES ('20000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000005',0,'per_round',
ARRAY['{"reps":{"mode":"exact","value":5}}','{"reps":{"mode":"range","min":3,"max":5}}']::jsonb[],
ARRAY['{"mode":"exact","value":90}',NULL]::jsonb[],
'{"id":"20000000-0000-0000-0000-000000000005","metrics":["reps"],"unilateral":true}',now(),now());
INSERT INTO workout_logs(id,business_id,client_id,workout_id,date,at_utc,recorded_by,inserted_at,updated_at)
VALUES ('20000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000006',current_date,now(),'20000000-0000-0000-0000-000000000001',now(),now());
INSERT INTO exercise_sets(id,business_id,workout_log_id,workout_exercise_id,exercise_id,round,side,reps,exercise_snapshot,inserted_at,updated_at)
VALUES ('20000000-0000-0000-0000-00000000000b','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-000000000005',1,'left',5,
'{"id":"20000000-0000-0000-0000-000000000005","metrics":["reps"],"unilateral":true}',now(),now());
COMMIT;
