# Frontend Implementation Guide — Coach Client Management (v2)

Covers the coach-side client management surface: inviting, listing, viewing, editing, revoking, and resending invitations. Updated for the revised onboarding spec.

For the client-side acceptance flow (what happens when a client taps an invitation link), see `docs/client-auth-flow.md`.

All endpoints are defined in `docs/api_contract.yaml`. This doc is a frontend-focused summary of the relevant ones.

---

## Client type

```ts
type ClientStatus = "active" | "pending" | "inactive" | "archived";

type Client = {
  id: string;
  email: string | null;
  first_name: string | null;  // User-authoritative when linked; see below
  last_name: string | null;   // User-authoritative when linked; see below
  phone: string | null;
  notes: string | null;
  status: ClientStatus;

  // Invitation-widget fields (pending clients only; null otherwise)
  invite_url: string | null;
  invitation_sent_at: string | null;    // ISO datetime
  invitation_expires_at: string | null; // invitation_sent_at + 30 days

  inserted_at: string;
  updated_at: string;
};
```

### Name authority

Once a Client is linked to a User (i.e. any status except `pending`), the `first_name` / `last_name` fields in this response are the **User's** name, not the coach-set override. Fallbacks:

1. If `user.first_name` is non-blank → that wins
2. Else if the coach set a Client-level name → that
3. Else `null`

For pending clients, no User is linked, so you always see the coach-set values.

Practical implication: if a coach invites "Vikas K. (Pune gym)" as first_name, then the client accepts with a User whose first_name is already "Vikas Kumar" from a previous coach relationship, the GET response will show `first_name: "Vikas Kumar"`. This is correct — the User's global identity wins.

### Removed fields

Do not reference these — they were removed from the backend some time ago:

`instagram_handle`, `program_name`, `program_start`, `program_end`, `payment_status`, `payment_amount`, `payment_currency`, `payment_notes`, `intake_answers`, `offer`, `source`, `status_override`.

---

## Status lifecycle

Status transitions are now strictly validated server-side per the revised spec's invariants table:

```
pending ─(accept-invite)→ active        ← only path out of pending
                                           (client-driven, not coach-driven)

active  ──→ inactive   ──→ active
        └─→ archived   ──→ active
inactive ──→ active
         └─→ archived
archived ──→ active
         └─→ inactive

*nothing* → pending    ← once a Client has been linked to a User,
                         it can never return to pending
```

### What this means for the UI

**Pending client detail page:**
- Do NOT render a status dropdown. Status is locked at "Pending" until acceptance.
- Render the "Share invitation" widget (see below) as the primary action.
- All other fields (name, email, phone, notes, plan assignment) ARE editable — coaches prep plans/notes ahead of time.

**Active / inactive / archived detail page:**
- Status dropdown has exactly three options: Active, Inactive, Archived.
- Never include "Pending" in the dropdown.
- Do not render the invitation widget.

**Attempting a forbidden transition** via PATCH returns HTTP 422 with `error_detail.fields.status` set to a human-readable reason (see error table below). The frontend should treat these as form validation errors on the status field.

---

## Invitation widget (pending clients only)

Per spec, the invitation widget is the first section of a pending client's detail page, above contact info.

Render it using the Client JSON fields:

```tsx
<InvitationWidget
  inviteUrl={client.invite_url}
  sentAt={client.invitation_sent_at}
  expiresAt={client.invitation_expires_at}
  phone={client.phone}
  name={client.first_name}
  onResend={() => resendInvite(client.id)}
  onRevoke={() => revokeInvite(client.id)}
/>
```

**Widget elements (per spec):**

- **Copy-able URL**: `client.invite_url` truncated visually, `navigator.clipboard.writeText(client.invite_url)` on Copy
- **Share on WhatsApp** (primary action): open `https://wa.me/{phone_digits}?text={encoded_message}` if `client.phone` is present, else fall back to WhatsApp's generic share sheet. Pre-filled message:
  > "Hi {first_name}, I've set up your coaching profile. Tap this link to get started: {invite_url}"
- **Resend email** (secondary, disabled if `client.email` is null): calls `POST /v1/coach/clients/{id}/resend-invite`. Server bumps `invitation_sent_at` to now, so `invitation_expires_at` resets. Show the updated "Invited X ago" from the refreshed response.
- **Timestamp + expiry copy**: `"Invited {relative(invitation_sent_at)}. Invitation expires in {days_until(invitation_expires_at)} days."`
- **Revoke** (destructive, tucked away): calls `DELETE /v1/coach/clients/{id}`. Confirmation dialog: "Revoke this invitation? {first_name}'s link will no longer work. You can re-invite them later."

Once the client accepts (status flips to active), the next fetch of the client detail returns non-null User data and the widget fields become null. Hide the widget.

---

## Endpoints

### POST /v1/coach/clients/invite

Create a new pending client.

**Auth:** coach bearer token.

```json
// Request
{
  "email": "vikas@email.com",      // optional
  "first_name": "Vikas",           // optional
  "last_name": "Sandhu",           // optional
  "phone": "+91 98765 43210",      // optional
  "notes": "Interested in coaching" // optional
}
```

At least one of `email` or `phone` is required.

**Success (201):** `{ "data": Client }` with `status: "pending"` and all three invitation fields populated (`invite_url`, `invitation_sent_at`, `invitation_expires_at`).

**Error cases (422):**

| `error_detail.fields` | Meaning | Suggested copy |
|-----------------------|---------|----------------|
| `{ email: ["you can't invite yourself as a client"] }` | Coach used their own email | "You can't invite yourself." |
| `{ email: ["is already an active client of another business"] }` | The invited email belongs to a User who is active elsewhere | "This email is already an active client of another business. That client must be archived before you can invite them here." |
| `{ base: ["at least one of email or phone is required"] }` | Missing both contact channels | "Provide at least an email or a phone number." |
| Other Ecto-style errors | Various | Display per-field as standard form validation |

Frontend pattern: on 201, optimistically add the returned Client to the local list and open its detail page with the invitation widget shown.

---

### GET /v1/coach/clients

Paginated list with status filter and summary counts.

| Query param | Default | Notes |
|-------------|---------|-------|
| `offset`    | 0       | pagination |
| `limit`     | 10      | page size |
| `search`    | `""`    | substring match on first_name, last_name, email, phone |
| `status`    | (none)  | filter: `active` \| `pending` \| `inactive` \| `archived` |

**Response (200):**
```json
{
  "data": [Client, ...],
  "count": 42,
  "summary": { "active": 30, "pending": 5, "inactive": 4, "archived": 3 }
}
```

- `count` = number of rows matching current filters (drives pagination)
- `summary` = counts across ALL business clients, unfiltered (drives tab badges)

---

### GET /v1/coach/clients/:id

Single client with preloaded user/business/creator. Returns `{ "data": Client }` or 404.

The `first_name`/`last_name` fields follow the User-authoritative rule (see above). For pending clients, `invite_url` / `invitation_sent_at` / `invitation_expires_at` are populated; for any other status they are null.

---

### PATCH /v1/coach/clients/:id

Update contact fields and/or transition status.

```json
// Body: all fields optional
{
  "first_name": "Vikas",
  "last_name": "Sandhu",
  "phone": "+91 98765 43210",
  "email": "vikas@email.com",
  "notes": "Started coaching",
  "status": "archived"
}
```

**Status constraints** (per the invariants table):

| If current status is | Allowed new `status` values |
|----------------------|-----------------------------|
| `active`             | `inactive`, `archived` |
| `inactive`           | `active`, `archived` |
| `archived`           | `active`, `inactive` |
| `pending`            | (none — no manual status change; use accept-invite flow or revoke) |

Sending `status: "pending"` from any state returns 422.

**Success (200):** `{ "data": Client }` with the updated fields.

**Error cases (422):**

| `error_detail.fields.status[0]` | Meaning |
|---------------------------------|---------|
| `"cannot return to pending"` | Tried to set status to `pending` |
| `"pending clients can only become active by accepting the invitation"` | Tried to change a pending client's status |
| `"invalid status transition"` | Transition not in the allowed matrix (e.g. if a new rule gets added) |
| `"is invalid"` | Unknown value (e.g. `"expired"`, `"foo"`) |

Contact-field errors use standard Ecto changeset shape.

Frontend pattern: optimistic patch on local form state; reconcile with the response's `data` on 200. On 422, surface the field-level message in the form.

---

### DELETE /v1/coach/clients/:id   (revoke invitation)

Hard-deletes a pending client. Only valid when `status == "pending"`.

**Auth:** coach bearer token.

**No body.**

**Success (204):** empty response. The client row is gone, along with any personal training/nutrition plans the coach had assigned. Templates (`client_id IS NULL` plans) are preserved.

**Error cases:**

| HTTP | `error_code` / detail | Meaning |
|------|-----------------------|---------|
| 404  | `not_found` | Client doesn't exist or belongs to another business |
| 422  | `error_detail.status[0] = "only pending invitations can be revoked; archive the client instead"` | Client is not pending — use PATCH with `status: "archived"` instead |

Frontend pattern: confirmation dialog → call endpoint → on 204, remove from local list and navigate back to the client list. The client's invitation URL becomes invalid immediately — anyone tapping it will see the `invalid` state from `GET /v1/auth/invitations/:token`.

---

### POST /v1/coach/clients/:id/resend-invite

Re-send the invitation email for a pending client with an email address.

**Auth:** coach bearer token. **No body.**

**Success (200):** `{ "data": Client }` with `invitation_sent_at` bumped to now and `invitation_expires_at` reset.

**Error cases (422):**

| `error_detail` | Meaning |
|----------------|---------|
| `{ status: ["client is not in pending status"] }` | Can't resend for non-pending clients |
| `{ email: ["client has no email address"] }` | Client was invited phone-only; coach must use the WhatsApp-share flow instead |

Frontend pattern: show a loading spinner on the Resend button; on success, show toast "Invitation email sent to {client.email}" and update the widget's sent-at / expires-at from the response.

---

## Status badges (summary + per-client chip)

Map the four statuses to UI chips:

| Status | Typical color |
|--------|---------------|
| `active`   | green |
| `pending`  | amber / neutral |
| `inactive` | grey |
| `archived` | muted grey |

The `summary` counts from `GET /v1/coach/clients` drive dashboard badge numbers and the client-list tab badges. No "expiring" / "expired" states exist.

---

## Error response shape (universal)

Every error response across all endpoints:

```ts
type ErrorResponse = {
  error_code: string;
  error_message: string;
  error_detail?:
    | { fields: Record<string, string[]> }  // Ecto changeset errors
    | Record<string, string[]>              // hand-built validation errors
};
```

**Switch on `error_code`, not on `error_message`.** The message is subject to copy changes; the code is part of the contract.

**Two 422 detail shapes exist side-by-side:**

- Ecto changeset errors (e.g. most PATCH failures): `error_detail.fields.{field}: [msgs]`
- Hand-built validation errors (self-invite, already-active, revoke-non-pending): `error_detail.{field}: [msgs]`

Your error parser should handle both:

```ts
function getFieldErrors(err: ErrorResponse): Record<string, string[]> {
  if (!err.error_detail) return {};
  if ("fields" in err.error_detail) return err.error_detail.fields;
  return err.error_detail as Record<string, string[]>;
}
```

---

## Changes from the previous version of this doc

Reference — if you're updating existing frontend code:

1. **`pending` is no longer a valid value** in the PATCH status enum. Remove it from the dropdown options.
2. **New `invitation_sent_at` and `invitation_expires_at` fields** on Client. Use them for the widget's "Invited X ago / expires in Y days" copy.
3. **New DELETE endpoint** for revoking pending invitations. Wire up the widget's Revoke button.
4. **New 422 error codes on invite**: `you can't invite yourself` and `is already an active client of another business`. Surface these as inline form errors.
5. **Name fields reflect User authority** once a client is linked. If your UI had a "coach can rename a client" feature, understand that the coach-set override is now a fallback, not authoritative.
6. **Error response shape** is `{error_code, error_message, error_detail}`, not `{errors: {fields: ...}}` (the previous version of this doc was incorrect about this).

---

## What's NOT in this doc

- Client-side acceptance flow — see `docs/client-auth-flow.md`
- Consolidated v2 handoff with migration checklist — see `docs/frontend-spec-v2-handoff.md`
- Plan assignment endpoints — unchanged, see the plan docs and `api_contract.yaml`
