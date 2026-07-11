# Check-ins Phase 4: Ratings and weight implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task.

**Goal:** Make check-ins useful as longitudinal coaching data by adding rating and weight questions, deriving provenance-bearing weight records at submit time, seeding a practical weekly template, and showing weight and rating trends to coaches.

**Architecture:** `rating` and `weight` remain question-only JSON types in form-template snapshots. Submission validation owns their answer shapes. The existing submission transaction inserts one `weight_entries` row for each answered weight question, linked back to the submission. Existing client self-logging keeps its one-row-per-day upsert semantics through a partial unique index, while submission-backed entries append independently. Rating trends are derived client-side from existing assignment/submission responses, keyed by stable question id; no trend table or endpoint is introduced.

**Tech stack:** Elixir/Phoenix/Ecto/Postgres, OpenApiSpex, React 19, RTK Query codegen, HeroUI v3, native SVG charts.

## Global constraints

* `backend/AGENTS.md` remains authoritative: Ctx-first public functions, tenant-scoped query builders, bare-atom domain errors, transactions for multi-write operations, and `@spec` on public functions.
* `rating` and `weight` are valid only for form questions. `profile_field_definitions.field_type` remains unchanged.
* Ratings are integers from 1 through 5. Weight is a positive number below the existing 1000-unit bound.
* Every answered weight question creates a distinct `weight_entries` record in the same transaction as the submission and assignment completion. A rollback leaves none of those writes behind.
* Weight unit resolution is: newest weight entry unit, then client goal-weight unit, then the business default. A new business defaults to `kg`.
* Client self-logging still upserts the non-submission entry for a date. Submission-backed entries do not overwrite self logs or one another.
* Generated clients come from OpenAPI. Do not hand-edit `generated.ts`.
* Phase 5 owns photo questions; the Phase 4 preset bank excludes the photo preset.
* Backend finish gate is `mix precommit`; frontend gates are focused Biome, both affected app builds, `just check-rm`, and live 375px/1280px verification.

---

### Task 1: Extend question validation for rating and weight

**Files:**
* Modify: `backend/lib/easy/client_profiles/form_template.ex`
* Modify: `backend/lib/easy/client_profiles/form_submission.ex`
* Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Test: `backend/test/easy/client_profiles/form_template_test.exs`
* Test: `backend/test/easy/client_profiles/form_submission_test.exs`

**Interfaces:**
* Form-template question types become `text | number | boolean | date | select | multi_select | rating | weight`.
* `rating` accepts integers 1–5 only; `weight` accepts positive numbers below 1000.
* Profile-field OpenAPI enums stay on the original six types; form-question schemas use a separate question-type enum.

- [ ] Add red schema tests proving valid rating/weight templates pass and unknown types fail without changing profile-field types.
- [ ] Add red answer tests for rating boundaries, non-integers, positive weight bounds, optional blanks, and required blanks.
- [ ] Add a form-question type list in the template schema and validate every stored question's id, label, type, options, and mapping shape.
- [ ] Split OpenApiSpex form-question types from profile-field types and keep JSON/OpenAPI examples representative.
- [ ] Run focused schema tests and stock Credo.
- [ ] Commit: `feat(backend): validate rating and weight questions`.

---

### Task 2: Append weight entries from submissions

**Files:**
* Create: `backend/priv/repo/migrations/20260711140000_add_check_in_weight_provenance.exs`
* Modify: `backend/lib/easy/orgs/business.ex`
* Modify: `backend/lib/easy/fitness/weight_entry.ex`
* Modify: `backend/lib/easy/weight_entries.ex`
* Modify: `backend/lib/easy/client_profiles.ex`
* Modify: `backend/lib/easy_web/controllers/business_json.ex`
* Modify: relevant business and weight OpenApiSpex schemas
* Test: `backend/test/easy/client_profiles_test.exs`
* Test: `backend/test/easy/fitness/weight_entry_test.exs`
* Test: relevant business controller tests

**Interfaces:**
* Adds `businesses.default_weight_unit`, constrained to `kg | lbs`, default `kg`.
* Adds nullable `weight_entries.form_submission_id` with tenant/client-safe provenance and an index.
* Replaces unique `(client_id, date)` with a partial unique index for rows where `form_submission_id IS NULL`.
* Adds `WeightEntry.for_self_logs/1`, `for_submission/2`, and newest-unit query composition.
* Submission creates weight entries dated from `submitted_at` and linked to the inserted submission.

- [ ] Add red tests for unit fallback order, one derived row per answered weight question, provenance, same-day coexistence, self-log upsert stability, and full transaction rollback when a derived row is invalid.
- [ ] Add the reversible migration. Verify migrate, rollback, and reapply with an existing self-log row and submission row.
- [ ] Update the weight schema and self-log upsert query so only provenance-free rows participate in client/date upsert.
- [ ] Add a private submission-side-effect pass immediately after submission insert and before profile mappings/assignment completion.
- [ ] Resolve unit inside the transaction from newest entry, client goal, then business default; lock only where needed and preserve tenant scoping.
- [ ] Expose `form_submission_id` on weight JSON/OpenAPI and `default_weight_unit` on business JSON/OpenAPI.
- [ ] Run focused context, schema, controller, migration, and stock Credo checks.
- [ ] Commit: `feat(backend): derive weight logs from check-ins`.

---

### Task 3: Get or create the default weekly check-in

**Files:**
* Create: `backend/lib/easy/default_check_in.ex`
* Modify: `backend/lib/easy/client_profiles.ex`
* Test: `backend/test/easy/client_profiles_test.exs`

**Interfaces:**
* `Easy.DefaultCheckIn.sections/0` contains ten stable-id questions: weight; energy; sleep quality; stress; training adherence; nutrition adherence; hunger; biggest win; biggest challenge; questions for coach.
* Listing coach templates ensures one active `Weekly check-in` per business, using the same get-or-create approach as intake and safe conflict handling under concurrent first access.

- [ ] Add red tests for exact curated content, stable ids/types, per-business isolation, idempotence, and concurrent creation safety.
- [ ] Add the curated module and a private `get_or_create_default_check_in_template/1` context seam.
- [ ] Ensure the default before returning the coach template list so existing and new businesses receive it without a separate backfill job.
- [ ] Keep the template normally editable; past submissions remain protected by snapshots.
- [ ] Run focused context tests and stock Credo.
- [ ] Commit: `feat(backend): provide a default weekly check-in`.

---

### Task 4: Add coach builder types and common-question presets

**Files:**
* Create: `frontend/apps/coachapp-v2/src/checkins/question-presets.ts`
* Modify: `frontend/apps/coachapp-v2/src/api/checkins.ts`
* Modify: `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx`

**Interfaces:**
* Introduces `FormQuestionType`, separating the eight form types from `ProfileFieldType`.
* Builder answer-type options include `Rating (1–5)` and `Weight`.
* `Add common question` opens a category-grouped picker for all approved Phase 4 presets except progress photos; insertion creates an editable draft with a fresh React key and no persisted id collision.
* Profile mapping remains available only when the selected question type is compatible with the target profile field.

- [ ] Add the typed preset bank with stable labels, type, category, default required state, and options.
- [ ] Refactor draft/request mappers to use `FormQuestionType` while retaining stored ids through edit cycles.
- [ ] Add rating and weight to the answer-type picker and prevent incompatible profile mapping combinations.
- [ ] Add the common-question picker per section, with keyboard-accessible HeroUI primitives and duplicate presets allowed through unique persisted ids.
- [ ] Run focused Biome and `pnpm --filter coachapp-v2 build`.
- [ ] Commit: `feat(coachapp): add check-in question presets`.

---

### Task 5: Render rating and weight in the client fill flow

**Files:**
* Modify: `frontend/apps/clientapp-v2/src/checkins/checkin-field.tsx`
* Modify: `frontend/apps/clientapp-v2/src/checkins/fill-checkin.tsx`
* Modify: `frontend/apps/clientapp-v2/src/api/profile.ts` only if a cache export is needed

**Interfaces:**
* `rating` renders five large tap targets with selected and focus states and emits an integer 1–5.
* `weight` renders a numeric field with the resolved unit label. The client profile goal unit is used for immediate display; absence falls back to the API/business default behavior and displays `kg`.

- [ ] Add the rating renderer with an accessible group label, five buttons, and visible selected state.
- [ ] Add the weight number field with decimal support, positive client-side validation, and unit suffix.
- [ ] Read the existing client profile query in the fill screen and pass its goal unit/default to weight fields without blocking non-weight forms.
- [ ] Preserve payload shapes as JSON numbers and surface a specific validation message before submit.
- [ ] Run focused Biome and `pnpm --filter clientapp-v2 build`.
- [ ] Commit: `feat(clientapp): answer rating and weight questions`.

---

### Task 6: Show rating trends in the coach check-in card

**Files:**
* Create: `frontend/apps/coachapp-v2/src/clients/components/checkin-trends.tsx`
* Create: `frontend/apps/coachapp-v2/src/clients/components/rating-sparkline.tsx`
* Modify: `frontend/apps/coachapp-v2/src/clients/components/client-checkins.tsx`
* Modify: `frontend/apps/coachapp-v2/src/api/checkins.ts` if cache tags/helpers are needed

**Interfaces:**
* The existing `ClientWeight` progress report remains the single weight chart and automatically includes derived check-in rows from the shared endpoint.
* The check-in card loads submissions for completed check-in occurrences, groups rating answers by stable question id, and shows one compact 1–5 trend per current or historical rating label.
* A trend requires at least two numeric points; single answers show the latest score without inventing a line.

- [ ] Add pure extraction/grouping helpers that tolerate old snapshots, missing questions, renamed labels, and invalid legacy answers.
- [ ] Load completed occurrence submissions without issuing requests for open/missed/dismissed assignments.
- [ ] Render compact native-SVG sparklines with dates, latest score, accessible labels, and responsive overflow behavior.
- [ ] Place rating trends below occurrence history and above latest answers; avoid duplicating the full weight report already present on client detail.
- [ ] Run focused Biome and `pnpm --filter coachapp-v2 build`.
- [ ] Commit: `feat(coachapp): show check-in rating trends`.

---

### Task 7: Regenerate clients and verify Phase 4 end to end

- [ ] Restart Phoenix to clear the cached OpenAPI spec and run `just gen-api`.
- [ ] Confirm both generated clients contain rating/weight question schemas, weight provenance, and business default-unit fields without hand edits.
- [ ] Run `mix precommit` and confirm the full suite is green.
- [ ] Run focused Biome over every touched frontend file, both app builds, and `just check-rm`.
- [ ] Live verify at 375px and 1280px: default weekly template exists once; preset insertion/edit/save works; rating and weight answer controls are usable; submit creates a provenance-bearing weight row with the expected fallback unit; rollback behavior is covered by tests; client Progress and coach weight charts include it; rating history accumulates by stable question id.
- [ ] Add a recurring-mistakes entry only for a repeatable violation discovered during implementation.
- [ ] Commit verification fixes if needed: `chore: phase-4 ratings and weight verification fixes`.
