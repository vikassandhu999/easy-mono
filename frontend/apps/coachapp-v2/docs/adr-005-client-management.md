# ADR-005: Client Management

**Date:** 2026-04-11
**Context:** Client detail page redesign, edit form improvements, and list filtering UX for coachapp-v2

---

## Context

The client management screens (list, detail, edit) were redesigned to address five problems:

1. **Client card was a blank wall** — only showed name + email + status. With 30 clients, every card looked the same.
2. **Detail page was flat** — six sections with equal visual weight. The coach had to scroll and read everything.
3. **Contact info was passive text** — "Email: vikas@email.com" on a phone screen. No tap-to-action.
4. **"Assign Plan" was disconnected** — button in top nav, picker appeared mid-page.
5. **Everything required the edit page** — adding a note meant navigating away.

Additionally, the list page had 7 horizontal tabs that overflowed on 375px mobile screens.

### Data Model

The `Client` type (from `api/clients.ts`) includes program tracking fields that drive the detail page:

```
Client
├── id, email, first_name, last_name, phone, instagram_handle
├── program_name, program_start (date), program_end (date)
├── payment_status (free|paid|partial|pending), payment_amount, payment_currency, payment_notes
├── status (active|expiring|expired|pending|inactive|archived)
├── status_override (nullable — bypasses auto-computation when set)
├── notes, intake_answers, offer, source, invite_url
├── inserted_at, updated_at
```

`ClientSummary` (returned with list responses): badge counts for `active`, `expiring`, `pending`, `expired`, `payment_due`.

---

## Decision: Hero Card + Program Strip Detail Page

The detail page consolidates the header, contact, and status into a single hero card. Program data becomes a compact strip. Plans are unified. Notes are inline-editable.

### Section Order

1. **Header bar** — Back (left) + Edit (right). Two buttons only.
2. **Hero card** — bordered card containing:
   - Identity row: Avatar (size-12), full name, program subtitle (`getSubtitle`), status chip
   - Action buttons (conditional, below divider): WhatsApp link, Call link, Renew button, Archive AlertDialog
   - Actions only render when at least one is applicable. `flex-wrap` prevents overflow on 375px.
3. **Program strip** — compact `bg-content2` banner (only when `program_name` or `program_start` set):
   - Program name + payment chip + "Paid" button
   - Date range (short format) + time remaining
4. **Plans** — unified `ClientPlans` component (nutrition + training in one section):
   - Plan cards with type subtitle ("Nutrition · 3 meals", "Training · 5 workouts")
   - `+ Nutrition plan` / `+ Training plan` ghost buttons with inline pickers
5. **Notes** — `InlineNotes` component: tap-to-edit, no page navigation
6. **Intake** — conditional (only when `intake_answers` exists)
7. **Nutrition Adherence** — `ClientNutritionAdherence` component
8. **Workout History** — `ClientWorkoutHistory` component
9. **Details** — added date, last updated date

### What Was Removed

- **Contact section** — WhatsApp/Call moved to hero card action buttons. Email and Instagram accessible via Edit page.
- **Separate Nutrition Plans / Training Plans sections** — merged into unified Plans section.
- **"Assign Plan" from top nav** — moved inline to Plans section.
- **Verbose program section** (6 items with icons) — replaced by compact 2-line strip.

---

## Decision: Autocomplete Status Filter

The 7-tab horizontal filter (`All | Active | Expiring | ₹ Due | Pending | Expired | Archived`) overflowed on mobile. Replaced with a HeroUI `Autocomplete` dropdown:

- **Mobile** (< 640px): search stacked on top, full-width status dropdown below
- **Desktop** (sm+): side by side, search takes remaining space, dropdown is `sm:w-44`
- Options: All, Active, Expiring, Payment Due, Pending, Expired, Archived
- Shows summary counts in parentheses: "Active (3)", "Expiring (1)"
- `useFilter({sensitivity: 'base'})` for in-dropdown search
- `selectionMode="single"`, clear button resets to All

---

## Decision: Collapsible Edit Form

The edit form's ~15 fields in 5 flat `Fieldset` sections were overwhelming. Replaced with collapsible `FormSection` cards:

- **Personal Info** — default open (most common edit)
- **Program** — default open only in renew mode (`?renew=true`)
- **Payment** — collapsed by default
- **Notes** — collapsed by default
- **Status Override** — collapsed by default

Each collapsed section shows a **subtitle summary** of current values via `useWatch({control})`:
- Personal: "Vikas Sandhu · +91 98765 · vikas@email.com"
- Program: "Fat Loss 12 Weeks · 2026-03-01 → 2026-05-24"
- Payment: "4999 INR · Paid"
- Notes: first 60 chars or "No notes"
- Status: "Automatic (active)" or "Override: Archived"

---

## Container Decisions

| Action | Keyboard? | Container | Rationale |
| --- | --- | --- | --- |
| View client detail | No | **NEW PAGE** | Full page with multiple sections |
| Edit client | Yes, 12+ fields | **NEW PAGE** | Collapsible form sections |
| WhatsApp client | No, tap link | **INLINE** | `<a>` tag in hero card |
| Call client | No, tap link | **INLINE** | `<a>` tag in hero card |
| Renew program | Yes, pre-filled form | **NEW PAGE** | Edit page with `?renew=true` |
| Archive client | No, confirmation | **DIALOG** | AlertDialog in hero card |
| Assign nutrition plan | Yes, search | **INLINE** | NutritionPlanPicker in Plans section |
| Assign training plan | Yes, search | **INLINE** | TrainingPlanPicker in Plans section |
| Edit notes | Yes, 1 field | **INLINE** | Tap-to-edit textarea on detail page |
| Mark as paid | No, single tap | **INLINE** | Button in program strip |
| Filter clients by status | No, select | **INLINE** | Autocomplete dropdown |
| Search clients | Yes, 1 field | **INLINE** | SearchField above list |

---

## Component Architecture

### Screens

| File | Route | Purpose |
| --- | --- | --- |
| `list-clients.tsx` | `/clients` | Infinite scroll list + search + Autocomplete status filter |
| `client-detail.tsx` | `/clients/:id` | Hero card + program strip + plans + notes + intake + history |
| `edit-client.tsx` | `/clients/:id/edit` | Collapsible form sections with subtitle summaries |
| `invite-client.tsx` | `/clients/invite` | Invite form (name, email, phone, notes) + confirmation |

### Components (defined in screen files)

| Component | File | Purpose |
| --- | --- | --- |
| `ClientPlans` | `client-detail.tsx` | Unified nutrition + training plans with inline assign pickers |
| `InlineNotes` | `client-detail.tsx` | Tap-to-edit notes with `useUpdateClientMutation` |
| `FormSection` | `edit-client.tsx` | Collapsible form card with title, subtitle summary, chevron toggle |
| `InviteConfirmation` | `invite-client.tsx` | Post-invite screen with link copy + WhatsApp share |

### Components (`clients/components/`)

| Component | File | Purpose |
| --- | --- | --- |
| `ClientCard` | `client-card.tsx` | List card with avatar, name, program subtitle, status chip, WhatsApp icon |
| `ClientPicker` | `client-picker.tsx` | Autocomplete for selecting clients (used by plan detail pages) |
| `ClientNutritionAdherence` | `client-nutrition-adherence.tsx` | Weekly adherence strip with day drill-down |
| `ClientNutritionDetail` | `client-nutrition-detail.tsx` | Per-day food log table |
| `ClientWorkoutHistory` | `client-workout-history.tsx` | Paginated session list |

---

## Data Flow

```
list-clients.tsx
  ├── useListClientsQuery({limit: 0})           → summary counts for filter badges
  ├── useClientsInfiniteQuery(queryArg)          → paginated client list
  └── Autocomplete (status filter) + SearchField → merged into queryArg

client-detail.tsx
  ├── useGetClientQuery(id)                      → client data
  ├── useUpdateClientMutation                    → mark as paid, archive, save notes
  │
  ├── ClientPlans
  │   ├── useListNutritionPlansQuery({client_id})
  │   ├── useListTrainingPlansQuery({client_id})
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
  ├── useUpdateClientMutation                    → save changes
  └── useWatch({control})                        → live subtitle summaries
```

---

## Key Design Decisions

### 1. Hero card consolidates 3 sections

The hero card replaces separate header, contact, and status sections. Contact is now action buttons (WhatsApp, Call), not passive text. The coach taps to message, not reads and manually copies a number. Email and Instagram were moved to the edit page because Indian coaches primarily use WhatsApp, not email.

### 2. Program strip is context, not content

The program is displayed as a compact 2-line strip (`bg-content2`) rather than a full section with icons. It answers "what program, when does it end" in one glance. Payment status chip is inline. Hidden entirely when no program data exists.

### 3. Unified Plans section

`ClientNutritionPlans` and `ClientTrainingPlans` were merged into a single `ClientPlans` component. Plan cards show type as subtitle text ("Nutrition · 3 meals"). Assign buttons (`+ Nutrition plan`, `+ Training plan`) are ghost buttons within the section, not in the top nav. Pickers appear inline when toggled.

### 4. Inline notes with draft pattern

`InlineNotes` uses a `draft` state that's initialized from `initialNotes` only when entering edit mode (via `startEditing()`). Read mode always displays `initialNotes` directly from RTK Query cache. This avoids the stale closure problem with `useState(prop)` and eliminates the need for `useEffect` to sync.

### 5. Autocomplete replaces tabs for filtering

Seven tabs overflowed on 375px. The Autocomplete dropdown is compact, includes built-in search, and shows counts in parentheses. `useFilter({sensitivity: 'base'})` provides case-insensitive filtering within the dropdown.

### 6. Collapsible form sections with live subtitles

`FormSection` wraps form groups in collapsible bordered cards. `useWatch({control})` reactively computes subtitle strings shown when collapsed. The coach can scan all sections' summaries without expanding them. Only the section being edited is open.

### 7. Conditional hero action buttons

The action buttons bar (WhatsApp, Call, Renew, Archive) is wrapped in a conditional that checks if ANY button would render. When `!client.phone && status !== expiring/expired && !canArchive`, the entire divider + action bar is hidden, avoiding an empty border-t line.

### 8. `getSubtitle` handles all statuses

The `getSubtitle` function on the detail page handles `active`, `expiring`, and `expired` statuses — all show program name + time remaining. Pending clients show offer name + time ago. Fallback is email or phone.

---

## API Endpoints Used

| Endpoint | Hook | Purpose |
| --- | --- | --- |
| `GET /v1/coach/clients` | `useClientsInfiniteQuery` | Paginated list with status/payment/search filters |
| `GET /v1/coach/clients` (limit=0) | `useListClientsQuery` | Summary counts for filter badges |
| `GET /v1/coach/clients/:id` | `useGetClientQuery` | Client detail |
| `PATCH /v1/coach/clients/:id` | `useUpdateClientMutation` | Edit, mark as paid, archive, save notes |
| `POST /v1/coach/clients/invite` | `useInviteClientMutation` | Create pending client with invite |
| `GET /v1/coach/nutrition_plans?client_id=X` | `useListNutritionPlansQuery` | Plans assigned to client |
| `GET /v1/coach/training_plans?client_id=X` | `useListTrainingPlansQuery` | Plans assigned to client |
| `POST /v1/coach/nutrition_plans/:id/assign` | `useAssignNutritionPlanMutation` | Copy plan template to client |
| `POST /v1/coach/training_plans/:id/assign` | `useAssignTrainingPlanMutation` | Copy plan template to client |

---

## What's Not Built Yet

- **Badge counts on filter options** — summary counts are shown in Autocomplete option labels, but not as separate badge chips
- **Client deletion** — no delete mutation or UI (clients are archived, not deleted)
- **Bulk actions** — no multi-select or bulk archive/status change
- **Client avatar upload** — avatar uses initials fallback only
