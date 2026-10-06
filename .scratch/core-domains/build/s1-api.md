# Slice 1 API contract

Existing route families remain under `/v1/coach` and `/v1/client`.

Training content is exactly training.md section 4. All node ids are UUID strings created by the editor. Read and write the same content shape. Exercise names are refreshed from the authorised library at publication. Numeric base values in content: `load: {kg, entered_unit: kg|lb}`, `distance: {m, entered_unit: m|km|mi}`. Nullable optional set fields are accepted.

`TrainingPlan`: id, kind (template|client_plan), name, description, revision (edit lock), archived_at, start_date, end_date, created_local_date, client_id, source_template_id, content, current_revision ({id,number,effective_on,content}|null), scheduled_revisions (same revision[]), stopped_on, inserted_at, updated_at. Templates have null dates/client/current_revision and no scheduled revisions. Plan content is current revision content, or revision 1 before start. Derived read fields also include status, lifecycle, workout_count, client {id,full_name,preferred_name}|null. Keep `TrainingPlanIndex` data/count/next_cursor.

POST `/training-plans`: {name,description?,content} saves one complete template.
PATCH `/training-plans/:id`: {expected_revision,name?,description?,content?,start_date?,end_date?,effective_on?}. Template edits whole document. Client content creates immutable publication, effective_on defaults to today. Metadata and publication share ONE transaction.
POST `/clients/:client_id/training-plans/:id/assign`: {start_date?,end_date?}; copy template to revision 1. Keep existing show/list/archive/restore/duplicate/delete routes. Delete client plan is denied: archive instead.
DELETE `/training-plans/:id/revisions/:revision_id`: query expected_revision; withdraw future revision.
GET client `/training-plans/coverage?date=`: {data: {date,plan,workouts}|null}; workouts are all eligible plan workouts.
GET client `/training-plans/occurrences?from=&to=` and coach `/clients/:client_id/training-occurrences?from=&to=`: {data: [{plan_id,plan_revision_id,schedule_entry_id,occurrence_date,workout_id,workout_name,session_id: string|null}], extra_sessions: Session[]}. A completed session fulfils each occurrence once.
GET coach `/clients/:client_id/exercises/:exercise_id/history`, client `/training-exercises/:exercise_id/history`: {data: {bests:[{reps,best_kg}],sets:[PerformedSet with session_id and local_date]}}.

Session read: id, revision, local_date, timezone, started_at, ended_at, state, notes, request_id, plan_revision_id, workout_id, schedule_entry_id, occurrence_date, prescription (workout from immutable revision|null), performed_sets, inserted_at, updated_at.
POST client `/training-sessions`: {request_id?,plan_revision_id?,workout_id?,schedule_entry_id?,occurrence_date?,notes?}. Explicit occurrence selects the revision for its original date. No occurrence means the workout must be in today's coverage. Both prescription ids absent means free session. Existing active/show/list/update/complete/discard routes remain under `/training-sessions`; set PATCH/DELETE remain under `/training-performed-sets/:id`. PATCH and complete accept {expected_revision?,local_date?,notes?}. No soreness.

PerformedSet read: id, session_id, position, request_id, item_id, set_id, exercise_id, exercise_name, kind(warmup|working|drop), outcome(done|failed|skipped), reps(integer|null), load_kg, entered_load_unit, duration_s, distance_m, entered_distance_unit, rpe, rir, notes, deleted_at, inserted_at, updated_at. Library exercise_name resolves from frozen prescription or the library at first write.
POST `/training-sessions/:session_id/performed-sets`: {request_id,expected_revision?,item_id?,set_id?,exercise_id?,exercise_name?,kind?,outcome?,reps?,load_value?,load_unit?:kg|lb,duration_s?,distance_value?,distance_unit?:m|km|mi,rpe?,rir?,notes?}. PATCH set accepts same editable values and expected_revision. DELETE retains tombstone; retry of removed request does not resurrect it. Responses retain {data: PerformedSet}; session refetch returns updated revision.

Exercise replaces tracking_type/source/images with measures(reps|load|duration|distance[]),bodyweight,media_id/media,archived_at. Existing name/instructions/mechanics/force/muscles/equipment kept. Description is removed from exercises. Derived built_in is true when business_id is null. Measures and bodyweight editable only on create.
