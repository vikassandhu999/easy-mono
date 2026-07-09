# Client Lifecycle, Subscription Tracking & Default Intake — Design

**Date:** 2026-07-09
**Status:** Approved (brainstormed with user; stage model and status streamlining validated against gpt-5.5 market research of Trainerize/TrueCoach/Everfit/CoachRx/My PT Hub)

## Goal

Make a coach's roster answer two questions at a glance — *"what phase is each client in?"* and *"what do they need from me today?"* — and make client subscription periods real (tracked dates, automatic deactivation on expiry). Simultaneously shrink the status vocabulary so every word the coach sees implies exactly one action.

End-state coach vocabulary: **3 statuses, 2 stages, 3 flags.**

```
client.status          = pending | active | inactive        (was 5 values)
client.stage           = onboarding | coaching              (new; shown for active only)
client.inactive_reason = manual | subscription_expired | awaiting_seat  (new; set iff inactive)
flags (derived, never stored) = intake_incomplete | needs_plan | expiring_soon
```

## 1. Status streamlining

### Enum change

`clients.status` shrinks from `[active, pending, inactive, archived, awaiting_seat]` to `[pending, active, inactive]`:

- **`archived` merges into `inactive`.** Verified behaviorally identical today (no seat, locked out, seat-gated reactivation — `clients.ex:219` already matches both). "Might come back vs. gone forever" gets no state: it has no operational consequence.
- **`awaiting_seat` becomes `inactive` + `inactive_reason: awaiting_seat`.** It was an activation hold, not a lifecycle state. It must NOT fold into `pending` — "hasn't accepted" and "accepted but no seat" are different situations.

### New column: `inactive_reason`

Nullable `Ecto.Enum [:manual, :subscription_expired, :awaiting_seat]`. Invariant: non-nil iff `status = :inactive` (set on every transition to inactive, cleared on every transition out). Powers the Inactive-tab reason chips and the reactivation CTA copy. Enforce the invariant in the changeset.

### Transition matrix (5 rules, was 9)

```
pending  -> active                      (invite accepted, seat available)
pending  -> inactive(awaiting_seat)     (invite accepted, no seat)
active   -> inactive(manual)            (coach deactivates)
active   -> inactive(subscription_expired)  (expiry sweep only)
inactive -> active                      (coach reactivates; seat-gated as today)
```

Guard: transition `inactive -> active` is rejected while `subscription_ends_on` is in the past — the coach must extend or clear the dates first, otherwise the next sweep would immediately re-deactivate. The reactivation UI bundles date-extension into the same dialog.

### Billing changes

- `Billing.activate_awaiting_clients/1` predicate changes from `status == :awaiting_seat` to `status == :inactive and inactive_reason == :awaiting_seat`; its `update_all` sets `status: :active, inactive_reason: nil`. **It must not touch other inactive clients.**
- Seat counting and `ensure_seat_available` are unchanged (only `active` occupies a seat, as today).

### Migration

One migration, in order: add `inactive_reason` and the new columns from §2/§4; remap `archived -> inactive (reason: manual)` and `awaiting_seat -> inactive (reason: awaiting_seat)`; backfill `stage` (see §2); then the enum values `archived`/`awaiting_seat` cease to exist in code. (Postgres column is varchar via Ecto.Enum, so no DB-level enum surgery — just data remap + code enum change.)

### Blast radius

`Client` schema + transition validation; status-count summary query (`clients.ex:254-268`) now returns 3 buckets; OpenAPI `client.ex:128` enum; both frontends regen (`just gen-api`; **restart phx.server first — OpenApiSpex spec is cached in dev**); coachapp `STATUS_DISPLAY` (`clients/lib/client.ts`) and `FILTER_OPTIONS` tabs (`list-clients.tsx`); tests. No API deprecation window — we own both consumers, pre-launch.

## 2. Stage

New column on `clients`: `stage`, `Ecto.Enum [:onboarding, :coaching]`, NOT NULL, default `:onboarding`.

**Meaning:** `onboarding` = "client is on board but I haven't delivered their first plan." The finish line is concrete: first plan assigned.

- **Auto-advance:** in the training-plan and nutrition-plan assignment context functions — when a plan is assigned to a client whose stage is `:onboarding`, set stage to `:coaching` in the same transaction. This is the only automatic stage transition.
- **Manual override:** coach can set stage either direction via the normal client-update endpoint (allowed only while `active`). No other rules — override exists so the coach is never locked out of correcting it.
- Intake completion does NOT advance stage (a coach may assign a plan before intake is done; the client is then `coaching` with an `intake_incomplete` flag — correct: they're being coached, paperwork lags).
- Stage is never cleared. On reactivation the client resumes their old stage (a returning client is not re-onboarded).
- **Backfill:** existing active clients with any plan ever assigned -> `:coaching`, else `:onboarding`. All other statuses keep the default.
- UI shows stage only for `active` clients.

## 3. Derived attention flags

Never stored; computed server-side in the client-list query (joins/subqueries) and returned as three booleans on the list-item payload, plus on the client-detail payload:

| Flag | Derivation | Coach action |
|---|---|---|
| `intake_incomplete` | client has a `FormAssignment` with `purpose: :intake` and status in `[:assigned, :in_progress]` (no dependency on a `ClientProfile` row existing; `completed`/`dismissed` clear it) | nudge client |
| `needs_plan` | no non-archived training plan AND no non-archived nutrition plan currently assigned | build plan |
| `expiring_soon` | `status = active` and `subscription_ends_on` within the next 7 days (inclusive of today) | renew conversation |

Naming rule: the word "pending" is reserved for invites. The flag is always labeled **"Intake incomplete."**

Display rules (coachapp roster):
- Stage `onboarding`: flags collapse into the stage chip showing the highest-priority missing item — `Onboarding · Needs plan` if intake is done, else `Onboarding · Intake incomplete`. (`expiring_soon` still shows as its own badge if applicable.)
- Stage `coaching`: chip reads `Coaching`; `needs_plan` / `expiring_soon` / `intake_incomplete` render as standalone badges. No badges = nothing owed.

## 4. Subscription tracking

Two nullable `:date` columns on `clients`: `subscription_started_on`, `subscription_ends_on`. No new table, no payments — the coach types dates in. Validation: `ends_on >= started_on` when both set. Editable from the client-detail page (and optionally at invite time). Clients with no `ends_on` never auto-expire.

### Expiry sweep

A small GenServer (`Easy.Clients.SubscriptionSweeper`) in the supervision tree:

- Runs once on boot, then every 24h via `Process.send_after`.
- One `update_all`: clients with `status: :active` and `subscription_ends_on < today (UTC)` -> `status: :inactive, inactive_reason: :subscription_expired`.
- Bypasses changesets deliberately (same pattern as `activate_awaiting_clients`); scoped by nothing — it sweeps all businesses.
- `# ponytail:` UTC date boundary (expiry lands up to a few hours off local midnight) and 24h granularity are acceptable; upgrade path is Oban + business timezones if this ever matters.

### Renewal / reactivation UX

- Inactive row with `reason: subscription_expired` shows chip `Subscription ended <date>` and CTA **"Extend subscription"** — a dialog that sets new dates and reactivates in one action (subject to the §1 guard and seat check).
- `reason: manual` -> chip `Paused by you`, CTA "Reactivate". `reason: awaiting_seat` -> chip `Needs a seat`, CTA leads to billing/add-seats.

## 5. Default intake form

Today's custom form builder stays in the codebase but leaves the coach's way. The existing pipeline (`FormTemplate` -> auto `FormAssignment` -> client submits -> `apply_profile_mappings!` fills `ClientProfile` sections) already works end-to-end (`client_profiles.ex:318-434`); we supply curated content and auto-wiring.

### Default template

Question content defined as a code constant (module `Easy.ClientProfiles.DefaultIntake`) in the exact sections/questions shape `FormTemplate` validates today. On client invite, **get-or-create** a `FormTemplate` row per business (`purpose: :intake`, name "Intake") from the constant, then auto-assign it to the new client (`FormAssignment`, `purpose: :intake`). Existing pipeline handles the rest. If the business already has such a template (rerun, or coach made one), reuse it — never duplicate.

### Curated fields (~15 questions, 4 sections, each answer mapped via `profile_mapping` kind `core` into the matching `ClientProfile` section)

1. **About you & goals** (-> `general`): primary goal (select: Lose weight / Build muscle / Get fitter / Sport performance); what does success look like in 3 months (long text); target weight (number, optional).
2. **Training** (-> `training`): experience (select: New / <1 year / 1–3 years / 3+ years); days per week (select 2–6); equipment (select: Full gym / Home basics / Bodyweight only); injuries or movements to avoid (long text).
3. **Nutrition** (-> `nutrition`): dietary preference (select: No restrictions / Vegetarian / Vegan / Eggetarian / Other); allergies (text); meals per day (select 2 / 3 / 4 / 5+); typical day of eating (long text).
4. **Lifestyle** (-> `lifestyle`): daily activity (select: Desk job / On my feet part of the day / Physically demanding); sleep (select: <6 / 6–7 / 7–8 / 8+ hours); stress (select: Low / Moderate / High); anything else your coach should know (long text, optional).

Exact question-map keys/types must match the existing template validation (`form_template.ex:60-100`) — copy the shape the builder UI produces.

### Wiring intake completion

On intake submission, `FormAssignment.status` becomes `:completed` (exists) — this alone drives the `intake_incomplete` flag. Additionally sync the client's `ClientProfile.intake_status` to `:completed` (+ `intake_completed_at`) in the same flow if not already wired, so the coach-facing profile page agrees with the flag. Verify during planning; add if missing.

### Hiding the builder

Remove coachapp nav links/routes to the profile-fields builder (`settings/profile-fields.tsx`) and any form-template builder screens. Code stays; nothing deleted. The client coaching-profile page (`clients/client-profile.tsx`) remains — it's where intake answers land.

### Clientapp

After accepting the invite, the client's intake assignment must be prominent (home screen card or first-run redirect) until submitted. Reuse the existing clientapp form-filling flow (check-ins module / `get_client_form_assignment` + `submit_client_form_assignment` endpoints); planning locates the exact screen and reuses it for `purpose: intake`.

## 6. Coachapp UI summary

- **Tabs:** Active / Invited / Inactive (+counts). "Invited" is the display label for `pending`.
- **Roster rows:** stage chip per §3 display rules; invite-expired hint on Invited rows (exists today).
- **Inactive tab rows:** reason chip per §4.
- **Client detail:** status chip + stage control (override dropdown, active only); subscription dates card with edit + the reason-specific reactivation CTAs; everything else unchanged.
- `STATUS_DISPLAY` shrinks to 3 entries; add `STAGE_DISPLAY`.

## 7. API changes (OpenApiSpex, then `just gen-api` for both apps)

- `Client` schema: status enum -> 3 values; add `stage`, `inactive_reason`, `subscription_started_on`, `subscription_ends_on`, `intake_incomplete`, `needs_plan`, `expiring_soon`.
- Client update request: accepts `stage`, subscription dates.
- List endpoint: status filter values change; add optional `stage` filter; summary counts return 3 buckets.
- New or extended action for "extend subscription + reactivate" (can be the existing update endpoint if it accepts dates + status together atomically — planning decides; must be one transaction).

## 8. Testing

- Transition matrix: each allowed/forbidden transition incl. the expired-dates reactivation guard; `inactive_reason` invariant.
- Migration test or assertion on remapped rows (archived/awaiting_seat backfill, stage backfill).
- Sweep: expires the right clients only (active + past ends_on), sets reason, idempotent on rerun.
- Auto-advance: assigning first training/nutrition plan flips onboarding->coaching; second plan is a no-op; manual override respected.
- Flags: list query returns correct booleans for the derivation cases in §3.
- Intake: invite auto-creates template (once per business) + assignment; submission completes assignment, fills profile sections via mappings, sets `intake_status: completed`.
- `Billing.activate_awaiting_clients` only touches `awaiting_seat`-reason rows.
- `mix precommit` clean; frontend `just lint` clean.

## 9. Out of scope (deliberate)

- Client payments/billing integration for subscriptions (dates only).
- Subscription period history table (add when renewals need auditing).
- Grace period on expiry; expiry notification emails/pushes.
- `prospect` stage (landing-funnel module owns pre-client life).
- Deleting the form-builder code; any builder UX work.
- Oban/Quantum; business-timezone-aware sweeps.

## Walkthrough (reference)

Invite (pending, intake auto-assigned) -> accept (active + onboarding, `Onboarding · Intake incomplete`) -> client submits intake (profile fills itself, `Onboarding · Needs plan`) -> coach assigns first plan (auto -> `Coaching`) -> steady state (no badges = nothing owed; `Needs plan` reappears if the plan lapses) -> 7 days before `ends_on` (`Coaching · Expiring soon`) -> date passes (nightly sweep -> Inactive tab, `Subscription ended <date>`, app locked) -> client returns (CTA "Extend subscription": new dates + seat-gated reactivate, stage still `coaching`).
