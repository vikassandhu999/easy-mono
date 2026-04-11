# Frontend Implementation Guide: Client Management MVP

**Date:** 2026-04-11
**Backend status:** Complete and tested (317 tests pass)
**Implements:** UX Spec "Client Management (MVP)" dated 2026-04-06

---

## Client Type

```typescript
export type ClientStatus = 'active' | 'pending' | 'inactive' | 'archived';

export type Client = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  invite_url: string | null;  // present only for pending clients with invitation token
  inserted_at: string;
  updated_at: string;
};
```

### Fields NOT in the response

These fields were removed from the backend. Do not reference them in frontend code:

`instagram_handle`, `program_name`, `program_start`, `program_end`,
`payment_status`, `payment_amount`, `payment_currency`, `payment_notes`,
`intake_answers`, `offer`, `source`, `status_override`

### Status is manual

There is no auto-computation. The `status` field is exactly what is stored in the database. The coach sets it via the edit page. No `expiring` or `expired` statuses exist.

---

## API Endpoints

### POST /v1/coach/clients/invite

Creates a client with status `pending`.

**Auth:** Bearer token (coach)

**Request:**
```json
{
  "email": "vikas@email.com",       // optional (nullable)
  "first_name": "Vikas",            // optional
  "last_name": "Sandhu",            // optional
  "phone": "+91 98765 43210",       // optional
  "notes": "Interested in coaching" // optional
}
```

At least one of `email` or `phone` is required. Returns 422 if both are missing.

If `email` is provided, an invitation email is sent automatically.
If only `phone`, no email is sent -- the coach shares the `invite_url` manually.

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "email": "vikas@email.com",
    "first_name": "Vikas",
    "last_name": "Sandhu",
    "phone": "+91 98765 43210",
    "notes": "Interested in coaching",
    "status": "pending",
    "invite_url": "https://app.example.com/invite/abc123...",
    "inserted_at": "2026-04-11T10:00:00Z",
    "updated_at": "2026-04-11T10:00:00Z"
  }
}
```

**Frontend pattern:** On success, show the `invite_url` for the coach to copy/share. Add the new client to the local list.

---

### GET /v1/coach/clients

Paginated client list with status filter and summary counts.

**Auth:** Bearer token (coach)

**Query parameters:**

| Param    | Type    | Default | Notes |
|----------|---------|---------|-------|
| `offset` | integer | 0       | Pagination offset |
| `limit`  | integer | 10      | Page size |
| `search` | string  | ""      | Searches first_name, last_name, email, phone |
| `status` | string  | --      | One of: `active`, `pending`, `inactive`, `archived`. Omit for all. |

**Response 200:**
```json
{
  "data": [Client, ...],
  "count": 42,
  "summary": {
    "active": 30,
    "pending": 5,
    "inactive": 4,
    "archived": 3
  }
}
```

`count` is the total matching the current filters (for pagination).
`summary` is always computed from ALL business clients regardless of filters (for tab badge numbers).

**Frontend pattern:** Each tab (All/Active/Pending/Inactive/Archived) sends its `status` filter. Use `summary` for badge counts on all tabs. The `count` drives pagination for the current tab.

---

### GET /v1/coach/clients/:id

Single client with full details.

**Auth:** Bearer token (coach)

**Response 200:**
```json
{
  "data": Client
}
```

Returns 404 if the client doesn't exist or belongs to a different business.

**Frontend pattern:** Cache by id. Refetch after mutations (update, status change).

---

### PATCH /v1/coach/clients/:id

Updates client fields. All fields are optional -- only send what changed.

**Auth:** Bearer token (coach)

**Request:**
```json
{
  "first_name": "Vikas",
  "last_name": "Sandhu",
  "phone": "+91 98765 43210",
  "email": "vikas@email.com",
  "notes": "Started strength program",
  "status": "active"
}
```

**Status validation:** Must be one of `active`, `pending`, `inactive`, `archived`. Any other value (including `expired`, `expiring`) returns 422.

**Response 200:** `{ "data": Client }` with the updated fields.

**Response 422 examples:**
```json
// Invalid status
{ "errors": { "fields": { "status": ["is invalid"] } } }
```

**Frontend pattern:** The edit page sends all form fields. For inline notes editing (CM-6), send only `{ "notes": "..." }`. For status changes from a dropdown (CM-9), send only `{ "status": "archived" }`.

---

### POST /v1/coach/clients/:id/resend-invite

Resends the invitation email for a pending client.

**Auth:** Bearer token (coach)

**Request body:** None required.

**Constraints:**
- Client must have `status: "pending"` -- returns 422 otherwise
- Client must have an email address -- returns 422 if email is null/empty

**Response 200:** `{ "data": Client }`

**Frontend pattern:** Show loading state on the button. Display success toast on 200. Show error message from 422 response.

---

## Plan Endpoints (for CM-7)

Plans are fetched and assigned via separate endpoints. The client detail page needs these for the plans section.

### Fetching plans assigned to a client

**Nutrition plans:**
```
GET /v1/coach/clients/{clientId}/nutrition_plans
```

**Training plans:**
```
GET /v1/coach/clients/{clientId}/training_plans
```

Client-scoped plan lists use dedicated endpoints with the client ID in the URL path. The library endpoints (`GET /v1/coach/nutrition_plans`, `GET /v1/coach/training_plans`) return only templates.

**Nutrition plan list item shape:**
```json
{
  "id": "uuid",
  "name": "Non Veg Cutting",
  "description": "...",
  "tags": ["cutting"],
  "macros_goal": { "protein": 180, "carbs": 200, "fats": 60, "calories": 2060 },
  "status": "active",
  "start_date": "2026-04-01",
  "end_date": "2026-06-01",
  "client_id": "uuid",
  "client": { "id": "uuid", "first_name": "Jane", "last_name": "Doe" },
  "source_template_id": "uuid",
  "inserted_at": "...",
  "updated_at": "..."
}
```

A plan is a template when `client_id` is `null`; otherwise it is a personal plan assigned to that client.

**Training plan list item shape:**
```json
{
  "id": "uuid",
  "name": "Push Pull Legs",
  "description": "...",
  "status": "active",
  "start_date": "2026-04-01",
  "end_date": "2026-06-01",
  "client_id": "uuid",
  "client": { "id": "uuid", "first_name": "Jane", "last_name": "Doe" },
  "original_template_id": "uuid",
  "planned_workouts": [{ ... }],
  "inserted_at": "...",
  "updated_at": "..."
}
```

For the plan card in CM-7, you need:
- Nutrition: `name`, `status`, count of meals (not in list response -- show tag count or omit)
- Training: `name`, `status`, `planned_workouts.length` for workout count

### Fetching available plans for the picker

To populate the NutritionPlanPicker and TrainingPlanPicker dropdowns, fetch template plans. Both library endpoints now return only templates by default:

**Nutrition templates:**
```
GET /v1/coach/nutrition_plans?status=active
```

**Training templates:**
```
GET /v1/coach/training_plans?status=active
```

Both return paginated results. The training plan index also supports a `search` parameter for filtering by name.

### Assigning a plan to a client

**Assign nutrition plan:**
```
POST /v1/coach/nutrition_plans/:planId/assign
Content-Type: application/json

{ "client_id": "uuid" }
```

**Assign training plan:**
```
POST /v1/coach/training_plans/:planId/assign
Content-Type: application/json

{
  "client_id": "uuid",
  "start_date": "2026-04-01",  // optional
  "end_date": "2026-06-01"     // optional
}
```

Both return **201** with the newly created plan (a clone of the template, assigned to the client). The original template is not modified.

Returns 404 if the plan or client doesn't exist / doesn't belong to the business.

**Frontend pattern for CM-7:**
1. On client detail load, fetch plans via `GET /v1/coach/clients/{id}/nutrition_plans` and `GET /v1/coach/clients/{id}/training_plans`
2. When coach clicks "+ Nutrition plan", show picker with templates from `GET /v1/coach/nutrition_plans?status=active`
3. On select, POST to `/assign` with the client_id
4. Refetch the client's plans to update the list

---

## Status Lifecycle

```
[Coach invites client] --> pending
[Coach changes status via edit page] --> active / inactive / archived
[Client accepts invite] --> active (automatic)
```

No automatic transitions. The coach controls status via the edit page dropdown (CM-9).

---

## Implementation Mapping (Spec Items to API)

| Spec Item | API Dependency | Notes |
|-----------|---------------|-------|
| CM-1: Client card subtitle | None | Use `status` + `inserted_at` from existing list response |
| CM-2: Status colors fix | None | Map the 4 statuses to chip colors |
| CM-3: Fix filter tabs | `GET /v1/coach/clients?status=X` | Use `summary` for badge counts |
| CM-4: Hero card | None | Use `phone` for WhatsApp/Call buttons |
| CM-5: Simplified top nav | None | Pure UI change |
| CM-6: Inline notes | `PATCH /v1/coach/clients/:id` | Send `{ "notes": "..." }` |
| CM-7: Plans section | See Plan Endpoints above | Fetch + assign via plan endpoints |
| CM-8: Section reorder | None | Pure UI change |
| CM-9: Edit page status dropdown | `PATCH /v1/coach/clients/:id` | Send `{ "status": "active" }` |

### Items with zero backend dependency

CM-1, CM-2, CM-3, CM-4, CM-5, CM-6, CM-8 can all ship using the existing API responses. They are pure frontend changes.

### Items with existing backend support

CM-6 and CM-9 use `PATCH /v1/coach/clients/:id` which already supports `notes` and `status` fields.

CM-7 uses the existing plan list/assign endpoints documented above.

---

## Dashboard Impact

The dashboard stat strip and "needs attention" section use the client list endpoint.

**Stat strip:** Use `summary` from `GET /v1/coach/clients`:
```
Active: summary.active
Pending: summary.pending
Inactive: summary.inactive
Archived: summary.archived
```

No "expiring" or "expired" cards. All cards have equal visual weight (no amber accent).

**Needs attention section:** Fetch pending clients:
```
GET /v1/coach/clients?status=pending&limit=5
```

Subtitle for each card: `Invited * {relative_time(inserted_at)}`

If 0 results, show empty state: "No pending clients. All clients are active or archived."

---

## Error Response Format

All 422 errors follow this shape:

```json
{
  "errors": {
    "fields": {
      "field_name": ["error message"]
    }
  }
}
```

Or for non-field errors:
```json
{
  "errors": {
    "status": ["client is not in pending status"]
  }
}
```

404 errors:
```json
{
  "errors": {
    "detail": "Client not found"
  }
}
```
