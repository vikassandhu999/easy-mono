# Coach team capability and envelope implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the coach client capability artifacts and add the canonical coach team management capability with its bounded Claude Design envelope.

**Architecture:** Product truth remains in canonical files under `docs/product-capabilities/`; Claude Design receives only derived envelopes under `docs/product-capabilities/envelopes/`. Team management owns the roster and trainer membership lifecycle, while authentication owns OTP acceptance and client relationships owns ordinary assignment.

**Tech Stack:** Markdown, backend OpenApiSpex contracts, Elixir domain rules, React/RTK Query behavior, ripgrep, Git.

## Global constraints

* Follow `docs/agents/claude-design-workflow.md` and `docs/superpowers/specs/2026-07-14-coach-team-capability-design.md`.
* Describe product behavior without routes, screens, dialogs, navigation, layout, or component instructions.
* Keep code paths and technical evidence in canonical capability entries only.
* Do not add runtime code or change product behavior.
* Treat authentication, client relationships, and billing as related capabilities. Do not copy their workflows into Team management.
* Unsupported capabilities require direct user approval before Claude Design may rely on them.

---

### Task 1: Correct the client capability source and envelope

**Files:**

* Modify: `docs/product-capabilities/coach-client-relationships.md`
* Modify: `docs/product-capabilities/envelopes/coach-client-relationships.md`

**Interfaces:**

* Consumes: `ClientInviteRequest`, `Easy.Clients.list_clients/2`, `Easy.Clients.invite_client/2`, and the approved Team capability design spec.
* Produces: corrected client product truth and a matching design input with no frontend-only restriction.

- [x] **Step 1: Separate filtered count from roster status totals**

In the canonical entry, describe the visible roster's status totals separately from the matching count returned after search and filtering. Change the list action outcome so it does not imply that status totals are recalculated by filters.

In the envelope, use this distinction:

```markdown
* Collection context: total matching relationships, overall counts by pending, active, and inactive status, active clients needing attention, search by name or contact information, and filtering by status or coaching stage.
```

- [x] **Step 2: Remove the frontend-only display-name requirement**

Record that first and last name are optional invitation information. The invitation requires at least email or phone.

Use this canonical action shape:

```markdown
* A coach can invite a person using at least an email address or phone number and may include their name, resulting in a pending client relationship, a shareable invitation link, and an assigned default intake.
```

Use this canonical constraint:

```markdown
* A coach invitation needs at least one delivery or sharing contact: email or phone. First and last name are optional.
```

Make the equivalent changes in the envelope and its pending-client example without adding a placeholder name requirement.

- [x] **Step 3: Describe email delivery as part of invitation creation**

Replace the separate "send invitation" action with this behavior in both artifacts:

```markdown
* Creating an invitation with an email address automatically attempts email delivery. For a phone-only invitation, the coach can copy or share the returned link through a device-supported channel.
```

- [x] **Step 4: Validate the corrected client artifacts**

Run:

```bash
! rg -n 'requires? a display name|needs a display name|using a display name' \
  docs/product-capabilities/coach-client-relationships.md \
  docs/product-capabilities/envelopes/coach-client-relationships.md

rg -n 'First and last name are optional|name is optional' \
  docs/product-capabilities/coach-client-relationships.md \
  docs/product-capabilities/envelopes/coach-client-relationships.md

rg -n 'automatically attempts email delivery' \
  docs/product-capabilities/coach-client-relationships.md \
  docs/product-capabilities/envelopes/coach-client-relationships.md

git diff --check
```

Expected: the first command prints nothing; both positive scans match both files; `git diff --check` exits successfully.

---

### Task 2: Add coach team management to the capability library

**Files:**

* Create: `docs/product-capabilities/coach-team-management.md`

**Interfaces:**

* Consumes: `EasyWeb.Coaches.TeamController`, Team OpenAPI schemas, `Easy.Coaches`, `Easy.Orgs.Coach`, trainer invitation acceptance, billing seat calculation, and coachapp team behavior.
* Produces: the canonical source for team roster information and trainer membership lifecycle.

- [x] **Step 1: Write the supported outcome and available information**

State that a business owner can establish and maintain a coaching team while client responsibility remains accounted for when a trainer leaves.

Include only these information groups:

* The whole team collection, available to the business owner.
* First name, last name, and email when recorded; an invited member always has email.
* Invited, active, or inactive status and whether the member is the owner.
* Invitation send time and the 30-day validity period for invited members.

- [x] **Step 2: Write actions, lifecycle, and conditions**

Document these actions and outcomes:

* Owner lists all team members.
* Owner invites by required email with optional name; the result is an invited membership and automatic email delivery.
* Owner resends an invited membership; the link rotates and the 30-day period restarts.
* Owner revokes an invited membership; the pending row is removed.
* Owner deactivates an active non-owner trainer; new sign-in and session renewal are blocked, already issued access may continue for up to five minutes, and assigned clients transfer to the owner immediately.

Document this lifecycle:

```text
invited -> active    invitation accepted
invited -> removed   invitation revoked
active  -> inactive  owner deactivates trainer
```

Document these conditions:

* Only the owner can access team management.
* Pending actions apply only to invited members; deactivation applies only to active non-owner trainers.
* There is no supported transition out of inactive.
* A person with any coach membership cannot accept another trainer invitation.
* Trainer membership does not consume client billing seats.

- [x] **Step 3: Record constraints, related ownership, and unsupported assumptions**

Include these interaction constraints:

* Email is required; first and last name are optional.
* The owner cannot invite their own account email.
* Re-inviting a pending email on the same team refreshes only its link and send time; it does not update member details.
* An active or inactive email on the same team cannot be invited again.
* Invitations expire 30 days after the latest send time.
* Deactivation cannot target the owner. It blocks sign-in and session renewal, permits already issued access for up to five minutes, and transfers clients to the owner immediately.

Reference Authentication and invitation acceptance, Client relationships, and Billing and seats without copying their internal behavior.

List these unsupported assumptions: trainer reactivation, owner editing another member, deletion of active or inactive trainers, choosing a transfer target during deactivation, ownership transfer, team search, filtering, pagination, per-member permission settings, configurable roles, bulk team actions, multi-business coach membership, and delivery outside email.

- [x] **Step 4: Add verification evidence**

Reference:

```markdown
* `backend/lib/easy_web/controllers/coaches/team_controller.ex` and `backend/lib/easy_web/controllers/coaches/team_json.ex`: supported owner team operations and rendered team information.
* `backend/lib/easy_web/open_api/schemas/team.ex`: public team information and invitation input.
* `backend/lib/easy/coaches.ex` and `backend/lib/easy/orgs/coach.ex`: membership lifecycle, duplicate handling, deactivation effects, and invitation validity.
* `backend/lib/easy/identity/invitations.ex`: trainer acceptance result and the single-coach-membership condition.
* `backend/lib/easy/identity/user_sessions.ex`, `backend/lib/easy/identity/session_factory.ex`, and `backend/lib/easy/identity/token.ex`: session revocation and the five-minute access window.
* `backend/lib/easy/billing.ex`: client-only seat calculation.
* `frontend/apps/coachapp-v2/src/api/team.ts` and `frontend/apps/coachapp-v2/src/settings/team.tsx`: interaction-visible team behavior.
```

---

### Task 3: Derive and validate the Team Design Envelope

**Files:**

* Create: `docs/product-capabilities/envelopes/coach-team-management.md`
* Modify: `docs/superpowers/plans/2026-07-14-coach-team-capability-envelope.md`

**Interfaces:**

* Consumes: `docs/product-capabilities/coach-team-management.md`.
* Produces: the bounded Team input for Claude Design and a completed implementation record.

- [x] **Step 1: Derive the envelope**

Use the canonical sections without verification evidence. Do not add search, filters, roles, member editing, reactivation, a selectable transfer target, or manual link sharing.

Use four example members:

* Priya Nair, active business owner.
* Neha Kapoor, active trainer with assigned clients.
* Rohan Mehta, invited on 13 July 2026 and expiring on 12 August 2026.
* Sana Iqbal, inactive after deactivation, with her assigned clients transferred to Priya.

- [x] **Step 2: Validate derivation and neutrality**

Run:

```bash
! rg -n 'TBD|TODO|FIXME|<[^>]+>' \
  docs/product-capabilities/coach-team-management.md \
  docs/product-capabilities/envelopes/coach-team-management.md

! rg -n '/v1/|\.tsx|\.ex(:|`)|OpenApiSpex|Ecto|RTK Query|ROUTES|coach_id|user_id|business_id' \
  docs/product-capabilities/envelopes/coach-team-management.md

for heading in 'Supported outcome' 'Available information' 'Supported actions' 'Lifecycle' 'Conditions' 'UX-relevant constraints' 'Related capabilities' 'Unsupported assumptions'; do
  rg -q "^## ${heading}$" docs/product-capabilities/coach-team-management.md
  rg -q "^## ${heading}$" docs/product-capabilities/envelopes/coach-team-management.md
done

rg -q '^## Verification evidence$' docs/product-capabilities/coach-team-management.md
rg -q '^## Example content$' docs/product-capabilities/envelopes/coach-team-management.md
git diff --check
```

Expected: negative scans print nothing; every required section is present; `git diff --check` exits successfully.

Compare every Team envelope action, state transition, condition, and unsupported assumption with the canonical entry. The envelope may omit technical evidence but must not add behavior.

- [x] **Step 3: Mark the plan complete and commit**

Mark every plan checkbox complete, then run:

```bash
git add \
  docs/product-capabilities/coach-client-relationships.md \
  docs/product-capabilities/envelopes/coach-client-relationships.md \
  docs/product-capabilities/coach-team-management.md \
  docs/product-capabilities/envelopes/coach-team-management.md \
  docs/superpowers/plans/2026-07-14-coach-team-capability-envelope.md

git commit -m "docs: add coach team design envelope"
```

Expected: one documentation-only commit containing the corrected client artifacts, Team canonical capability, Team envelope, and completed implementation plan.
