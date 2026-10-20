\ir 03.sql

BEGIN;
-- The user exists, so only the new recorder-resolution guard can reject this log.
INSERT INTO users(id,email,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-0000000000fe','migration-03-unknown@example.com','2026-10-04 06:00:00+00','2026-10-04 06:00:00+00');
INSERT INTO workout_logs(id,business_id,client_id,workout_id,state,date,at_utc,recorded_by,difficulty,pain,inserted_at,updated_at)
VALUES ('30000000-0000-0000-0000-0000000000ff','30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000009','completed','2026-10-04','2026-10-04 06:00:00+00','30000000-0000-0000-0000-0000000000fe','just_right',false,'2026-10-04 06:00:00+00','2026-10-04 06:00:00+00');
COMMIT;
