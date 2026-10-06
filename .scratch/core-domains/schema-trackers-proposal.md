# Trackers and Review schema proposal

Status: proposed for table-by-table decisions, 2026-10-04. No product schema, migration or contract change is approved by this document.

The agreed [Check-ins spec](../check-ins/spec.md) controls this proposal. It keeps the Tracker list on the client, built-in values in metric, custom units as free text, repeated entries, coach-recorded Tracker entries and client-only workout/meal recording. The [overview](overview.md) and [validation](spec-validation.md) contain proposals, not replacements for those decisions.

## Storage conventions

The first build has six Tracker/Review tables: `trackers`, `client_trackers`, `tracker_entries`, `tracker_entry_attachments`, `tracker_requests`, and `reviews`. The assignment and attachment tables implement the spec's list and ordered report membership; they are not additional product concepts. There is no Tracker plan or universal record table.

Unless marked nullable, fields below are required. Every table has a UUID `id` primary key and conventional `inserted_at`/`updated_at` UTC timestamps, except the attachment join, which needs only `inserted_at`. Business-owned rows have a required `business_id` FK. Client-owned rows also have a required `client_id`, with a composite FK to `(clients.id, clients.business_id)`. Add the referenced composite unique keys needed by the FKs described below. History-bearing FKs restrict deletion.

Business and actor IDs come from trusted Ctx, never editable JSON. Owner access covers the business; other coaches access their assigned clients. Client access targets `ctx.client_id`. Every public read and mutation applies this rule, including attachment downloads and source-record links. Clients never receive Review assessment or private notes.

Use explicit `:utc_datetime_usec` fields for effective instants and review/change cutoffs; conventional timestamps can retain the backend contract's `:utc_datetime`. This precision choice needs to be documented as a narrow backend-contract extension. Equality boundaries still require transaction ordering; microseconds alone do not solve concurrency.

## 1. `trackers`: one library definition

| Field | SQL / Ecto type | Null? | Meaning |
|---|---|---|---|
| `business_id` | UUID FK | Yes | Null for a built-in; business ID for a custom Tracker |
| `creator_id` | UUID FK users | Yes | Required for custom Trackers; null for system built-ins |
| `builtin_key` | text | Yes | Stable built-in identity, such as `reflection` or `body_weight` |
| `name` | text | No | Display label; does not define identity |
| `kind` | text / Ecto.Enum | No | `quantity`, `rating`, `text`, `photo`, `document` |
| `unit` | text | Yes | Required for quantity; built-in canonical metric unit or custom free text |
| `rating_min`, `rating_max` | integer | Yes | Both required only for rating; min < max |
| `rating_labels` | jsonb / map | Yes | Optional labels keyed by valid integer scale values |
| `default_timing` | text / Ecto.Enum | No | `daily`, `weekly`, `after_workout`, `after_meal`, `on_request` |
| `archived_at` | UTC instant | Yes | Only custom Trackers may be archived |

Checks enforce the kind-specific unit/scale fields and ownership shape: built-in means null business/creator plus non-null key; custom means non-null business/creator plus null key. `builtin_key` is unique when present. Names need not be unique. Reject blank names and units. Add unique `(id, kind)` for entry shape enforcement.

The built-in registry in code maps keys to canonical units and display conversions. Built-in quantities are normalized to their metric storage unit before persistence and displayed using the client's `unit_system`. Custom `unit` is an opaque string: `cups`, `hours`, and `scoops` do not gain automatic conversions because their labels resemble known units. No units table, `boolean` kind or special duration kind is required by the agreed first build; duration can be a quantity.

Coach mutations: create custom Tracker, edit name/default timing, edit meaning-bearing fields before first use, archive, restore, delete only when unreferenced. Lock the Tracker when inserting its first entry or changing kind/unit/scale so concurrent writes cannot change interpretation. Meaning-bearing fields become immutable once any entry exists, including a deleted entry. Built-ins are system-managed and cannot be archived. Referenced list/default/request definitions prevent physical deletion even when there are no entries.

Archival behavior is an explicit decision below. History always keeps its definition. Changing a library default timing never silently rewrites a client's list.

## 2. `client_trackers`: one effective timing interval

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `business_id`, `client_id` | UUID FKs | No | Client-owned list |
| `tracker_id` | UUID FK trackers | No | Visible built-in or same-business Tracker |
| `timing` | timing enum | No | Timing for this interval |
| `effective_from` | UTC instant | No | Server time when added or timing changed |
| `effective_until` | UTC instant | Yes | Exclusive end; null while active |
| `position` | integer | No | Display order, >= 0 |
| `creator_id` | UUID FK users | No | Coach who made this interval |

Intervals are `[effective_from, effective_until)`. Require end > start and use an exclusion constraint against overlapping intervals for `(business_id, client_id, tracker_id)`, plus a partial unique key for the open interval. Validate visibility of the Tracker in the context; its nullable global/business ownership cannot be expressed by an ordinary composite FK alone.

Adding opens an interval. Removing closes it. Changing timing closes the current interval and opens its replacement at the same server instant, in one transaction. Re-adding opens another row; it never clears the earlier end. Reordering may change `position` without changing historical eligibility. Do not allow future scheduling or backdating of list edits in this build.

Serialize list edits and event completion/first-save for the same client. Events and list edits sharing timestamp precision must receive a deterministic boundary order; use strictly increasing effective instants under that lock or an explicit ordered tie-break. A date-only `added_on` cannot distinguish a 09:00 workout from a 15:00 assignment.

The list survives term end and resumption unchanged. A term gates prompts and writes; it does not end assignment intervals or copy defaults again. Daily/weekly timing creates reminders, not expected-entry rows. Client reminder weekday comes from the copied client setting below. Entries recorded through Add something else never create assignment rows.

## 3. `tracker_entries`: one independently corrected observation

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `business_id`, `client_id` | UUID FKs | No | Observed client |
| `tracker_id` | UUID FK trackers | No | Definition |
| `kind` | kind enum | No | Matches definition through composite `(tracker_id, kind)` FK |
| `local_date` | date | No | Date the observation concerns |
| `applied_timezone` | text | No | Valid timezone captured when recording |
| `occurred_at` | UTC instant | Yes | Actual time only when supplied; never invent midnight for a date-only observation |
| `number_value` | numeric / Decimal | Yes | Quantity in the definition's storage unit |
| `rating_value` | integer | Yes | Rating within definition bounds |
| `text_value` | text | Yes | Nonblank text for a text Tracker |
| `training_session_id` | UUID FK | Yes | Optional workout context |
| `diary_slot_id` | UUID FK | Yes | Optional Diary Slot context |
| `recorded_by_user_id` | UUID FK users | No | Immutable creator account |
| `recorded_by_type` | actor enum | No | `client` or `coach`; supplies Recorded by coach label |
| `recorded_at` | UTC instant | No | Immutable server insertion time |
| `revision` | positive integer | No | Starts at 1; expected revision required for correction/deletion |
| `changed_at` | UTC instant | No | Latest observable mutation time |
| `changed_seq` | bigint | No | Client-scoped committed change order, described below |
| `last_editor_id` | UUID FK users | No | Last actor account |
| `deleted_at` | UTC instant | Yes | Tombstone for deletion discovery |
| `idempotency_key` | UUID | No | Client-generated create identity |
| `creation_fingerprint` | bytea | No | Immutable hash of canonical original create input |

There is deliberately no unique key on client/date/Tracker or event/Tracker. Two weigh-ins or reports on the same day are separate observations. Uniqueness for creation retries is `(business_id, client_id, recorded_by_user_id, idempotency_key)`, including tombstones. Same key/different original input conflicts; a retry cannot recreate a deleted observation or compare against a later corrected payload.

Checks enforce exactly the appropriate value column for quantity/rating/text; photo/document use no scalar value. Finite decimal validation and rating bounds belong at the write boundary; cross-row scale validation runs under the definition lock. Attachment cardinality and MIME rules are checked in the entry transaction. At most one event FK may be present. Composite event FKs include business/client; source visibility and allowed source state are also authorized in the context. A linked event is context, not a required prescription or assignment.

Both actors may create entries while coaching is active, for any observation date allowed by the agreed recording contract. Local date and optional occurrence time must agree under the captured timezone when time is supplied. Preserve the applied timezone on corrections unless the user explicitly corrects the date/time basis. No plan, current assignment, or observation-date coaching term is required to record an entry.

Recommended correction ownership: clients edit/delete client-recorded entries; coaches edit/delete coach-recorded entries. Either actor sees both. Editing another actor's evidence needs an explicit product decision rather than an implicit broad CRUD grant. Creating a coach entry never pretends the client answered a request. Workout and meal writes remain client-only.

Tracker identity, creator and recording time stay fixed. Correct value/date/attachments with optimistic revision checks. If the wrong Tracker was used, delete and create another entry. Source IDs stay fixed once attached; resolving a wrongly linked event can use delete/recreate. Tombstones stay out of summaries but remain in change discovery. Do not physically cascade source deletion to entries; retain a source tombstone and show unavailable context.

## 4. `tracker_entry_attachments`: ordered private files

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `business_id`, `client_id` | UUID FKs | No | Same client as entry and attachment |
| `tracker_entry_id` | UUID FK | No | Parent entry |
| `attachment_id` | UUID FK attachments | No | Private upload |
| `position` | integer | No | Zero-based order, >= 0 |

Unique `(tracker_entry_id, attachment_id)` and `(tracker_entry_id, position)`. Use composite FKs including business/client for both parent and attachment. No polymorphic `record_type/record_id` join. A report is one document entry with one or more PDF/image links; a second report is another entry. Recommended photo cardinality is exactly one image per entry; front/side/back remain separate Trackers.

Create or replace the ordered membership in the parent entry transaction. Check every supplied ID exists for this business/client and its MIME is allowed. Every reorder, addition, removal or replacement advances the parent revision, changed time and change sequence. Removing membership or deleting an entry does not delete the storage object, because a chat message or another entry may still reference it.

Reuse `Easy.Attachments`: client-scoped rows, the private bucket, presigned PUT and authorized signed GET. Do not use `library_media`, whose delivery is public. Keep uploader identity separate from observation author; access is scoped by the attachment's client, as in the service.

The inspected service has no upload-completion state or content-verification endpoint. An issued attachment ID is an upload ticket, not proof that bytes arrived. The first UI must finish PUT successfully before saving the entry and support retry when a file is unavailable. Do not falsely label a database attachment row as a verified upload. An object-verification/finalization API may be added within that service later, with its own migration and cleanup design; it is not a prerequisite to defining report membership.

Images retain the service's 15 MiB per-file limit. PDF MIME/extension support and a PDF limit must be added explicitly: the service has no current PDF limit. Recommend 15 MiB per PDF and 20 files per report as initial bounded values, pending approval. Do not copy chat's four-file limit without a report decision. No destructive orphan-cleanup job is included in this build.

## 5. `tracker_requests`: one coach ask with durable closure

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `business_id`, `client_id` | UUID FKs | No | Requested client |
| `coaching_term_id` | UUID FK coaching_terms | No | Term covering request creation |
| `tracker_id` | UUID FK trackers | No | Requested observation |
| `requested_by_id` | UUID FK users | No | Coach account |
| `requested_at` | UTC instant | No | Immutable server request time |
| `fulfilled_by_entry_id` | UUID FK tracker_entries | Yes | Client entry that fulfilled the ask |
| `fulfilled_at` | UTC instant | Yes | Server fulfillment time |
| `cancelled_at` | UTC instant | Yes | Explicit coach cancellation |
| `cancelled_by_id` | UUID FK users | Yes | Present with cancellation |

Term FK includes `client_id`, backed by a unique `(coaching_terms.id, client_id)`. Entry FK includes business/client/Tracker, backed by the corresponding entry unique key. Pair each closure ID with its timestamp; prohibit both fulfilled and cancelled. Partial unique `(business_id, client_id, coaching_term_id, tracker_id)` where no closure allows one open ask per Tracker per term. No due date, expiry, stored open status or entry-side duplicate request FK is needed.

Create only during the term covering today. Coach can cancel an unanswered ask; no editing identity or request time. The UI derives open as unclosed AND request term = today's current term. Ended-term asks stay historical and never return on resumption.

On a successful client entry creation, lock the relevant request and fulfill an open ask of the same Tracker in the current term, only if the entry was recorded after the ask. Its observation date may be earlier. Coach entries, edits of pre-request entries, and retries of earlier creates do not fulfill it. Serialize request creation and entry creation under the client lock and allocate strictly increasing server instants across these actions, including timestamp ties. No request needs to exist for entry creation to succeed.

Recommended deletion rule: fulfillment is a historical receipt. Deleting its entry shows Received, entry deleted and does not reopen the ask. A coach can issue another request. This avoids repeatedly reviving old requests through ordinary corrections, but requires explicit acceptance below.

## 6. `reviews`: one saved coach assessment

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `business_id`, `client_id` | UUID FKs | No | Reviewed client |
| `coaching_term_id` | UUID FK | No* | Current term at save; see off-term decision |
| `reviewer_id` | UUID FK users | No | Coach who saved the Review |
| `reviewed_at` | UTC instant | No | Immutable save time |
| `reviewed_on` | date | No | Immutable client-local date at save |
| `applied_timezone` | text | No | Timezone used for reviewed_on |
| `seen_at` | UTC instant | No | Server moment the review read was taken |
| `seen_change_seq` | bigint | No | Exact change cutoff from that read |
| `assessment` | enum | No | `on_track`, `needs_attention`, `at_risk` |
| `private_note` | text | Yes | Coach-only note |
| `revision` | positive integer | No | Correction conflict detection |
| `last_editor_id` | UUID FK users | No | Last coach editor |
| `idempotency_key` | UUID | No | Save retry identity |
| `creation_fingerprint` | bytea | No | Immutable original save fingerprint |

Term FK includes client. Unique `(business_id, client_id, reviewer_id, idempotency_key)`. Multiple Reviews per date are allowed. Check seen_at <= reviewed_at, nonnegative seen sequence, positive revision, and the enum. Server issues a signed read token bound to business/client/reviewer carrying seen_at/sequence; save does not accept an arbitrary client-authored cutoff.

Saving takes the assessment chosen by the coach; the UI pre-fills the latest assessment or On track for the first Review. Private note and optional reply can be blank. Save Review and reply atomically. Focus/request changes may be part of the same explicit save transaction or independent client actions; they are not embedded Review state.

Editing assessment, private note or reply requires expected revision and never changes reviewed_at, reviewed_on, term or seen cutoff. No Review deletion is required by the agreed spec. Authorized team coaches may edit; record the last editor. Original authorship remains intact.

Due is derived only while today's term exists: no Review in that term means due today; otherwise use the latest Review's reviewed_on + client frequency. Editing a Review never resets this date. Frequency is calendar days, not elapsed 24-hour durations. Latest assessment and private note derive from Reviews, not duplicate mutable client fields.

### Existing chat extension for the reply

Add nullable `review_id` to `chat_messages`, with composite `(review_id, business_id)` FK to Reviews and partial unique `review_id`. Validate that the message's conversation belongs to the Review's client inside the save transaction; the existing message row does not have its own client ID. Add nullable `edited_at` and `deleted_at` if chat retains tombstones. The message body is the sole reply text; do not duplicate it on Reviews. An internal review ID may link the message without exposing the coach-only Review payload to clients. Client navigation must show only the reply-safe representation.

Edit the linked message in place and mark it edited. Deleting a reply tombstones that same message; adding it back may restore the same linked row with an edit marker. Advance Review revision for reply changes. Update conversation previews and unread calculations consistently; deletion must not leave a private or deleted body in preview caches. Existing frozen training/meal previews do not include private assessment or notes. Review reply mutation is additional chat behavior, not behavior already implemented.

## Extensions to existing client and business tables

| Table | Added field | Type / nullability | Default and rule |
|---|---|---|---|
| `clients` | `review_frequency_days` | required smallint | Copy business default; check IN (1,3,7,14,28) |
| `clients` | `reminder_weekday` | required smallint | Copy business default; ISO weekday 1..7 |
| `clients` | `focus` | nullable text | One line; recommend max 500 characters |
| `clients` | `record_change_seq` | required bigint | 0 initially; >= 0; transactional change counter |
| `businesses` | `default_review_frequency_days` | required smallint | 7; same allowed values |
| `businesses` | `default_reminder_weekday` | required smallint | 7, Sunday |
| `businesses` | `default_trackers` | required jsonb array | Ordered `{tracker_id, timing}`; initially Reflection/weekly |

Validate default Tracker references and business visibility while saving settings; reject duplicate IDs and unsupported timings. JSON is sufficient because the default list is replaced as one business setting and has no historical event identity. Tracker deletion must check these references transactionally; alternatively retain all Tracker definitions rather than allowing physical deletion.

New clients get copied settings and assignment intervals. Existing clients retain their choices unless the coach explicitly selects Apply to all existing clients. Recommended meaning is exact replacement of the affected setting: diff the list, close removed/retimed intervals at the application instant, insert additions, preserve unchanged intervals. Do not backdate history or replace every interval unnecessarily. Business-setting authority follows business settings permissions; list/focus/frequency mutations follow client access. A returning client is not a new client.

## Event coverage and reminders

Recommended first-build event anchors are workout completion and the first saved Diary Slot containing actual intake. Use server instants, preserved across corrections. Training's completed `closed_at` is a candidate anchor; Nutrition needs an explicit immutable `first_recorded_at` if insertion can precede actual intake. A Diary Slot is one event; adding another embedded Diary Entry does not create another meal event. Confirm this interpretation before shipping coverage.

For a Tracker/range, denominator = distinct eligible, non-deleted events whose anchor fell inside an `after_workout` or `after_meal` interval and whose observation date falls in the requested range. Include both planned and freestyle workouts. Require the coaching term active at the event anchor. Numerator = distinct denominator event IDs with at least one non-deleted entry for this Tracker and that event. Three entries against one workout count as one covered workout. An unlinked entry remains useful data but does not imply coverage. Coach-recorded entries count as recorded coverage while keeping their author label.

Example: workout A completes 09:00; Energy is assigned 12:00; workout B completes 16:00. Only B enters the denominator. Removing at 17:00 and re-adding next day creates a gap, not a rewrite of A/B history. An answer added later can cover B. A correction or deletion recomputes recorded coverage. Discarded/deleted source events leave the denominator; linked observations remain as history with unavailable context.

Daily reminders are satisfied by any non-deleted entry for that Tracker on today's local date. Recommended weekly interpretation: show on the reminder weekday until there is an entry dated that day, then remove at local day end; do not create a week-long debt. Requests are independent and follow recording time, not this reminder-date test. Removing a Tracker stops its list prompt immediately but does not cancel a separate request unless explicitly chosen.

## Reliable New since last review

Each Training Session, Diary Slot and Tracker entry remains its own record. The read view unions their public change markers; no shared write table is introduced. The cross-domain requirement is a parent `changed_at`, `changed_seq`, and a retained deletion marker/state.

Use a short transaction with a client-row lock for every review-visible record mutation and the review-data snapshot. A mutation increments `clients.record_change_seq` and writes that sequence plus changed_at to the affected record before committing. Child mutations touch their visible parent in the same transaction: Performed Set add/edit/delete touches the Training Session; embedded Diary Entry edits touch the Diary Slot; attachment membership changes touch the Tracker entry. Parent deletion retains a tombstone. The counter rollback follows the transaction.

The review read acquires that lock, captures seen_at and record_change_seq, reads the record data consistently, then releases the lock before the coach starts reading. The returned server token fixes that snapshot cutoff. Writes committed afterward receive a higher sequence. The saved Review keeps that token even if the coach spends an hour reading. Feed membership uses changed_seq > seen_change_seq, with changed_at for display. A plain timestamp test can miss a writer that started before the read and committed afterward.

Paginated or lazily loaded review data must use the same captured snapshot/cutoff; merely stamping the page-open time and later fetching inconsistent data is insufficient. Do not hold a database transaction open while the human reads. A practical first build materializes the bounded review response at open; explicit reload produces another token.

Multiple coaches may save in a different order from opening screens. Recommend the greatest saved seen_change_seq as the team seen boundary, while the latest reviewed_at controls due/assessment. This prevents an older open screen from moving the team's boundary backward. The agreed spec literally says last Review; this concurrency interpretation is a product decision, not silently approved. Either policy must still surface deletions and edits to historical dates.

## Decisions to settle with the user

| Decision | Recommended first-build choice |
|---|---|
| Table representation of Tracker list | Timestamp interval rows in `client_trackers`; acknowledge this physical table beyond the spec's four named categories |
| Unit conflict with overview D3 | Preserve the agreed metric built-ins and opaque custom units unless explicitly superseded |
| Review outside an active term | Require an active term to save; spec also says any client at any time, so resolve that conflict explicitly. If off-term Reviews are wanted, make term nullable and exclude them from later-term due calculation |
| Cross-actor entry corrections | Actor owns their recorded entries; authorized coaches own coach-created entries |
| Deleting a request's answer | Preserve receipt, show deleted answer, allow a fresh request |
| Archiving a Tracker still assigned/requested | Require an explicit archive action that closes active list intervals and cancels open requests; restoring does not silently reassign or reopen |
| Photo/report bounds | One image per photo entry; 20 files per report; 15 MiB per PDF, images retain service limits |
| What counts as a meal event | One Diary Slot's first saved actual intake; no extra event for every embedded food entry |
| Weekly reminder satisfaction | Entry on the reminder date; reminder expires at day end |
| Concurrent Review cutoffs | Greatest saved cutoff for team seen state; latest saved Review for due and assessment |
| Apply defaults to all | Replace affected client settings, preserving unchanged intervals and historical data |

## Evidence and verification limits

Graph tool inventory was unavailable in this session; no graph project, generation, or coverage result was established. This is a source-fallback design, not a graph completeness claim. Read the agreed spec, glossary, backend contract, overview, shared report and validation. Directly inspected `backend/lib/easy/attachments.ex`, `attachments/attachment.ex`, `chat/message_attachment.ex`, `orgs/business.ex`, `coaching_terms/coaching_term.ex`, `nutrition/diary_slot.ex`, and `training/training_session.ex`. The shared report supplies wider access/chat/migration evidence; that wider audit was not independently repeated here. No runtime behavior, migration or test was changed or executed.
