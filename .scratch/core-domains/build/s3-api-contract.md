# Tracker API contract (implementation target)

All paths start `/v1`. Success bodies use `{data: value}`, except list pages `{data: [...], count: number, next_cursor: string|null}`. All ids are UUID strings. Dates are ISO local dates. Weekday is 0=Monday through 6=Sunday. Generated named types use `Tracker`, `TrackerAssignment`, `TrackerEntry`, `TrackerRequest`, `TrackerTemplate`, `TrackerMetrics`, `TrackerToday`, and their request aliases. The generated schema is authoritative once available.

## Library

Coach `/coach/trackers`: GET (query `search?`, `kind?`, `archived?`, `offset?`, `limit?`, `cursor?`), POST (`name`, `kind`, `base_unit?`, `scale_max?`). `/coach/trackers/:id`: GET, PATCH (`name` only), DELETE (unused custom only; conflict if used). POST `/coach/trackers/:id/archive` and `/restore`. Client GET `/client/trackers` with same list query (active only by default), GET `/client/trackers/:id`.

Tracker: `id,name,kind,base_unit,scale_max,archived_at,built_in,entry_count,units:[{unit,to_base_factor}]`. Null fields remain explicit. Kind is number|rating|yes_no|text|photo|document. Kind/unit/scale are fixed. Known built-in display units: kg/lb, cm/in, ml/fl_oz; custom units remain literal. Sleep uses hours and steps uses steps.

## Client records and assignments

Coach prefix `/coach/clients/:client_id`; client prefix `/client`.

- GET `<prefix>/tracker-assignments`: `{data: TrackerAssignment[]}` current assignments. Coach POST same path: `{tracker_id,timing,weekday?}`. Coach PATCH `<prefix>/tracker-assignments/:id`: `{timing,weekday?}`. Coach DELETE same: ends assignment immediately. Assignment has `id,tracker,timing,weekday,starts_on,ends_on`.
- GET `<prefix>/tracker-entries`: paged, query `tracker_id?`, `from?`, `to?`, `offset?`, `limit?`, `cursor?`. POST same: `{tracker_id,request_id,local_date,number_value?,entered_unit?,rating_value?,yes_no_value?,text_value?,attachment_ids?,about_session_id?,about_meal_id?}`. PATCH `<prefix>/tracker-entries/:id`: same editable values without tracker_id, plus `request_id,expected_revision,local_date`. DELETE same: query `expected_revision` (repeat delete succeeds).
- Entry: `id,tracker,local_date,timezone,recorded_by_type,recorded_by_id,revision,request_id,number_value,entered_unit,rating_value,yes_no_value,text_value,about_session_id,about_meal_id,attachments,inserted_at,updated_at`. `number_value` response is in tracker base units; input is in `entered_unit`. Attachments are ordered `{id,content_type,byte_size,captured_on,position}`. Use existing private download URLs.
- GET `<prefix>/trackers/:id/metrics`: query `from?,to?,previous_date?`. Returns `tracker,count,latest,previous,first,change,min,max,average,series,workout_coverage,meal_coverage`. Entry slots are full entries or null; series is `{date,value,entry_id}[]`; coverage is `{recorded,total}`. Range defaults to last 30 local dates. Change compares latest with latest entry on/before previous_date (default before range), in base unit. No client aggregation required.
- GET `<prefix>/tracker-today`: `{date,due:TrackerAssignment[],requests:TrackerRequest[]}`. Daily/weekly reminders only.
- GET `<prefix>/tracker-prompts`: query `about_session_id?` OR `about_meal_id?` (exactly one). Returns `{data:TrackerAssignment[]}` pending for the completed/shared event. Complete/share the event first, query prompts, then POST entries linked to that event. The prompt call is safe to repeat.
- GET `<prefix>/tracker-requests`: open requests `{data:TrackerRequest[]}`. Coach POST same `{tracker_id}`. Coach DELETE `<prefix>/tracker-requests/:id` cancels. Request: `id,tracker,requested_at,requested_by,cancelled_at`.

## Templates/settings (coach only)

`/coach/tracker-templates`: GET paged (`search?,archived?,offset?,limit?,cursor?`), POST `{name,description?,content:{items:[{tracker_id,timing,weekday?}]}}`.
`/coach/tracker-templates/:id`: GET, PATCH `{expected_revision,name?,description?,content?}`. Shared Plans template workflows; no Tracker plans.
POST `/coach/clients/:client_id/tracker-templates/:id/apply` with `{expected_revision}`: matches assignments and returns `{data:TrackerAssignment[]}`.
GET `/coach/tracker-settings`: `{data:{default_tracker_template_id}}`.
PATCH same: `{default_tracker_template_id:string|null,apply_to_existing?:boolean}`; applies to all accessible clients only when owner (settings write is owner-only).

Private uploads add `application/pdf` (15 MiB) and optional `captured_on` date. Existing upload and download endpoints remain.

Retries: create finds existing entry by client/request_id. Correction stores request_id of the accepted mutation; retry returns that entry before checking expected_revision. Keep one request_id per intended mutation. Same-day timing changes preserve an empty old row (`ends_on = starts_on - 1`) and insert a new row; empty date ranges do not overlap.

PATCH retains omitted values, event links, and attachment order. Exact partial retries compare supplied fields against the accepted journal snapshot. Numeric correction without entered_unit uses the existing entered unit; date-only correction does not convert the stored value again.
