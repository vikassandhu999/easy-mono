# Reviews, chat, and Trackers

Status: Tracker and Chat concepts agreed, 10 October 2026. Reviews are deferred until the recording domains are built and tested with coaches. Review rules below are retained design notes, not the next implementation scope. This design supersedes conflicting Tracker and review-reply rules from the 3 October spec. It is not an implemented database contract. Training and nutrition follow their own concept documents.

## Purpose

During a coaching term, the client records facts, the client and coach discuss them, and the coach regularly reviews the ongoing record. Recording, communication, and assessment have independent lifecycles. There is no check-in period or client submission.

## Agreed decisions

| # | Decision |
|---|---|
| R1 | Tracker defines what can be recorded. TrackerSchedule defines the ask and timing. TrackerLog records a dated observation. |
| R2 | Reflection is a text Tracker answering a defined prompt. Chat is conversation. Both contain text but serve different purposes. |
| R3 | Review owns the coach assessment and private note. ChatMessage owns communication. Sending a message does not mark a client reviewed; saving a Review does not require a message. |
| R4 | A chat message can refer to a Review or record. A review reply is an ordinary linked ChatMessage, not text stored and edited in two models. |
| R5 | TrackerSchedule replaces Tracker assignment. A TrackerLog can exist without a schedule. Ending a schedule preserves logs. |
| R6 | Schedule timing is selected weekdays, after_workout, after_meal, or once. Weekday timing uses the agreed weekday-mask convention. Event timing does not become a calendar rule. |
| R7 | A once request is a TrackerSchedule, not a separate TrackerRequest. It stays outstanding until fulfilled or cancelled. SubmitBefore and automatic expiry are omitted. |
| R8 | Weekday reminders end with their day without a backlog. Event prompts appear in the event recording flow; a log can be added later against that event. Once requests stay outstanding. |
| R9 | Tracker prompts have no overdue state. Once requests can show Waiting since a date. Reviews can be overdue because review frequency supplies a due date. Missing records can show missing coverage. |
| R10 | A specific log fulfils a once request through an explicit link. Recording from that request can create the link automatically. Unrelated logs do not close it. |
| R11 | TrackerLog replaces the term Tracker entry in the design. It records measurement time separately from entry time, author, value, optional note, and optional workout or nutrition context. |
| R12 | Basic value types are number, rating, yes_no, text, photo, document. Named compound types support one observation with several related values, starting with blood_pressure. |
| R13 | Compound types are defined by the product, with fields, units, validation, and report behaviour. Coaches do not build arbitrary compound schemas. Blood pressure keeps systolic and diastolic together. |
| R14 | Independent values entered on one screen remain separate logs. Repeated weight measurements are separate logs. Several photos from one occasion or files belonging to one report are ordered attachments on one log. |
| R15 | Activities with their own interval or lifecycle, such as sleep or fasting, keep dedicated models. Multiple fields alone do not make them Trackers. |
| R16 | Use shared tracker_logs for observation metadata and separate typed value tables. Each saved log has exactly one value shape matching its Tracker. Attachment types use attachment relations. Detailed database enforcement remains open. |
| R17 | Reports select a client, Tracker, and date range, then read typed values. Latest and maximum are derived per client and Tracker, not per value type. |
| R18 | Maximum only exists where meaningful. Blood pressure has separate systolic and diastolic maxima, potentially from different logs. Text, photo, and document have no maximum. |
| R19 | Do not store latest/max log pointers initially. Add derived summaries keyed by client and Tracker only if measurements justify them. Logs remain the source of truth; corrections, deletions, and backdated records must be handled. |
| R20 | The client can record several observations on one screen. Coach views are timeline, Tracker history, and Review summary. UI grouping does not create a grouped Tracker. |

## Model responsibilities

```text
Tracker -> TrackerSchedule
   └----> TrackerLog -> typed value or ordered attachments
                └---- optional schedule fulfilment / event context

WorkoutLogs + NutritionLogs + TrackerLogs -> Review
ChatMessage -> optional record or Review reference
```

The arrows describe relationships, not required execution steps. Review reads records; it does not own or close them.

| Model | Proposed fields / shape |
|---|---|
| Tracker | id, business_id (null for built-ins), name, description, value_type, type-specific definition, archived_at |
| TrackerSchedule | id, business_id, client_id, tracker_id, timing, timing-specific details, instructions, starts_on, ends_on, cancellation for once |
| TrackerLog | id, business_id, client_id, tracker_id, measured_at, recorded_at, recorded_by, note, optional context and schedule reference |
| Review | client, coach, reviewed_at, reviewed_through_seq, assessment, private_note |
| ChatMessage | sender, conversation, content, optional record or Review reference; message edits belong to chat |

These are domain shapes, not final DDL. Shared record/journal fields and access rules still apply. Fulfilment links and recurring occurrence identity need precise design.

## Value types

| Type | Definition | Value / relation |
|---|---|---|
| number | Unit and optional valid bounds | Numeric value in base unit, plus entered unit |
| rating | Scale and labels | Selected scale value |
| yes_no | Defined question | Boolean |
| text | Defined prompt | Written response |
| photo | Photo measurement | Ordered image attachments |
| document | One report | Ordered PDF/image attachments |
| blood_pressure | Product-defined compound observation | Systolic and diastolic, both in mmHg |

Names and descriptions can change without rewriting logs. Value meaning must be preserved. Changing a number into a rating requires a different Tracker. Exact definition-edit and snapshot rules remain open.

## PostgreSQL direction and reports

```text
tracker_logs
  id, business_id, client_id, tracker_id
  measured_at, recorded_at, recorded_by, note, ...

tracker_number_values
  log_id PRIMARY KEY, value, entered_unit, ...

tracker_rating_values
  log_id PRIMARY KEY, value

tracker_blood_pressure_values
  log_id PRIMARY KEY, systolic_mmhg, diastolic_mmhg
```

Other basic types have typed storage or attachment relations. A foreign key from value rows to logs is required. A primary key on log_id prevents two rows in one value table; by itself it does not enforce exactly one matching value across all tables. The complete write and constraint design is a next-stage task.

| Initial index | Query |
|---|---|
| tracker_logs (business_id, client_id, tracker_id, measured_at, id) | Tracker history and range reports |
| tracker_logs (business_id, client_id, measured_at, id) | Client Tracker timeline |
| Each value table primary key (log_id) | Value joins and one row per log within that table |

Index value columns only for demonstrated queries. Range reports filter observations first and calculate over the selected rows. Pagination and date-range filtering limit reads. No performance claim has been tested.

Latest uses measurement time with a deterministic tie-breaker. Maximum reads the relevant typed value. The tie-breaker, null rules, and treatment of corrections/deletions remain to be specified.

## UI

One measurement screen can show weight, waist, blood pressure, and photos. Save creates separate logs for independent observations; blood pressure remains one compound log. Save atomicity and retry behaviour are detailed API decisions.

The coach timeline shows dated observations, notes, and attachment previews. Tracker history shows a selected range and appropriate trends. Review summary shows selected values, changes, and coverage. Blood pressure displays both readings together and charts them separately. Text and files do not get numeric charts.

Paginate the timeline, load charts for a chosen range, and fetch attachment content when opened. Opening a request provides its context and automatically links the recorded response.

## Review workflow and retained rules

The following rules from the earlier spec remain unless revised explicitly:

- Review frequency is 1, 3, 7, 14, or 28 days; business default is 7. A three-day interval is not literally two fixed reviews per calendar week.
- A client is due at the current coaching term start if not reviewed in that term, then at last Review date plus frequency. Missed reviews do not accumulate. A coach can review at any time.
- Assessment is On track, Needs attention, or At risk, selected by the coach. Assessment and private note are coach-only. They can be edited; review time stays fixed.
- Review reads a consistent record-change boundary and saves reviewed_through_seq. Later changes, including corrections to older logs and changes during reading, remain new for the next Review.
- The roster shows due/overdue, last reviewed, assessment, unread chat, and outstanding once asks. These are derived facts, not a separate work queue.
- Focus is one client priority line, shown until changed or cleared. It stays independent of messages and Review.
- Tracker logs can be recorded on any day by the client or an authorised coach. Coach-authored logs are labelled. Missing data is not proof that an activity was skipped.
- Clients can record library Trackers that are not scheduled. Custom Trackers with logs can be archived and restored; built-ins cannot be archived.
- The default Tracker template contains weekly Reflection. Template application copies schedules. Business defaults apply to new clients; applying them to other clients is an explicit coach action.
- Reviews and prompts operate during coaching terms; history stays readable afterward. Client writes use the coaching-term gate. Previous-term once asks do not return with a new term.
- Built-in numeric units convert through the client unit system. Custom free-text units have no implicit conversion. Front, side, and back photos remain separate built-in Trackers; a photo log can hold several images for its own Tracker.
- Owner/assigned-coach access remains tenant-scoped. Document logs preserve the original ordered report files.

The previous rule that only clients can record workouts is superseded by the workout concept. Nutrition author permissions remain a nutrition design decision. No new workout/nutrition permission rule is inferred here.

## Open detailed decisions

1. Typed-value constraints, definition history, corrections, deletion, units, validation, and reporting of unknown values.
2. Recurring occurrence and event-link identity; matching logs to prompts; fulfilment correction/deletion; overlapping schedules and duplicate requests.
3. One-off dates versus undated once requests, date bounds, cancellation fields, and term-scoping rules.
4. Review editing/deletion, message reference visibility, and independent message deletion after a linked Review.
5. Transaction boundaries, multi-log save/retries, journal writes, API and UX failure behaviour.
6. Reports, comparison ranges, photo comparisons, upload limits, notifications, and realistic performance verification.
7. Implementation slices. The earlier delivery order needs revision for this model; no build starts from this document alone.

No forms, arbitrary compound field builders, calculated risk/adherence scores, or automatic request deadlines are introduced. AI report parsing, specific-event Tracker schedules, imports, and push notifications remain future work.
