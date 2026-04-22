# UX Spec: Weight Tracker

**Date:** 2026-04-22
**Scope:** Client logs their body weight. Coach sees the trend with a goal line. One entry per day. No coach-side logging (MVP).
**Design principle:** Weight is emotional data. Daily fluctuations scare clients. The UI must lead with the trend, not the noise.

---

## What It Is (And Isn't)

### Is

A simple daily weight journal. The client logs today's weight. The app shows it against their goal and their starting point. Over weeks, the chart tells a story.

### Isn't

- Body composition tracking (fat %, muscle mass, measurements) — post-MVP
- Photos — separate tracker, separate spec
- Coach-side weight entry — post-MVP
- Multiple weigh-ins per day — post-MVP
- Historical data migration or import — post-MVP
- Anything that looks like a medical tool — this is motivation, not diagnosis

---

## Data Model

### New entity: `Fitness.WeightEntry`

One row per client per day. The date is the identifier (alongside client_id), not a timestamp. A client weighs themselves "on Monday" — the time of day is noise we don't need.

```
schema "weight_entries" do
  field :date, :date                    # local date, not UTC timestamp
  field :value, :decimal                # the weight
  field :unit, Ecto.Enum, values: [:kg, :lbs]
  field :note, :string                  # optional, e.g., "ate a lot yesterday"

  belongs_to :client, Clients.Client
  belongs_to :business, Orgs.Business

  timestamps(type: :utc_datetime)
end
```

**Why date not datetime:** One entry per day. No user cares whether they logged at 7am or 8am. Storing a date prevents timezone bugs entirely — the client's "today" is always unambiguous.

**Why `value` not `weight`:** Reads better in queries (`entry.value`) and keeps the field name language-neutral.

**Why `unit` per-entry:** A client might travel from India (kg) to the US (lbs) and log a few entries in lbs, then return. Per-entry unit means we never re-convert or lose precision.

**No `source` field.** Only the client can log, so we don't need to track who entered it. When coach-side logging lands post-MVP, add `logged_by` (user_id) at that point.

### Unique constraint

```
create unique_index(:weight_entries, [:client_id, :date])
```

Enforces one entry per client per day at the database level. If the client logs again on the same date, we update the existing row instead of inserting.

### Goal weight on Client

Add two fields to the existing `clients` table:

```
field :goal_weight_value, :decimal
field :goal_weight_unit, Ecto.Enum, values: [:kg, :lbs]
```

**Why on Client and not a separate entity:** A client has one current goal. When it changes, the coach updates the value. We don't need goal history for MVP — the weight chart itself shows the story. A post-MVP "goal changed on X date" feature could add a WeightGoal entity with start/end dates, but that's premature.

**Nullable by default.** Clients without a goal weight see the chart without the goal line. Perfectly valid state.

### No `starting_weight` field

The "started at" value shown on the chart is computed from the **first WeightEntry** for this client. Don't duplicate it on Client. If the client deletes their first entry, "started at" becomes the next earliest entry. Derived, not stored.

---

## Backend — Schema Module

Following AGENTS.md patterns: changesets per operation, composable queries, actions at the bottom, `business_id` on every query.

### `Fitness.WeightEntry` module structure

```elixir
defmodule Easy.Fitness.WeightEntry do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @units [:kg, :lbs]

  schema "weight_entries" do
    field :date, :date
    field :value, :decimal
    field :unit, Ecto.Enum, values: @units
    field :note, :string

    belongs_to :client, Client
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  # Changesets

  @cast_fields [:date, :value, :unit, :note]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(client_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:client_id, client_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:date, :value, :unit, :client_id, :business_id])
    |> validate_number(:value, greater_than: 0, less_than: 1000)
    |> validate_length(:note, max: 500)
    |> unique_constraint([:client_id, :date],
      name: :weight_entries_client_id_date_index,
      message: "already logged for this date"
    )
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [:value, :unit, :note])
    |> validate_required([:value, :unit])
    |> validate_number(:value, greater_than: 0, less_than: 1000)
    |> validate_length(:note, max: 500)
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(e in query, where: e.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(e in query, where: e.client_id == ^client_id)
  end

  @spec on_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def on_date(query \\ __MODULE__, date) do
    from(e in query, where: e.date == ^date)
  end

  @spec since(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def since(query \\ __MODULE__, date) do
    from(e in query, where: e.date >= ^date)
  end

  @spec between(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def between(query \\ __MODULE__, from_date, to_date) do
    from(e in query, where: e.date >= ^from_date and e.date <= ^to_date)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.date])
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(e in query, order_by: [desc: e.date])
  end

  # Actions

  @spec upsert(String.t(), String.t(), map()) ::
          {:ok, t()} | {:error, Ecto.Changeset.t()}
  def upsert(client_id, business_id, %{"date" => date} = attrs) do
    case __MODULE__ |> for_business(business_id) |> for_client(client_id) |> on_date(date) |> Repo.one() do
      nil ->
        insert_changeset(client_id, business_id, attrs) |> Repo.insert()

      existing ->
        update_changeset(existing, attrs) |> Repo.update()
    end
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(entry), do: Repo.delete(entry)
end
```

**Why `upsert` as an action:** The UX is "log today's weight" — not "insert" or "update." The client's mental model is one action. The backend hides the "already exists?" check. The client-side code just calls `POST /weight_entries` with a date + value and gets back the current state.

**Why no `list`, `get`, `paginate` here:** Per AGENTS.md, callers compose queries. The controller will compose `for_business |> for_client |> ordered |> Repo.all()` directly.

### Client schema addition

Add to the existing `Client` module:

```elixir
# Add to schema block
field :goal_weight_value, :decimal
field :goal_weight_unit, Ecto.Enum, values: [:kg, :lbs]

# Update cast fields (both in update_changeset and whatever coach-side edit uses)
@update_cast_fields [
  :first_name, :last_name, :phone, :email, :notes, :status,
  :goal_weight_value, :goal_weight_unit
]
```

No separate changeset needed. The existing client edit flow picks it up. Validation: if `goal_weight_value` is set, `goal_weight_unit` is required (add a simple `validate_goal_weight_has_unit/1` validator).

### Migration

```
create table(:weight_entries, primary_key: false) do
  add :id, :binary_id, primary_key: true
  add :date, :date, null: false
  add :value, :decimal, precision: 5, scale: 2, null: false
  add :unit, :string, null: false
  add :note, :text

  add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false
  add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all), null: false

  timestamps(type: :utc_datetime)
end

create unique_index(:weight_entries, [:client_id, :date])
create index(:weight_entries, [:business_id, :client_id, :date])

alter table(:clients) do
  add :goal_weight_value, :decimal, precision: 5, scale: 2
  add :goal_weight_unit, :string
end
```

**Precision: 5, scale: 2** = max value 999.99. Enough for any real human weight in kg or lbs, with 0.01 precision (fine for digital scales that show one decimal).

**`on_delete: :delete_all`** on client_id — when a client is deleted, their weight entries go too. Cascading is correct here; weight has no meaning without the client.

---

## API Endpoints

Three endpoints. Clean, REST-ish, tenant-isolated.

### Client-facing (session role: client)

```
POST   /client/weight_entries          — upsert today's (or any date's) weight
GET    /client/weight_entries          — list (optionally ?since=YYYY-MM-DD)
DELETE /client/weight_entries/:id      — delete a specific entry
```

**No `PATCH /client/weight_entries/:id`.** Edit-by-date goes through the same POST. The backend upserts. One endpoint, two behaviors, one mental model for the frontend.

### Coach-facing (session role: coach)

```
GET    /coaches/clients/:client_id/weight_entries    — list
```

Read-only. Coach can't log, can't edit. They see what the client sees.

### What's NOT an endpoint

- No `GET /client/weight_entries/:id` (no single-entry view in the UX)
- No `PATCH /coaches/clients/:id` for goal weight specifically (goal_weight lives on Client and updates via existing `PATCH /coaches/clients/:id`)
- No bulk endpoints (no bulk import in MVP)

### Response shape

```
GET /client/weight_entries?since=2026-03-01

{
  "entries": [
    {
      "id": "...",
      "date": "2026-03-01",
      "value": "95.20",
      "unit": "kg",
      "note": null,
      "inserted_at": "2026-03-01T09:14:12Z"
    },
    ...
  ],
  "goal": {
    "value": "88.00",
    "unit": "kg"
  },
  "summary": {
    "first_entry": {"date": "2026-02-01", "value": "95.20", "unit": "kg"},
    "latest_entry": {"date": "2026-04-20", "value": "91.40", "unit": "kg"},
    "total_change": -3.80,
    "change_unit": "kg"
  }
}
```

**`summary` is computed server-side.** First + latest + total change. The frontend doesn't need to re-derive these on every render. The moving average IS computed client-side (see chart section below) — it's per-visible-range so server can't cache it.

**Why `since` instead of offset/limit:** Weight entries are naturally time-bounded. "Last 30 days," "last 90 days," "all." The client picks a date cutoff. No pagination needed — nobody has 100,000 weight entries.

---

## Client App — Weight Screen

Tab: Progress → Weight. (Per the app shell spec, Progress is a tab in the client app.)

### First-run empty state

Client has no entries, no goal:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Weight                                          │
│                                                  │
│                                                  │
│         Start tracking your weight               │
│                                                  │
│     Log regularly to see how you're              │
│     progressing.                                 │
│                                                  │
│            [Log first weight]                    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Normal state — one or more entries

```
┌──────────────────────────────────────────────────┐
│  Weight                                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  91.4 kg                started at 95.2 kg       │
│  ↓ 3.8 kg                                        │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │    ·                                       │  │
│  │     ·  ·          ← 7-day moving avg       │  │
│  │       ·_                                   │  │
│  │          '·.                               │  │
│  │              ·.                             │ │
│  │                ·._                         │  │
│  │  - - - - - - - - - - goal: 88 kg           │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [30d]  [90d]  [All]                             │
│                                                  │
│  [+ Log today's weight]                          │
│                                                  │
└──────────────────────────────────────────────────┘
```

### What's on the screen

**Headline (top-left):** `91.4 kg` — latest value, large (24px font, weight 500). The number the client actually cares about.

**Sub-headline (top-right):** `started at 95.2 kg`. Anchors the journey. Same unit as the latest entry.

**Delta row:** `↓ 3.8 kg`. Green text if down (positive progress for most clients), neutral if up, never red. Never "+" vs "-" — use `↓` and `↑` arrows. Tiny but emotionally important.

**The chart:** 7-day moving average as the main line. Daily values as faint dots behind it. Goal as a dotted horizontal line. No axis labels — the headline numbers tell the story. Y-axis auto-fits to the data range with 10% padding top/bottom.

**Range toggle:** `[30d] [90d] [All]`. Default 30d. Client-side filter only — the data is already in memory from the single GET.

**Primary action:** `[+ Log today's weight]` at the bottom. Sticky if the screen scrolls.

### Why moving average is the lead

A client's daily weight fluctuates ±1.5 kg from water, food, sodium, sleep, and bowel movements. If they see yesterday's spike without context, they panic or give up. The 7-day moving average smooths this almost entirely — the trend line goes down even when yesterday's number was up.

This is the single most important UX decision in the whole weight tracker. The chart must tell a calm story.

**Moving average calculation (client-side):**

```javascript
function movingAverage(entries, window = 7) {
  return entries.map((entry, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = entries.slice(start, i + 1);
    const avg = slice.reduce((sum, e) => sum + parseFloat(e.value), 0) / slice.length;
    return { date: entry.date, value: avg };
  });
}
```

The first few days show a shorter-window average (until there are 7 days of data). That's fine — the line is still smoother than raw values.

### If no goal is set

```
  91.4 kg                started at 95.2 kg
  ↓ 3.8 kg

  [chart — no goal line]

  [30d]  [90d]  [All]

  [+ Log today's weight]
```

The goal line is simply omitted. No mention of "set a goal" on the client screen — the coach owns the goal. The client shouldn't be nagged to set one they can't set.

### If only one entry exists

```
  91.4 kg                logged today

  [no chart yet — single point]

  Log for a few more days to see your trend.

  [+ Update today's weight]
```

Charts with a single data point are not useful. Show a gentle message instead. Button switches to "Update" — the coach knows the client logged today.

---

## Log Weight Flow (Mobile)

Tapping `[+ Log today's weight]` opens a bottom sheet, not a separate screen.

### The bottom sheet

```
┌────────────────────────────────────────┐
│                                        │
│    Log weight for today                │
│    Wednesday, Apr 22                   │
│                                        │
│    ┌────────────────────────────┐      │
│    │                            │      │
│    │    91.4          kg  ▾     │      │
│    │                            │      │
│    └────────────────────────────┘      │
│                                        │
│    Last time: 91.8 kg (3 days ago)     │
│                                        │
│    Note (optional)                     │
│    [                              ]    │
│                                        │
│    [Cancel]              [Save]        │
│                                        │
└────────────────────────────────────────┘
```

### What's good about this

**Date is shown, not pickable.** It's today. Always today. If they want to log a past date, they edit that day from the chart (see "Edit a day" below). Simpler than having a date picker every time.

**Big central input.** 48px tall, centered text, font-size 28px. The number is the whole point of this screen — make it enormous.

**`inputmode="decimal"`.** Opens the number pad with a decimal point. 92.3 is three taps.

**Unit pill next to the value.** Default matches the client's previous unit (from the last entry). Tap the pill → bottom sheet with `kg` / `lbs` options. Changing unit doesn't convert — it just tags this entry with the new unit. Mixed units are handled at display time.

**"Last time" hint.** Shows the previous entry and how long ago. Anchors the new number. Helps catch typos ("I meant 91.4 not 914").

**Note is collapsed and optional.** Most days there's no note. Some days the client wants to log "weighed in after a big meal" — they can. Label says "optional" so nobody feels obligated.

**Save is sticky-right, Cancel to its left.** Same pattern as the set builder.

### What happens after Save

The bottom sheet closes. The chart updates with the new point and redrawn moving average. A brief toast confirms:

```
Logged: 91.4 kg · ↓ 0.4 kg this week
```

If the value is down from the last entry: celebrate subtly ("↓ 0.4 kg this week").
If up by less than 0.5 kg: neutral ("Weight fluctuates day-to-day — focus on the trend.").
If up significantly: calm framing ("Hold steady — water and food affect daily weight a lot. The trend is what matters.").

**Never shame.** Never "you gained weight." Never red. Never alarm.

### If logging on top of an existing entry

The client logged Monday morning at 92.1 kg. Later Monday evening they tap "Log today's weight" again. The bottom sheet opens pre-filled with 92.1.

```
┌────────────────────────────────────────┐
│    Update today's weight               │
│    Wednesday, Apr 22                   │
│                                        │
│    ┌────────────────────────────┐      │
│    │                            │      │
│    │    91.4          kg  ▾     │      │  ← pre-filled
│    │                            │      │
│    └────────────────────────────┘      │
│                                        │
│    Replaces earlier entry of 92.1 kg   │
│                                        │
│    [Cancel]              [Save]        │
└────────────────────────────────────────┘
```

Title changes to "Update." A subtle line tells them the old value is being replaced. No modal-within-modal confirmation needed — they're explicitly editing the day.

---

## Edit a Past Day

The client realizes yesterday's entry was wrong. Tap the chart's data point for yesterday.

### Tapping a data point

```
Chart with a dot at April 21 → tap

     ↓

┌────────────────────────────────────────┐
│    April 21, 2026                      │
│                                        │
│    91.8 kg                             │
│    Note: "morning, after coffee"       │
│                                        │
│    [Edit]              [Delete]        │
└────────────────────────────────────────┘
```

A small popover / bottom sheet shows the entry. Two actions: Edit (reopens the log sheet with that date) or Delete (confirms, then removes).

### Edit opens the log sheet with that date

```
┌────────────────────────────────────────┐
│    Update weight for April 21          │
│    3 days ago                          │
│                                        │
│    ┌────────────────────────────┐      │
│    │    91.8          kg  ▾     │      │
│    └────────────────────────────┘      │
│                                        │
│    Note                                │
│    [morning, after coffee          ]   │
│                                        │
│    [Cancel]              [Save]        │
└────────────────────────────────────────┘
```

Same bottom sheet, different title.

### Delete confirmation

```
┌────────────────────────────────────────┐
│    Delete entry for April 21?          │
│                                        │
│    This will remove 91.8 kg from       │
│    your history. You can always log    │
│    a new value for this day.           │
│                                        │
│    [Cancel]             [Delete]       │
└────────────────────────────────────────┘
```

Destructive action gets a confirm. "Delete" button is red (`--color-background-danger`). After deletion, the chart redraws without that point.

---

## Coach View — Client's Weight

On the coach's client detail page, a "Weight" section. Same chart as the client sees, but read-only.

```
┌──────────────────────────────────────────────────┐
│  Weight                                          │
│  Goal: 88 kg     [Edit goal]                     │
├──────────────────────────────────────────────────┤
│                                                  │
│  Current: 91.4 kg             Started: 95.2 kg   │
│  Down 3.8 kg in 11 weeks                         │
│                                                  │
│  [chart — same as client]                        │
│                                                  │
│  [30d]  [90d]  [All]                             │
│                                                  │
│  Logged 22 of last 30 days  ← adherence hint     │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Differences from client view

**Goal editable here.** "Edit goal" opens a small form (value + unit) that PATCHes the Client record. This is where the coach sets and updates the goal.

**"Started" shows actual date + value.** Coach wants to know when the client started, not just the number. "95.2 kg · 11 weeks ago" or similar.

**Adherence hint.** "Logged 22 of last 30 days" — tells the coach how consistent the client has been. Low adherence is a cue to nudge them on WhatsApp.

**No logging button.** Coach doesn't log. Seeing that action would be confusing.

### Edit goal dialog

```
┌────────────────────────────────────────┐
│    Set weight goal for Vikas           │
│                                        │
│    Target weight                       │
│    ┌────────────────────────┐          │
│    │  88             kg  ▾  │          │
│    └────────────────────────┘          │
│                                        │
│    Leave empty to remove the goal.     │
│                                        │
│    [Cancel]              [Save]        │
└────────────────────────────────────────┘
```

Goal can be unset — empty the field, save. The chart hides the goal line. Coach might do this mid-program when reassessing.

---

## Units and Conversion

The app never silently converts weights. If a client logs in kg, the value stays in kg. If they switch to lbs and log again, the new entry is in lbs.

### Display logic

When mixing units on one chart (rare but possible), display the latest entry's unit. Convert older entries to that unit **for display only**:

```
Latest entry: 91.4 kg
Three entries 200 days ago in lbs (210, 208, 206)
  → displayed as 95.3 kg, 94.3 kg, 93.4 kg on the chart
```

Stored values never change — conversion happens at render time only. 1 kg = 2.20462 lbs exactly.

### The "started at" value

Uses the unit of the FIRST entry. If that was lbs and everything since is kg, the "Started at" line shows it in lbs with a small `(95.2 kg)` conversion. Or just convert to current unit silently — cleaner. Pick one and stick with it:

**Recommendation:** Convert to current unit silently for the "started at" and "total change" readouts. Show the original unit only on the chart hover / tap for an individual entry.

### Where unit preference comes from

Look at the client's most recent entry. That's the default for the log sheet. If they have no entries, use the business's default unit (from Settings — Indian coach = kg, US coach = lbs). New clients land in kg by default.

---

## Mobile Polish

Same principles from the set planning spec apply:

### Chart touch interaction

- **Tap a point:** show that day's value + date + note in a mini-popover (as described above)
- **Pan the chart:** scroll horizontally through time when zoomed to 30d/90d
- **Pinch to zoom** (nice-to-have): zoom in on a date range. Skip for MVP.
- **Long-press on chart:** shows a vertical crosshair with the value at that date. Drag the crosshair to scrub through time. Standard fitness-app gesture.

### Input keyboard

`inputmode="decimal"` on the weight value. The decimal point is reachable (major reason not to use `type="number"`, which varies wildly across browsers).

### Haptic feedback

- Light tap when opening the log sheet
- Light tap when switching range (30d/90d/All)
- Success haptic after saving an entry
- Warning haptic before confirming delete

### Dark mode

The chart must work in both modes. Use CSS variables for the line color, grid lines, and goal dashes. Spot-check that the faint daily-value dots are still visible against the dark background — may need a slightly higher opacity than in light mode.

### Landscape

Optional but nice: in landscape, the chart fills more width and the range toggle moves to a floating top-right button. Most clients use portrait; this is a post-MVP polish item.

---

## What the Coach Can See (Summary)

| Surface | Coach | Client |
|---------|-------|--------|
| View latest weight | Yes | Yes |
| View chart / history | Yes | Yes |
| View moving average trend | Yes | Yes |
| See starting value + total change | Yes | Yes |
| Set goal weight | Yes | No |
| Edit goal weight | Yes | No |
| Log new weight | No | Yes |
| Edit past entries | No | Yes |
| Delete entries | No | Yes |

This separation keeps data ownership clean. The client's weight is the client's data. The coach's role is to set the target and observe.

---

## Risks and Decisions

### Risk: clients log erratically, coach can't see a clear trend

**Mitigation:** The moving average handles short gaps naturally (it uses whatever data is in the window). The adherence hint on the coach side ("Logged 14 of 30 days") surfaces low logging rates so the coach can nudge.

Not solved for MVP: gaps longer than 7 days leave the moving average with stale data. Consider breaking the line into segments separated by gaps >7 days, post-MVP.

### Risk: client weighs at different times of day, inconsistent data

**Mitigation:** Don't try to detect or fix this. The moving average smooths it. The UI hints at consistency ("weigh at the same time daily — morning is best") could be shown as a one-time onboarding tip, post-MVP.

### Risk: goal weight becomes stale when coach changes strategy

**Mitigation:** Coach can edit the goal anytime. The chart's goal line updates immediately. Coach's mental model: "update goal when the phase changes." No automation — manual is fine for MVP.

### Risk: client has eating disorder, daily weight tracking is harmful

**Mitigation:** The app doesn't push weight tracking. It's opt-in (empty state has one button, easy to ignore). If the client never logs, the screen stays empty, no nagging. The moving average framing reduces daily-weight anxiety for everyone else.

Not solved for MVP: active intervention for at-risk users. This is a product-level concern — the coach is expected to handle it through the relationship.

### Risk: timezone confusion

**Mitigation:** Date (not datetime) on WeightEntry eliminates the whole class of timezone bugs. The client's device provides "today" as a local date string; the server stores it as-is. Two clients in different timezones logging "today" is fine — each has their own date.

---

## Implementation Effort

### Backend

| Task | Effort |
|------|--------|
| Migration (weight_entries table + goal_weight fields on clients) | Small |
| `Fitness.WeightEntry` schema module (changesets + queries + upsert) | Small-Medium |
| `Client` schema update (goal_weight fields + validation) | Small |
| `WeightEntryController` (client-side CRUD) | Small |
| `CoachClientController` extension (read-only list) | Small |
| `WeightEntryJSON` view (with summary computation) | Small |
| Tests (SchemaCase for schema, ControllerCase for API) | Medium |
| Update `docs/api_contract.yaml` with new endpoints | Small |

### Frontend (Client app)

| Task | Effort |
|------|--------|
| Weight screen layout (headline + chart + range toggle) | Medium |
| Chart component (line + moving average + goal line + daily dots) | Medium |
| Log weight bottom sheet | Medium |
| Edit / delete past entry flow | Small-Medium |
| Empty states (no entries, single entry, no goal) | Small |
| Client-side moving average calculation | Small |
| Unit conversion for display | Small |
| Haptic feedback + polish | Small |

### Frontend (Coach app)

| Task | Effort |
|------|--------|
| Weight section on client detail page | Medium |
| Goal edit dialog | Small |
| Adherence hint calculation | Small |

**Total: ~5-7 days backend, ~6-8 days frontend** (client + coach). The chart component is the biggest single piece — use a charting library like Recharts (already in the stack per the earlier specs) to avoid rolling our own.

---

## What's Deferred (Post-MVP)

- Body composition (fat %, lean mass)
- Circumference measurements (waist, hips, arms)
- Photos linked to weight entries
- Multiple weigh-ins per day
- Coach-side logging
- Goal history with dates ("goal was 90, then 88")
- Weight import from scales (Fitbit, Apple Health)
- CSV export
- Charts beyond weight (volume, strength, adherence — separate specs)
- Week-over-week delta summaries
- Predictions / trend extrapolation
- Gap detection in logging streaks

Each of these is a deliberate choice to ship a simple, honest weight tracker that tells a calm story about progress — not a full body composition system.