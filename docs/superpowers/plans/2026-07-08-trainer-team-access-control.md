# Trainer Team Invitations + Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A business owner invites trainers; each trainer sees and manages only the clients assigned to them (via a new `clients.assigned_coach_id`); the owner sees everyone and reassigns clients between trainers.

**Architecture:** Actor identity (`coach_id`, `owner?`) is resolved once at session creation and carried in JWT claims → `Ctx`. One visibility chokepoint (`Client.visible_to/2` + `Clients.authorize_client/2`) gates every client-scoped read/write across 7 contexts. Invites mirror the existing client-invite flow (row-held link token + `one_time_tokens` OTP acceptance). Zero billing changes — trainers are `coaches` rows, not seats.

**Tech Stack:** Elixir/Phoenix/Ecto, OpenApiSpex, Joken (JWT); React + generated RTK Query client + HeroUI v3.

**Spec:** `docs/superpowers/specs/2026-07-08-trainer-team-access-control-design.md`

## Global Constraints

- backend/AGENTS.md is authority: Ctx-first public context fns; bare-atom errors (`:not_owner`, `:not_found`, `:already_on_team`, `:already_a_coach`); trusted ids via `put_change`, never cast; tenant scope on every query; `@spec` on public fns; no `@moduledoc`/`@doc`; kebab-case for new multi-word routes; every new endpoint gets a co-located OpenApiSpex operation (+ `CastAndValidate` on writes).
- **Fail-closed visibility:** a trainer fetching a non-assigned client (or its sub-resources) gets `:not_found` — never `:forbidden` (don't leak existence).
- **Declare 403 `forbidden`** on every owner-gated operation's OpenAPI responses (recurring-mistake from billing: `:not_owner` renders 403, not 401).
- `coach_id`/`owner?` come only from server-resolved JWT claims — never from request input.
- New timestamps: `DateTime.utc_now(:second)`. `Ecto.Enum` for closed sets.
- FE: regen via `just gen-api` from repo root; wire invalidations (tag:false); sentence-case copy; "Couldn't load…" never "Failed to load…"; HeroUI v3 semantic tokens (`accent`/`border`/`surface`/`muted` — NEVER v2 tokens `primary`/`divider`/`content*`).
- Verbatim UI copy is **binding** where quoted in Task 8.
- Run `mix format` + `mix compile --warnings-as-errors` before every backend commit; `mix precommit` at task end. Full-suite baseline: 8 pre-existing failures (food/exercise ordering) are not yours.
- Backend OpenAPI schema edits require a full phx.server restart in dev (spec is cached).
- Commit from `backend/` for backend tasks with ONLY your task's paths (never `git add -A`).

---

### Task 1: Data model — coach lifecycle columns, `clients.assigned_coach_id` + backfill, schema + factory updates

**Files:**
- Create: `backend/priv/repo/migrations/20260708090000_add_trainer_team.exs`
- Modify: `backend/lib/easy/orgs/coach.ex`
- Modify: `backend/lib/easy/clients/client.ex` (add `belongs_to :assigned_coach`)
- Modify: `backend/test/support/factory.ex`
- Test: `backend/test/easy/orgs/coach_test.exs` (create), extend `backend/test/easy/clients/` changeset coverage if a client schema test exists (check `test/easy/clients/`)

**Interfaces:**
- Produces (later tasks rely on these exact names):
  - `Coach` fields: `email :string`, `status Ecto.Enum [:invited, :active, :inactive] default :active`, `invitation_token :string`, `invitation_sent_at :utc_datetime`, `invited_by_id :binary_id`; `user_id` now nullable.
  - `Coach.active(query \\ __MODULE__)` — query builder filtering `status == :active`.
  - `Coach.invite_changeset(business_id, invited_by_id, attrs)` — casts `[:email, :first_name, :last_name]`, requires + downcases email, validates format (reuse the regex from `Easy.Identity.User`), puts `business_id`, `invited_by_id`, `status: :invited`, a random `invitation_token` (`:crypto.strong_rand_bytes(24) |> Base.url_encode64(padding: false)`), `invitation_sent_at: DateTime.utc_now(:second)`, plus `unique_constraint(:email, name: :coaches_business_id_lower_email_index)` and `unique_constraint(:user_id)`.
  - `Coach.accept_changeset(coach, user_id)` — puts `user_id`, `status: :active`, clears `invitation_token`; `unique_constraint(:user_id)`.
  - `Client` gains `belongs_to :assigned_coach, Orgs.Coach, foreign_key: :assigned_coach_id` (NEVER cast — set via `put_change` by callers).
  - Factory: `coach_factory` gains `email: sequence(:coach_email, &"coach-#{&1}@test.com"), status: :active`; `client_factory` sets `assigned_coach: creator` (the same `creator` var already built).

**Steps:**

- [ ] **Step 1: Write the migration.**

```elixir
defmodule Easy.Repo.Migrations.AddTrainerTeam do
  use Ecto.Migration

  def up do
    alter table(:coaches) do
      add :email, :string
      add :status, :string, null: false, default: "active"
      add :invitation_token, :string
      add :invitation_sent_at, :utc_datetime
      add :invited_by_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
    end

    execute "ALTER TABLE coaches ALTER COLUMN user_id DROP NOT NULL"

    create unique_index(:coaches, ["business_id", "lower(email)"],
             where: "email IS NOT NULL",
             name: :coaches_business_id_lower_email_index
           )

    # One coach row per user, globally — login resolves a single business (spec F3).
    create unique_index(:coaches, [:user_id], where: "user_id IS NOT NULL")
    create unique_index(:coaches, [:invitation_token], where: "invitation_token IS NOT NULL")

    alter table(:clients) do
      add :assigned_coach_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:clients, [:business_id, :assigned_coach_id])

    # Backfill: every existing client → the owner's coach row (created at signup).
    # Businesses with no owner coach row leave nil (fail closed: owner still sees).
    execute """
    UPDATE clients SET assigned_coach_id = co.id
    FROM businesses b
    JOIN coaches co ON co.business_id = b.id AND co.user_id = b.owner_id
    WHERE clients.business_id = b.id
    """
  end

  def down do
    alter table(:clients), do: remove(:assigned_coach_id)
    drop index(:coaches, [:invitation_token])
    drop index(:coaches, [:user_id])
    drop index(:coaches, [:business_id], name: :coaches_business_id_lower_email_index)
    execute "ALTER TABLE coaches ALTER COLUMN user_id SET NOT NULL"

    alter table(:coaches) do
      remove :email
      remove :status
      remove :invitation_token
      remove :invitation_sent_at
      remove :invited_by_id
    end
  end
end
```

If `mix ecto.migrate` fails on `DROP NOT NULL` because the original coaches table never had the constraint, delete that `execute` line and its `down` counterpart (verify against the original create-table migration first).

- [ ] **Step 2: Write failing schema tests** (`test/easy/orgs/coach_test.exs`, `use Easy.DataCase, async: true`): `invite_changeset` valid input produces `:invited` status + token + downcased email; missing/invalid email invalid; `business_id`/`invited_by_id`/`status`/`invitation_token` are NOT castable from attrs (assert attrs with `%{"status" => "active", "business_id" => other_id}` don't override); `accept_changeset` sets user_id + `:active` + nil token; DB uniqueness: same email twice in one business → constraint error; same user_id on two coach rows → constraint error; `Coach.active/1` filters.
- [ ] **Step 3: Run** `mix ecto.migrate && mix test test/easy/orgs/coach_test.exs` — expect failures (fns missing).
- [ ] **Step 4: Implement** the `Coach` schema changes, query builder, and changesets per Interfaces; add `belongs_to :assigned_coach` to `Client`; update the two factories.
- [ ] **Step 5: Run** `mix test test/easy/orgs/coach_test.exs test/easy/clients test/easy/billing` — green (factory change must not break existing suites). `mix format`, compile warnings-as-errors.
- [ ] **Step 6: Commit** `feat(team): coach lifecycle columns + clients.assigned_coach_id with owner backfill`

### Task 2: Actor identity — `Ctx.coach_id`/`owner?`, session claims, active-status login gate

**Files:**
- Create: `backend/priv/repo/migrations/20260708091000_add_session_actor_claims.exs`
- Modify: `backend/lib/easy/ctx.ex`
- Modify: `backend/lib/easy/identity/session_factory.ex` (`validate_role(:coach, …)`)
- Modify: `backend/lib/easy/businesses.ex` (`get_one_for_coach` — active filter)
- Modify: `backend/lib/easy/identity/user_session.ex` (fields + cast list, `lib/easy/identity/user_session.ex:38` area)
- Modify: `backend/lib/easy/identity/token.ex` (claims at `token.ex:26-31`)
- Modify: `backend/lib/easy_web/plugs/authenticate.ex`
- Modify: `backend/test/support/conn_case.ex` (`authenticate_coach/2`)
- Modify: `backend/test/support/data_case.ex` (add ctx helpers)
- Test: `backend/test/easy/identity/session_factory_test.exs` (extend or create)

**Interfaces:**
- Produces:
  - `%Easy.Ctx{business_id, user_id, coach_id, owner?: false}`; `Ctx.new/2` unchanged behavior (coach_id nil, owner? false — fail closed); new `Ctx.new(business_id, user_id, coach_id, owner?)`.
  - `SessionFactory.validate_role(:coach, user)` → `{:ok, %{role: :coach, business_id: id, coach_id: id, is_owner: bool}}`; resolves ONLY `status: :active` coach rows; `{:error, …unauthorized…}` otherwise (deactivated trainers cannot log in).
  - `user_sessions` gains `coach_id :binary_id` (plain column, no FK — claims cache) and `is_owner :boolean default false`; JWT claims gain `"coach_id"` and `"is_owner"`.
  - `Authenticate` builds `Ctx.new(claims["business_id"], claims["user_id"], claims["coach_id"], claims["is_owner"] == true)`.
  - Test helpers (in `Easy.DataCase`, importable): `owner_ctx(business)` → owner?: true + owner's coach row id if one exists (lookup, may be nil); `trainer_ctx(coach)` → `Ctx.new(coach.business_id, coach.user_id, coach.id, false)`.
  - `ConnCase.authenticate_coach(conn, coach)` claims now include `coach_id: coach.id` and `is_owner:` computed as `coach.business.owner_id == coach.user_id` (preload/lookup business; keep the existing signature so ~all controller tests keep working unchanged).

**Steps:**

- [ ] **Step 1: Failing tests** in `session_factory_test.exs`: (a) owner logs in → claims map has `coach_id` = owner's coach row, `is_owner: true`; (b) invited trainer (coach row `status: :invited`, `user_id: nil`) — user with no active row gets `{:error, _}`; (c) deactivated trainer (`status: :inactive`, user linked) → `{:error, _}`; (d) plain trainer → `is_owner: false`, correct coach_id.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement:**

```elixir
# businesses.ex — get_one_for_coach: add status filter to the join
join: c in Orgs.Coach, on: c.business_id == b.id and c.status == :active,

# session_factory.ex
def validate_role(:coach, user) do
  case Easy.Coaches.get_active_coach_for_user(user.id) do
    %Coach{} = coach ->
      is_owner = Repo.exists?(from b in Orgs.Business, where: b.id == ^coach.business_id and b.owner_id == ^user.id)
      {:ok, %{role: :coach, business_id: coach.business_id, coach_id: coach.id, is_owner: is_owner}}
    nil ->
      {:error, Error.unauthorized("User is not associated with any business")}
  end
end
```

Add `Easy.Coaches.get_active_coach_for_user(user_id)` → `Coach.for_user(user_id) |> Coach.active() |> Repo.one()` (public, plain arg — pre-auth, no ctx). Migration adds the two session columns; `UserSession` schema + cast list gains them; `refresh_session` path already re-runs `validate_role` — verify `coach_id`/`is_owner` flow through the attrs merge (they're not `business_id`, so they survive the `Map.drop([:business_id])`); `Token.generate_access_token` adds `"coach_id" => session.coach_id, "is_owner" => session.is_owner`; `Authenticate` builds the 4-arg Ctx.
- [ ] **Step 4: Run** the new tests + `mix test test/easy/identity test/easy_web` — green.
- [ ] **Step 5: Add the ctx test helpers** to `DataCase` and update `ConnCase.authenticate_coach/2`; run `mix test` (full) — no NEW failures vs the 8-failure baseline (nothing enforces visibility yet, so this is purely additive).
- [ ] **Step 6: Commit** `feat(team): actor identity in session claims + Ctx; active-status login gate`

### Task 3: Visibility chokepoint — `Client.visible_to/2`, `authorize_client`, assignment on create paths, reassign

**Files:**
- Modify: `backend/lib/easy/clients/client.ex` (query builder)
- Modify: `backend/lib/easy/clients.ex`
- Test: `backend/test/easy/clients/` (extend the existing client context test file — check dir for exact name)

**Interfaces:**
- Produces:
  - `Client.visible_to(query \\ __MODULE__, ctx)`:

```elixir
def visible_to(query \\ __MODULE__, ctx)
def visible_to(query, %Easy.Ctx{owner?: true}), do: query
def visible_to(query, %Easy.Ctx{coach_id: coach_id}) when not is_nil(coach_id),
  do: from(c in query, where: c.assigned_coach_id == ^coach_id)
def visible_to(query, %Easy.Ctx{}), do: from(c in query, where: false)
```

  - `Clients.authorize_client(ctx, client_id)` → `{:ok, %Client{}} | {:error, :not_found}` — `Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx) |> Repo.get(client_id)`. **This is the guard every later task calls.**
  - `Clients.authorize_client_id(ctx, client_id)` → `:ok | {:error, :not_found}`; `authorize_client_id(_ctx, nil), do: :ok` (nil = template/non-client resource) else `with {:ok, _} <- authorize_client(ctx, client_id), do: :ok`.
  - `Clients.reassign_client(ctx, client_id, coach_id)` → `{:ok, %Client{}} | {:error, :not_owner | :not_found | :coach_not_active}` — owner-only (`if ctx.owner?, do: :ok, else: {:error, :not_owner}` as private `ensure_owner/1`); target coach must be `Coach.for_business(ctx.business_id) |> Coach.active()`; sets `assigned_coach_id` via `put_change`-style update (never cast).
- Consumes: Task 2's `Ctx`, helpers `owner_ctx/trainer_ctx`.

**Steps:**

- [ ] **Step 1: Failing tests:** owner sees all clients in `list_clients`; trainer sees only assigned; trainer `get_client` on another trainer's client → `{:error, :not_found}`; cross-tenant unchanged; nil-assigned client visible to owner only; `invite_client` by a trainer sets `assigned_coach_id` = their coach row; `create_inquiry` (public funnel) sets `assigned_coach_id` = owner's coach row; `reassign_client` happy path, non-owner `:not_owner`, target inactive coach `:coach_not_active`, cross-tenant target `:coach_not_active`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement:** the three fns; pipe `Client.visible_to(ctx)` into `get_client`, `list_clients` (both query and count/summary — read `clients.ex:15-70` and thread ctx through), `update_client`, `delete_client`, and `resend_client_invitation`'s lookup; in `create_invitation` put `assigned_coach_id: coach.id`; in `create_inquiry` resolve the owner's coach row (`Coach` for business where user_id == business.owner_id) and put it. FallbackController already maps `:not_owner`/`:not_found`; add a `:coach_not_active` clause → 422 unprocessable with message `"The selected trainer is not active on this team."`.
- [ ] **Step 4: Run** `mix test test/easy/clients test/easy_web/controllers/coaches/client_controller_test.exs 2>/dev/null || mix test test/easy/clients test/easy_web` — fix any test that now needs `trainer_ctx`/`owner_ctx` (this is the expected churn; the factory's `assigned_coach: creator` default minimizes it).
- [ ] **Step 5: Commit** `feat(team): client visibility chokepoint + assignment on create paths + owner reassign`

### Task 4: Enforcement sweep A — nutrition_plans + training_plans

**Files:**
- Modify: `backend/lib/easy/nutrition_plans.ex`, `backend/lib/easy/training_plans.ex`
- Test: extend `backend/test/easy/nutrition_plans*` and `backend/test/easy/training_plans*` (check exact test paths with `ls test/easy/ | grep -i plan`)

**Interfaces:**
- Consumes: `Clients.authorize_client(ctx, client_id)`, `Clients.authorize_client_id(ctx, client_id)`, test helpers.
- Produces: no new public interfaces — same signatures, enforced visibility.

**Steps:**

- [ ] **Step 1: Failing isolation tests** (same shape in BOTH contexts): trainer A's ctx + trainer B's client → `list_plans_for_client` returns `{:error, :not_found}`; `assign_plan_to_client` → `{:error, :not_found}`; `get_plan_full` on a plan whose `client_id` is B's client → `{:error, :not_found}`; owner ctx succeeds on all three; template plans (`client_id: nil`) remain fully visible to every trainer (library stays shared — assert trainer A can `get_plan_full` a template created by trainer B).
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement:** in each context, prepend `with {:ok, _client} <- Clients.authorize_client(ctx, client_id)` to `list_plans_for_client/3` and `assign_plan_to_client/4`; in the central fetch helpers (`get_plan_full/2` public and `get_plan/2` private at `nutrition_plans.ex:325` / `training_plans.ex:266`) add after load: `with :ok <- Clients.authorize_client_id(ctx, plan.client_id)` — thread `ctx` into the private helper where it currently takes bare `business_id` (rename arg, internal only). Every nested mutation (days/meals/weeks/sessions) that routes through these helpers inherits the guard — verify by grep that no other fn in these two modules does `Repo.get`-by-id on a client-owned row without passing the helper; if one does, guard it identically.
- [ ] **Step 4: Run** both contexts' suites + their controller tests — green.
- [ ] **Step 5: Commit** `feat(team): enforce client visibility in nutrition + training plans`

### Task 5: Enforcement sweep B — threads, sessions, meal_logs, weight_entries, client_profiles

**Files:**
- Modify: `backend/lib/easy/threads.ex`, `backend/lib/easy/sessions.ex`, `backend/lib/easy/meal_logs.ex`, `backend/lib/easy/weight_entries.ex`, `backend/lib/easy/client_profiles.ex`
- Test: each context's existing test file

**Interfaces:** same pattern as Task 4. Exact entry points to guard (from recon — re-grep `def [a-z_]*_(for|to)_client\(` to confirm):
- `threads.ex`: `list_threads_for_client/2`, `create_thread_for_client/3`, and `get_thread/2` (coach side: guard `thread.client_id` via `authorize_client_id`; the client-role branch resolving via `Client.for_user(ctx.user_id)` at `threads.ex:173` is untouched).
- `sessions.ex`: `list_sessions_for_client/3`, `get_session_for_client/3`.
- `meal_logs.ex`: `list_meal_logs_for_client/3`.
- `weight_entries.ex`: `list_entries_for_client/3`, `adherence/3`, and the private `get_client_by_id/2` (`weight_entries.ex:117`) — pipe `Client.visible_to(ctx)` there so both callers inherit.
- `client_profiles.ex`: `assign_form_template_to_client/4`, `list_form_assignments_for_client/2`, `get_form_assignment_for_client/3`, plus the coach-side profile show/update paths (`ClientProfileController` routes through this context — grep for the fns it calls and guard the client resolution there too).

**Steps:**

- [ ] **Step 1: Failing isolation tests per context** — one canonical pair each: trainer A on trainer B's client → `:not_found`; owner → ok. For threads also: trainer A cannot `get_thread` a thread belonging to B's client.
- [ ] **Step 2: Run to verify failures.**
- [ ] **Step 3: Implement** the guards exactly as Task 4 (`authorize_client` at `_for_client` entry, `authorize_client_id`/`visible_to` at central client resolution). Client-role fns (`*_client_*` Case-3, resolving via `Client.for_user(ctx.user_id)`) are NOT touched.
- [ ] **Step 4: Run** all five contexts' suites + controller suites — green. Then full `mix test` — no new failures vs baseline.
- [ ] **Step 5: Commit** `feat(team): enforce client visibility in threads, sessions, logs, weights, profiles`

### Task 6: Coaches context — team management + invite/accept flow

**Files:**
- Modify: `backend/lib/easy/coaches.ex`
- Modify: `backend/lib/easy/orgs/coach.ex` (resolve/expiry helpers if placed on schema — follow `Client`'s split: token resolve lives in context)
- Modify: `backend/lib/easy/identity/invitations.ex`
- Modify: `backend/lib/easy/identity/user_sessions.ex` (add `revoke_all_for_user/1`)
- Modify: `backend/lib/easy/emails.ex`
- Test: `backend/test/easy/coaches_test.exs` (create/extend), `backend/test/easy/identity/invitations_test.exs` (extend)

**Interfaces:**
- Produces:
  - `Coaches.list_team(ctx)` → `{:ok, [%Coach{}]}` — all statuses, `Coach.for_business(ctx.business_id)`, ordered newest-first; owner-only (`{:error, :not_owner}`).
  - `Coaches.invite_trainer(ctx, attrs)` → `{:ok, %Coach{}} | {:error, :not_owner | :already_on_team | Ecto.Changeset.t()}`. Owner-only. attrs = `%{email, first_name, last_name}` (atom keys — CastAndValidate). If an `:invited` row exists for `(business, lower(email))` → rotate token + `invitation_sent_at`, resend email, return it (idempotent). `:active`/`:inactive` row → `:already_on_team`. Inviting the owner's own email → `:already_on_team`. Sends `Emails.trainer_invitation_email(email, invitation_token, business_name)`.
  - `Coaches.resend_invite(ctx, coach_id)` → `{:ok, %Coach{}} | {:error, :not_owner | :not_found}` (only `:invited` rows; rotate + resend).
  - `Coaches.revoke_invite(ctx, coach_id)` → `{:ok, %Coach{}} | {:error, :not_owner | :not_found}` — deletes the row, only when `status == :invited`.
  - `Coaches.deactivate_trainer(ctx, coach_id)` → `{:ok, %Coach{}} | {:error, :not_owner | :not_found | :cannot_deactivate_owner}`. Transaction: set `:inactive`; `UserSessions.revoke_all_for_user(coach.user_id)`; `UPDATE clients SET assigned_coach_id = <owner coach row id> WHERE business_id = ^ctx.business_id AND assigned_coach_id = ^coach_id` (via `Repo.update_all`). Deactivating the owner's own row → `:cannot_deactivate_owner`.
  - `Coaches.resolve_invitation_token(token)` → `{:ok, %Coach{}} | {:error, :invalid | :used | :expired}` — mirror `Clients.resolve_invitation_token/1` (`clients.ex:170-178`): `:invited` + `invitation_sent_at` within 30 days.
  - `Coaches.accept_invite(coach, user_id)` → `{:ok, %Coach{}} | {:error, :race_lost | :already_a_coach}` — atomic `update_all` (`where status == :invited and id == ^coach.id`, set user_id/status/token-nil); `:already_a_coach` when the user already has ANY coach row (pre-check + rescue the `coaches_user_id_index` constraint).
  - `Coaches.invitation_preview(token)` → `{:ok, %{business_name: _, email: _, first_name: _}} | {:error, …}` for the accept screen.
  - `Invitations.accept_trainer_invite(%{"invitation_token" => t, "email" => e})` → `{:ok, :otp_sent} | {:error, …}` and `Invitations.verify_accept_trainer_invite(params, session_opts)` → `{:ok, auth_tokens} | {:error, …}` — mirror the client pair verbatim (same OTP machinery, `:invitation_acceptance` type; only resolve/finalize differ: `Coaches.resolve_invitation_token`, `Coaches.accept_invite`, session `role: :coach`).
  - `UserSessions.revoke_all_for_user(user_id)` → `{count, nil}` — `update_all(set: [revoked_at: DateTime.utc_now(:second)])` on non-revoked sessions.
  - `Emails.trainer_invitation_email(email, invitation_token, business_name)` — mirror `client_invitation_email` (`emails.ex:28`) but the link targets the COACH app: use the `:easy, :frontend_url` config (coachapp), path `/accept-invite?token=…`.
- Consumes: Task 1 changesets/builders, Task 2 `get_active_coach_for_user`, Task 3 owner check pattern.

**Steps:**

- [ ] **Step 1: Failing context tests** (`coaches_test.exs`): invite happy path (row `:invited`, token present, email downcased); re-invite same email idempotent (same row, new token); active teammate → `:already_on_team`; non-owner → `:not_owner`; revoke deletes only invited; deactivate: status flips + clients move to owner's coach row + sessions revoked (insert a session, assert `revoked_at` set) + owner-row protected; resolve token valid/used/expired/invalid; `accept_invite` links user, second accept → `:race_lost`, user who's already a coach elsewhere → `:already_a_coach`.
- [ ] **Step 2: Failing invitations tests:** full OTP flow for a trainer (accept → OTP mail → verify → auth tokens with `role: :coach` claims incl. `coach_id`); verify rejects wrong OTP/expired.
- [ ] **Step 3: Run to verify failures.**
- [ ] **Step 4: Implement** per Interfaces. Keep `Invitations` DRY: extract the shared OTP-send/verify scaffolding only if it stays readable — duplicating the two small public fns with different resolve/finalize calls is acceptable (they're ~30 lines each); do NOT build a generic "invitable" abstraction.
- [ ] **Step 5: Run** `mix test test/easy/coaches_test.exs test/easy/identity` — green. Full backend suite — no new failures.
- [ ] **Step 6: Commit** `feat(team): trainer invite/accept/deactivate context + session revocation`

### Task 7: HTTP + OpenAPI — team endpoints, trainer accept endpoints, reassign

**Files:**
- Create: `backend/lib/easy_web/controllers/coaches/team_controller.ex`
- Create: `backend/lib/easy_web/open_api/schemas/team.ex`
- Modify: `backend/lib/easy_web/controllers/auth_controller.ex` (3 trainer-invite actions)
- Modify: `backend/lib/easy_web/controllers/coaches/client_controller.ex` (reassign action)
- Modify: `backend/lib/easy_web/router.ex`
- Modify: `backend/lib/easy_web/controllers/fallback_controller.ex` (new atoms)
- Test: `backend/test/easy_web/controllers/coaches/team_controller_test.exs` (create), extend auth + client controller tests

**Interfaces:**
- Routes (coach scope, `require_coach`):

```elixir
get "/team", TeamController, :index
post "/team/invite", TeamController, :invite
post "/team/:id/resend-invite", TeamController, :resend_invite
delete "/team/:id", TeamController, :revoke_invite
post "/team/:id/deactivate", TeamController, :deactivate
post "/clients/:id/reassign", ClientController, :reassign
```

- Public scope (same block as the client invitation routes, `router.ex:49-51`):

```elixir
get "/trainer-invitations/:token", AuthController, :show_trainer_invitation
post "/trainer-accept-invite", AuthController, :trainer_accept_invite
post "/trainer-accept-invite/verify", AuthController, :trainer_accept_invite_verify
```

- OpenAPI (`schemas/team.ex`): `TeamMember` (id, first_name, last_name, email, status, is_owner:boolean — computed `coach.user_id == business.owner_id`, invitation_sent_at nullable), `TeamResponse` (`data: [TeamMember]`), `TrainerInviteRequest` (email required + format, first_name, last_name), `ReassignClientRequest` (`coach_id` uuid required). Operation ids: `getTeam`, `inviteTrainer`, `resendTrainerInvite`, `revokeTrainerInvite`, `deactivateTrainer`, `reassignClient`. Every owner-gated op declares `unauthorized` (401), **`forbidden` (403)**, `unprocessable_entity` (422); invite also `conflict`-free (already_on_team renders 422 — see below).
- FallbackController additions: `:already_on_team` → 422 unprocessable `%{fields: %{email: ["is already on this team"]}}`; `:cannot_deactivate_owner` → 422 `%{fields: %{coach: ["the owner cannot be deactivated"]}}`; `:already_a_coach` → maps via existing `Errors`-struct path if the Invitations flow returns `Easy.Error` (mirror how `already_active_client` renders today — check `Errors` module and reuse the pattern); `:coach_not_active` was added in Task 3.
- Controller actions are one-context-call thin; `CastAndValidate` on `:invite` and `:reassign`; reassign reads `%{coach_id: coach_id} = conn.body_params`, client id from path.
- Consumes: every Task 6 context fn, exact names above.

**Steps:**

- [ ] **Step 1: Failing controller tests:** `GET /team` 200 owner (schema-assert `TeamResponse` with `assert_schema`), 403 non-owner trainer; `POST /team/invite` 200 + row, 403 trainer, 422 dup active, 422 bad email (CastAndValidate); resend 200/404-on-active; revoke 200 invited / 404 active; deactivate 200 + effects, 422 owner-self; `POST /clients/:id/reassign` 200 owner + client moves, 403 trainer, 422 inactive target; trainer-invite public endpoints: preview 200/expired, accept sends OTP (assert via Swoosh test assertions — grep how existing invitation mailer is asserted), verify returns tokens.
- [ ] **Step 2: Run to verify failures.**
- [ ] **Step 3: Implement** controllers + schemas + routes + fallback clauses.
- [ ] **Step 4: Run** the new suites + `mix test test/easy_web` — green. `mix precommit`.
- [ ] **Step 5: Commit** `feat(team): team management + trainer accept endpoints with OpenAPI`

### Task 8: Coachapp — team settings, accept-invite screens, assigned-trainer picker

**Files:**
- Regen: `just gen-api` (repo root; restart dev backend first if it was running through schema edits)
- Create: `frontend/apps/coachapp-v2/src/api/team.ts`
- Create: `frontend/apps/coachapp-v2/src/settings/team.tsx`
- Create: `frontend/apps/coachapp-v2/src/auth/accept-invite.tsx` + `frontend/apps/coachapp-v2/src/auth/verify-invite-otp.tsx` (mirror `frontend/apps/clientapp-v2/src/auth/accept-invite.tsx` / `verify-invite-otp.tsx` — read both first, keep the coach variants structurally identical)
- Modify: `frontend/apps/coachapp-v2/src/settings/settings.tsx` (mount TeamSection)
- Modify: `frontend/apps/coachapp-v2/src/clients/invite-client.tsx` + `frontend/apps/coachapp-v2/src/clients/edit-client.tsx` (assigned-trainer picker)
- Modify: coachapp router file (locate where `/login` route is declared — add `/accept-invite`)

**Interfaces:**
- Consumes generated hooks from operation ids: `useGetTeamQuery`, `useInviteTrainerMutation`, `useResendTrainerInviteMutation`, `useRevokeTrainerInviteMutation`, `useDeactivateTrainerMutation`, `useReassignClientMutation` (verify exact generated names in `src/api/generated.ts` after regen).
- `api/team.ts` wraps them with invalidation consistent with `api/billing.ts`'s pattern (tag `{type: 'Team', id: 'LIST'}`; reassign additionally invalidates the clients list tag — read `api/clients.ts` for its tag names).

**Behavior (binding):**
1. **TeamSection** in Settings, rendered only when billing summary's `is_owner` is true (same flag BillingSection already uses). Section heading (verbatim): **"Team"**. Rows: full name, email, status chip — (verbatim) **"Invited"** / **"Active"** / **"Deactivated"**; the owner row shows **"Owner"** instead of a status chip. Row actions: invited → **"Resend invite"** + **"Revoke invite"**; active non-owner → **"Deactivate"** with confirm dialog copy (verbatim): **"Deactivate this trainer? Their clients will be reassigned to you."** confirm button **"Deactivate"**, cancel **"Cancel"**.
2. **"Invite trainer"** button → dialog with First name / Last name / Email, submit (verbatim) **"Send invite"**; on success close + refetch; on 422 duplicate show the server field error inline.
3. **Accept screens** (public routes `/accept-invite`, token from query string): preview business name — heading (verbatim) **"Join {business_name} as a trainer"** — email + OTP two-step exactly like the clientapp flow; on success store auth tokens the same way login does and route into the app.
4. **Assigned-trainer picker**: in invite-client and edit-client forms, a select labeled (verbatim) **"Assigned trainer"**, options = active team members; visible ONLY when `is_owner`; invite path passes nothing (backend defaults to acting coach) unless the owner picks someone else — in that case call reassign after create for the invite path, or include it in the edit flow via the reassign mutation (edit form: changing the picker fires `reassignClient` on save). Trainers see no picker.
5. Errors: (verbatim) **"Couldn't load team"** with a Retry button, matching the app's ErrorState pattern.
6. No new deps.

**Steps:**

- [ ] **Step 1:** `just gen-api`; verify the six hooks exist in `generated.ts`.
- [ ] **Step 2:** Implement `api/team.ts`, TeamSection, dialogs.
- [ ] **Step 3:** Implement accept screens + route.
- [ ] **Step 4:** Implement the picker in both client forms.
- [ ] **Step 5:** `pnpm -C apps/coachapp-v2 build` (tsc clean) + `bash scripts/check-rm.sh` — both from `frontend/`.
- [ ] **Step 6:** Live smoke (dev servers): owner invites trainer → email link (grab token from backend logs/mailbox) → accept + OTP → trainer logs in, sees empty client list; owner reassigns a client → trainer sees exactly that client (list + detail + plans); trainer CANNOT open another client by URL (404 state); owner deactivates trainer → trainer's next refresh is logged out, clients back with owner; billing page unchanged (`used_seats` unmoved by trainer invites). Verify at 1280px and 390px.
- [ ] **Step 7: Commit** `feat(coachapp): team settings, trainer accept flow, assigned-trainer picker`

### Task 9: Final verification + whole-branch review

- [ ] `mix precommit` (backend) — failures limited to the documented 8-test baseline.
- [ ] `just lint` / `just build` — no NEW failures vs the pre-existing set noted in the SDD ledger.
- [ ] Grep-audit (mechanical): every fn matching `def [a-z_]*_(for|to)_client\(` in `lib/easy/*.ex` calls `authorize_client`; `Client.visible_to` piped in every `Clients` read path; no `assigned_coach_id` in any `cast/3` list.
- [ ] Final whole-branch review (most capable model) per superpowers:subagent-driven-development; the risk centers are the enforcement sweeps (Tasks 4–5) and the claims plumbing (Task 2).
- [ ] Then superpowers:finishing-a-development-branch.
