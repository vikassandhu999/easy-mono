# Coach client capability and envelope implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the canonical coach-side client-relationship capability entry and a bounded Design Envelope derived from it.

**Architecture:** Product truth lives in one capability file under `docs/product-capabilities/`; its verification section cites the OpenAPI contract, backend rules, frontend behavior, and functional specs. The Claude Design input lives under `docs/product-capabilities/envelopes/`, contains no technical evidence or current UI structure, and links back to the canonical entry as a derived artifact.

**Tech Stack:** Markdown, backend OpenApiSpex contracts, Elixir domain rules, React/RTK Query behavior, repository validation with ripgrep and Git.

## Global constraints

* Use the rules and templates in `docs/agents/claude-design-workflow.md`.
* Describe product capabilities by user outcome, information, actions, lifecycle, conditions, and UX-relevant constraints; do not describe routes or screens.
* Keep technical source references in the canonical capability entry and out of the Design Envelope.
* Give each related capability one canonical owner and reference it without copying its rules.
* Treat owner/trainer differences, seat availability, client status, and invitation state as conditions, not a general permission matrix.
* Record unsupported assumptions explicitly; do not present them as supported product behavior.
* Do not change runtime code while documenting the capability.

---

### Task 1: Create the canonical coach client-relationship capability

**Files:**

* Create: `docs/product-capabilities/coach-client-relationships.md`
* Modify: `docs/superpowers/plans/2026-07-14-coach-client-capability-envelope.md`

**Interfaces:**

* Consumes: `docs/agents/claude-design-workflow.md`, the coach client OpenAPI operations and schemas, `Easy.Clients`, `Easy.Clients.Client`, billing seat rules, team ownership rules, and the coach frontend's client API behavior.
* Produces: the canonical product-truth source for coach-side client discovery, invitations, relationship state, assignment, subscription context, and attention signals.

- [x] **Step 1: Record the source-backed capability boundary**

Create the capability entry with these sections and facts:

* Supported outcome: a coach can establish, understand, and maintain each coaching relationship through invitation, onboarding, active coaching, and inactivity.
* Available information: roster totals and filters; identity/contact/notes; pending invitation timing and link; active/inactive status and reason; onboarding/coaching stage; assigned trainer; subscription dates; paired goal weight and unit; intake, plan, and expiry attention signals.
* Supported actions: list/search/filter; inspect attention cases; invite; share or copy the returned invitation link; resend an email invitation; revoke a pending invitation; update coach-editable client facts; activate/deactivate accepted clients; change an active client's stage; reassign to an active trainer as owner.
* Lifecycle: invitation acceptance changes pending to active when capacity remains or inactive awaiting-seat when the business became over capacity; pending can be removed through revocation; accepted clients move between active and inactive; awaiting-seat clients activate when capacity becomes available; first plan assignment advances onboarding to coaching; an expired subscription deactivates an active client.
* Conditions: owners see all business clients and may reassign them; trainers see assigned clients; seats gate invitations and reactivation; pending and inactive states change available actions; system-driven awaiting-seat clients cannot use the client app.
* UX-relevant constraints: invitation requires email or phone; an email already tied to an active client cannot be invited; resend requires a pending invitation with email; invitations expire after 30 days and resend refreshes them; subscription end cannot precede start; expired subscriptions must be extended or cleared before reactivation; goal value and unit are paired; only active clients can change coaching stage.
* Related capability references: Team management, Billing and seats, Forms and check-ins, Training plans and history, Nutrition plans and adherence, Weight tracking, Messaging, and Prospects.
* Unsupported assumptions: bulk client operations, accepted-client deletion, multiple assigned trainers, backend SMS/WhatsApp delivery, arbitrary role permissions, and trainer access to unassigned or other trainers' clients.

- [x] **Step 2: Add stable verification evidence**

Reference the exact sources used to verify the entry:

```markdown
* `backend/lib/easy_web/router.ex` and `backend/lib/easy_web/controllers/coaches/client_controller.ex`: supported coach client operations.
* `backend/lib/easy_web/open_api/schemas/client.ex`: public client information and accepted request fields.
* `backend/lib/easy/clients.ex` and `backend/lib/easy/clients/client.ex`: visibility, invitation, lifecycle, attention, assignment, and validation rules.
* `backend/lib/easy/billing.ex`: seat availability and awaiting-seat behavior.
* `backend/lib/easy/coaches.ex`: owner-only team operations and trainer lifecycle.
* `frontend/apps/coachapp-v2/src/api/clients.ts`, `frontend/apps/coachapp-v2/src/clients/invite-client.tsx`, and `frontend/apps/coachapp-v2/src/clients/client-form/edit-client-form.tsx`: interaction-visible capability behavior.
* `docs/superpowers/specs/2026-07-09-client-lifecycle-subscription-intake-design.md` and `docs/superpowers/specs/2026-07-08-trainer-team-access-control-design.md`: functional intent, used only where consistent with code.
```

- [x] **Step 3: Validate the capability entry**

Run:

```bash
rg -n 'TBD|TODO|FIXME|<[^>]+>' docs/product-capabilities/coach-client-relationships.md
git diff --check
```

Expected: `rg` prints nothing and `git diff --check` exits successfully.

Review every non-evidence line against the workflow's inclusion test. Remove any fact that does not change what a user can see, do, understand, or expect after an action.

---

### Task 2: Derive the Claude Design Envelope

**Files:**

* Create: `docs/product-capabilities/envelopes/coach-client-relationships.md`
* Modify: `docs/agents/claude-design-workflow.md`
* Modify: `docs/superpowers/plans/2026-07-14-coach-client-capability-envelope.md`

**Interfaces:**

* Consumes: `docs/product-capabilities/coach-client-relationships.md` from Task 1.
* Produces: the bounded functional input for a Claude Design client-relationship project and a durable repository convention for derived envelopes.

- [x] **Step 1: Record the derived-envelope storage rule**

In `docs/agents/claude-design-workflow.md`, extend the Phase 5 introduction with this rule:

```markdown
Store a versioned project envelope under `docs/product-capabilities/envelopes/` when it will be handed to Claude Design. Name its canonical capability sources at the top. The envelope remains derived: refresh it from those sources before reuse, and never update it instead of the capability library.
```

- [x] **Step 2: Write the bounded envelope**

Create the envelope with:

* One supported-outcome sentence with no screen or layout language.
* Semantic information groups for roster context, client identity, relationship state, invitation state, coaching assignment, subscription context, goal weight, and attention signals.
* Actions in actor + action + condition + outcome form.
* The client and invitation lifecycle rules needed for design.
* Conditional capability differences for owner, trainer, pending, inactive, and seat-blocked states.
* Only the constraints that affect interaction or feedback.
* One-line references to related capabilities without their internal fields or workflows.
* Unsupported assumptions that require direct user approval before Claude Design uses them.
* Four realistic example clients: an active coaching client, a pending invitation, an onboarding client needing attention, and an inactive client whose subscription expired.

Do not include endpoint names, source paths, route names, component names, API property names, database concepts, or instructions about where information appears.

- [x] **Step 3: Validate derivation and design neutrality**

Run:

```bash
rg -n 'TBD|TODO|FIXME|<[^>]+>' \
  docs/product-capabilities/coach-client-relationships.md \
  docs/product-capabilities/envelopes/coach-client-relationships.md

rg -n '/v1/|\.tsx|\.ex(:|`)|OpenApiSpex|Ecto|RTK Query|ROUTES|assigned_coach_id|client_id' \
  docs/product-capabilities/envelopes/coach-client-relationships.md

git diff --check
```

Expected: both `rg` commands print nothing and `git diff --check` exits successfully.

Compare every supported action, lifecycle rule, condition, and unsupported assumption in the envelope with the canonical capability entry. The envelope may be shorter but must not add product behavior.

- [x] **Step 4: Commit the capability and derived envelope together**

Run:

```bash
git add \
  docs/agents/claude-design-workflow.md \
  docs/product-capabilities/coach-client-relationships.md \
  docs/product-capabilities/envelopes/coach-client-relationships.md \
  docs/superpowers/plans/2026-07-14-coach-client-capability-envelope.md
git commit -m "docs: add coach client design envelope"
```

Expected: one documentation-only commit containing the workflow convention, canonical capability entry, derived envelope, and completed implementation plan.
