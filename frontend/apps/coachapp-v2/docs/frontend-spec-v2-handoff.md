# Frontend Handoff — Client Onboarding Spec v2

Backend changes for the revised client onboarding spec are complete and merged. This page is the single entry point for the frontend team: what changed, what to build, what to migrate.

- **Backend commit:** `client onboarding: two-phase OTP flow, status invariants, revoke, 30-day expiry`
- **Spec reference:** "UX Spec: Client Onboarding (Invite-Only)" v2, dated 2026-04-15
- **Test status:** 410 passing, clean `--warnings-as-errors` compile
- **Contract:** `docs/api_contract.yaml` (the source of truth for request/response shapes)

Companion docs:
- `docs/client-auth-flow.md` — step-by-step client-side flow (Screens 1–2, OTP entry)
- `docs/frontend-client-management-mvp.md` — coach-side endpoints, status rules, revoke

---

## TL;DR — what changed

### The big one: accept-invite is now two phases

The old flow mutated the Client and created the User → Client link at `POST /accept-invite`, before any OTP was verified. Anyone with the invite URL could claim a Client. **This is fixed.**

The flow is now:

1. `POST /v1/auth/accept-invite` — validates the invitation and mails an OTP. **No mutation.**
2. `POST /v1/auth/accept-invite/verify` — accepts `(invitation_token, email, otp)`. On success, atomically creates/links the User, flips the Client to active, and issues a `scope=client` session in one response.

If the frontend previously called `/accept-invite` and then a separate `/verify` and `/token` chain, collapse it to just those two calls. The `verify` endpoint now returns an `AuthTokenResponse` directly.

### New endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/v1/auth/invitations/:token` | Public lookup — renders the welcome screen. Returns state-discriminated body (`pending` / `used` / `expired` / `invalid`). |
| `POST` | `/v1/auth/accept-invite/verify` | Phase-2 OTP verification; returns `AuthTokenResponse` with `scope=client`. |
| `DELETE` | `/v1/coach/clients/:id` | Revoke a pending invitation (hard-delete). |

### Updated endpoints

| Method | Path | What changed |
|--------|------|--------------|
| `POST` | `/v1/auth/accept-invite` | Now returns `200 { message }` (OTP sent), not `201` with user data. Semantics = Phase 1 of the OTP flow. No mutation. |
| `POST` | `/v1/coach/clients/invite` | Now rejects self-invite and cross-business-active-client collisions with specific 422 `error_detail.email` messages. |
| `PATCH` | `/v1/coach/clients/:id` | Status transitions validated server-side. `pending` is no longer a valid input. |
| `GET`  | `/v1/coach/clients/:id` (and list) | Response now includes `invitation_sent_at` and `invitation_expires_at` (pending only). `first_name` / `last_name` are User-authoritative when linked. |

### Error shape (universal)

All error responses, regardless of endpoint:

```ts
type ErrorResponse = {
  error_code: string;       // e.g. "invitation_expired"
  error_message: string;
  error_detail?:
    | { fields: Record<string, string[]> }  // Ecto changeset path
    | Record<string, string[]>;             // hand-built path
};
```

**Switch on `error_code`, never on `error_message`.**

### Invitation expiry

Invitations now expire after **30 days** (was: not enforced). Stale links return `410 invitation_expired`. The email copy has been updated to match.

---

## Type definitions

Copy these into your TS client.

```ts
// Shared
type AuthTokenResponse = {
  access_token: string;     // JWT, 5 min
  token_type: "Bearer";
  expires_in: 300;
  refresh_token: string;    // 7 days
  scope: "coach" | "client" | "guest" | "owner";
};

type ErrorResponse = {
  error_code: string;
  error_message: string;
  error_detail?:
    | { fields: Record<string, string[]> }
    | Record<string, string[]>;
};

// ── Client-side flow ──

type InvitationLookup =
  | {
      state: "pending";
      business_name: string;
      coach_first_name: string;
      prefill_email: string | null;
      expires_at: string; // ISO datetime
    }
  | { state: "used" }
  | { state: "expired" }
  | { state: "invalid" };

type InvitationLookupResponse = { data: InvitationLookup };

type AcceptInviteRequest = {
  invitation_token: string;
  email: string;
};

type AcceptInviteVerifyRequest = {
  invitation_token: string;
  email: string;
  otp: string;
};

type MessageResponse = { message: string };

// ── Coach-side client management ──

type ClientStatus = "active" | "pending" | "inactive" | "archived";

type Client = {
  id: string;
  email: string | null;
  first_name: string | null;   // User-authoritative when linked
  last_name: string | null;    // User-authoritative when linked
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  invite_url: string | null;              // pending only
  invitation_sent_at: string | null;      // pending only
  invitation_expires_at: string | null;   // pending only (sent_at + 30 days)
  inserted_at: string;
  updated_at: string;
};

type ClientResponse = { data: Client };
type ClientListResponse = {
  data: Client[];
  count: number;
  summary: {
    active: number;
    pending: number;
    inactive: number;
    archived: number;
  };
};

type ClientInviteRequest = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  notes?: string | null;
};

type ClientUpdateRequest = {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  notes?: string;
  status?: "active" | "inactive" | "archived"; // note: "pending" is absent
};
```

---

## Endpoint-by-endpoint patterns

### GET `/v1/auth/invitations/:token` (public)

```ts
async function lookupInvitation(token: string): Promise<InvitationLookup> {
  const res = await fetch(`${API_BASE}/v1/auth/invitations/${token}`);
  const body = (await res.json()) as InvitationLookupResponse;
  // always 200 — switch on body.data.state
  return body.data;
}

// usage
const inv = await lookupInvitation(token);
switch (inv.state) {
  case "pending":
    renderWelcomeScreen({
      businessName: inv.business_name,
      coachFirstName: inv.coach_first_name,
      prefillEmail: inv.prefill_email ?? "",
    });
    break;
  case "used":
    renderUsedScreen(); // "Log in to continue"
    break;
  case "expired":
    renderExpiredScreen();
    break;
  case "invalid":
    renderInvalidScreen();
    break;
}
```

### POST `/v1/auth/accept-invite` (public)

```ts
async function requestInviteOtp(token: string, email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/auth/accept-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitation_token: token, email }),
  });

  if (res.ok) return; // 200 { message: "OTP sent..." }

  const err = (await res.json()) as ErrorResponse;
  switch (err.error_code) {
    case "invitation_invalid":
      throw new InvitationStateError("invalid");
    case "invitation_used":
      throw new InvitationStateError("used");
    case "invitation_expired":
      throw new InvitationStateError("expired");
    default:
      throw new Error(err.error_message);
  }
}
```

### POST `/v1/auth/accept-invite/verify` (public)

```ts
async function verifyInviteOtp(
  token: string,
  email: string,
  otp: string
): Promise<AuthTokenResponse> {
  const res = await fetch(`${API_BASE}/v1/auth/accept-invite/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitation_token: token, email, otp }),
  });

  if (res.ok) return res.json();

  const err = (await res.json()) as ErrorResponse;
  // Possible: invalid_otp (401), otp_expired (410),
  //           invitation_invalid (404), invitation_used (410),
  //           invitation_expired (410), already_active_client (409)
  throw new InviteVerifyError(err.error_code, err.error_message);
}
```

Error UX table:

| `error_code` | HTTP | Screen behavior |
|--------------|------|-----------------|
| `invalid_otp` | 401 | Keep OTP input focused; "Invalid code. Try again." |
| `otp_expired` | 410 | "This code has expired. Request a new one." → Resend button |
| `invitation_invalid` | 404 | Route to `/invite/:token` — it will show `invalid` |
| `invitation_used` | 410 | "Already accepted. Log in to continue." → `/login` |
| `invitation_expired` | 410 | Same as request-phase expired |
| `already_active_client` | 409 | "This email is already an active client of another business. Ask that coach to archive you first." |

### POST `/v1/coach/clients/invite` (coach bearer)

```ts
async function inviteClient(
  body: ClientInviteRequest,
  token: string
): Promise<Client> {
  const res = await fetch(`${API_BASE}/v1/coach/clients/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 201) {
    const { data } = (await res.json()) as ClientResponse;
    return data;
  }

  if (res.status === 422) {
    const err = (await res.json()) as ErrorResponse;
    const fields = getFieldErrors(err);
    // Surface per-field. Special cases:
    //   fields.email == ["you can't invite yourself as a client"]
    //   fields.email == ["is already an active client of another business"]
    //   fields.base  == ["at least one of email or phone is required"]
    throw new ValidationError(fields);
  }

  throw new Error("invite failed");
}

function getFieldErrors(err: ErrorResponse): Record<string, string[]> {
  if (!err.error_detail) return {};
  if ("fields" in err.error_detail) return err.error_detail.fields;
  return err.error_detail as Record<string, string[]>;
}
```

### PATCH `/v1/coach/clients/:id` (coach bearer)

```ts
async function updateClient(
  id: string,
  body: ClientUpdateRequest,
  token: string
): Promise<Client> {
  const res = await fetch(`${API_BASE}/v1/coach/clients/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const { data } = (await res.json()) as ClientResponse;
    return data;
  }

  if (res.status === 422) {
    const err = (await res.json()) as ErrorResponse;
    const fields = getFieldErrors(err);
    // fields.status may be:
    //   ["cannot return to pending"]
    //   ["pending clients can only become active by accepting the invitation"]
    //   ["invalid status transition"]
    //   ["is invalid"]
    throw new ValidationError(fields);
  }
  if (res.status === 404) throw new NotFoundError();
  throw new Error("update failed");
}
```

**Status dropdown composition rule:**

```ts
function allowedStatusesFor(current: ClientStatus): ClientStatus[] {
  switch (current) {
    case "pending":  return [];                           // no dropdown, widget instead
    case "active":   return ["active", "inactive", "archived"];
    case "inactive": return ["active", "inactive", "archived"];
    case "archived": return ["active", "inactive", "archived"];
  }
}
```

### DELETE `/v1/coach/clients/:id` (coach bearer)

```ts
async function revokeInvitation(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/coach/clients/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204) return;
  if (res.status === 404) throw new NotFoundError();
  if (res.status === 422) {
    // client is not pending — use PATCH { status: "archived" } instead
    throw new InvalidActionError("not_pending");
  }
  throw new Error("revoke failed");
}
```

---

## Migration checklist for existing frontend code

If you have code written against the previous spec, work through this list.

### Critical (breaks with the new backend)

- [ ] Replace single-step `POST /accept-invite` → OTP verify chain with the new two-phase flow.
  - Screen 1's submit calls `POST /accept-invite` (returns `200 { message }`) and navigates to Screen 2.
  - Screen 2's submit calls `POST /accept-invite/verify` with `(invitation_token, email, otp)` and uses the returned `AuthTokenResponse` as the client's session.
  - Remove any calls to `POST /v1/auth/verify` or `POST /v1/auth/token` that were part of the acceptance flow — they are no longer needed on first-time acceptance.
- [ ] Remove `"pending"` from PATCH `/v1/coach/clients/:id` status dropdowns.
- [ ] Handle new 422 responses on invite creation: self-invite (`you can't invite yourself as a client`) and cross-business collision (`is already an active client of another business`).
- [ ] Fix the error-response parser. The shape is `{error_code, error_message, error_detail}`, not `{errors: {fields: …}}`. A prior version of our frontend docs was wrong about this.
- [ ] Switch all error-branching logic to `error_code`, not HTTP status alone (especially for the invitation family where 410 covers both used and expired).

### Important (new features)

- [ ] **Screen 1 / Invitation Welcome Page:** call `GET /v1/auth/invitations/:token` before rendering. Implement the four-state switch. The `pending` branch pre-fills `prefill_email` (editable).
- [ ] **Invitation widget** on pending client detail: use `invite_url`, `invitation_sent_at`, `invitation_expires_at`. Wire up Copy / WhatsApp / Resend / Revoke actions.
- [ ] **Revoke action:** `DELETE /v1/coach/clients/:id`, pending-only. Confirmation dialog. Remove from local list on 204.

### Nice-to-have (UX polish per spec)

- [ ] Expiry countdown: "Invitation expires in N days" computed from `invitation_expires_at`.
- [ ] On a used invitation URL, offer a "Log in" button that routes to `/login`.
- [ ] On a 409 `already_active_client` at verify time, show a specific message explaining the one-coach-at-a-time rule.
- [ ] Coach detail page: once status flips from pending → active, the backend's `first_name` / `last_name` become User-authoritative. If your UI shows "this is the email/name the client actually uses post-acceptance," this is already handled server-side.

---

## Testing

Backend tests covering these changes: **410 passing**, 0 failures. Notable suites:

- `test/easy_web/controllers/auth/accept_invite_test.exs` (20 tests: request-phase + verify-phase + race/conflict edge cases)
- `test/easy_web/controllers/auth/show_invitation_test.exs` (7 tests: all four lookup states)
- `test/easy_web/controllers/coaches/client_controller_test.exs` (65 tests: invite, list, show, update with status-transition matrix, delete/revoke, name-authority)

When in doubt, look at the controller tests — they're the most precise behavioral spec we have.

---

## Questions / sharp edges

- **Q: Does the client need to "verify email" separately after accepting an invitation?**
  A: No. The invitation OTP is the email verification. On `/accept-invite/verify` success, the User's email is marked confirmed in the same transaction.

- **Q: What if the client didn't receive the OTP?**
  A: They tap "Resend code" → POST `/accept-invite` again with the same `(invitation_token, email)`. The server invalidates any prior OTP for that email and issues a fresh one. The prior OTP, if guessed, no longer works.

- **Q: Is there a rate limit on OTP requests?**
  A: Not yet — it's a known TODO in the backend. For now, the frontend should client-side throttle the Resend button (e.g. 30-second cooldown after each request).

- **Q: What about clients without an email address (phone-only invite)?**
  A: For MVP, coaches must help such clients create an email before they can log in. The spec mentions SMS/WhatsApp OTP as a post-MVP alternative channel. For now, a phone-only invite means the coach will share the invite URL manually (WhatsApp) and the client will enter *any* email at Screen 1.

- **Q: What about an existing user accepting a new invitation — do they need to re-enter their password?**
  A: There are no passwords in this system. Every login is OTP-based. So an existing User accepting a new coach's invitation just enters the OTP that was mailed to their email, same as a new user.

- **Q: How does the frontend handle multi-business users?**
  A: MVP enforces "one active Client per User" — so there can only be one active business at a time. Post-MVP multi-business support will add a business picker on login. For now, if the login endpoint returns an `AuthTokenResponse` with `scope=client`, the associated business is unambiguous.
