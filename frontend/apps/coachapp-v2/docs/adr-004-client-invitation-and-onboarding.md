# ADR-004: Client Invitation & Onboarding

**Date:** 2026-03-27
**Last updated:** 2026-04-11 (simplified for MVP — see ADR-005 for the current client model)
**Context:** Client invite flow for Indian coach workflows

---

## Context

Indian coaches acquire clients primarily through WhatsApp and in-person referrals. For the MVP, the only path is a manual invite from inside the coach app: the coach enters a name and contact, the backend generates an invite URL, the coach shares it via WhatsApp.

There is no storefront intake form in the MVP (see ADR-003 — the storefront feature was removed from coachapp-v2 on 2026-06-20, parked for v2 and still in git history). There are no leads. Every person in the client list was created by the coach via the invite flow.

The client model itself is intentionally small — see [ADR-005: Client Management](adr-005-client-management.md) for the current MVP `Client` type and the full list of fields that were removed (program, payment, intake, offer, status_override).

### Data Model (MVP)

```
Client
├── id
├── first_name: null | string
├── last_name: null | string
├── email: null | string
├── phone: null | string
├── notes: null | string
├── status: ClientStatus            ← active | pending | inactive | archived
├── invite_url: null | string       ← generated at invite time, sent via email and/or shared manually
└── inserted_at, updated_at
```

New invited clients are created with `status: pending`. The coach manually transitions them to `active` (or `inactive` / `archived`) from the edit form — status is not auto-computed.

---

## Decision: Invite Page

The invite page (`invite-client.tsx`) has two states on the same page:

1. **Form state** — Name (required, single field), Email (optional), Phone (optional), Notes. At least one of email or phone required (zod `.refine()`). On submit: `inviteClient` mutation → store result in `inviteResult` state.

2. **Confirmation state** — Replaces the form (no navigation). Shows:
   - Success banner with contextual message (email sent vs. share manually)
   - Invite link in a bordered box with copy button
   - "Share via WhatsApp" link (pre-composed message with client name + invite URL)
   - "Copy link" button
   - "View client" → navigates to client detail
   - "Invite another" → resets form via `reset()` and clears `inviteResult`

The invite form deliberately collects only what the backend needs to generate an invite. All other fields (status, notes edits) are made from the edit page after the invite exists.

See [ADR-005](adr-005-client-management.md) for the list, detail, and edit screens that the invited client flows into.

---

## Container Decisions

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Invite client (form) | Yes, 4 fields | **NEW PAGE** | Multiple inputs (name, email, phone, notes) |
| Post-invite confirmation | No | **INLINE** (same page) | Replaces form — invite link is the focus |
| Copy invite link | No, single tap | **INLINE** | Clipboard + toast |
| Share via WhatsApp | No, single tap | **INLINE** | External `wa.me` link |
| Invite another | No, single tap | **INLINE** | Resets form state |

---

## Component Architecture

### Screens

| File | Route | Purpose |
| --- | --- | --- |
| `invite-client.tsx` | `/clients/invite` | Invite form + post-invite confirmation |

See [ADR-005](adr-005-client-management.md) for `list-clients.tsx`, `client-detail.tsx`, and `edit-client.tsx`.

### Inline Components (defined within screen files)

| Component | File | Purpose |
| --- | --- | --- |
| `InviteConfirmation` | `invite-client.tsx` | Post-invite success screen with link sharing |

---

## Data Flow

```
invite-client.tsx
  └── useInviteClientMutation        → create client (status: pending), return invite_url
      └── on success: setInviteResult → show InviteConfirmation
```

---

## Key Design Decisions

### 1. Single "Name" field instead of first/last

The invite form uses a single "Name" field. Indian coaches think in single names ("Vikas", "Priya"), not first/last. `splitName()` splits on the first space: "Vikas Sandhu" → `first_name: "Vikas"`, `last_name: "Sandhu"`. A single word maps to `first_name` only. The edit form still has separate first/last fields for precision editing.

### 2. Email optional with cross-field validation

The zod schema uses `.refine()` to require at least one of email or phone. With no `path` argument, zodResolver maps the refinement error to `errors.root`, which is displayed below the form fields. If email is provided, the backend sends an invite email automatically. If only phone, the invite is link-only.

### 3. Confirmation replaces form, not a separate page

After successful invite, the form is replaced by `InviteConfirmation` on the same page (via `inviteResult` state). This keeps the invite link as the focal point. "Invite another" resets via RHF `reset()` and clears `inviteResult`. No new route needed.

### 4. WhatsApp share with pre-composed message

All WhatsApp links use `wa.me/{phone}?text={encoded_message}`. The message includes the client's first name and invite URL: "Hi {name}, I've set up your coaching profile! Use this link to get started: {url}". If no phone is provided, the link opens WhatsApp without a recipient (`wa.me/?text=...`).

### 5. Client status enum: `pending` not `invited`

The API uses `status: "pending"` for clients who haven't been activated yet. The full status enum is: `active | pending | inactive | archived`. Status is manual — the coach sets it from the edit form. There is no `status_override` field and no auto-computation from program dates.

### 6. invite_url on Client type

`invite_url: null | string` is always present on the `Client` type. It's non-null for invited/pending clients (backend generates from `invitation_token`) and null after the client activates.

### 7. No leads, no storefront intake

The storefront feature was removed from coachapp-v2 on 2026-06-20 (parked for v2, still in git history; see ADR-003). There is no public intake form creating pending clients. Every client is created by the coach via the invite flow inside the app. When the storefront ships in v2, it will also create clients with `status: pending` rather than introducing a separate Lead entity.

---

## API Endpoints Used

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `POST /v1/coach/clients/invite` | `useInviteClientMutation` | Create client + send invite (email optional) |
| `POST /v1/coach/clients/:id/resend-invite` | `useResendClientInviteMutation` | Resend invite email |

See [ADR-005](adr-005-client-management.md) for the full list of client endpoints (list, get, update).

---

## What's Not Built Yet

- **Client deletion** — No delete endpoint or UI
- **Client profile photo** — No photo_url field on Client type
- **Bulk invite** — No multi-client invite flow
- **Invite link expiration** — No expiry handling or display
- **Storefront intake** — Deferred to v2 (see ADR-003)
