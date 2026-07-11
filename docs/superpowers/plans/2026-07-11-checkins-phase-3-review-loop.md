# Check-ins Phase 3: Review loop implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task.

**Goal:** Give coaches one tenant-safe queue of submitted check-ins, let them mark each submission reviewed or continue into chat with a prefilled reply, and show review state to the client.

**Architecture:** Review state belongs to `FormSubmission`; the queue is a query over unreviewed submissions joined to check-in assignments and visible clients. The queue response embeds the assignment, template, and compact client summary needed by both the list and detail screen. Client assignment responses expose the latest submission's `reviewed_at` as a derived field so the client list does not need another request.

**Tech stack:** Elixir/Phoenix/Ecto/Postgres, OpenApiSpex, React 19, RTK Query codegen, HeroUI v3, React Router.

## Global constraints

* `backend/AGENTS.md` remains authoritative: Ctx-first public functions, tenant-scoped query builders, fail-closed coach visibility, bare-atom errors, and `@spec` on public functions.
* Intake submissions never enter the queue.
* Marking reviewed is idempotent: the first review writes both fields; later calls return the stored review without changing reviewer or timestamp.
* The queue is newest first with an id tie-break and respects trainer client assignments.
* Chat reply uses the client conversation route and a URL-encoded `prefill` query parameter. Sending a message never reviews a submission.
* Generated clients come from OpenAPI. Do not hand-edit `generated.ts`.
* Backend finish gate is `mix precommit`; frontend gates are focused Biome, both affected app builds, `just check-rm`, and live 375px/1280px verification.

---

### Task 1: Persist review state and define queue queries

**Files:**
* Create: `backend/priv/repo/migrations/20260711130000_add_form_submission_reviews.exs`
* Modify: `backend/lib/easy/client_profiles/form_submission.ex`
* Modify: `backend/lib/easy/client_profiles/form_assignment.ex`
* Modify: `backend/lib/easy/client_profiles.ex`
* Test: `backend/test/easy/client_profiles_test.exs`

**Interfaces:**
* Adds nullable `reviewed_at` and `reviewed_by_id` to `form_submissions`; `reviewed_by_id` references `users` with `on_delete: :nothing`.
* Produces `FormSubmission.unreviewed/1`, `for_check_ins/1`, `for_visible_clients/2`, and preload/query helpers for assignment, template, and client.
* Produces `ClientProfiles.list_unreviewed_check_in_submissions(ctx)` and `review_form_submission(ctx, submission_id)`.
* Adds derived `latest_submission_reviewed_at` to assignment JSON data by preloading the newest submission in client assignment reads.

- [ ] Add red context tests for intake exclusion, newest/id ordering, tenant and trainer visibility, embedded assignment/template/client data, first review stamps, repeat review stability, and cross-tenant not-found.
- [ ] Run `mix test test/easy/client_profiles_test.exs`; expect missing fields and functions.
- [ ] Add the reversible migration and verify rollback/reapply with a populated submission row.
- [ ] Add schema/query builders, keeping query composition in the schema module and Repo calls in the context.
- [ ] Implement queue listing and idempotent review. Authorize the submission through its client before returning or updating it.
- [ ] Preload the newest submission for client assignment list/get responses and expose `latest_submission_reviewed_at` without adding review state to `form_assignments`.
- [ ] Run the focused context tests and stock Credo.
- [ ] Commit: `feat(backend): persist check-in submission reviews`.

---

### Task 2: Expose the review queue and review action

**Files:**
* Create: `backend/lib/easy_web/controllers/coaches/check_in_review_controller.ex`
* Create: `backend/lib/easy_web/controllers/coaches/check_in_review_json.ex`
* Create: `backend/test/easy_web/controllers/coaches/check_in_review_controller_test.exs`
* Modify: `backend/lib/easy_web/controllers/coaches/form_assignment_json.ex`
* Modify: `backend/lib/easy_web/controllers/clients/form_assignment_json.ex`
* Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Modify: `backend/lib/easy_web/router.ex`

**Interfaces:**
* Adds `GET /v1/coach/check-ins/review-queue` as `listCheckInReviewQueue`.
* Adds `POST /v1/coach/form-submissions/:id/review` as `reviewFormSubmission`.
* Adds `ClientProfileReviewQueueItem` with submission fields, nested assignment/template, and compact client `{id, first_name, last_name, email}`.
* Adds nullable `reviewed_at`, `reviewed_by_id` to submission responses and nullable `latest_submission_reviewed_at` to assignment responses.

- [ ] Add red routed tests for list order, intake exclusion, trainer visibility, idempotent review, cross-tenant access, JSON/OpenAPI parity, and route coverage.
- [ ] Run the new controller tests and OpenAPI coverage test.
- [ ] Add schemas, controller-local `CastAndValidate` for the POST, JSON views, and kebab-case routes.
- [ ] Run focused controller tests, restart Phoenix to refresh the cached spec, and run `just gen-api`.
- [ ] Confirm both generated clients receive the assignment review field and coachapp receives queue/review hooks.
- [ ] Commit: `feat(api): expose the check-in review queue`.

---

### Task 3: Build the coach review queue and detail flow

**Files:**
* Create: `frontend/apps/coachapp-v2/src/checkins/review-checkin.tsx`
* Create: `frontend/apps/coachapp-v2/src/checkins/review-answers.tsx`
* Modify: `frontend/apps/coachapp-v2/src/api/checkins.ts`
* Modify: `frontend/apps/coachapp-v2/src/@config/routes.ts`
* Modify: `frontend/apps/coachapp-v2/src/router.tsx`
* Modify: `frontend/apps/coachapp-v2/src/checkins/list-checkins.tsx`

**Interfaces:**
* Adds `ROUTES.CHECKINS_TO_REVIEW` and `ROUTES.CHECKIN_REVIEW`.
* Forms page tabs become `Templates` and `To review`, with the queue count in the tab label.
* Review detail finds its item from the queue query, renders the stored question snapshot and answers, and offers `Mark reviewed` and `Reply in chat`.

- [ ] Enhance queue/review endpoints with `CheckInReview` cache tags; reviewing invalidates the queue and client assignment lists.
- [ ] Add route constants and the inbound queue-to-detail route.
- [ ] Convert the Forms page to URL-backed tabs (`?tab=review`) so dashboard links survive reload and browser navigation.
- [ ] Render queue rows newest first with client, form, submission date, and an empty/error/loading state using app primitives.
- [ ] Build the detail screen from snapshot questions. Mark reviewed navigates back to the queue after success.
- [ ] Build `Reply in chat` with `ROUTES.CLIENT_MESSAGES` plus `prefill=Re: check-in <date> — `; it must not call the review mutation.
- [ ] Run focused Biome and `pnpm --filter coachapp-v2 build`.
- [ ] Commit: `feat(coachapp): review submitted check-ins`.

---

### Task 4: Accept a chat reply prefill

**Files:**
* Modify: `frontend/apps/coachapp-v2/src/messages/client-conversation.tsx`
* Modify: `frontend/apps/coachapp-v2/src/messages/conversation-view.tsx`

**Interfaces:**
* `ClientConversation` reads `prefill` from `useSearchParams` and passes it as `initialBody`.
* `ConversationView` initializes the composer once from `initialBody`; navigating or live message updates do not overwrite coach edits.

- [ ] Add the optional prop and initialize composer state from it.
- [ ] Verify an encoded review quote appears, remains editable, sends normally, and leaves review state unchanged.
- [ ] Run focused Biome and the coach build.
- [ ] Commit with Task 3 when kept atomic, otherwise `feat(coachapp): prefill review replies in chat`.

---

### Task 5: Add dashboard and client review indicators

**Files:**
* Create: `frontend/apps/coachapp-v2/src/dashboard/components/checkins-to-review-cell.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/dashboard.tsx`
* Modify: `frontend/apps/coachapp-v2/src/dashboard/mobile-dashboard.tsx`
* Modify: `frontend/apps/clientapp-v2/src/api/checkins.ts`
* Modify: `frontend/apps/clientapp-v2/src/checkins/list-checkins.tsx`

**Interfaces:**
* Dashboard shows `<count> check-ins to review` on desktop and mobile, linking to `ROUTES.CHECKINS_TO_REVIEW`.
* A completed client assignment with `latest_submission_reviewed_at` renders `Completed · Reviewed ✓`; unreviewed completed assignments remain `Completed`.

- [ ] Consume the queue query once in Dashboard and pass count/error/loading into desktop and mobile cards.
- [ ] Add the dashboard card without making queue failure break other dashboard data.
- [ ] Update the client status helper/rendering for reviewed completion while preserving due/overdue/missed rules.
- [ ] Run focused Biome, coach build, client build, and `just check-rm`.
- [ ] Commit: `feat(apps): surface check-in review status`.

---

### Task 6: Phase 3 verification

- [ ] Run `mix precommit` and confirm the full suite is green.
- [ ] Run focused Biome over every touched frontend file, both app builds, and `just check-rm`.
- [ ] Confirm generated API routes/hooks and JSON/OpenAPI parity; no hand-written duplicate endpoints.
- [ ] Live verify at 375px and 1280px: submitted check-in enters queue, intake does not, trainer sees only assigned clients, review removes the row, client shows `Reviewed ✓`, dashboard count changes, chat prefill is editable, and sending chat does not review.
- [ ] Add a recurring-mistakes entry only for a repeatable violation discovered during implementation.
- [ ] Commit verification fixes if needed: `chore: phase-3 review-loop verification fixes`.
