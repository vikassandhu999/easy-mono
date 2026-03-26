# ADR-004: Client Invitation & Onboarding

**Date:** 2026-03-27  
**Context:** Client invite flow, detail page, and onboarding UX improvements for Indian coach workflows

---

## Context

Indian coaches acquire clients primarily via WhatsApp and in-person referrals. The original invite flow was email-centric: the coach entered a required email, the backend sent an email invite, and the coach was redirected to the client list with no confirmation or link to share. This was broken for the Indian market:

1. **Email is a dead end** — Indian clients don't check personal email. Coaches need the invite link to share via WhatsApp.
2. **No link returned** — After invite, the coach had no way to get the invite URL.
3. **Post-invite dead end** — Redirect to list with no confirmation, no link, no guidance.
4. **Email required** — Many coaches only have a phone number, not an email.

The client detail page also had gaps: no training plans section (despite full API support), no invite management for pending clients, no WhatsApp links for quick contact, and a status mismatch between the list filter and card display.

### Data Model

```
Client
├── id, first_name, last_name
├── email: null | string           ← nullable (phone-only invites)
├── phone: null | string
├── notes: null | string
├── invite_url: null | string      ← present for invited clients, null for active
├── status: "active" | "inactive" | "invited"
├── inserted_at, updated_at
```

---

## Decision: WhatsApp-First Invite Flow

The invite flow was redesigned around the assumption that the coach will share the invite link via WhatsApp, not rely on email delivery. Email is sent automatically when provided, but the invite link is always the primary output.

### Invite Page (invite-client.tsx)

Two states on the same page:

1. **Form state** — Name (required, single field), Email (optional), Phone (optional), Notes. At least one of email or phone required (zod `.refine()`). On submit: `inviteClient` mutation → store result in `inviteResult` state.

2. **Confirmation state** — Replaces the form (no navigation). Shows:
   - Success banner with contextual message (email sent vs. share manually)
   - Invite link in a bordered box with copy button
   - "Share via WhatsApp" link (pre-composed message with client name + invite URL)
   - "Copy link" button
   - "View client" → navigates to client detail
   - "Invite another" → resets form via `reset()` and clears `inviteResult`

### Client Detail — Invite Section (client-detail.tsx)

For clients with `status === 'invited'`, an invite management section appears between the profile header and contact section:
- Invite sent date and recipient
- Invite link display with copy button
- "WhatsApp" link (pre-composed message)
- "Copy link" button
- "Resend email" button (only when client has email, calls `resendClientInvite` mutation)
- Section auto-hides when status changes from `invited` to `active`

### Client Detail — Training Plans

Added `ClientTrainingPlans` section mirroring the existing `ClientNutritionPlans`:
- Lists plans assigned via `useListTrainingPlansQuery({ client_id })`
- Inline picker for assignment via `useAssignTrainingPlanMutation`
- Action bar split into two buttons: "Nutrition" and "Training" (mutually exclusive pickers)

### Client List & Card

- Status tab `id` aligned to `'invited'` (matching API enum)
- WhatsApp icon button on `ClientCard` (only when phone exists, `stopPropagation` to prevent navigation)
- Card shows `email ?? phone` as secondary text (handles phone-only clients)

---

## Container Decisions

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Invite client (form) | Yes, 4 fields | **NEW PAGE** | Multiple inputs |
| Post-invite confirmation | No | **INLINE** (same page) | Replaces form — invite link is the focus |
| Copy invite link | No, single tap | **INLINE** | Clipboard + toast |
| Share via WhatsApp | No, single tap | **INLINE** | External `wa.me` link |
| Invite another | No, single tap | **INLINE** | Resets form state |
| Edit client | Yes, 4 fields | **NEW PAGE** | Multiple inputs |
| Resend invite email | No, single tap | **INLINE** | Button with loading state |
| Assign nutrition plan | Yes, search | **INLINE** | Picker autocomplete in toggle panel |
| Assign training plan | Yes, search | **INLINE** | Picker autocomplete in toggle panel |
| Filter clients by status | No, tab selection | **INLINE** | HeroUI Tabs compound component |
| Search clients | Yes, 1 field | **INLINE** | Search input with debounce |
| WhatsApp client (card) | No, single tap | **INLINE** | Icon button, opens external link |
| WhatsApp client (detail) | No, single tap | **INLINE** | Icon button in contact section |

---

## Component Architecture

### Screens

| File | Route | Purpose |
| --- | --- | --- |
| `list-clients.tsx` | `/clients` | Infinite scroll + search + status tabs |
| `invite-client.tsx` | `/clients/invite` | Invite form + post-invite confirmation |
| `client-detail.tsx` | `/clients/:id` | Detail + invite section + plan assignment |
| `edit-client.tsx` | `/clients/:id/edit` | Edit client form |

### Components

| Component | Purpose | Used by |
| --- | --- | --- |
| `client-card.tsx` | List item card (avatar, name, email/phone, WhatsApp icon, status chip) | list-clients |
| `client-picker.tsx` | Autocomplete for searching/selecting clients. Cross-feature picker (imported by nutrition-plan-detail, training-plan-detail). | plan detail pages |

### Inline Components (defined within screen files)

| Component | File | Purpose |
| --- | --- | --- |
| `InviteConfirmation` | `invite-client.tsx` | Post-invite success screen with link sharing |
| `ClientInviteSection` | `client-detail.tsx` | Invite management for pending clients |
| `ClientNutritionPlans` | `client-detail.tsx` | Assigned nutrition plans list + picker |
| `ClientTrainingPlans` | `client-detail.tsx` | Assigned training plans list + picker |
| `InfoRow` | `client-detail.tsx` | Reusable contact info row with optional action slot |

### Cross-feature Pickers (imported into client-detail.tsx)

| Picker | From | Purpose |
| --- | --- | --- |
| `NutritionPlanPicker` | `nutrition-plans/components/` | Search + select nutrition plan templates |
| `TrainingPlanPicker` | `training-plans/components/` | Search + select training plan templates |

---

## Data Flow

```
invite-client.tsx
  └── useInviteClientMutation        → create client, return invite_url
      └── on success: setInviteResult → show InviteConfirmation

client-detail.tsx
  ├── useGetClientQuery(id)           → client with invite_url for invited status
  │
  ├── ClientInviteSection (status === 'invited')
  │   └── useResendClientInviteMutation → resend email invite
  │
  ├── ClientNutritionPlans
  │   ├── useListNutritionPlansQuery({client_id}) → assigned plans
  │   └── useAssignNutritionPlanMutation → copy template to client
  │
  └── ClientTrainingPlans
      ├── useListTrainingPlansQuery({client_id}) → assigned plans
      └── useAssignTrainingPlanMutation → copy template to client

list-clients.tsx
  └── useClientsInfiniteQuery({search?, status?}) → paginated, filtered list

edit-client.tsx
  ├── useGetClientQuery(id)           → populate form
  └── useUpdateClientMutation         → save changes
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

### 5. Consistent WhatsApp link styling

All WhatsApp `<a>` tags across the codebase use the same neutral border style: `rounded-lg border border-divider px-3 py-2 text-sm font-medium hover:bg-default-100 active:bg-default-200`. This matches the pattern established in `lead-detail.tsx`. HeroUI `Button` doesn't support `as="a"`, so native `<a>` elements are used.

### 6. Two separate assign buttons (Nutrition + Training)

The client detail action bar has two buttons instead of one ambiguous "Assign Plan" button. Each toggles its respective picker and closes the other (mutually exclusive). The buttons use `UtensilsCrossed` and `Dumbbell` icons with short labels "Nutrition" and "Training".

### 7. Client status enum: `invited` not `pending`

The API uses `status: "invited"` for clients who haven't accepted yet. The STATUS_MAP key, tab filter id, and all conditional checks use `'invited'`. The display label is also "Invited" (clearer than "Pending" for coaches).

### 8. invite_url on Client type

`invite_url: null | string` is always present on the `Client` type. It's non-null for invited clients (backend generates from `invitation_token`) and null for active/inactive clients. The UI gracefully handles both: shows the link section when present, shows a fallback message when null.

### 9. Resend email only when client has email

The "Resend email" button in `ClientInviteSection` is conditionally rendered: `{clientEmail && <Button ...>}`. The backend rejects resend for clients without email (422), so the UI prevents the action entirely.

### 10. Card secondary text: email ?? phone

`ClientCard` shows `client.email ?? client.phone` as the secondary text line. For phone-only clients, this shows the phone number. For email-only clients, shows the email. This ensures every card has meaningful secondary text.

---

## API Endpoints Used

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `POST /v1/coach/clients/invite` | `useInviteClientMutation` | Create client + send invite (email optional) |
| `GET /v1/coach/clients/:id` | `useGetClientQuery` | Fetch client with `invite_url` |
| `GET /v1/coach/clients` (infinite) | `useClientsInfiniteQuery` | Paginated list with search + status filter |
| `GET /v1/coach/clients` (list) | `useListClientsQuery` | Used by `ClientPicker` |
| `PATCH /v1/coach/clients/:id` | `useUpdateClientMutation` | Edit client |
| `POST /v1/coach/clients/:id/resend-invite` | `useResendClientInviteMutation` | Resend invite email |
| `GET /v1/coach/nutrition_plans?client_id=X` | `useListNutritionPlansQuery` | Plans assigned to client |
| `POST /v1/coach/nutrition_plans/:id/assign` | `useAssignNutritionPlanMutation` | Copy nutrition plan to client |
| `GET /v1/coach/training_plans?client_id=X` | `useListTrainingPlansQuery` | Plans assigned to client |
| `POST /v1/coach/training_plans/:id/assign` | `useAssignTrainingPlanMutation` | Copy training plan to client |

---

## What's Not Built Yet

- **Client deletion** — No delete endpoint or UI
- **Client status management** — No UI to manually change status (e.g., deactivate a client)
- **Client profile photo** — No photo_url field on Client type
- **Bulk invite** — No multi-client invite flow
- **Invite link expiration** — No expiry handling or display
