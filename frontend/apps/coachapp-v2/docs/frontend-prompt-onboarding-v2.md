# Prompt for the Frontend Coding Agent

Paste everything below the `────` line into your coding agent (OpenCode / Claude Code / Cursor) after dropping the handoff docs into the frontend repo's `docs/` folder. Then let it work.

**Hand over these four files** alongside this prompt (copy them into the frontend repo's `docs/` folder before starting):

1. `spec-client-onboarding-ux-v2.md` — the UX spec (authority on layouts, copy, edge cases)
2. `client-auth-flow.md` — step-by-step client-side flow
3. `frontend-client-management-mvp.md` — coach-side client management
4. `frontend-spec-v2-handoff.md` — consolidated handoff: TL;DR, types, fetch patterns, migration checklist

Optionally also copy `api_contract.yaml` (the OpenAPI contract — source of truth for every request/response shape).

────

# Task: Client Onboarding v2 — Frontend Implementation

You are updating an existing frontend app (a coach-side web app and a client-facing app) to match revision 2 of the client onboarding UX spec. The backend is already shipped; your job is to consume the new contract.

## Start by reading

Read these files in order, from the `docs/` folder of this repo:

1. `docs/spec-client-onboarding-ux-v2.md` — the design authority. Pay attention to copy, widget layouts, status-transition rules, and the edge cases section.
2. `docs/frontend-spec-v2-handoff.md` — the TL;DR of what changed, TypeScript type definitions, per-endpoint fetch patterns, and the migration checklist.
3. `docs/client-auth-flow.md` — detailed client-side flow (Screens 1–2, returning-user login, token refresh).
4. `docs/frontend-client-management-mvp.md` — coach-side endpoints, status rules, invitation widget, revoke.
5. `docs/api_contract.yaml` (if present) — the OpenAPI contract. Source of truth for exact field names, enums, and error shapes. Consult when handoff docs are ambiguous.

Before writing any code, use your exploration tools to answer:

- What framework and routing library is this frontend using? (Next.js / React Router / Remix / etc.)
- Where are API clients / fetchers defined? Where do type definitions live?
- Is there an existing `Client` type? Where?
- Is there an existing invitation acceptance flow? Which routes?
- Is there an existing coach client-detail page? How is the invitation section rendered today?
- How are errors currently surfaced to the user (toasts, inline form errors, modal, etc.)?
- What's the design-system primitive for: status chip, copy-to-clipboard, confirmation dialog, toast, 6-digit code input?

Report your findings before proceeding. Do not start implementing until you've done this reconnaissance and shared a short summary.

## Rules of engagement

1. **Follow the UX spec's copy verbatim** where it specifies user-facing strings. The writer chose deliberately — "Invitation" not "invite" (as a noun), "login code" not "OTP", "Coach {first_name} has invited you", etc. Adapt only for your design system's terminology when there's a clear reason.
2. **Switch error branches on `error_code`, never on `error_message`.** The codes are part of the contract; messages are subject to copy changes.
3. **Don't invent new endpoints or fields.** Every request and response shape is in `api_contract.yaml`. If you feel you need something that's not there, stop and ask.
4. **Use the migration checklist** in `frontend-spec-v2-handoff.md` as your task list. Don't skip items.
5. **Track your work with todos** and mark items complete as you finish them. Show the user progress after each meaningful step.
6. **Ask the user before destructive refactors** (deleting existing auth code, rewriting a routing tree, changing the HTTP client library, etc.). Small additions are fine to just ship.

## Scope of this task

### In scope

**Client-facing app (new or heavily revised):**

- `GET /v1/auth/invitations/:token` lookup on the invitation landing page
- Screen 1 (Welcome / email entry) — renders business + coach name from the lookup response, pre-fills `prefill_email` if present, editable
- Screen 2 (OTP entry) — 6-digit code input, Resend button, "Change it" back-link
- POST `/v1/auth/accept-invite` (Phase 1 — request OTP, no mutation)
- POST `/v1/auth/accept-invite/verify` (Phase 2 — returns `AuthTokenResponse` with `scope=client`)
- State routing for the four invitation link states: `pending` / `used` / `expired` / `invalid`
- Returning-client login flow (`POST /v1/auth/otp` + `POST /v1/auth/token` with `role: "client"`)
- Token refresh (unchanged from before, but verify your implementation handles the 401 → refresh → retry pattern cleanly)

**Coach-side app (migration):**

- Update the `Client` TypeScript type: add `invitation_sent_at`, `invitation_expires_at`. Understand that `first_name` / `last_name` are User-authoritative when linked.
- Remove `"pending"` from the PATCH status dropdown options. Status dropdown logic depends on current status (see handoff doc's `allowedStatusesFor` helper).
- Implement the "Share invitation" widget per the UX spec for pending-client detail pages:
  - Copy-able URL (`client.invite_url`)
  - "Share on WhatsApp" button (deep-links to `wa.me/{phone}?text=...` if phone present)
  - "Resend email" button (disabled if `client.email` is null)
  - "Invited X ago. Invitation expires in Y days." copy derived from `invitation_sent_at` / `invitation_expires_at`
  - "Revoke invitation" (destructive, tucked at the bottom)
- Wire up `DELETE /v1/coach/clients/:id` for the revoke action. Confirmation dialog required.
- Handle new 422 error codes on invite creation: "you can't invite yourself as a client" and "is already an active client of another business". Surface as inline form errors on the email field.
- Handle new 422 error codes on PATCH status: the transition-violation messages listed in the handoff doc.
- Verify error-response parser matches the shape `{error_code, error_message, error_detail}`. If the existing parser expects a different shape (e.g. `{errors: {fields: ...}}` — a prior version of the frontend docs was wrong about this), fix it.
- Remove the old one-step `POST /accept-invite` → mutation flow if the client-facing app had it. The flow is now strictly two-phase.

### Not in scope

- Backend changes (already shipped)
- The authenticated client app's internal structure once logged in (separate spec)
- Streaks, PR celebrations, emotional engagement layer (separate spec)
- Post-MVP multi-business login picker
- SMS / WhatsApp OTP (post-MVP alternative channel)

## Deliverables

For each change you make, produce:

1. **Code change** — TypeScript types, fetch functions, React components, route definitions, test updates.
2. **Tests** — if the repo has a testing setup (Jest, Vitest, Playwright), add coverage for at least:
   - The four invitation states from `GET /v1/auth/invitations/:token`
   - The happy path of accept-invite → verify → session stored
   - OTP errors (invalid / expired) — keep the user on Screen 2
   - `already_active_client` at verify time — show the specific message
   - The invitation widget's Copy / WhatsApp / Resend / Revoke actions
   - Status dropdown never offering "Pending"
3. **Visual verification** — screenshot or brief description of each new screen / widget once implemented, if you can run the dev server.

## Verification checklist (do this before saying "done")

- [ ] Read all five docs listed at the top.
- [ ] Reconnaissance summary shared with the user.
- [ ] Every item in the "Critical" section of the handoff doc's migration checklist is done.
- [ ] Every item in the "Important" section is done.
- [ ] Existing tests still pass.
- [ ] New tests cover the items listed above.
- [ ] You can manually demo (or describe) the full client-side flow: land on `/invite/{valid_token}` → see welcome → enter email → see OTP screen → enter correct OTP → land in the authenticated client app.
- [ ] You can manually demo (or describe) all three non-pending invitation states showing the right copy.
- [ ] You can manually demo (or describe) the coach's pending-client detail with the invitation widget (Copy / WhatsApp / Resend / Revoke all wire up to real endpoints).
- [ ] You can manually demo (or describe) that PATCH status dropdown has three options (no Pending) and that all valid transitions return 200.
- [ ] You've reviewed the diff for scope creep — nothing unrelated to onboarding has been touched.

## When you get stuck

If the handoff docs are ambiguous or contradict the UX spec:

1. Check `api_contract.yaml` — it's the most precise source of truth.
2. If the contract also doesn't answer your question, ask the user. Do not guess.
3. If you discover a backend bug or a contract field that looks wrong, stop and flag it — do not work around it. The backend team has a separate review process.

## Open questions you should raise (these were left intentionally to the frontend team)

- **Resend cooldown.** The backend has no rate limit on `POST /accept-invite`. Client-side throttle the Resend button (e.g. 30-second cooldown with a countdown) so users don't spam. Confirm cooldown duration with the user.
- **Auth-switch guard.** The UX spec says if a coach is logged in and taps a client invite link, show "You're currently logged in as a coach. Log out first…". Confirm that the client-facing app shares an auth state with the coach app (same origin? separate app?), and wire accordingly.
- **Post-login routing.** After a successful verify, where should the client land? Home? A specific onboarding tour? Confirm with the user.
- **Error telemetry.** Is there a product analytics / Sentry setup? Worth emitting events for each distinct failure mode so we can measure how often users hit `invitation_expired`, `invalid_otp`, etc.

Start by reporting your reconnaissance findings, then propose a task breakdown, then implement one task at a time with user review between each. Follow the same pattern the backend agent used: plan → confirm → ship → verify → next.
