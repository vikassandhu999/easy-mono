# Trainer Team Invitations + Access Control — Design

**Date:** 2026-07-08
**Status:** Approved (brainstorming) — pending spec review
**Scope:** Backend (`backend/`) + coachapp-v2 frontend. No billing changes.

## Goal

A business owner can invite trainers to their business. Invited trainers coach a
subset of the business's clients. A trainer sees and manages **only the clients
assigned to them**; the owner sees and manages everyone and can reassign clients
between trainers.

## Motivation

Today a business is single-trainer: the signup user is the sole `coaches` row and
the `business.owner_id`. Every client is business-scoped and visible to any coach.
There is no path to add a second trainer and no per-trainer client boundary.

## Market research (what informed these decisions)

Surveyed Trainerize, TrueCoach, Everfit (the category leaders). Consistent pattern:

- **Roles:** Owner → (optional Admin) → Trainer. Trainer sees **only assigned
  clients**; owner/admin see all and can **transfer** clients between coaches.
  Trainerize adds a per-location Manager tier for multi-location studios (not us).
- **Content library is business-shared:** TrueCoach — *"all programs and library
  items are available for any coach on the team to use."*
- **Billing is per active *client*, never per trainer.** TrueCoach: *"add as many
  coaches as you like for no additional cost."* None charge a per-trainer seat.

Sources: Trainerize "Trainer, Manager and Staff Permissions"; TrueCoach "Team
Accounts" + pricing; Everfit "Permission Settings / Add a sub-coach".

## Decisions

1. **Two tiers: Owner + Trainer.** Owner = `business.owner_id` (already gates
   billing via `Billing.ensure_owner`). Trainer = a `coaches` row. A non-owner
   "Admin who sees all clients" is **deferred** — it is one added role branch on
   top of this design, not a rework. (Everfit/TrueCoach parity, when needed.)

2. **Explicit `clients.assigned_coach_id`** is the single access boundary —
   **distinct from `creator_id`**. `creator_id` = who created the record
   (provenance, unchanged). `assigned_coach_id` = who currently coaches them
   (mutable, drives visibility).

3. **Trainers are unlimited and free** — never consume client billing seats.
   A trainer is a `coaches` row, not a `clients` row, so `Billing.used_seats`
   (counts clients) is already unaffected. **Zero billing changes.**

4. **Library stays business-shared** — `foods`, `recipes`, `exercises`, and plan
   *templates* (`nutrition_plans`/`training_plans` with `client_id = nil`) are
   visible and usable by every trainer regardless of `creator_id`. `creator_id`
   is provenance only. `foods.source = :system` (global catalog) unaffected.
   - **Ship A:** any coach may edit/delete any business library item (current
     behavior, no gating).
   - **B — documented hardening (not built now):** restrict edit/delete of a
     library item to its `creator` or the owner; use stays open to all. Add as a
     per-path `authorize` guard later; no schema/architecture change required.

5. **Client-assigned plans follow the client.** A `nutrition_plans`/
   `training_plans` row with `client_id` set is visible to a trainer iff the
   client is assigned to them. This falls out of the client boundary — no
   separate rule on plan queries beyond "the client must be visible."

## Data model changes

### `clients.assigned_coach_id`
- New column: `add :assigned_coach_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)`, nullable, indexed `(business_id, assigned_coach_id)`.
- **Backfill:** every existing client → the business owner's `coaches` row.
- On create/invite, defaults to the acting coach (or an owner-chosen coach).
- **Public write paths have no acting coach:** the landing-funnel inquiry
  (`create_inquiry`, `/v1/public` — no ctx) must default `assigned_coach_id` to
  the **owner's coach row**, not leave it nil. Audit every `Client` insert path
  (`invite_client`, `create_inquiry`) for an explicit assignment.

### `coaches` — invitation + lifecycle columns (mirrors the client-invite pattern)
Coaches currently always have a `user_id` and no email/status. Add:
- `add :email, :string` — the invited address; required for invites (matches
  `users.email`; case-insensitivity handled by a lower-case unique index).
- `add :status, :string` — `Ecto.Enum [:invited, :active, :inactive]`, default
  `:active` (existing/owner rows are `:active`).
- `user_id` becomes **nullable** — an invited-but-not-accepted trainer has no user yet.
- `add :invited_by_id, references(:coaches)` — provenance (nullable).
- Unique index on `(business_id, lower(email))`, partial `WHERE email IS NOT NULL`
  (all existing coach rows have nil email), so the same trainer isn't invited twice.
- Unique index on `(user_id)`, partial `WHERE user_id IS NOT NULL` — one coach
  row per user, mechanically (see access-control section).
- Owner's coach row (from signup) is `:active` with `user_id` set — untouched.

Invite token: reuse the existing **`one_time_tokens`** table
(`token_type: "coach_invite"`, `relates_to` = coach id) rather than adding token
columns — consistent with the OTP infra already in place.

## Access-control architecture

### Actor identity in `Ctx`
`Ctx` today is `{business_id, user_id}`. Client visibility needs the acting
**coach id** and whether the actor is the **owner**. Carry them on `Ctx`:

```
%Ctx{business_id, user_id, coach_id, owner?: boolean}
```

**Resolve at session creation, not per request.** No plug touches the DB today —
`Authenticate` is pure JWT decode. `SessionFactory.validate_role(:coach, user)`
already queries the DB once at login/refresh to stamp `role`/`business_id` into
the token; extend it to also resolve the user's **active** coach row id and
`business.owner_id == user.id`, and embed `coach_id` + `is_owner` in the JWT
claims. `Authenticate` builds the full `Ctx` from claims. Staleness window =
access-token lifetime — identical to what `role`/`business_id` already accept,
and deactivation revokes sessions so refresh re-resolves. Server-trusted only,
never from client input. Client-role and guest requests carry
`coach_id = nil`, `owner? = false`.

**Coach resolution must filter `status: :active`** (in `validate_role` /
`get_business_for_coach`). Without this, a deactivated trainer simply logs in
again — session revocation alone does not lock anyone out.

**One coach row per user, enforced:** unique index on `coaches(user_id)`
(partial, `WHERE user_id IS NOT NULL`), and the accept flow rejects an invite
when the user already has a coach row (at any business) — otherwise
`get_one_for_coach`'s `limit: 1` resolves a nondeterministic business at login.

**Fail-closed property:** a nil `assigned_coach_id` matches no trainer in
`visible_to` — the client is visible only to the owner, never leaked.

**Test impact (plan must budget for it):** existing tests build
`Ctx.new(business.id, owner_id)` and would fail closed (empty roster) once
visibility lands. Add a shared test helper (e.g. `owner_ctx(business)` /
`trainer_ctx(coach)`) in the first backend task and sweep call sites with it.

### The one chokepoint
Add a schema query builder + a context guard, and route every client-scoped path
through it:

```elixir
# Client query builder — owner sees all; trainer sees only assigned.
def visible_to(query \\ __MODULE__, %Ctx{owner?: true}), do: query
def visible_to(query, %Ctx{coach_id: coach_id}),
  do: from c in query, where: c.assigned_coach_id == ^coach_id
```

- `Clients.get_client/2` and the client list already pipe `Client.for_business`;
  add `|> Client.visible_to(ctx)`. A trainer fetching a non-assigned client gets
  `:not_found` (not `:forbidden` — don't leak existence across the boundary).
- Every `_for_client(ctx, client_id, …)` / `_to_client` entry point (in
  `nutrition_plans`, `training_plans`, `threads`, `client_profiles`, `sessions`,
  `meal_logs`, `weight_entries`) must first resolve the client through a shared
  `Clients.authorize_client(ctx, client_id)` that applies `visible_to`. This is
  the highest-risk part of the change — the enforcement must be a **single guard
  reused everywhere**, not re-implemented per module, and covered by
  cross-trainer isolation tests per context.

### Owner-only actions (via existing `ensure_owner` pattern)
Invite trainer, resend/revoke invite, deactivate trainer, reassign a client's
`assigned_coach_id`. Trainers cannot invite or reassign.

## Flows

### Invite a trainer (owner)
1. Owner submits `{email, first_name, last_name}` → `Coaches.invite_trainer(ctx, attrs)`.
2. Creates a `coaches` row: `status: :invited`, `user_id: nil`, `email`, `business_id`.
3. Issues a `coach_invite` one-time token; emails an accept link (reuse mailer).
4. Idempotent on `(business_id, email)`: re-invite resends, doesn't duplicate.

### Accept an invite (trainer)
1. Link opens accept screen → trainer verifies email via **existing OTP flow**.
2. On verify: create/find `User`, link it to the coach row, set `status: :active`,
   consume the token.
3. Trainer logs in → `validate_role(:coach, user)` resolves their business →
   session as `:coach`. They land in coachapp seeing their (initially empty) roster.

### Assign / reassign clients (owner)
- Client create + edit gain an **assigned-coach picker** (owner only; trainers see
  their own name, fixed). New clients default `assigned_coach_id` to the acting coach.
- Reassign = owner sets `assigned_coach_id` to another active trainer. Transfer is
  immediate; the plans/logs/threads move with the client because they resolve
  through client visibility.

### Deactivate a trainer (owner)
- `Coaches.deactivate_trainer(ctx, coach_id)`: set `status: :inactive`, revoke the
  trainer's sessions, and **reassign their clients to the owner** so no client is
  left invisible/orphaned. Owner can then redistribute. (No hard delete.)
- Known bounded window: access tokens are stateless JWTs, so an already-issued
  token stays valid until expiry; revocation bites at refresh, and fresh logins
  are blocked by the `status: :active` filter in coach resolution.

## Login / tenancy notes
- A user is a trainer at **one** business (matches `get_business_for_coach`
  returning a single business). Multi-business membership is **out of scope**.
- The legacy `"owner"` role string in `Authenticate`'s allowlist stays unused;
  owners authenticate as `:coach` and owner-gating is the `owner?`/`ensure_owner`
  check, not a distinct role.

## Frontend (coachapp-v2)
- **Team settings page (owner-only):** list trainers with status, invite form,
  pending-invite rows with resend/revoke, deactivate action.
- **Trainer accept-invite screen:** email + OTP, mirroring client accept.
- **Client create/edit:** assigned-coach picker (owner); read-only for trainers.
- **Client list/detail:** already filtered server-side; trainers simply see fewer.
- Copy: sentence case, "Couldn't load…" never "Failed to load…".

## Out of scope / deferred
- **Admin tier** (non-owner sees all clients) — one added role branch later.
- **B hardening** — creator/owner-only edit/delete of library items.
- Multiple trainers per client; per-location Managers; multi-business membership.
- Any billing/seat change (trainers are free by construction).

## Testing focus
- Cross-trainer isolation for **every** client-scoped context (trainer A cannot
  read/write trainer B's client's plans, logs, threads, sessions, weights,
  profile) — the chokepoint's whole point.
- Owner sees all; owner reassigns; reassigned client's plans follow.
- Invite → accept → login lands with correct roster; re-invite is idempotent;
  revoked/expired token rejected.
- Deactivate reassigns clients to owner and revokes sessions.
- Billing untouched: inviting/accepting trainers does not change `used_seats`.

## Rollout
Fresh backfill assigns all current clients to the owner, so existing single-trainer
businesses behave exactly as before until the owner invites and reassigns.
