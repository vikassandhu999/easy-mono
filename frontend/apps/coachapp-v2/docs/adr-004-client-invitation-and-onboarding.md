# ADR-004: Client Invitation & Onboarding

**Date:** 2026-03-27  
**Context:** Enriched client model, invite flow, detail page, and client management for Indian coach workflows

---

## Context

Indian coaches acquire clients through two paths: manual invites (via WhatsApp/in-person) and the public storefront intake form. The original system had a separate `Lead` entity for storefront applicants, requiring a conversion step to become a client. This was eliminated — the intake form now creates a `Client` directly with `status: pending`.

The client model was enriched with program tracking (name, dates), payment tracking (status, amount), intake data (answers, offer, source), and status override. This unified model means coaches manage all people — applicants, active clients, past clients — in a single list with tab filters and badge counts.

Key problems solved:
1. **No more lead conversion** — Leads eliminated, public intake creates clients directly
2. **Program tracking** — Coaches need to track program dates and expiration
3. **Payment tracking** — Coaches need to mark payments without external tools
4. **Enriched client detail** — Program, intake, payment, and contact info in one view

### Data Model

```
Client
├── id
├── first_name: null | string
├── last_name: null | string
├── email: null | string
├── phone: null | string
├── instagram_handle: null | string
│
├── program_name: null | string           ← e.g. "Fat Loss 12 Weeks"
├── program_start: null | string          ← ISO date
├── program_end: null | string            ← ISO date
│
├── payment_status: null | PaymentStatus  ← free | paid | partial | pending
├── payment_amount: null | number
├── payment_currency: null | string       ← e.g. "INR"
├── payment_notes: null | string
│
├── intake_answers: null | Record<string, unknown>   ← from storefront form
├── offer_id: null | string
├── source: null | string                ← e.g. "storefront"
├── offer: ClientOffer | null            ← preloaded {id, name, price_display}
│
├── status: ClientStatus                 ← active | archived | expired | expiring | inactive | pending
├── status_override: null | string       ← manual override (auto-computed from program dates otherwise)
│
├── notes: null | string
├── invite_url: null | string
├── inserted_at, updated_at

ClientStatus = "active" | "archived" | "expired" | "expiring" | "inactive" | "pending"
PaymentStatus = "free" | "paid" | "partial" | "pending"

ClientSummary (on list response)
├── active, expired, expiring, payment_due, pending: number
```

---

## Decision: Enriched Client Management

The client module was expanded from a simple invite+list flow to a full client lifecycle management system. Leads were eliminated — the public storefront intake form creates a `Client` directly with `status: pending`.

### Invite Page (invite-client.tsx)

Two states on the same page:

1. **Form state** — Name (required, single field), Email (optional), Phone (optional), Notes. At least one of email or phone required (zod `.refine()`). Instagram was removed from the invite form — it can be added later from the edit page. On submit: `inviteClient` mutation → store result in `inviteResult` state.

2. **Confirmation state** — Replaces the form (no navigation). Shows:
   - Success banner with contextual message (email sent vs. share manually)
   - Invite link in a bordered box with copy button
   - "Share via WhatsApp" link (pre-composed message with client name + invite URL)
   - "Copy link" button
   - "View client" → navigates to client detail
   - "Invite another" → resets form via `reset()` and clears `inviteResult`

### Client Detail, List & Edit

See [ADR-005: Client Management](adr-005-client-management.md) for the full client detail page redesign (hero card, program strip, unified plans section, inline notes), client list filtering (Autocomplete dropdown replacing tabs), and edit form (collapsible sections).

### Edit Client (edit-client.tsx)

Five collapsible form sections using `FormSection` component: **Personal Info** (first name, last name, email, phone, instagram — default open), **Program** (name, start date, end date — default open only in renew mode), **Payment** (amount, currency, payment status select, payment notes), **Notes** (textarea), **Status Override** (select with Automatic/Active/Inactive/Pending/Expired/Archived options). Each collapsed section shows a subtitle summary of its current values via `useWatch`. See [ADR-005](adr-005-client-management.md).

**Renew support**: When navigated with `?renew=true`, the form pre-fills with shifted dates (new start = old end or today, new end = start + same duration), resets payment status to "pending", and opens the Program section by default. This is triggered from the "Renew" button on the detail page hero card.

---

## Container Decisions

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| Invite client (form) | Yes, 4 fields | **NEW PAGE** | Multiple inputs (name, email, phone, notes) |
| Post-invite confirmation | No | **INLINE** (same page) | Replaces form — invite link is the focus |
| Copy invite link | No, single tap | **INLINE** | Clipboard + toast |
| Share via WhatsApp | No, single tap | **INLINE** | External `wa.me` link |
| Invite another | No, single tap | **INLINE** | Resets form state |
| Edit client | Yes, 12+ fields | **NEW PAGE** | Multiple sections (personal, program, payment, notes, status) |
| Renew client | Yes, pre-filled form | **NEW PAGE** | Edit page with `?renew=true`, shifted dates + reset payment |
| Mark as paid | No, single tap | **INLINE** | Button → PATCH payment_status on detail page |
| Archive client | No, confirmation | **DIALOG** | AlertDialog → PATCH status_override on detail page |
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
| `list-clients.tsx` | `/clients` | Infinite scroll + search + status tabs with badge counts |
| `invite-client.tsx` | `/clients/invite` | Invite form + post-invite confirmation |
| `client-detail.tsx` | `/clients/:id` | Enriched detail: program, intake, contact, plans, actions |
| `edit-client.tsx` | `/clients/:id/edit` | Edit form with personal, program, payment, notes, status sections |

### Components

| Component | Purpose | Used by |
| --- | --- | --- |
| `client-card.tsx` | List item card (initials avatar, name, contextual subtitle, WhatsApp icon, status chip) | list-clients |
| `client-picker.tsx` | Autocomplete for searching/selecting clients. Cross-feature picker (imported by nutrition-plan-detail, training-plan-detail). | plan detail pages |

### Inline Components (defined within screen files)

| Component | File | Purpose |
| --- | --- | --- |
| `InviteConfirmation` | `invite-client.tsx` | Post-invite success screen with link sharing |
| `ClientNutritionPlans` | `client-detail.tsx` | Assigned nutrition plans list + picker |
| `ClientTrainingPlans` | `client-detail.tsx` | Assigned training plans list + picker |
| `SectionHeading` | `client-detail.tsx` | Consistent section heading (uppercase, small, muted) |

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
  ├── useGetClientQuery(id)           → client with all enriched fields
  ├── useUpdateClientMutation         → mark as paid (PATCH payment_status)
  │                                    → archive (PATCH status_override)
  │
  ├── ClientNutritionPlans
  │   ├── useListNutritionPlansQuery({client_id}) → assigned plans
  │   └── useAssignNutritionPlanMutation → copy template to client
  │
  └── ClientTrainingPlans
      ├── useListTrainingPlansQuery({client_id}) → assigned plans
      └── useAssignTrainingPlanMutation → copy template to client

list-clients.tsx
  ├── useClientsInfiniteQuery({search?, status?, payment_status?}) → paginated, filtered list
  └── useListClientsQuery({limit: 0}) → summary counts for tab badges

edit-client.tsx
  ├── useGetClientQuery(id)           → populate form (supports ?renew=true)
  └── useUpdateClientMutation         → save all fields (personal, program, payment, notes, status)
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

All WhatsApp `<a>` tags across the codebase use the same neutral border style: `rounded-lg border border-divider px-3 py-2 text-sm font-medium hover:bg-default-100 active:bg-default-200`. HeroUI `Button` doesn't support `as="a"`, so native `<a>` elements are used.

### 6. Two separate assign buttons (Nutrition + Training)

The client detail action bar has two buttons instead of one ambiguous "Assign Plan" button. Each toggles its respective picker and closes the other (mutually exclusive). The buttons use `UtensilsCrossed` and `Dumbbell` icons with short labels "Nutrition" and "Training".

### 7. Client status enum: `pending` not `invited`

The API uses `status: "pending"` for clients who haven't been activated yet (both manual invites and storefront applicants). The full status enum is: `active | archived | expired | expiring | inactive | pending`. Status is auto-computed from program dates by the backend; `status_override` allows manual override.

### 8. invite_url on Client type

`invite_url: null | string` is always present on the `Client` type. It's non-null for invited/pending clients (backend generates from `invitation_token`) and null for active/inactive clients.

### 9. Leads eliminated — single concept: clients

The separate `Lead` entity was removed. The public storefront intake form now creates a `Client` directly with `status: pending`, `intake_answers`, `offer` (preloaded), and `source`. Coaches manage all people in the unified client list. No conversion step needed.

### 10. Card subtitle is contextual by status

`ClientCard` subtitle varies by client state:
- **Pending with offer**: offer name + time ago (e.g. "Fat Loss 12 Weeks · 3 days ago")
- **Active/expiring with program**: program name + time remaining + payment status
- **Has program name only**: program name
- **Fallback**: email ?? phone ?? "No details"

### 11. Status auto-computation from program dates

Client status is computed by the backend from `program_start` and `program_end` dates: `active` when within range, `expiring` when near end, `expired` after end. `status_override` allows the coach to manually set a different status. The edit form shows the current computed status and explains the override is optional.

### 12. Renew support via edit page query param

The "Renew Program" button on the detail page navigates to `/clients/:id/edit?renew=true`. The edit form's `getFormValues()` detects the `renew` param and pre-fills: new start = old end (or today if expired), new end = start + same duration, payment status reset to "pending", payment notes cleared.

---

## API Endpoints Used

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `POST /v1/coach/clients/invite` | `useInviteClientMutation` | Create client + send invite (email optional) |
| `GET /v1/coach/clients/:id` | `useGetClientQuery` | Fetch client with all enriched fields |
| `GET /v1/coach/clients` (infinite) | `useClientsInfiniteQuery` | Paginated list with search + status + payment_status filter |
| `GET /v1/coach/clients` (list) | `useListClientsQuery` | Used by `ClientPicker` + summary badge counts |
| `PATCH /v1/coach/clients/:id` | `useUpdateClientMutation` | Edit client, mark as paid, archive (status_override) |
| `POST /v1/coach/clients/:id/resend-invite` | `useResendClientInviteMutation` | Resend invite email |
| `GET /v1/coach/nutrition_plans?client_id=X` | `useListNutritionPlansQuery` | Plans assigned to client |
| `POST /v1/coach/nutrition_plans/:id/assign` | `useAssignNutritionPlanMutation` | Copy nutrition plan to client |
| `GET /v1/coach/training_plans?client_id=X` | `useListTrainingPlansQuery` | Plans assigned to client |
| `POST /v1/coach/training_plans/:id/assign` | `useAssignTrainingPlanMutation` | Copy training plan to client |

---

## What's Not Built Yet

- **Client deletion** — No delete endpoint or UI
- **Client profile photo** — No photo_url field on Client type
- **Bulk invite** — No multi-client invite flow
- **Invite link expiration** — No expiry handling or display
- **Payment history** — Only current payment status tracked, no payment log or receipts
- **Program renewal automation** — Renew is manual (edit page with pre-filled dates), no auto-renewal
