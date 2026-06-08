# Frontend Handover: Weight Tracker

**Date:** 2026-04-22
**Spec:** `docs/specs/ux-spec-weight-tracker-2026-04-22.md`
**PR:** `easy-backend-refactoring` (local branch)
**Breaking change:** No — purely additive
**Migration urgency:** Same release — required to ship the Progress → Weight tab and the coach-side Weight section

---

## TL;DR

- New feature: clients log daily body weight; coaches see the trend and set a goal. Two new surfaces (client Progress → Weight, coach client detail Weight section) and one new field group on the existing Client (goal weight).
- Three new client endpoints: `GET` / `POST` / `DELETE /v1/client/weight_entries`. `POST` is an **upsert by date** — the frontend calls the same endpoint whether the user is logging or updating a day.
- One new coach endpoint: `GET /v1/coach/clients/:client_id/weight_entries`. Read-only. Includes `adherence` (logged days in last 30).
- Goal weight is set on the existing `PATCH /v1/coach/clients/:id` via two new fields `goal_weight_value` (number) and `goal_weight_unit` (`kg` | `lbs`). The client-facing `PATCH /v1/client/profile` does **not** accept goal fields — only the coach can set the goal.
- Server computes `summary` (first entry, latest entry, total change) and converts mixed units silently for display. Frontend never recomputes the headline — just renders.
- 7-day moving average and local range filtering (30d / 90d / All) are **client-side**. One GET fetches the whole history; the frontend slices.
- Settled rendering rules (see "Client-side rendering decisions"): default unit is hardcoded `kg`; moving-average line breaks at gaps >7 days; chart displays in the latest entry's unit (tap-a-point popover shows the original).
- No existing endpoints changed behaviorally; one new nullable field group is added to existing Client responses.

---

## Changes

### Change 1: New entity — `WeightEntry`

**Type:** new entity, new endpoints
**Spec reference:** From `ux-spec-weight-tracker-2026-04-22.md`:
> "One row per client per day. The date is the identifier (alongside client_id), not a timestamp. ... A client weighs themselves 'on Monday' — the time of day is noise we don't need."

**Breaking:** No (new surface)

**What changed in the backend**
A new table `weight_entries` stores one row per `(client_id, date)`. Columns: `id` (UUID), `date` (local calendar date, not a timestamp), `value` (decimal, 5.2), `unit` (`kg` | `lbs`), `note` (optional, max 500 chars), `client_id`, `business_id`, timestamps. Unique index on `(client_id, date)` — one entry per client per day, enforced at the DB level. On client delete, weight entries cascade.

**What the frontend will observe**
A new resource shape. Critical detail: `date` is a calendar date string (`"2026-04-22"`), **not** a datetime. Timezone handling: the frontend always sends the user's local date — the server never infers "today." A future-date check rejects `date > today + 1 day` (1-day buffer for clients ahead of server UTC).

**Shape**
```json
{
  "id": "946a0b30-8a54-43d2-8d1a-7a55ec2fdf0b",
  "date": "2026-04-22",
  "value": "91.40",
  "unit": "kg",
  "note": "morning weigh-in",
  "inserted_at": "2026-04-22T06:45:00Z"
}
```

`value` is a **string** in responses (Decimal serialization). Parse it with `parseFloat` or `Decimal.js` before doing math. Requests accept either number or numeric string.

**Frontend impact**
- Add a TypeScript type `WeightEntry` (likely in `types/fitness.ts` or a new `types/weight.ts`)
- Note that `value` arrives as string — choose one convention (parse at the boundary, or keep as string through the UI and parse only for chart math)
- Choose a convention for `date` — either keep as `"YYYY-MM-DD"` strings everywhere, or convert to `Date` at the boundary. If you use `new Date("2026-04-22")` be aware it parses as UTC — prefer `new Date(2026, 3, 22)` for local-midnight semantics

---

### Change 2: New endpoint — `GET /v1/client/weight_entries`

**Type:** new endpoint
**Spec reference:** From the spec:
> "`since` instead of offset/limit: Weight entries are naturally time-bounded. 'Last 30 days,' 'last 90 days,' 'all.' The client picks a date cutoff. No pagination needed — nobody has 100,000 weight entries."

Also:
> "`summary` is computed server-side. First + latest + total change."

**Breaking:** No

**What changed in the backend**
Client-authenticated route that returns the authenticated client's full weight history (optionally filtered by `since`), the coach-set goal, and a server-computed summary.

**What the frontend will observe**
One GET per screen load. Keep the response in memory. The 30d / 90d / All toggles are **local filters** — don't refetch on toggle. Refetch after create, update, delete, or when the coach changes the goal (via a separate coach action the client may or may not be notified of).

**API details**

```
GET /v1/client/weight_entries
GET /v1/client/weight_entries?since=2026-03-01
```

Response:
```json
{
  "entries": [
    {
      "id": "8c1e14b7-4a7f-4ec6-a15d-c8cba3f750e2",
      "date": "2026-03-01",
      "value": "95.20",
      "unit": "kg",
      "note": null,
      "inserted_at": "2026-03-01T09:14:12Z"
    },
    {
      "id": "946a0b30-8a54-43d2-8d1a-7a55ec2fdf0b",
      "date": "2026-04-20",
      "value": "91.40",
      "unit": "kg",
      "note": "morning weigh-in",
      "inserted_at": "2026-04-20T07:10:00Z"
    }
  ],
  "goal": {
    "value": "88.00",
    "unit": "kg"
  },
  "summary": {
    "first_entry": { "date": "2026-03-01", "value": "95.20", "unit": "kg" },
    "latest_entry": { "date": "2026-04-20", "value": "91.40", "unit": "kg" },
    "total_change": -3.8,
    "change_unit": "kg"
  }
}
```

Key details:
- `entries` is ordered **ascending by date** (oldest first). If the frontend needs newest-first for a list, reverse locally.
- `goal` is `null` when not set — not `{ value: null, unit: null }`. Check with `if (response.goal)`.
- `summary.first_entry` and `summary.latest_entry` are `null` when there are no entries.
- `summary` silently converts mixed units to the latest entry's unit. If the client logged in lbs 200 days ago and kg recently, `summary.first_entry` is in kg. Use `summary` for headline numbers — don't recompute.
- `total_change` is a **number** (not string) with 2-decimal precision. Negative means weight went down.

**Status codes**
- `200 OK` — returned even when there are no entries (empty `entries`, `null`/numeric placeholders in `summary`)
- `401 Unauthorized` — no/invalid client session (the API returns `403` per the existing auth convention — see "Status codes note" below)
- `422 Unprocessable Entity` — `since` is not a valid date (`"bad-date"` → `{"error_detail": {"fields": {"since": ["is invalid"]}}}`)

**Frontend impact**
- New RTK Query (or equivalent) endpoint `getClientWeightEntries` that accepts optional `since`
- Cache key should include `since` — though in practice the frontend only calls without `since` and filters locally
- Add invalidation tags so that after create/upsert/delete, this query refetches
- Render the empty state spec (`entries: []`, `goal: null`) as the first-run screen

**Example**
```bash
curl -H "Authorization: Bearer $CLIENT_TOKEN" \
  "$API/v1/client/weight_entries"
```

---

### Change 3: New endpoint — `POST /v1/client/weight_entries` (upsert by date)

**Type:** new endpoint
**Spec reference:** From the spec:
> "The UX is 'log today's weight' — not 'insert' or 'update.' The client's mental model is one action. The backend hides the 'already exists?' check. The client-side code just calls `POST /weight_entries` with a date + value and gets back the current state."

Also:
> "No `PATCH /client/weight_entries/:id`. Edit-by-date goes through the same POST. The backend upserts. One endpoint, two behaviors, one mental model for the frontend."

**Breaking:** No

**What changed in the backend**
POST that upserts a weight entry keyed by `(client_id, date)`. If the date already has an entry, the server updates `value` / `unit` / `note` in place and returns the updated row. If not, it inserts. Same `201 Created` response status in both cases (deliberate — the frontend doesn't need to distinguish).

**What the frontend will observe**
Always `POST`, never `PATCH`. For "Log today's weight" and "Update a past day" the request is identical except for the `date` field. When the bottom sheet is opened on a day that already has an entry, pre-fill from the `entries[]` array (the frontend already has it in memory from Change 2).

**API details**

```
POST /v1/client/weight_entries
```

Request body:
```json
{
  "date": "2026-04-22",
  "value": 91.4,
  "unit": "kg",
  "note": "morning weigh-in"
}
```

- `date` (required): ISO date string. Client-local calendar date. Future beyond `today + 1` is rejected.
- `value` (required): number (or numeric string). `> 0` and `< 1000`. Decimal precision 2 (server rounds).
- `unit` (required): `"kg"` or `"lbs"`. Default in the log sheet is `latest_entry?.unit ?? "kg"` — compute at render time, don't store a preference anywhere. See "Client-side rendering decisions" below for the full rule.
- `note` (optional): up to 500 chars.

Response: `201 Created` with:
```json
{
  "data": {
    "id": "946a0b30-...",
    "date": "2026-04-22",
    "value": "91.40",
    "unit": "kg",
    "note": "morning weigh-in",
    "inserted_at": "2026-04-22T06:45:00Z"
  }
}
```

Note the wrapper — `data`, not a bare object, to match the rest of the API contract.

**Status codes**
- `201 Created` — created OR updated
- `422 Unprocessable Entity` — validation error. Error shapes include:
  - `{"fields": {"date": ["can't be blank"]}}`
  - `{"fields": {"date": ["is invalid"]}}` — unparseable date string
  - `{"fields": {"date": ["cannot be in the future"]}}` — more than 1 day ahead of server UTC
  - `{"fields": {"value": ["must be greater than 0"]}}`
  - `{"fields": {"value": ["must be less than 1000"]}}`
  - `{"fields": {"unit": ["is invalid"]}}` — not `kg` or `lbs`
  - `{"fields": {"note": ["should be at most 500 character(s)"]}}`
- `403 Forbidden` — no client session

**Frontend impact**
- One `upsertWeightEntry` mutation — no separate create/update mutations
- Call it for both "Log" and "Update" flows; toggle sheet title based on whether `entries[]` already has that date
- Invalidate the list query on success so `summary` and `entries[]` refresh
- The toast messaging spec (celebrate small losses, neutral on fluctuation, calm framing on increases) is computed client-side from the delta between the new entry and the previous one
- Handle the full 422 error map — display field-level messages under the weight input

**Example**
```bash
curl -X POST -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  "$API/v1/client/weight_entries" \
  -d '{"date":"2026-04-22","value":91.4,"unit":"kg","note":"morning"}'
```

---

### Change 4: New endpoint — `DELETE /v1/client/weight_entries/:id`

**Type:** new endpoint
**Spec reference:** From the spec:
> "`DELETE /client/weight_entries/:id` — delete a specific entry"

Also the "Delete confirmation" UX step.

**Breaking:** No

**What changed in the backend**
Deletes one entry by ID. Scoped by both `business_id` and `client_id` from the JWT — a client can only delete their own entries. Returns `404` if the entry doesn't exist or belongs to another client (never `403`, to avoid leaking existence).

**What the frontend will observe**
Standard DELETE. After success, refetch the list query (or optimistically remove the point and reconcile).

**API details**

```
DELETE /v1/client/weight_entries/:id
```

Response: `204 No Content` (empty body).

**Status codes**
- `204 No Content` — deleted
- `403 Forbidden` — no client session
- `404 Not Found` — entry does not exist, or belongs to another client

**Frontend impact**
- `deleteWeightEntry` mutation, invalidates the list query
- Handle `404` gracefully — treat as "already deleted, refetch list"

---

### Change 5: New endpoint — `GET /v1/coach/clients/:client_id/weight_entries`

**Type:** new endpoint
**Spec reference:** From the spec:
> "`GET /coaches/clients/:client_id/weight_entries` — list. Read-only. Coach can't log, can't edit. They see what the client sees."

Also:
> "Adherence hint. 'Logged 22 of last 30 days' — tells the coach how consistent the client has been."

**Breaking:** No

**What changed in the backend**
Coach-authenticated route that returns one client's weight history plus `adherence`. Same shape as the client endpoint **plus** one extra key.

> Note on path — the spec draft said `/coaches/...` but all existing coach routes use `/v1/coach/...`. We kept consistency with the rest of the coach surface.

**What the frontend will observe**
The coach client detail page fetches this when the Weight panel opens. Same chart rendering code can be reused from the client side — the response shape is a superset.

**API details**

```
GET /v1/coach/clients/:client_id/weight_entries
GET /v1/coach/clients/:client_id/weight_entries?since=2026-03-01
```

Response:
```json
{
  "entries": [ /* same shape as client */ ],
  "goal": { "value": "88.00", "unit": "kg" },
  "summary": { /* same shape as client */ },
  "adherence": { "logged_days": 22, "window_days": 30 }
}
```

Adherence:
- `window_days` is always `30` for now
- `logged_days` counts **distinct dates** in the trailing 30-day window ending today (inclusive). An upsert to the same day counts once.
- Render as "Logged 22 of last 30 days" per the spec.

**Status codes**
- `200 OK`
- `401` / `403` — no coach session
- `404 Not Found` — client doesn't exist or belongs to another business
- `422 Unprocessable Entity` — invalid `since`

**Frontend impact**
- New `getCoachClientWeightEntries` query, keyed by `client_id`
- Reuse the client-side chart component for the read-only display (no log button, no edit/delete on points)
- Render the adherence hint prominently — it's the coach's primary signal for nudging

**Example**
```bash
curl -H "Authorization: Bearer $COACH_TOKEN" \
  "$API/v1/coach/clients/$CLIENT_ID/weight_entries"
```

---

### Change 6: New fields on `Client` — `goal_weight_value` and `goal_weight_unit`

**Type:** schema change (additive), modified endpoint behavior
**Spec reference:** From the spec:
> "Goal weight on Client: Add two fields to the existing `clients` table: `goal_weight_value, :decimal` and `goal_weight_unit, Ecto.Enum, values: [:kg, :lbs]`."

Also:
> "Nullable by default. Clients without a goal weight see the chart without the goal line."

**Breaking:** No — both fields are nullable

**What changed in the backend**
Two new nullable columns on `clients`. Both are included in every existing Client response shape (coach client list, coach client detail, client profile). The coach `PATCH /v1/coach/clients/:id` endpoint now accepts both fields in its cast list. The client-facing `PATCH /v1/client/profile` does **not** accept them — a client cannot change their own goal.

**What the frontend will observe**
- Every Client payload (coach list, coach detail, client profile) now has two new nullable fields: `goal_weight_value` (string, decimal) and `goal_weight_unit` (`"kg"` | `"lbs"` | `null`).
- Coach can set/update/clear the goal via the existing client edit endpoint — no new endpoint.

**API details**

New fields on all existing Client responses:
```json
{
  "id": "...",
  "first_name": "Vikas",
  "last_name": "Sandhu",
  ...
  "goal_weight_value": "88.00",
  "goal_weight_unit": "kg",
  ...
}
```

Coach updating the goal:
```bash
PATCH /v1/coach/clients/:id
{
  "goal_weight_value": 88,
  "goal_weight_unit": "kg"
}
```

Coach clearing the goal — send either field as `null` (or empty):
```bash
PATCH /v1/coach/clients/:id
{
  "goal_weight_value": null
}
```
The backend clears **both** fields when either is blanked. This matches the spec's "Leave empty to remove the goal" flow from the Edit Goal dialog.

**Status codes & errors**
- `422` with `{"fields": {"goal_weight_unit": ["is required when goal_weight_value is set"]}}` if only `goal_weight_value` is sent on a client with no existing unit.
- `422` with `{"fields": {"goal_weight_value": ["must be less than 1000"]}}` or `["must be greater than 0"]` on out-of-range values.

**Frontend impact**
- Extend the Client TypeScript type with `goal_weight_value: string | null` and `goal_weight_unit: "kg" | "lbs" | null`
- Build the Coach "Edit goal" dialog per the spec (value + unit picker, empty to remove)
- Do **not** expose goal editing on the client-side profile screen — only display. The Progress → Weight screen shows the goal line on the chart; the client can't change it.
- The client profile response (`GET /v1/client/profile`) also includes these two fields. **Duplication is intentional** — keep both. The weight screen reads from the `goal` object in the `/v1/client/weight_entries` response so it only makes one API call to render. Both endpoints read from the same DB columns; no synchronization concern. Eventual consistency over a few seconds after a coach edits the goal is fine.

---

## Client-side rendering decisions

These are settled rules the backend does not enforce. Listed here so the
frontend implementation is aligned.

### Default unit

Hardcoded `kg`. No business-level or client-level setting.

```javascript
const defaultUnit = latestEntry?.unit ?? "kg";
```

Rationale: user base is Indian (metric). US coaches flip the unit pill once on first entry and the previous-entry heuristic handles every subsequent log. Post-MVP a `default_weight_unit` on Business can replace the hardcoded default if US adoption grows.

### Moving average — break the line on gaps >7 days

Do **not** interpolate across gaps. If two adjacent entries are more than 7 days apart, end one line segment and start a new one. The daily-value dots still appear wherever entries exist; nothing renders during the gap.

Rationale: smoothing across a 3-week logging gap draws a line through data that doesn't exist. A broken line is honest. The 7-day threshold matches the moving-average window — tighter thresholds would break the line over normal weekend gaps.

### Mixed-unit chart rendering — convert to the latest entry's unit

Stored values are never changed. Convert at render time only.

```javascript
const displayUnit = entries[entries.length - 1]?.unit ?? "kg";

const normalized = entries.map(e => ({
  date: e.date,
  value: e.unit === displayUnit
    ? parseFloat(e.value)
    : convert(e.value, e.unit, displayUnit),
  originalValue: parseFloat(e.value),
  originalUnit: e.unit,
}));

function convert(value, from, to) {
  if (from === to) return parseFloat(value);
  if (from === "kg" && to === "lbs") return parseFloat(value) * 2.20462;
  if (from === "lbs" && to === "kg") return parseFloat(value) / 2.20462;
  return parseFloat(value);
}
```

On the tap-a-point detail popover, show the **original unit and value** that the client logged (e.g., "201.5 lbs · logged in lbs") — preserves intent while keeping the chart readable.

The `summary` block from the backend already applies the same rule for the headline numbers — don't recompute it, just render.

### 401 vs 403 status codes

Match existing codebase behavior (the auth plug returns `403` for missing client sessions). Treat either `401` or `403` as "session missing/invalid — redirect to login." This is a pre-existing quirk; a codebase-wide audit is scheduled separately, not in this PR.

---

## Migration checklist for frontend

Ordered by dependency — do earlier items first.

- [ ] Add TypeScript type `WeightEntry` with fields `id`, `date` (string), `value` (string), `unit` (`"kg" | "lbs"`), `note` (string | null), `inserted_at` (string)
- [ ] Add types for the list response: `WeightGoal | null`, `WeightSummary`, `WeightAdherence`, `WeightEntryListResponse`, `CoachWeightEntryListResponse`
- [ ] Extend the `Client` TypeScript type with `goal_weight_value: string | null` and `goal_weight_unit: "kg" | "lbs" | null`
- [ ] Add RTK Query endpoints (or equivalent):
  - `getClientWeightEntries(since?: string)`
  - `upsertClientWeightEntry({ date, value, unit, note? })`
  - `deleteClientWeightEntry(id)`
  - `getCoachClientWeightEntries({ clientId, since? })`
- [ ] Wire invalidation tags so upsert/delete refetch the list query
- [ ] Build the client Progress → Weight screen with: headline (latest + started-at + delta), range toggle, chart, log button — per the spec
- [ ] Build the log-weight bottom sheet with `inputmode="decimal"`, unit pill, "Last time" hint, optional note, sticky Save
- [ ] Build the edit-a-past-day flow: tap point on chart → mini popover → Edit (reopens the log sheet) / Delete (confirms)
- [ ] Implement client-side 7-day moving average (sliding window, partial window for first 7 days)
- [ ] Break the moving-average line into segments whenever two adjacent entries are >7 days apart — do not interpolate across gaps
- [ ] Implement client-side 30d / 90d / All range toggles — local filter only
- [ ] Implement unit conversion for display only: compute `displayUnit = latestEntry?.unit ?? "kg"`, convert older entries to `displayUnit` using `1 kg = 2.20462 lbs`. Stored values never change.
- [ ] Log-sheet default unit on a brand-new client: hardcode `kg`. No configurability for MVP.
- [ ] Tap-a-point detail popover: show the **original** unit and value the client logged (not the converted display value)
- [ ] Build the coach Weight section on the client detail page: read-only chart + adherence hint + Edit goal button
- [ ] Build the coach Edit Goal dialog that PATCHes `/v1/coach/clients/:id` (value + unit; empty to remove)
- [ ] Implement empty-state screens: no entries (first-run), single entry (no chart yet), no goal (chart without goal line)
- [ ] Implement toast messaging spec after save: celebrate small losses, neutral on fluctuation, calm framing on increases (never red, never "gained")
- [ ] Handle all 422 error shapes (date blank/invalid/future, value out of range, unit invalid, note too long)
- [ ] Add haptic feedback: light tap on sheet open, range toggle; success haptic after save; warning haptic before delete
- [ ] Verify dark mode: line color, goal dashes, daily dots — use CSS variables, spot-check dot opacity

---

## Things that did NOT change

- No existing endpoint shape changed. The new `goal_weight_*` fields on Client responses are **additive** — they show up as `null` for any client without a goal set.
- Auth, session handling, tenant isolation all unchanged.
- The Client self-update endpoint (`PATCH /v1/client/profile`) still only accepts `[:first_name, :last_name, :phone]`. Clients cannot set their own goal — enforced server-side.
- No pagination model change. Weight entries use `since` filtering; list endpoints elsewhere unchanged.
- No change to units anywhere else in the app. The `kg`/`lbs` enum is local to `WeightEntry` and the goal fields on Client.
- No change to the Progress tab's other sub-screens (training, nutrition, etc.) — this is a net-new sub-screen under Progress.
- No notification / push / WhatsApp integration. The spec defers all "nudging" behavior to the coach's existing manual workflow.

---

## Open questions / known gaps

All six questions surfaced in review have been resolved — decisions folded into the relevant sections above. Remaining forward-looking notes:

- **Post-MVP: coach-side logging.** Not implemented. The coach endpoint is read-only. The `source` / `logged_by` field is deliberately omitted from `WeightEntry` until this ships — when it lands, it's an additive migration.
- **Post-MVP: photos, body composition (fat %, lean mass, circumference), imports from Fitbit/Apple Health, CSV export.** None in scope. Each is either a new entity or additive fields — current `weight_entries` shape stays forward-compatible.
- **Post-MVP: `default_weight_unit` on Business settings.** If US adoption grows and the hardcoded-kg default becomes friction for US coaches, add the setting then. Not before.
- **Post-MVP: gap-aware moving average.** Frontend will break the line at >7-day gaps (see "Client-side rendering decisions"). If gap detection becomes more sophisticated (e.g., adherence-streak breaks, visual indicators), treat as a separate UX refinement.
- **Tech debt: 401 vs 403 audit.** The codebase returns `403` for missing sessions. Rule going forward for net-new endpoints: `401` if no valid session, `403` if session valid but wrong role, `404` if resource exists but cross-tenant. Retrofitting old endpoints is a separate PR — not this one.
- **Tech debt: rate limiting on `POST /v1/client/weight_entries`.** A buggy frontend (e.g., save on every keystroke) could hammer the upsert. The unique constraint prevents duplicate rows but each call still costs a DB round-trip. Not blocking launch — add basic per-user rate limiting (e.g., 10 req/min) when convenient.
