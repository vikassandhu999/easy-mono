# Coach workbench: the clients listing becomes a work rail

**Date:** 2026-08-06
**Status:** Proposed. Supersedes [`2026-08-04-coach-workbench-spec.md`](2026-08-04-coach-workbench-spec.md), which kept the old clients list intact inside a wrapper and left five decisions open. This spec replaces the listing outright and resolves the decisions (§11).
**Inputs:**
- [`docs/research/coach-workflow-inbox-research.md`](../../research/coach-workflow-inbox-research.md) — queue mechanics across 9 fitness platforms + Front/Intercom/Superhuman/Linear/Gmail/GitHub (2026-08-04)
- [`docs/research/2026-07-25-client-triage-messaging-research.md`](../../research/2026-07-25-client-triage-messaging-research.md) — market and evidence research (2026-07-25)
- Product direction (2026-08-06): the clients listing is replaced by this surface. A roster is a lookup tool, not a workspace; the primary surface is the work, not the list.

---

## 1. What this replaces

Today the coach's attention work is spread across three places: the dashboard's
priority queue, the clients list with a "Needs attention" pill, and `/messages`.
All three are partial views of the same question — "who needs me, and why?" —
and none of them can be worked to zero.

This spec replaces all three with one surface. `/clients` becomes the
**workbench**: a rail of drainable queues, worked lane by lane, with the full
roster and the message inbox demoted to browse views inside the same shell. The
alphabetical client listing stops being a destination. The dashboard's priority
queue is deleted rather than kept as a second copy of the rail — the 2026-07-25
research flagged that duplication explicitly ("it duplicates CoachEasy's
existing Needs you today dashboard"), and running two triage surfaces teaches
the coach to trust neither.

Where this spec departs from the research's caution: the research recommends
keeping the roster as the primary surface with attention as a filter dimension
(the Trainerize/Everfit shape). The product decision is the reverse — the
queues are primary, the roster is the escape hatch. What the research still
governs is the mechanics: every queue definition, exit, count, and badge below
follows the mechanics findings, because those are the parts that decide whether
the rail gets worked or ignored.

What survives from the research unchanged:

* Conversations are not dissolved into client queues. Every product surveyed
  keeps a messaging destination; Linear runs Triage and Inbox as two surfaces
  on purpose. The rail gets the drainable slice (Replies) and the browsable
  whole (Messages) as separate items.
* The client's name stays the primary row object everywhere. The research
  found no product that replaces the name with an explanatory sentence as the
  scanning anchor. Reasons ride next to the name, never instead of it.
* A complete roster remains reachable in one click. Every surveyed product
  keeps one; known-client lookup is a different job from triage and must not
  get slower.

## 2. Concept model

Everything in the rail is a **queue** or a **view**, and the two are never
visually mixed (the Hevy pitfall: a stream that looks like a queue, cannot be
drained, and teaches you to ignore the rail).

A queue holds items needing a coach action. Each queue has:

* a definition — a saved query over domain data. The coach never files anyone
  into a queue and never maintains one.
* a sort order and a **total count** (work remaining, not unread — only a
  total reaches zero by working; Superhuman reversed unread badges for exactly
  this reason).
* an exit. Computed conditions exit automatically when the condition clears;
  manual exits are the domain action itself (reviewing a check-in), never a
  bare "dismiss". Items re-enter automatically if the condition recurs
  (Front's auto-reopen).
* two empty states: drained and never-populated (§7).

A view is a browsable list with no completion semantics: All clients,
Messages. No count that demands draining.

Every queue row carries a machine-readable **reason** (`check_in_waiting`,
`plan_expiring`, `no_successor_plan`, …) delivered by the API. Segments derive
from reasons; one client can sit in several queues without the frontend
guessing why; the vocabulary is identical in the backend enum, the API, and
the frontend keys (GitHub's `review_requested` vs `review-requested` drift is
the cautionary tale).

## 3. The rail

Two groups, seven items at launch, one more in phase 3. Order inside "Today"
is the coach's morning sequence: review what came in, answer who's waiting,
fix what's about to lapse, welcome who's new.

| # | Item | Group | Kind | Definition | Sort | Exit | Badge |
|---|---|---|---|---|---|---|---|
| 1 | Check-ins | Today | Queue | Submissions with no `reviewed_at` | Oldest first | Coach reviews | Count |
| 2 | Replies | Today | Queue | Conversations where the client sent the last message | Longest-waiting first | Coach replies | Count |
| 3 | Programming | Today | Queue | Active client with no in-force plan, or in-force plan ending ≤3 days with nothing scheduled after | No-plan first, then soonest end | Plan assigned or extended | Count |
| 4 | Expiring | Today | Queue | Active client whose subscription ends ≤7 days | Soonest end first | Renewed, or lapses to Inactive | Count |
| 5 | New | Today | Queue | Added ≤14 days ago, invite pending >3 days, or intake incomplete | Newest first | Onboarding completes and 14 days pass | Muted count |
| 6 | All clients | Browse | View | Full roster: search, status filter, sort | — | — | None |
| 7 | Messages | Browse | View | Full conversation inbox | Recent first | — | Unread count |
| 8 | Quiet *(phase 3)* | Today | Queue | ≥2 consecutive missed **scheduled** sessions, or latest check-in assignment `missed` | Most-missed first | Client completes a session or check-in | Count |

Per-queue rationale, in research terms:

**Check-ins.** Already a real backend concept: `GET /v1/coach/check-ins/review-queue`
lists unreviewed submissions oldest-first and `FormSubmission.reviewed_at`
persists the exit. This queue drains today; the rail gives it a count and a home.

**Replies.** One derived condition, not the inbox. The clock runs only while
the ball is in the coach's court (Intercom's pause semantics): a coach who
replied and is waiting on the client has zero items here regardless of unread
state. The row shows waiting duration ("Waiting 26h") because that is the
actionable fact.

**Programming.** The `needs_plan` flag today is the lapsed form — it fills
only after the coach has already failed the client. Everfit's "Need
Programming" is a lookahead ("last assigned workout <3 days away") and that is
the right definition: warn while there is time to act. Definition: no in-force
plan (training and nutrition both absent), OR an in-force plan whose last
scheduled day is ≤3 days out with no successor. Row chips show per-discipline
state ("Training ✓ · Nutrition —") because the fix differs. The lapsed
definition never ships in the rail, not even temporarily — a queue that opens
wrong is a queue the coach learns to distrust in week one.

**Expiring.** `expiring_soon` (7-day window) exists and is correct.
Revenue-bearing and time-boxed, so it earns an accent badge. Row shows end
date and days remaining.

**New.** Time-since-added alone is informational, not actionable, so the
definition anchors on onboarding work: invites sitting >3 days (Trainerize
flags at exactly 3 days), incomplete intake, plus anyone in their first 14
days so the coach watches the period where most dropout happens (65% of
dropouts in the first two weeks, per the weight-loss cohort in the 07-25
research). Muted count — arrivals are self-evidently paced and must not shout
next to churn and revenue queues.

**Quiet** ships in phase 3 because it is the queue most likely to be defined
wrongly if rushed. Count consecutive missed scheduled sessions, never calendar
days: a client programmed 3×/week who trained Friday is not "missing" on
Sunday, and day-based silence produces a false positive on every rest day.
False positives are how a rail gets ignored (false monitor alarms run 80–99%
in the alarm-fatigue literature). Until the schedule-aware query exists, no
missed queue ships at all. `last_active_at` is explicitly not an acceptable
approximation — it blends workouts, check-ins, food logs and weight into one
timestamp and cannot tell a rest day from a lapse.

## 4. Rows

One row grammar across all queues, so the workbench reads as one instrument:

```
[avatar]  Maya Sharma        Check-in · submitted 2d ago      [Review]  [⋯]
          ── severity stripe on the row edge when time-critical ──
```

* Name first, always. The reason renders as a chip/subline after the name.
* One primary action per row — the queue's verb: Review / Reply / Assign plan /
  Renew / Nudge. Inline action from the row is the shipped pattern in CoachRx
  and TrueCoach; a queue whose rows only navigate is a list, not a workbench.
* An overflow menu carries Message and View client (and Snooze in phase 3).
* Urgency is expressed inside the queue — sort order and row copy ("ends
  tomorrow") — never by badge color. Priority is a separate axis from state
  (Intercom).
* Clicking the row navigates within the shell (check-in review, conversation,
  client detail). Back returns to the same queue at the same scroll position;
  queue selection lives in the URL.

The All clients view keeps roster ergonomics: name-anchored rows, search,
status filter (Active / Invited / Inactive), sort. Its "Needs attention" pill
dies — the rail is that pill, expanded. Reason chips still appear on roster
rows for clients who sit in a queue, so the roster answers "why is this
client flagged" without a navigation.

## 5. Layout and routes

### Desktop (≥1024px)

```
┌──────────┬─────────────┬─────────────────────────────────────┐
│ Sidebar  │ Rail 224px  │ Content (fluid)                     │
│          │             │                                     │
│ Dashboard│ TODAY       │  Queue header: name, count, sort    │
│ Clients ●│  Check-ins 4│  ┌ row ───────────────────────────┐ │
│ Exercises│  Replies  2 │  │ ◉ Maya S.  Check-in · 2d       │ │
│ Foods    │  Programming│  │            [Review]      [⋯]   │ │
│ …        │          3  │  └────────────────────────────────┘ │
│          │  Expiring 1 │                                     │
│          │  New      2 │                                     │
│          │ BROWSE      │                                     │
│          │  All clients│                                     │
│          │  Messages 5 │                                     │
└──────────┴─────────────┴─────────────────────────────────────┘
```

* The rail renders between the app sidebar and the content pane and persists
  across queue/view switches and drill-ins that stay in the workspace
  (conversation open, check-in review). Client detail is full-width; the rail
  yields.
* Rail anatomy: 32px rows, 13px labels, counts right-aligned in tabular-nums.
  Group labels 11px uppercase muted. Active item: `accent` text on
  accent-tinted background; hover `surface` tint (HeroUI v3 tokens only —
  `accent`/`surface`/`muted`/`border`; the v2 names are dead). A queue at zero
  shows its label with no count, never a "0".

### Routes

| URL | Renders |
|---|---|
| `/clients` | Workbench. Default view: first non-empty Today queue; the caught-up pane when all are drained |
| `/clients?view=check-ins` … `?view=new` | That queue |
| `/clients?view=all` | All clients |
| `/messages` | Workbench with the Messages view active (kept for deep links) |
| `/messages/:id` | Conversation inside the shell, Messages item active |
| `/clients/:id` + sub-routes | Client detail, unchanged, full-width |

No route renames; the shell wraps the `/clients` and `/messages` families.

### Mobile (<1024px)

* The bottom nav keeps its Messages tab. Thumb-reachable chat is the whole
  game on a phone; the desktop merge and the mobile split coexist because both
  are entry points to the same surfaces.
* The Clients tab opens the workbench with the rail collapsed to a
  horizontally scrollable chip row under the header (chips = rail items with
  counts). Same URLs, same queues.

## 6. Counts and badges

One endpoint returns every count in one call (§8 B1), cached under one query
key, invalidated by the mutations that can change it and by the existing
`inbox` websocket event.

* Counts are totals (work remaining) everywhere except the Messages view,
  which keeps unread semantics because it is an awareness surface.
* Accent counts: Check-ins, Replies, Programming, Expiring (and Quiet, phase 3).
  Muted count: New. No count: All clients.
* The app sidebar's Clients item shows a dot when any accent queue is non-zero
  (Linear's count-or-dot compromise; a number summed across five queues is a
  meaningless workload figure). The removed Messages sidebar item's unread
  count moves onto the rail's Messages item; mobile keeps it on the bottom-nav
  tab.
* No red/urgent badge variants anywhere. Badging every lane at once is the
  alarm-fatigue failure mode.

## 7. Empty states

Two per queue, always. "No items" alone reads as a bug in both cases
(Atlassian/Polaris; Polaris adds: never make the user feel guilty).

| Queue | Drained | Never populated |
|---|---|---|
| Check-ins | "All reviewed. Nothing waiting on you." | "Client check-ins land here when they're submitted. Set up a check-in form to get started." |
| Replies | "Inbox clear — every client has heard back from you." | "When a client messages you and you haven't replied yet, they show up here." |
| Programming | "Everyone's programmed. Next plan ends in {n} days." | "Clients appear here when their plan is about to run out — before it does." |
| Expiring | "No renewals due in the next 7 days." | "Clients appear here a week before their subscription ends." |
| New | "No one in onboarding right now." | "New and invited clients spend their first two weeks here." |

When every Today queue is drained, `/clients` shows a full-pane caught-up
state: "You're caught up. {active} clients, all on track." with one link to
All clients. This moment is the product's payoff; it must feel earned.

## 8. Backend changes

All endpoints follow the OpenApiSpex flow (schema + controller + `just
gen-api`; the dev server needs a full restart after spec edits).

**B1 — Workbench counts (phase 1).** `GET /v1/coach/workbench` →
`{check_ins, replies, programming, expiring, new_clients}` (later `quiet`).
One batched round-trip, tenancy-scoped like everything else. Feeds the rail,
the mobile chips, and the sidebar dot.

**B2 — Per-queue client lists (phase 1).** Add a `filter` enum
(`programming | expiring | new`) to `GET /v1/coach/clients`, reusing the
`attention_facts` subqueries so each queue is independently pageable and
server-sorted. Every returned client row carries its `reasons` array. The
all-or-nothing `/v1/coach/clients/attention` endpoint is deleted once the
frontend stops calling it.

**B3 — Programming lookahead (phase 1).** `needs_programming` replaces
`needs_plan` in queue semantics: no in-force plan, OR in-force plan whose
final scheduled day is ≤3 days out with no successor scheduled. The
per-discipline `active_for_clients` subqueries exist; this un-ANDs them and
adds the end-date horizon. Expose per-discipline booleans for the row chips.
Keep `needs_plan` on the client payload until the frontend fully migrates,
then delete it.

**B4 — Replies derivation (phase 2).** Persist `last_message_role`
(`:coach | :client`) on `Conversation`, denormalized next to
`last_message_at`; backfill migration derives it from the newest message.
`waiting=true` filter on `GET /v1/coach/conversations` plus the count in B1.
Cheap, race-safe, no per-request message scans.

**B5 — Quiet (phase 3).** Schedule-aware: for each active client with an
in-force training plan, count consecutive past scheduled session dates with no
completed session; threshold ≥2. Include clients whose latest check-in
assignment lapsed to `:missed` (that status already sets automatically). This
gets its own short spec against the plan-schedule model before build.

**B6 — Snooze (phase 3).** `client_queue_snoozes` (client_id, queue,
snoozed_until). Snoozed items leave the queue and its count until expiry, then
reappear automatically. Snooze is the pressure valve every serious triage
product ships; without it, "on holiday" means either ignoring the queue or
lying to it.

## 9. Frontend changes

Built as a workbench module, not as a wrapper around the old screens. The old
listing and the dashboard queue are deleted, not preserved under new chrome.

| Area | Change |
|---|---|
| New `workbench/` module | The whole clients workspace: rail, shell, queue screens, All-clients view, caught-up pane. Row list built on `BrowseListBox` + `LIST_ITEM_CLASS`; date copy from `dashboard/lib/date-format.ts` |
| `clients/list-clients.tsx` | Deleted. The All-clients view is written fresh inside `workbench/` (roster rows + reason chips, §4); the old screen's filter-pill system, attention endpoint wiring, and page shell do not carry over |
| `dashboard/components/priority-queue.tsx` | Deleted in phase 1. The dashboard shows count cards (one per accent queue, deep-linking to `/clients?view=…`) in its place; its row-verb and tone/stripe vocabulary moves into the workbench rows |
| `@components/app-shell.tsx` | Messages leaves `PRIMARY` (phase 2); Clients gets the dot; `BOTTOM_NAV` unchanged |
| `router.tsx`, `@config/routes.ts` | Shell wraps the `/clients` + `/messages` families; `?view=` param; no renames |
| `messages/` | Inbox and conversation screens render inside the shell; internals untouched |
| `api/` | `workbenchKeys` in `keys.ts`; counts hook; `filter` on clients hooks; `waiting` on conversations hooks; invalidations from review / plan-assign / renew / message mutations |

## 10. Phasing

**Phase 1 — the rail replaces the listing.** B1 + B2 + B3. Workbench shell,
rail, queues Check-ins / Programming / Expiring / New with honest definitions,
All clients view, caught-up pane, both empty states each, mobile chips,
dashboard count cards replacing the priority queue. Messages stays in the
desktop sidebar for this phase. Independently shippable.

**Phase 2 — the merge.** B4. Replies queue, Messages leaves the desktop
sidebar and joins the rail. The workbench is now the coach's whole morning.

**Phase 3 — the hard signal and the pressure valve.** B5 + B6. Quiet queue
(after its own spec), snooze on Quiet/Expiring, and optionally keyboard triage
(`j`/`k` move, `enter` open, one key per primary verb — the Superhuman/Linear
mechanic).

## 11. Decisions (formerly §12 open decisions, resolved)

1. **Default landing for `/clients`: first non-empty Today queue.** The
   listing is being replaced because it is boring; landing on a roster would
   re-instate it. The rail asserts itself; All clients is one click away; the
   caught-up pane covers the drained case. Cheap to flip if it grates.
2. **Windows: 14-day New window, 3-day invite threshold, 3-day programming
   horizon, 7-day expiry.** Constants in one backend module, named and
   tunable. Trainerize's 3-day setup flag and Everfit's 3-day lookahead are
   the anchors; usage tunes the rest.
3. **Naming: nouns** (Check-ins / Replies / Programming / Expiring / New).
   Nouns scan as places; the verbs live on the row buttons where they do work.
4. **Dashboard: the priority queue dies in phase 1.** Two triage surfaces at
   ~80% overlap is the duplication the 07-25 research warned about. The
   dashboard keeps summary cards that deep-link into queues.
5. **Mobile bottom nav keeps Messages.** Revisit only if usage shows the chip
   row winning on mobile.

## 12. Rules held from the research

1. A queue is a saved query. The coach never files anyone anywhere.
2. Totals, not unreads. Only a total reaches zero by working.
3. Badge only where the number changes the coach's next action.
4. Schedule-aware, never calendar-aware, for "missed" — or don't ship it.
5. Lookahead, not lapsed, for programming.
6. Exits are automatic when computed, domain actions when manual; no fake "done".
7. Items re-enter when the condition recurs.
8. Streams never sit in the rail next to queues.
9. Two empty states per queue.
10. Conversations are never queue items; the Replies condition is.
11. The client's name is the row anchor; the reason rides beside it.
12. The roster survives as a view. Lookup is a different job from triage.
