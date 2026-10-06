# Slice 3 backend

The Tracker backend and retained-app API contract are implemented. Full `rtk mix precommit` passed with **752 tests, zero failures**, seed **930934**. Part 1 ended at 715 tests; this work adds **37 tests** and removes none. The test log is [s3-backend-precommit.log](s3-backend-precommit.log).

## Persistence and shared services

The two new migrations create `trackers`, `tracker_assignments`, `tracker_entries`, `tracker_entry_attachments`, and `tracker_requests`; extend `records`; add `attachments.captured_on`; and add `businesses.default_tracker_template_id`.

SQL fixes Tracker kind, base unit, scale, and business after creation. Built-ins reject updates and deletion. Entry checks enforce the value kind and at most one event link. Composite foreign keys enforce the same client and business for sessions, meals, attachments, and requests. A trigger checks that custom Trackers belong to the referenced business. Default templates must have the Tracker domain and the same business.

Assignment dates are inclusive. The exclusion uses `daterange(starts_on, ends_on + 1, '[)')`. A change on the same day retains an empty earlier row with `ends_on = starts_on - 1`. This preserves the timing changes without overlapping dates. The client lock serializes assignment changes. Applying a template ends missing or changed assignments and inserts the required rows in one transaction. Repeating an unchanged template application preserves the assignment ids. No Tracker Plan or Plan Revision is created.

`Easy.Plans.Domain` now dispatches Tracker content to `Easy.Trackers.Content`. Template creation, revision checks, editing, reads, and pagination use the existing `Easy.Plans.Programming` and `Easy.Plans.Reader` workflows.

`Easy.CoachingTerms.insert_term/1` copies the business default after the first term is inserted and inside the same transaction. Both invitation acceptance and coach start use it. Invalid default content rolls back the term and invitation acceptance. A later term does not copy the default again. `Easy.Orgs` creates the default for each new business. Seeds add the same default to existing businesses that have none.

The 17 built-ins use stable UUIDs `a0000000-0000-4000-8000-000000000001` through `...000017`, in this order: Body weight, Waist, Sleep hours, Steps, Water, Energy, Soreness, Hunger, Bloating, Reflection, Progress photo front, Progress photo side, Progress photo back, Blood report, Supplements taken, 10k steps reached, Alcohol-free day. The default is weekly Reflection, Sunday (`weekday: 6`).

Private attachments retain the shared upload/download flow. They now accept `application/pdf` up to 15 MiB and an optional `captured_on` date. Documents accept ordered PDFs and images; photos accept images only. Attachment ids must be distinct and belong to the entry client. At most 50 files belong to one entry.

## Record writes and calculated reads

All entry writes use `Easy.RecordJournal`; coach writes use `write_for_client`. The original recorder remains on the entry. Each journal row records the actor of that mutation. Corrections increase the entry revision. Removal keeps a tombstone. Attachment additions, order changes, and removals produce attachment journal rows.

One request id identifies one intended create or correction. Exact retries return the current entry without a sequence increment. Reusing an id with another Tracker, value, event, date, unit, or attachment order returns conflict. The journal supplies the original mutation values, so a retry after later correction or removal does not insert another entry. PATCH retains omitted values, event links, and attachment order. Retry checks compare supplied PATCH fields with the accepted journal snapshot; new supplied values that differ still conflict. Numeric date-only changes retain the stored base value without a second conversion. Revision checks reject stale corrections. Repeated removal succeeds without a new sequence.

The existing `RequireCoaching` plug remains the single client HTTP write gate. Context authorization checks the target client and business. Coaches can write historical Tracker entries. Library counts use only clients visible to the actor; clients cannot infer other clients' entry counts.

Due reads use active daily and weekly assignments for the current client-local date. A nondeleted same-day entry satisfies the reminder. Past reminders do not remain due. Due items and requests are empty outside coaching. Event prompts read one completed workout or shared meal, check its client/business, and return assigned Trackers without a nondeleted entry linked to that event.

Request openness is calculated from cancellation, the current term, and nondeleted entries inserted since the request. Request and entry timestamps retain microseconds, so an earlier entry in the same second does not close a later request. Removed entries no longer satisfy the request.

Metrics return the count, latest/previous/first entries, change, min/max/average, dated chart series, and workout/meal coverage. Numeric values use the Tracker base unit. Coverage counts distinct completed/shared events in the range while the relevant event assignment applies. Multiple linked entries do not increase the completed count.

## Function contracts

All tenant context calls below take `%Easy.Ctx{}` first and return `{:ok, value} | {:error, reason}`. Private helpers keep transactions in the contexts. Schema files remain under `lib/easy/trackers/`; non-schema modules are at `lib/easy/tracker_*.ex` to match the repository layout test.

| Module | Public operation |
| --- | --- |
| `Easy.Trackers` | `list_trackers(ctx, opts)`, `describe_tracker(ctx, id)`, `create_tracker(ctx, attrs)`, `update_tracker(ctx, id, attrs)`, `archive_tracker(ctx, id)`, `restore_tracker(ctx, id)`, `delete_tracker(ctx, id)` |
| `Easy.Trackers.Assignments` | `list_for_client(ctx, client_id)`, `add_for_client(ctx, client_id, attrs)`, `change_for_client(ctx, client_id, id, attrs)`, `end_for_client(ctx, client_id, id)`, `apply_for_client(ctx, client_id, template_id, expected_revision)` |
| `Easy.Trackers.Records` | `create_for_client(ctx, client_id, attrs)`, `update_for_client(ctx, client_id, id, attrs)`, `remove_for_client(ctx, client_id, id, expected_revision)`; client HTTP adapters pass only trusted `ctx.client_id` |
| `Easy.Trackers.Reader` | `entries_for_client(ctx, client_id, opts)`, `today_for_client(ctx, client_id)`, `prompts_for_client(ctx, client_id, params)`, `metrics_for_client(ctx, client_id, tracker_id, opts)`, `requests_for_client(ctx, client_id)`, `request_for_client(ctx, client_id, attrs)`, `cancel_for_client(ctx, client_id, id)` |
| `Easy.Trackers.Defaults` | `get_settings(ctx)`, `update_settings(ctx, attrs)`, internal onboarding calls `create_default(ctx)` and `copy_first_term(ctx, client, term)` |
| `Easy.Units` | `tracker_options(tracker)` returns `[{unit, to_base_factor}]`; `tracker_value(tracker, value, entered_unit)` returns a Decimal in the base unit |

## HTTP and generated types

The complete request/response fields are in [s3-api-contract.md](s3-api-contract.md) and `backend/lib/easy_web/types/trackers.ex`. Both retained `schema.ts` files are generated. The final generator exposes **165 typed routes** (39 new Tracker routes).

Prefixes: coach target `C = /v1/coach/clients/:client_id`; client self `S = /v1/client`. Pages return `{data, count, next_cursor}`. Other successes return `{data}`; removals return 204. Lists support `cursor`, including `start`, or offset/limit; limit is capped at 100.

| Method and path | Body/query and result |
| --- | --- |
| GET `/v1/coach/trackers`, `/v1/client/trackers` | `Tracker.list_query` → `TrackerIndex` |
| GET `/v1/coach/trackers/:id`, `/v1/client/trackers/:id` | `Tracker` |
| POST `/v1/coach/trackers` | `Tracker.create` → `Tracker` |
| PATCH `/v1/coach/trackers/:id` | `Tracker.update` (name only) → `Tracker` |
| DELETE `/v1/coach/trackers/:id` | Unused custom deletion |
| POST `/v1/coach/trackers/:id/archive`, `/restore` | `Tracker` |
| GET `C/tracker-assignments`, `S/tracker-assignments` | `TrackerAssignment[]` |
| POST `C/tracker-assignments` | `TrackerAssignment.create` → assignment |
| PATCH `C/tracker-assignments/:id` | `TrackerAssignment.update` → new assignment |
| DELETE `C/tracker-assignments/:id` | End assignment |
| GET `C/tracker-entries`, `S/tracker-entries` | `TrackerEntry.list_query` → `TrackerEntryIndex` |
| POST `C/tracker-entries`, `S/tracker-entries` | `TrackerEntry.create` → entry |
| PATCH `C/tracker-entries/:id`, `S/tracker-entries/:id` | `TrackerEntry.update` → entry |
| DELETE `C/tracker-entries/:id`, `S/tracker-entries/:id` | Query `expected_revision` → 204 |
| GET `C/tracker-today`, `S/tracker-today` | `TrackerToday` |
| GET `C/tracker-prompts`, `S/tracker-prompts` | Query exactly one `about_session_id` or `about_meal_id` → assignment list |
| GET `C/trackers/:id/metrics`, `S/trackers/:id/metrics` | Query `from`, `to`, `previous_date` → `TrackerMetrics` |
| GET `C/tracker-requests`, `S/tracker-requests` | Open `TrackerRequest[]` |
| POST `C/tracker-requests` | `TrackerRequest.create` → request |
| DELETE `C/tracker-requests/:id` | Cancel request |
| GET/POST `/v1/coach/tracker-templates` | Shared template page/create |
| GET/PATCH `/v1/coach/tracker-templates/:id` | Shared template read/edit with `expected_revision` |
| POST `C/tracker-templates/:id/apply` | `expected_revision` → current assignment list |
| GET/PATCH `/v1/coach/tracker-settings` | `TrackerSettings`; write adds optional `apply_to_existing` and requires owner |

Named generated types are `Tracker`, `TrackerUnit`, `TrackerAssignment`, `TrackerEntry`, `TrackerAttachment`, `TrackerRequest`, `TrackerTemplate`, `TrackerTemplateContent`, `TrackerTemplateItem`, `TrackerSettings`, `TrackerToday`, `TrackerMetrics`, `TrackerSeriesPoint`, `TrackerCoverage`, and the three page types. Generated request aliases follow the existing generator naming.

## Choices

- Rating scales are integer 1–N, with N from 2 to 10. The seeded rating scale is 5. Numeric custom units are required text.
- `weekday` is 0=Monday through 6=Sunday, matching the existing content convention.
- Archiving or deleting a custom Tracker removes its items from shared Tracker templates and increases those template revisions. This prevents an unusable default from blocking a later coaching start. Restore does not add those items back. Existing assignment rows and recorded history remain on archive; deletion cascades assignment/request references only when no entry, including tombstones, exists.
- Default setting writes require the business owner. `apply_to_existing: true` replaces lists for all clients in that business in the same transaction. Omitting it changes future defaults only. A null default with this option clears existing lists.
- Built-in units are kg/lb, cm/in, and ml/US fluid ounce (`fl_oz`); hours and steps remain literal. Custom units never convert, even if their label is `kg`. Both apps receive unit factors from the API.
- Metrics default to the last 30 local dates and allow up to 366 dates. Numeric change uses the last entry on or before `previous_date`, which defaults to the day before the range. Photo previous means the entry immediately before latest, including within the range. First means first recorded value in the full history.
- Library reads default to active Trackers. `archived=true` supports access to archived history. Metadata and entry reads remain available after archive.
- The existing attachment service checks submitted file metadata and signs storage URLs. It does not inspect uploaded bytes; this work retains that service contract.

## Verification

- Final focused run: **37 tests, zero failures**: 30 context tests and seven routed contract tests. It includes partial text, number, and document PATCH retry regressions.
- `rtk mix precommit`: **exit 0**, **752 tests, zero failures**, seed **930934**; no Credo issues; generated-contract drift check passed for 165 routes.
- `rtk just gen-api`: passed for retained apps only. No clientapp-v2 edits.
- Dev migrations: both applied. Test migrations: both applied by the test alias. Existing development accounts were preserved.
- Full `rtk mix run priv/repo/seeds.exs`: exit 0. Stable built-ins and default templates were added. A corrected default-domain function from the prototype migration was applied to the development database after the follow-up migration; test migration ran the corrected source.

No requested backend Tracker feature is deferred. Browser checks and frontend build evidence belong to the root and app reports. No commit, push, branch, or worktree was created.
