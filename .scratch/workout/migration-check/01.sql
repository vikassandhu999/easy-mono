INSERT INTO users(id,email,full_name,inserted_at,updated_at)
VALUES ('10000000-0000-0000-0000-000000000001','migration-01@example.com','Migration owner',now(),now());
INSERT INTO businesses(id,name,handle,owner_user_id,inserted_at,updated_at)
VALUES ('10000000-0000-0000-0000-000000000002','Migration 01','migration-01','10000000-0000-0000-0000-000000000001',now(),now());
INSERT INTO exercises(id,business_id,name,kind,goals,places,metrics,count_label,equipment,muscles,media,inserted_at,updated_at)
VALUES
('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000002','A','movement','{strength}','{gym}','{reps,successes,attempts}','  Moves  ','{"  Barbell","Bench  "}','{"  Quadriceps  ",Glutes,Quads," Quads"," Glutes "}','https://example.com/a.mp4',now(),now()),
('10000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000002','B','activity','{endurance}','{outdoor}','{distance,duration}',NULL,'{}','{}',NULL,now(),now()),
('10000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000002','C','movement','{strength}','{gym}','{reps,successes,attempts}','   ','{}','{}',NULL,now(),now());
