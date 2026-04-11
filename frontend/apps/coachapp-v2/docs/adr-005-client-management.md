# ADR-005: Client Management

**Date:** 2026-04-11
**Last updated:** 2026-04-11 (Plans section now uses client-scoped endpoints for strict template/personal separation; see ADR-001 and ADR-002)
**Context:** Client list, detail, and edit screens for coachapp-v2 MVP

---

## Context

For the MVP, client management is stripped down to the minimum a coach needs to run the core coaching loop with their first 10-20 clients. Payments are tracked on WhatsApp/UPI, there is no storefront intake form, and there are no program dates driving auto-computed status. Clients are a flat list of people the coach is coaching, invited, or has archived.

The previous design (hero card + program strip + intake + collapsible form sections + renew flow) was removed because the underlying fields were removed from the backend. The current design is deliberately simple: a list with a status filter, a detail page focused on plans and notes, and a flat edit form.

### Data Model (MVP)

The `Client` type (from `api/clients.ts`):

```
Client
├── id
├── first_name: null | string
├── last_name: null | string
├── email: null | string
├── phone: null | string
├── notes: null | string
├── status: ClientStatus
├── invite_url: null | string
├── inserted_at, updated_at

ClientStatus = "active" | "pending" | "inactive" | "archived"
```

Status is manual, not auto-computed. The coach sets it via the edit form. `pending` is the initial status for invited clients who haven't accepted yet.

`ClientSummary` (returned with list responses): counts for `active`, `pending`, `inactive`, `archived`.

### What Was Removed (vs pre-MVP)

- `instagram_handle`, `program_name`, `program_start`, `program_end`
- `payment_status`, `payment_amount`, `payment_currency`, `payment_notes`
- `intake_answers`, `offer`, `offer_id`, `source`
- `status_override` (status is now the direct field)
- `expired` and `expiring` statuses
- `PaymentStatus` and `ClientOffer` types

---

## Decision: Simple Detail Page

The detail page is a vertical stack of focused sections. No hero card with consolidated contact, no program strip, no conditional action bars — just what the coach needs to read and act on.

### Section Order

1. **Header bar** — Back (left, via `useGoBack`) + Edit (right). Two buttons only.
2. **Identity** — Avatar (size-12), full name, phone as subtitle, status chip
3. **Plans** — unified `ClientPlans` component (nutrition + training in one section):
   - Plan cards with type subtitle ("Nutrition · 3 meals", "Training · 5 workouts")
   - `+ Nutrition plan` / `+ Training plan` ghost buttons with inline pickers
4. **Notes** — `InlineNotes` component: tap-to-edit, no page navigation
5. **Nutrition Adherence** — `ClientNutritionAdherence` component (weekly adherence strip with day drill-down)
6. **Workout History** — `ClientWorkoutHistory` component (preview: 7 most recent, "View all" links to `/clients/:id/workout-history`)
7. **Meta** — "Added {date}" single line

### What Is Not On The Detail Page

- **Contact actions** (WhatsApp, Call) — deferred, not in MVP
- **Program strip** — no program data to show
- **Payment status / Mark as paid** — payments tracked externally
- **Intake section** — no storefront intake
- **Renew button** — no program dates to renew
- **Archive button** — archiving is done via the edit form status dropdown

---

## Decision: Autocomplete Status Filter

The list page filters by the 4 MVP statuses plus "All". A HeroUI `Autocomplete` dropdown replaces the previous 7-tab row (which overflowed on mobile and included the removed `expiring` / `payment_due` / `expired` tabs).

- **Mobile** (< 640px): search stacked on top, full-width status dropdown below
- **Desktop** (sm+): side by side, search takes remaining space, dropdown is `sm:w-44`
- Options: All, Active, Pending, Inactive, Archived
- Shows summary counts in parentheses: "Active (3)", "Pending (1)"
- `useFilter({sensitivity: 'base'})` for in-dropdown search
- `selectionMode="single"`, clear button resets to All

---

## Decision: Flat Edit Form

The edit form is a single vertical form with no collapsible sections. Five fields total — there is nothing to hide.

Fields, in order:
1. **First name** / **Last name** (2-column grid on `md:`)
2. **Email** / **Phone** (2-column grid on `md:`)
3. **Status** — Select with 4 options: Active, Pending, Inactive, Archived
4. **Notes** — Textarea
5. **Actions** — Save + Cancel

There is no `FormSection` wrapper, no `useWatch` subtitles, no renew mode, no `?renew=true` query param.

---

## Container Decisions

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| View client detail | No | **NEW PAGE** | Multiple sections (plans, notes, adherence, history) |
| Edit client | Yes, 6 fields | **NEW PAGE** | Form with multiple inputs |
| Assign nutrition plan | Yes, search | **INLINE** | NutritionPlanPicker in Plans section |
| Assign training plan | Yes, search | **INLINE** | TrainingPlanPicker in Plans section |
| Edit notes | Yes, 1 field | **INLINE** | Tap-to-edit textarea on detail page |
| Archive client | No, dropdown change | **NEW PAGE** | Set status to Archived on edit page |
| Filter clients by status | No, select | **INLINE** | Autocomplete dropdown |
| Search clients | Yes, 1 field | **INLINE** | SearchField above list |

---

## Component Architecture

### Screens

| File | Route | Purpose |
| --- | --- | --- |
| `list-clients.tsx` | `/clients` | Infinite scroll list + search + Autocomplete status filter |
| `client-detail.tsx` | `/clients/:id` | Identity + plans + notes + adherence + workout history preview |
| `client-workout-history-page.tsx` | `/clients/:id/workout-history` | Full paginated workout history with infinite scroll |
| `edit-client.tsx` | `/clients/:id/edit` | Flat form: name, contact, status, notes |
| `invite-client.tsx` | `/clients/invite` | Invite form (name, email, phone, notes) + confirmation |

### Components (defined in screen files)

| Component | File | Purpose |
| --- | --- | --- |
| `ClientPlans` | `client-detail.tsx` | Unified nutrition + training plans with inline assign pickers |
| `InlineNotes` | `client-detail.tsx` | Tap-to-edit notes with `useUpdateClientMutation` |
| `InviteConfirmation` | `invite-client.tsx` | Post-invite screen with link copy + WhatsApp share |

### Components (`clients/components/`)

| Component | File | Purpose |
| --- | --- | --- |
| `ClientCard` | `client-card.tsx` | List card with avatar, name, contextual subtitle, status chip |
| `ClientPicker` | `client-picker.tsx` | Autocomplete for selecting clients (used by plan detail pages) |
| `ClientNutritionAdherence` | `client-nutrition-adherence.tsx` | Weekly adherence strip with day drill-down |
| `ClientNutritionDetail` | `client-nutrition-detail.tsx` | Per-day food log table |
| `ClientWorkoutHistory` | `client-workout-history.tsx` | Preview (7 recent sessions) + "View all" link. Exports `SessionCard` for reuse. |

---

## Data Flow

```
list-clients.tsx
  ├── useListClientsQuery({limit: 0})           → summary counts for filter badges
  ├── useClientsInfiniteQuery(queryArg)          → paginated client list
  └── Autocomplete (status filter) + SearchField → merged into queryArg

client-detail.tsx
  ├── useGetClientQuery(id)                      → client data
  │
  ├── ClientPlans
  │   ├── useListClientNutritionPlansQuery({clientId})  → GET /v1/coach/clients/:id/nutrition_plans
  │   ├── useListClientTrainingPlansQuery({clientId})   → GET /v1/coach/clients/:id/training_plans
  │   ├── useAssignNutritionPlanMutation         → inline picker
  │   └── useAssignTrainingPlanMutation          → inline picker
  │
  ├── InlineNotes
  │   └── useUpdateClientMutation                → save notes (null for clear)
  │
  ├── ClientNutritionAdherence                   → weekly adherence
  └── ClientWorkoutHistory                       → session list

edit-client.tsx
  ├── useGetClientQuery(id)                      → pre-fill form
  └── useUpdateClientMutation                    → save changes
```

---

## Key Design Decisions

### 1. Status is manual, not auto-computed

There are no program dates, so there is nothing for the backend to compute status from. The coach picks a status from the edit form. `pending` is the default for invited clients.

### 2. `ClientCard` subtitle: status + date

`getSubtitle()` in `client-card.tsx` returns one of:
- `"Active · since Mar 1"` — active clients, uses `inserted_at`
- `"Invited · 3h ago"` — pending clients, uses `inserted_at`
- `"Inactive"` / `"Archived"` — plain status label
- Fallback: email, then phone

No program names, no time remaining, no payment status, no offer names.

### 3. Unified Plans section

`ClientNutritionPlans` and `ClientTrainingPlans` were merged into a single `ClientPlans` component. Plan cards show type as subtitle text ("Nutrition · 3 meals"). Assign buttons (`+ Nutrition plan`, `+ Training plan`) are ghost buttons within the section. Pickers appear inline when toggled.

Data comes from the client-scoped endpoints (`useListClientNutritionPlansQuery` / `useListClientTrainingPlansQuery`), which return that client's plans only. The library endpoints are reserved for templates — see ADR-001 decision #8 and ADR-002 decision #13 for the full template/personal separation. Meal and workout counts are rendered defensively (`plan.meals?.length ?? 0`, `plan.planned_workouts?.length ?? 0`) because the nutrition list endpoint does not preload `meals` (only the show endpoint does).

### 4. Inline notes with draft pattern

`InlineNotes` uses a `draft` state that's initialized from `initialNotes` only when entering edit mode (via `startEditing()`). Read mode always displays `initialNotes` directly from RTK Query cache. This avoids the stale closure problem with `useState(prop)` and eliminates the need for `useEffect` to sync.

### 5. Autocomplete replaces tabs for filtering

Five options (All, Active, Pending, Inactive, Archived) still fit in a dropdown more cleanly than tabs at 375px. The Autocomplete also includes built-in search and shows counts in parentheses. `useFilter({sensitivity: 'base'})` provides case-insensitive filtering within the dropdown.

### 6. Flat edit form

With only 6 fields (first name, last name, email, phone, status, notes), there is nothing to collapse. The form is a simple vertical stack with two `md:grid-cols-2` rows for the name and contact fields.

### 7. Archiving via status dropdown

There is no separate "Archive" button and no confirmation dialog. The coach opens the edit page and sets status to Archived. This keeps the detail page free of destructive actions and removes the need for an AlertDialog.

### 8. Back navigation uses `useGoBack` for scroll restoration

All Back buttons use `useGoBack(fallback)` from `@/@hooks/use-go-back`. This triggers `navigate(-1)` (pop navigation) when history exists, enabling `<ScrollRestoration />` to restore the scroll position. On deep links (no history), it falls back to the specified route. This pattern is used across all screens in the app, not just clients.

---

## API Endpoints Used

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `GET /v1/coach/clients` | `useClientsInfiniteQuery` | Paginated list with status/search filters |
| `GET /v1/coach/clients` (limit=0) | `useListClientsQuery` | Summary counts for filter badges |
| `GET /v1/coach/clients/:id` | `useGetClientQuery` | Client detail |
| `PATCH /v1/coach/clients/:id` | `useUpdateClientMutation` | Edit, save notes, change status |
| `POST /v1/coach/clients/invite` | `useInviteClientMutation` | Create pending client with invite |
| `GET /v1/coach/clients/:id/nutrition_plans` | `useListClientNutritionPlansQuery` | Plans assigned to client |
| `GET /v1/coach/clients/:id/training_plans` | `useListClientTrainingPlansQuery` | Plans assigned to client |
| `POST /v1/coach/nutrition_plans/:id/assign` | `useAssignNutritionPlanMutation` | Copy plan template to client |
| `POST /v1/coach/training_plans/:id/assign` | `useAssignTrainingPlanMutation` | Copy plan template to client |

---

## What's Not Built Yet

- **Contact actions** (WhatsApp, Call links) — deferred from the detail page for MVP
- **Client deletion** — no delete mutation or UI (clients are archived, not deleted)
- **Bulk actions** — no multi-select or bulk status change
- **Client avatar upload** — avatar uses initials fallback only
- **Badge count chips on filter options** — counts are shown inline in the Autocomplete label, not as separate chips
