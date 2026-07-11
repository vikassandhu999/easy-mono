# Check-ins: real-world flow (cadence, review, metrics, photos)

**Date:** 2026-07-11
**Status:** Approved
**Apps:** `backend`, `frontend/apps/coachapp-v2`, `frontend/apps/clientapp-v2`

## 1. Problem

Check-ins today are one generic forms pipeline (`FormTemplate` → `FormAssignment` → `FormSubmission` in `Easy.ClientProfiles`) and the loop is open on both ends:

* No recurrence. A "weekly check-in" is a one-off assignment; a coach with 30 clients must re-assign 30 forms every week by hand. The 2026-06-20 profile spec deferred "automated recurring check-in assignment" and nothing picked it up.
* No close. The client submits, the coach reads answers on the client-detail card, and that is the end. There is no reviewed state, no queue of submissions awaiting the coach, and no reply affordance, even though `Easy.Chat` exists.
* No data. Answers are text/select values copied into profile fields. A weight question overwrites last week's profile value instead of appending to the `weight_entries` table that already exists (unwired) in the same migration. No photos, no rating trends.
* Nothing chases the client. `due_date` exists but overdue is not a state, and there are no reminders.
* Hygiene: the backend does not enforce `required` on submit (client-side only), `client_profiles.intake_status` drifts if an intake assignment is dismissed or reopened via the generic PATCH, and a coach cannot edit an assignment after creating it.

Target flow: invite → intake (already works) → coach sets a cadence once → occurrences appear automatically with due/overdue states and email nudges → client submits weight, ratings, photos → coach works a review queue, marks reviewed, replies in chat → trends accumulate on client detail.

## 2. Data model

All changes stay inside the existing forms domain. No dedicated check-in entity is introduced; a check-in remains a `FormAssignment`.

### 2.0 Purpose collapse

`form_templates.purpose` and `form_assignments.purpose` shrink from `intake | weekly_check_in | nutrition_update | training_update | custom` to **`intake | check_in`**. A migration remaps existing rows (`weekly_check_in`, `nutrition_update`, `training_update`, `custom` → `check_in`) and tightens the CHECK constraints. `intake` keeps its special pipeline (auto-assign on invite, `intake_incomplete` flag, profile `intake_status` sync); everything else is a check-in. There is no third kind. The builder's purpose select disappears — coach-created templates are always `check_in`; the single intake template is curated code.

### 2.1 New table: `check_in_schedules`

| Field | Type | Notes |
|---|---|---|
| `business_id` | FK | composite tenant FK, `with: [business_id: :business_id]` like siblings |
| `client_id` | FK | |
| `form_template_id` | FK, `:restrict` | same delete-guard semantics as assignments |
| `frequency` | enum `once \| weekly \| biweekly \| monthly` | CHECK constraint mirrors enum |
| `next_due_on` | date | the anchor; advanced by frequency on each generation |
| `active` | boolean, default true | pause = `active: false`; no soft delete |

Unique partial index on `(client_id, form_template_id) WHERE active` — one active cadence per client per template. `next_due_on` doubles as the anchor day, so there is no weekday/day-of-month math: weekly adds 7 days, biweekly 14, monthly adds one calendar month (clamped to month end).

A one-time check-in is a schedule with `frequency: once` — same table, same generation path as recurring. After its occurrence is generated the schedule flips to `active: false`. This replaces manual one-off assignment: the coach assigns exclusively through schedules, so `POST /form-templates/:id/assign` is retired (intake auto-assign stays an internal context function creating the assignment directly).

### 2.2 `form_assignments` additions

* `check_in_schedule_id` — nullable FK. Present = a generated occurrence; absent = a one-off manual assignment. Both flow through the same submit path.
* New status **`:missed`** added to `assigned | in_progress | completed | dismissed`. Set only by the sweep (§3) when it generates the next occurrence while the previous one is still open. A missed assignment is terminal and not submittable.
* `due_reminder_sent_at`, `overdue_reminder_sent_at` — utc_datetime, email idempotency stamps.

### 2.3 `form_submissions` additions

* `reviewed_at` (utc_datetime), `reviewed_by_id` (coach user id). Unreviewed check-in = submission with `reviewed_at IS NULL` whose assignment purpose is `check_in`. That predicate IS the review queue; no queue table. (Intake submissions skip the queue — the profile card is where intake lands.)

### 2.4 New question types

The six field types (`text | number | boolean | date | select | multi_select`) gain three:

* `rating` — integer 1 to 5. Stored in `answers` like any value. Trendable because question ids are stable across a template's submissions.
* `weight` — numeric. On submit, in addition to any profile mapping, the backend appends a `weight_entries` row (value, date = submission date, provenance = submission id). This is the only question type with a side effect outside the profile.
* `photo` — answer value is a list of attachment ids (§2.5). Max 4 per question.

`profile_field_definitions.field_type` does NOT gain these three; they are question-only types. The changeset validation in `form_template.ex` and the OpenApiSpex `Common` enum lists are the two places the type list lives.

### 2.5 New table: `attachments`

| Field | Type | Notes |
|---|---|---|
| `business_id` | FK | tenant-scoped like everything else |
| `client_id` | FK | the client the file belongs to |
| `uploaded_by_type` / `uploaded_by_id` | enum + binary_id | mirrors `submitted_by_*` convention |
| `storage_key` | string | Tigris object key, never a URL |
| `content_type` | string | validated allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/heic` |
| `byte_size` | integer | max 15 MB |
| `purpose` | enum, starts with `check_in_photo` | generic on purpose; chat images can join later |

Storage is Tigris (S3-compatible, native on Fly) via presigned URLs: client asks the backend for a presigned PUT, uploads directly, then references the attachment id in `answers`. Reads are presigned GETs with short expiry, minted in the JSON views. The backend never proxies file bytes.

## 3. The sweep

Extends the existing nightly sweep (same pattern as the subscription-expiry sweep). Two jobs, both idempotent:

1. **Generate occurrences.** For each active schedule with `next_due_on <= today` where the client is `active`: mark the previous still-open occurrence of this schedule `:missed` (if any), insert a new `FormAssignment` (purpose from template, `due_date = next_due_on`, `check_in_schedule_id` set), advance `next_due_on` by frequency (for `once`, set `active: false` instead), send the due-day email, stamp `due_reminder_sent_at`. For schedules of `inactive` clients the sweep advances `next_due_on` without creating an assignment or sending email — the schedule stays active and resumes naturally when the client returns, with no backlog.

   The same generation function runs at schedule creation when `next_due_on <= today`, so "due today" (including every one-time assignment the coach fires off on the spot) reaches the client immediately instead of waiting for the nightly run.
2. **Overdue nudge.** For each open assignment with a `due_date` 2+ days past and `overdue_reminder_sent_at IS NULL`: send one overdue email, stamp it. One overdue email per occurrence, ever.

Both emails go through the existing Swoosh mailer (`Easy.Emails`). Copy is one line plus a deep link into the clientapp check-in.

Late submission is allowed: an overdue assignment stays submittable until the sweep marks it `:missed` (which only happens when the next occurrence is due). `:missed` and `:dismissed` are the two non-submittable terminal states. Occurrences of a `once` schedule have no next occurrence, so nothing auto-marks them missed — they stay Overdue and submittable until the client submits or the coach dismisses.

## 4. Backend API

Kebab routes, Ctx-first context functions, OpenApiSpex schemas updated alongside (remember: full `phx.server` restart to bust the cached spec).

Coach scope:

* `GET/POST /clients/:client_id/check-in-schedules`, `PATCH/DELETE /check-in-schedules/:id` (PATCH covers frequency, next_due_on, active; DELETE is for schedules never used — pausing is the normal off switch). Creating a schedule is the only way a coach assigns a form; `POST /form-templates/:id/assign` is removed.
* `GET /check-ins/review-queue` — unreviewed check-in submissions across all the coach's clients, newest first, with client summary embedded
* `POST /form-submissions/:id/review` — stamps `reviewed_at`/`reviewed_by_id`; idempotent
* Existing `PATCH /form-assignments/:id` already covers due-date/status edits; the coach UI starts using it (§5)

Client scope:

* `POST /uploads` — body: purpose, content_type, byte_size → returns attachment id + presigned PUT URL
* Existing `POST /form-assignments/:id/submit` — answers may carry rating/weight/photo values

Submit-path changes (in `submit_assignment!/4`):

* **Enforce `required`.** Reject submission with a per-question error map when a required question in the template snapshot has no answer. Trust-boundary fix; ships first.
* Validate answer shapes per question type (rating in 1..5, photo ids exist and belong to this client, weight is a positive number).
* Weight side effect: append `weight_entries` row inside the same transaction.

Intake hygiene: `update_form_assignment/3` syncs `client_profiles.intake_status` whenever it touches an intake assignment's status (dismiss → `:dismissed`, reopen → `:assigned`), not only on submit.

## 5. Coach UI (coachapp-v2)

* **Forms library.** The Library nav item is renamed from "Check-ins" to **"Forms"** and lists every template with a type chip: **Intake** (the one curated template, visible and editable here — question snapshots keep past submissions safe) or **Check-in** (everything else). The builder loses its purpose select; new templates are always check-ins. Type filter chips at the top.
* **Client detail.** The assign control always creates a schedule: template + "Repeats" (`Once / Weekly / Biweekly / Monthly`) + first due date. The check-in card shows cadence ("Weekly · next due Sun Jul 13"), pause/resume, and history as a list of occurrences with `Completed / Missed / Due` chips. Below it, trends: a weight sparkline from `weight_entries` and per-rating-question mini trends built client-side from the submissions list (stable question ids). The card also exposes edit-due-date and dismiss on an open assignment (the existing PATCH, finally surfaced).
* **Review queue.** The Forms page gains a "To review" tab: unreviewed submissions across clients, newest first. Opening one shows the full answers (photos rendered inline via presigned GETs), the client's trend strip, and two actions: **Mark reviewed** and **Reply in chat**. Reply deep-links to the existing conversation with a prefilled quote line ("Re: check-in Jul 11 — "); sending the message does not mark the submission reviewed, the button does.
* **Dashboard.** A "N check-ins to review" card linking to the queue (same derived predicate; no new endpoint beyond the queue list).

## 6. Client UI (clientapp-v2)

* **Check-ins tab.** Status chips gain `Due today`, `Overdue`, `Missed`, and `Completed · Reviewed ✓` (reviewed shown when `reviewed_at` is set). Missed items are visible but not openable for filling.
* **Home.** A due/overdue check-in gets a nudge card, same pattern and placement as the intake card. Intake keeps priority when both are open.
* **Fill flow.** Three renderers join `checkin-field.tsx`: rating (5-dot tap row), weight (number input + unit label), photo (camera/library picker → presigned upload with progress → thumbnail; remove before submit).

## 7. Phasing

Each phase ships independently, in order:

1. **Hygiene.** Backend `required` enforcement + answer-shape validation, intake_status sync on dismiss/reopen, coach edit/dismiss UI on open assignments.
2. **Cadence.** Purpose collapse to `intake | check_in` (+ remap migration), `check_in_schedules` incl. `once`, sweep jobs + immediate generation on create, `:missed` status, reminder emails, client due/overdue/missed states, coach Forms library rename + schedule-based assign, retire the assign endpoint.
3. **Review loop.** `reviewed_*` fields, review endpoint + queue endpoint, coach queue tab + dashboard card, chat deep-link reply, client "Reviewed ✓".
4. **Ratings + weight.** Two question types, submit-path side effects, builder support, client renderers, trends on client detail.
5. **Photos.** `attachments` + Tigris presign plumbing, photo question type, builder + client picker, inline rendering in review.

## 8. Out of scope

* Push notifications (Capacitor FCM/APNs is its own project; email + in-app states first)
* Per-question coach comments or any feedback surface outside chat
* Intake content changes; intake stays soft-required and never blocks
* Body measurements beyond weight; photo comparison/side-by-side views
* Timezone-aware sweep scheduling (inherits whatever the existing nightly sweep does)
* A third form kind — `custom` and the update purposes are gone; everything a coach builds is a check-in
* Renaming the clientapp "Check-ins" tab — client-facing vocabulary stays "check-in" even though the coach library is "Forms"
