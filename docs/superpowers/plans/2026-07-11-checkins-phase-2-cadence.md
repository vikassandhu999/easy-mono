# Check-ins Phase 2: Cadence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one-off coach form assignment with per-client check-in schedules that generate due occurrences, mark superseded open occurrences missed, send idempotent email reminders, and expose clear due/overdue/missed states in both apps.

**Architecture:** `Easy.ClientProfiles.CheckInSchedule` owns cadence and generates ordinary `FormAssignment` occurrences through `Easy.ClientProfiles`; a dedicated `Easy.CheckInSweeper` runs the same idempotent generation/reminder functions used at schedule creation. The API replaces the template assign endpoint with schedule CRUD, while generated RTK clients keep coach/client UIs aligned with the OpenAPI contract.

**Tech Stack:** Elixir/Phoenix/Ecto/Postgres, Swoosh, OpenApiSpex, React 19, RTK Query codegen, HeroUI v3.

## Global Constraints

- `backend/AGENTS.md` is authoritative: Ctx-first public context functions, tenant-scoped queries, bare-atom/changeset errors, schemas remain Repo-free, and every public function has `@spec`.
- Purpose is exactly `intake | check_in`; existing `weekly_check_in | nutrition_update | training_update | custom` rows remap to `check_in`.
- Frequency is exactly `once | weekly | biweekly | monthly`; monthly advancement uses `Date.shift(date, month: 1)`, which preserves the day and clamps to month end.
- Inactive clients advance without occurrences or email. One-time occurrences never auto-miss.
- Email sends are idempotent through `due_reminder_sent_at` / `overdue_reminder_sent_at`; send failures do not stamp.
- API routes are kebab-case and every write uses co-located OpenApiSpex + `CastAndValidate`.
- Regenerate both app clients with `just gen-api`; never hand-edit generated files.
- HeroUI v3 semantic tokens only; mobile targets are at least 44px.
- Backend finish gate: `mix precommit`. Frontend finish gates: focused Biome, both touched app builds, `just check-rm`, and live desktop/mobile verification.

---

### Task 1: Purpose collapse and cadence persistence

**Files:**
- Create: `backend/priv/repo/migrations/20260711120000_add_check_in_schedules.exs`
- Create: `backend/lib/easy/client_profiles/check_in_schedule.ex`
- Modify: `backend/lib/easy/client_profiles/form_template.ex`
- Modify: `backend/lib/easy/client_profiles/form_assignment.ex`
- Modify: `backend/test/support/factory.ex`
- Test: `backend/test/easy/client_profiles_test.exs`

**Interfaces:**
- Produces: `CheckInSchedule.insert_changeset/4`, `update_changeset/2`, `for_business/2`, `for_client/3`, `active/1`, `due_on_or_before/2`, `include_template/2`, and `advance/1`.
- Produces assignment fields `check_in_schedule_id`, `due_reminder_sent_at`, `overdue_reminder_sent_at`; status gains `:missed`.

- [ ] **Step 1: Add failing schema tests** for purpose remap vocabulary, frequency validation, one-active-schedule uniqueness, tenant composite FKs, `advance/1` for all four frequencies including Jan 31 → Feb 28, and `:missed` assignment status.
- [ ] **Step 2: Run red tests:** `mix test test/easy/client_profiles_test.exs`; expect missing `CheckInSchedule` and old enums.
- [ ] **Step 3: Write the migration.** Remap both purpose columns before replacing constraints; create `check_in_schedules` with binary ids, tenant composite FKs, partial unique index `WHERE active`, and add schedule/reminder columns plus `missed` constraint to assignments. `down/0` maps `check_in` back to `weekly_check_in`.
- [ ] **Step 4: Implement the schema.** `advance/1` returns `{next_due_on, active}`; `once` returns `{same_date, false}`, weekly/biweekly add 7/14, monthly preserves the anchor day when possible and clamps otherwise.
- [ ] **Step 5: Update template/assignment enums and factories**, keeping default intake internal and making the general template factory `purpose: :check_in`.
- [ ] **Step 6: Run green tests and migration cycle:** `MIX_ENV=test mix ecto.reset && mix test test/easy/client_profiles_test.exs`.
- [ ] **Step 7: Commit:** `feat(backend): add check-in cadence persistence`.

---

### Task 2: Schedule application service and immediate generation

**Files:**
- Modify: `backend/lib/easy/client_profiles.ex`
- Modify: `backend/lib/easy/client_profiles/check_in_schedule.ex`
- Modify: `backend/lib/easy/client_profiles/form_assignment.ex`
- Test: `backend/test/easy/client_profiles_test.exs`

**Interfaces:**
- Produces `list_check_in_schedules_for_client(ctx, client_id)`, `create_check_in_schedule_for_client(ctx, client_id, attrs)`, `update_check_in_schedule(ctx, id, attrs)`, `delete_check_in_schedule(ctx, id)`, and system entrypoint `generate_due_check_ins(today)`.
- `create_check_in_schedule_for_client/3` accepts `%{form_template_id, frequency, next_due_on}` and immediately generates when due today/past.

- [ ] **Step 1: Add red context tests** covering tenant/trainer authorization, rejecting intake templates, active uniqueness, future schedule no occurrence, due-today immediate occurrence, once deactivation, recurring advancement, marking the prior open occurrence missed, inactive-client silent advancement, and transaction rollback.
- [ ] **Step 2: Run red:** `mix test test/easy/client_profiles_test.exs`.
- [ ] **Step 3: Implement CRUD with explicit tenant queries.** Creation uses `Repo.transaction`; schedule insertion and optional generation are one transaction. Delete returns `:schedule_has_assignments` when occurrences exist; pause is update `%{active: false}`.
- [ ] **Step 4: Implement generation.** Lock due schedules with `FOR UPDATE`, mark only the previous `assigned|in_progress` occurrence missed, insert an assignment with `purpose: :check_in`, `due_date: schedule.next_due_on`, and advance/deactivate the schedule.
- [ ] **Step 5: Make submit reject `:missed`** through the existing `ensure_assignment_submittable/1` path and add the controller regression test.
- [ ] **Step 6: Run green:** `mix test test/easy/client_profiles_test.exs test/easy_web/controllers/clients/form_assignment_controller_test.exs`.
- [ ] **Step 7: Commit:** `feat(backend): generate check-in occurrences from schedules`.

---

### Task 3: Reminder emails and nightly sweeper

**Files:**
- Create: `backend/lib/easy/check_in_sweeper.ex`
- Create: `backend/test/easy/client_profiles/check_in_sweeper_test.exs`
- Modify: `backend/lib/easy/application.ex`
- Modify: `backend/lib/easy/client_profiles.ex`
- Modify: `backend/lib/easy/emails.ex`
- Modify: `backend/config/test.exs`

**Interfaces:**
- Produces `CheckInSweeper.sweep(today \\ Date.utc_today())` and email builders `check_in_due_email/3`, `check_in_overdue_email/3`.
- Produces system context functions `send_due_check_in_reminders(today)` and `send_overdue_check_in_reminders(today)`.

- [ ] **Step 1: Add red tests** using the Swoosh test adapter: due generation sends once and stamps only after delivery; overdue means `due_date <= Date.add(today, -2)` and sends once; inactive clients get none; once remains overdue/submittable; repeated sweep is idempotent.
- [ ] **Step 2: Run red:** `mix test test/easy/client_profiles/check_in_sweeper_test.exs`.
- [ ] **Step 3: Add one-line email bodies** with clientapp deep link from config, using `Easy.MailerDelivery.deliver_sync/2` inside the sweep so stamps reflect delivery success.
- [ ] **Step 4: Implement `CheckInSweeper`** with the existing 24-hour GenServer pattern, but keep `sweep/1` deterministic for tests. Add a separate `start_check_in_sweeper` config flag.
- [ ] **Step 5: Run green and mail tests:** `mix test test/easy/client_profiles/check_in_sweeper_test.exs test/easy/mailer_delivery_test.exs`.
- [ ] **Step 6: Commit:** `feat(backend): sweep check-in cadence and send reminders`.

---

### Task 4: Schedule API and retirement of manual assignment

**Files:**
- Create: `backend/lib/easy_web/controllers/coaches/check_in_schedule_controller.ex`
- Create: `backend/lib/easy_web/controllers/coaches/check_in_schedule_json.ex`
- Create: `backend/test/easy_web/controllers/coaches/check_in_schedule_controller_test.exs`
- Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
- Modify: `backend/lib/easy_web/router.ex`
- Modify: `backend/lib/easy_web/controllers/coaches/form_template_controller.ex`
- Modify: `backend/test/easy_web/controllers/coaches/form_template_controller_test.exs`

**Interfaces:**
- Adds `GET/POST /v1/coach/clients/:client_id/check-in-schedules` and `PATCH/DELETE /v1/coach/check-in-schedules/:id`.
- Removes `POST /v1/coach/form-templates/:id/assign` and generated `assignFormTemplate`.

- [ ] **Step 1: Add red routed controller tests** for CRUD, CastAndValidate, tenant/trainer isolation, duplicate active schedule 422, schedule-with-history delete 422, and absence of the retired assign route from `ApiSpec.spec().paths`.
- [ ] **Step 2: Run red:** `mix test test/easy_web/controllers/coaches/check_in_schedule_controller_test.exs test/easy_web/controllers/open_api_route_coverage_test.exs`.
- [ ] **Step 3: Add OpenAPI schemas** for schedule create/update/entity/list. Create requires `form_template_id`, `frequency`, `next_due_on`; update exposes only frequency/next_due_on/active.
- [ ] **Step 4: Implement controller/JSON and routes**, one context call per action. Remove assign operation/action/schema aliases and old tests.
- [ ] **Step 5: Run controller/OpenAPI tests**, restart any dev backend, then `just gen-api` and review generated diffs.
- [ ] **Step 6: Commit:** `feat(api): replace form assignment with check-in schedules`.

---

### Task 5: Coach Forms library and schedule assignment UI

**Files:**
- Modify: `frontend/apps/coachapp-v2/src/@components/app-shell.tsx`
- Modify: `frontend/apps/coachapp-v2/src/api/checkins.ts`
- Modify: `frontend/apps/coachapp-v2/src/checkins/list-checkins.tsx`
- Modify: `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx`
- Modify: `frontend/apps/coachapp-v2/src/checkins/create-checkin.tsx`
- Modify: `frontend/apps/coachapp-v2/src/clients/components/checkin-assign-content.tsx`
- Modify: `frontend/apps/coachapp-v2/src/clients/components/client-checkins.tsx`

**Interfaces:**
- Coach nav/page copy becomes Forms; type chips/filters are Intake and Check-in.
- Assign surface creates a schedule with template, repeats, first due date; no priority selector.

- [ ] **Step 1: Update API enhancement tags** for schedule list/create/update/delete and replace purpose types with `intake | check_in`.
- [ ] **Step 2: Remove builder purpose selection.** `emptyTemplateDraft()` and create submit always send `purpose: 'check_in'`; edit preserves the existing intake purpose.
- [ ] **Step 3: Rename the library surface to Forms** and add Intake/Check-in filter chips without changing route paths.
- [ ] **Step 4: Replace assign mutation UI** with `Once / Weekly / Biweekly / Monthly` plus required first due date, calling generated `useCreateCheckInScheduleMutation`.
- [ ] **Step 5: Add cadence controls/history to client card:** show frequency + next due, pause/resume via schedule PATCH, and occurrence chips `Completed / Missed / Due` while retaining Phase-1 date/dismiss actions.
- [ ] **Step 6: Verify:** focused Biome, `pnpm --filter coachapp-v2 build`, live 375px/1280px schedule creation and pause/resume.
- [ ] **Step 7: Commit:** `feat(coachapp): manage check-in cadence from Forms`.

---

### Task 6: Client due, overdue, and missed states

**Files:**
- Create: `frontend/apps/clientapp-v2/src/checkins/checkin-nudge-card.tsx`
- Modify: `frontend/apps/clientapp-v2/src/api/checkins.ts`
- Modify: `frontend/apps/clientapp-v2/src/checkins/list-checkins.tsx`
- Modify: `frontend/apps/clientapp-v2/src/checkins/fill-checkin.tsx`
- Modify: `frontend/apps/clientapp-v2/src/training/training-home.tsx`

**Interfaces:**
- Status derivation: missed/completed are terminal; open due today is `Due today`; open past due is `Overdue`; future open remains `To do`.
- Missed rows remain visible but are disabled/non-navigable; intake nudge keeps priority over check-in nudge.

- [ ] **Step 1: Add a pure `assignmentDisplayStatus(assignment, today)` helper** beside the API/domain types and unit tests if the app test runner exists; otherwise verify through typecheck and browser states seeded from the backend.
- [ ] **Step 2: Update list rows** with semantic status chips and no chevron/click for missed assignments.
- [ ] **Step 3: Guard fill route** so a missed/dismissed/completed assignment renders a read-only terminal state and never mounts the answer form.
- [ ] **Step 4: Add due/overdue home nudge** after `IntakeCard`; it returns null while an intake assignment is open.
- [ ] **Step 5: Verify:** focused Biome, `pnpm --filter clientapp-v2 build`, live 375px list/home/fill checks for due today, overdue, missed, and completed.
- [ ] **Step 6: Commit:** `feat(clientapp): show due overdue and missed check-ins`.

---

### Task 7: Phase 2 verification and documentation closeout

**Files:**
- Modify only if needed: `docs/agents/recurring-mistakes.md`

- [ ] **Step 1: Run `mix precommit`** and fix only Phase-2 regressions.
- [ ] **Step 2: Run focused Biome on touched frontend files**, both app builds, `just check-rm`, and record any unrelated repo-wide lint debt without changing it.
- [ ] **Step 3: Dump the OpenAPI route list** and assert schedule routes exist and `/form-templates/{id}/assign` does not; confirm generated clients expose schedule hooks and no assign hook.
- [ ] **Step 4: Live verify at 375px and 1280px:** create due-today once (immediate assignment), create weekly future schedule, pause/resume, run sweep twice (no duplicate), overdue reminder idempotency, missed visibility/non-openability, and inactive-client no-backlog behavior.
- [ ] **Step 5: Add a recurring-mistakes rule only if Phase 2 uncovered a genuinely repeatable new violation with a feasible mechanical check.**
- [ ] **Step 6: Commit verification fixes if any:** `chore: phase-2 cadence verification fixes`.
