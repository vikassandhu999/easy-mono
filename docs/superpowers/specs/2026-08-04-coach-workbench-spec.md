# Coach workbench: segmented client rail + merged messaging

**Date:** 2026-08-04
**Status:** Proposed — awaiting user sign-off on the open decisions in §12.
**Inputs:**
- [`docs/research/coach-workflow-inbox-research.md`](../../research/coach-workflow-inbox-research.md) — mechanics research across 9 fitness platforms + Front/Intercom/Superhuman/Linear/Gmail/GitHub, 139 cited sources (2026-08-04)
- [`docs/research/2026-07-25-client-triage-messaging-research.md`](../../research/2026-07-25-client-triage-messaging-research.md) — market/evidence research (2026-07-25)
- Codebase audit of coachapp-v2 + backend, 2026-08-04 (summarized in §8/§9)

---

## 1. Verdict up front

The side-rail idea is right, and it is not a bet. The segment taxonomy you sketched
(Recently Added / Missed / Expiring / Needs Programming / Check-in Submissions) is the
industry consensus: "Needs Programming" is Everfit's literal default segment name,
"Missed for 2 days" is CoachRx's "Missed 2+ Workouts in a Row", and every surveyed
product ships at least three of the five. The novelty is not the taxonomy — it is that
none of the fitness products present it as a **drainable work rail**. They bury it in
tags (Trainerize), a dashboard feed (TrueCoach), or parallel surfaces (Everfit). A rail
of queues the coach can work to zero, one lane at a time, is the Superhuman/Linear
mechanic applied to coaching, and nobody in the market has shipped it cleanly. That is
the creative opening.

On merging Messages: the evidence is one-sided against **dissolving** conversations into
client segments — all nine fitness products keep a messaging destination, Linear
deliberately runs Triage and Inbox as two surfaces, and Front documents that
conversations never decompose into tasks and never stay "done" (archives auto-reopen).
But your instinct to merge is still right at the **navigation** level. The spec resolves
it this way:

* The top-level Messages tab disappears on desktop. Messaging moves into the workbench rail.
* Conversations are NOT scattered into the client queues. Two things appear in the rail
  instead: a **"Waiting on you"** queue (only conversations where the client sent the
  last message — drainable, has a true zero) and a **"Messages"** view (the full inbox,
  unchanged semantics).

So: one surface, as you wanted — but conversations keep their own mechanics, as the
evidence demands. TrueCoach's inbox (one unread queue spanning messages + workout
results + comments) and Intercom's "waiting for reply" filter are the shipped precedents
for exactly this shape.

## 2. Concept model: queues vs views

Everything in the rail is one of two shapes, and the shape is visually labeled by
grouping. Mixing them is the #1 pitfall the research found (Hevy's activity stream looks
like a queue, cannot be drained, and teaches you to ignore it).

**Queues** hold clients (or submissions, or conversations) that need an action from the
coach. Every queue has: a definition (a saved query, never a manual filing step), a sort
order, a **total count** (not unread — only a total can be driven to zero by working;
Superhuman reversed unread badges deliberately for this reason), an exit (how an item
leaves), and two empty states. Items leave queues **automatically when the condition
clears** — the coach never "marks done" a computed condition. Where a manual exit exists
(reviewing a check-in) it is the domain action itself, not a dismiss button.

**Views** are browsable lists with no completion semantics: All clients, Messages. No
count badges that demand draining. They exist so the workbench fully replaces the two
screens it absorbs.

One rule from GitHub worth building in from day one: every queue row carries a
machine-readable **reason** (`check_in_due`, `plan_expiring`, …) delivered by the API,
so segments are derived from reasons rather than each being a bespoke client-side
recomputation, and one client can sit in several queues at once without the frontend
guessing why.

## 3. The rail

Final taxonomy. Two groups, seven items. Order within "Today" is the coach's natural
morning sequence: review what came in, reply to who's waiting, fix what's about to lapse.

| # | Rail item | Group | Kind | Definition (summary) | Sort | Exit | Badge |
|---|---|---|---|---|---|---|---|
| 1 | **Check-ins** | Today | Queue | Check-in submissions not yet reviewed | Oldest first | Coach reviews (persists `reviewed_at`) | Count |
| 2 | **Replies** | Today | Queue | Conversations where the client sent the last message | Longest-waiting first | Coach replies | Count |
| 3 | **Programming** | Today | Queue | Active client with no in-force plan, or in-force plan ending ≤3 days with nothing scheduled after | No-plan first, then soonest plan end | Plan assigned/extended | Count |
| 4 | **Expiring** | Today | Queue | Active client whose subscription ends ≤7 days | Soonest end first | Renewed, or subscription lapses (client moves to Inactive) | Count |
| 5 | **New clients** | Today | Queue | Added ≤14 days ago, or invite pending >3 days, or intake incomplete | Newest first | Stage flips to coaching, or 14 days elapse with intake done | Muted count (no accent) |
| 6 | **All clients** | Browse | View | The whole roster with today's filters/search/sort | — | — | None |
| 7 | **Messages** | Browse | View | The full conversation inbox, unchanged | Recent first | — | Unread count (existing semantics) |
| 8 | **Quiet** *(phase 3)* | Today | Queue | 2+ consecutive **scheduled** sessions missed, or check-in assignment lapsed to `missed` | Most-missed first | Client completes a session / next check-in | Count |

"Quiet" ships in phase 3, not phase 1, because it is the segment most likely to be
defined wrongly if rushed. The research is unambiguous: count **consecutive missed
scheduled sessions**, never calendar days — a client programmed 3×/week who trained
Friday is not "missing" on Sunday, and day-based silence produces a false positive on
every rest day. False positives are how a queue gets ignored (the alarm-fatigue
literature puts false monitor alarms at 80–99%). Until the schedule-aware query exists,
we do not ship a "missed" queue at all, rather than ship a wrong one.

### Why these definitions, per queue

**Check-ins.** Already a first-class backend concept: `GET /v1/coach/check-ins/review-queue`
lists unreviewed submissions oldest-first, and `FormSubmission.reviewed_at` persists the
exit. This queue drains today. The rail gives it a count and a home; nothing else changes.

**Replies.** Not the inbox — one derived condition with a bounded count and a clear exit.
Intercom's insight applies: the clock runs only while the ball is in the coach's court.
A coach who replied and is waiting on the client has zero items here, whatever the
unread state. Row shows waiting duration ("Waiting 26h") because that duration is the
actionable fact.

**Programming.** The current `needs_plan` flag is the *lapsed* form ("has no active
plan") — it fills only after the coach has already failed the client. Everfit's
definition is a *lookahead* ("last assigned workout <3 days away") and that is the right
one: the queue warns while there is still time to act. The definition becomes:
no in-force plan (training AND nutrition both absent — today's flag), OR an in-force
plan whose last scheduled day is ≤3 days away with no successor plan scheduled. Row
chips show per-discipline state ("Training ✓ · Nutrition —") since the fix differs.

**Expiring.** Already implemented (`expiring_soon`, 7-day window). Revenue-bearing and
time-boxed, so it earns a badge. Row shows the end date and days remaining.

**New clients.** Your "Recently Added" — but time-since-added alone is informational,
not actionable, so the definition anchors on onboarding work: pending invites that have
sat >3 days (Trainerize flags at exactly 3 days), incomplete intake, and anyone added in
the last 14 days so the coach can watch their first two weeks. Muted count, no accent
badge: arrivals are self-evidently paced and this queue must not shout alongside the
churn/revenue queues.

## 4. Layout

### Desktop (≥1024px)

```
┌──────────┬────────────┬──────────────────────────────────────┐
│ Sidebar  │ Rail       │ Content                              │
│ 240px    │ 224px      │ fluid                                │
│          │            │                                      │
│ Dashboard│ TODAY      │  [Queue header: name, count, sort]   │
│ Clients ●│  Check-ins 4│  ┌─ row ──────────────────────────┐ │
│ ── builders ──         │  │ ◉ Maya S.  Check-in · 2d ago    │ │
│ Exercises│  Replies  2 │  │            [Review]     [⋯]     │ │
│ …        │  Programming│  └─────────────────────────────────┘ │
│          │        3    │  …                                   │
│          │  Expiring 1 │                                      │
│          │  New      2 │                                      │
│          │            │                                      │
│          │ BROWSE     │                                      │
│          │  All clients│                                     │
│          │  Messages 5│                                      │
└──────────┴────────────┴──────────────────────────────────────┘
```

* The rail is part of the Clients workspace, rendered between the app sidebar and the
  content pane. It is persistent across queue/view switches and across drill-ins that
  stay inside the workspace (conversation open, check-in review).
* Rail item anatomy: 32px row height, 13px label, count right-aligned in tabular-nums.
  Group labels ("TODAY", "BROWSE") 11px uppercase muted. Active item: `accent` text on
  accent-tinted background (HeroUI v3 tokens: `accent`, `surface`, `muted`, `border` —
  the v2 tokens are dead). Hover: `surface` tint. Queues at zero show the label with no
  count, not a "0".
* Content pane reuses the existing `Page` primitives and `BrowseListBox` row list
  (skeleton/empty/error states come free). Queue rows reuse the tone/stripe/chip system
  already built in `priority-queue.tsx`.
* Clicking a rail item swaps the content pane. Clicking a row navigates within the
  workspace: check-in rows open the review screen, reply rows open the conversation,
  client rows open client detail. **Back returns to the same queue at the same scroll
  position** — queue selection lives in the URL.
* Each queue row carries one primary action button (the verb: Review / Reply / Assign
  plan / Renew / Nudge) and an overflow menu (Message, View client — and Snooze, phase 3).
  Inline action from the row, not forced navigation, is the shipped pattern in CoachRx
  and TrueCoach and the research's recommendation; the primary verb per row already
  exists in `priority-queue.tsx` (`Renew`/`Assign`/`Review`/`Nudge`).

### Routes

| URL | Renders |
|---|---|
| `/clients` | Workbench, defaulting to the first non-empty Today queue; All clients if everything is drained |
| `/clients?view=check-ins` … `?view=new` | That queue |
| `/clients?view=all` | All clients (current list, filters intact) |
| `/messages` | Workbench with Messages view active (route kept for deep links + client expectations) |
| `/messages/:id` | Conversation, rail persistent, Messages item active |
| `/clients/:id` and sub-routes | Client detail, unchanged (full-width; rail not shown) |

Existing route constants stay; the workbench shell wraps the `/clients` and `/messages`
route families. No redirects break.

### Mobile (<1024px)

* Bottom nav keeps a **Messages** tab. On a phone, thumb-reachable chat is the whole
  game; merging it away on mobile would be a regression. The desktop merge and the
  mobile split can coexist because both are just entry points to the same surfaces.
* The Clients tab opens the workbench with the rail collapsed into a horizontally
  scrollable chip row under the header (chips = rail items with counts). Same URLs,
  same queues.

## 5. Counts and badge policy

One endpoint returns every count in one call (§8), cached under a single query key,
invalidated by the mutations that can change it and by the existing `inbox` websocket
event. Counts are **totals** (work remaining), not unreads — except the Messages view,
which keeps unread semantics because it is an awareness surface, not a work queue.

Badge policy, per the alarm-fatigue findings (badge only where the number changes what
the coach does next):

* Accent-colored counts: Check-ins, Replies, Programming, Expiring (and Quiet, phase 3).
* Muted count, no accent: New clients.
* No counts: All clients, and no per-queue red/urgent variants. Urgency is expressed
  inside the queue by sort order and row copy ("ends tomorrow"), not by badge color —
  priority is a separate axis from state (Intercom).
* App sidebar: the Clients nav item shows a **dot** when any accent queue is non-zero
  (count-or-dot is Linear's shipped compromise; a summed number across five queues is a
  meaningless workload figure). The removed Messages nav item's unread count moves to
  the rail's Messages item. Mobile bottom nav keeps the unread count on Messages.

## 6. Empty states

Every queue ships two distinct empty states — a drained state (celebration) and a
never-populated state (explanation). "No items" alone reads as a bug (Atlassian/Polaris
guidance; Polaris adds: never make the user feel guilty).

| Queue | Drained | Never-populated |
|---|---|---|
| Check-ins | "All reviewed. Nothing waiting on you." | "Client check-ins land here when they're submitted. Set up a check-in form to get started." |
| Replies | "Inbox clear — every client has heard back from you." | "When a client messages you and you haven't replied yet, they show up here." |
| Programming | "Everyone's programmed. Next plan ends in {n} days." | "Clients appear here when their plan is about to run out — before it does." |
| Expiring | "No renewals due in the next 7 days." | "Clients appear here a week before their subscription ends." |
| New clients | "No one in onboarding right now." | "New and invited clients spend their first two weeks here." |

When **all** Today queues are drained, the default `/clients` view shows a full-pane
caught-up state: "You're caught up. {active} clients, all on track." with a single link
to All clients. This moment is the product's payoff — it must feel earned, not empty.

## 7. What "merged messaging" means precisely

* Desktop sidebar: Messages item removed; Dashboard + Clients + builders remain.
* The Replies queue is the actionable slice of messaging and sits in Today.
* The Messages view is the whole inbox and sits in Browse. Same component, same
  websocket wiring, same conversation screen — relocated, not rebuilt.
* Conversations never appear as rows in client queues, and queue rows never claim
  conversation semantics (no "done" on a chat). The two mechanics stay separate inside
  one surface. If we later want "one place to catch everything client-originated", the
  precedented move is TrueCoach's: **widen the inbox** (messages + workout comments +
  check-in submissions as one unread stream) — not scatter the inbox into the roster.
  Deliberately out of scope here.

## 8. Backend changes

All endpoints follow the existing OpenApiSpex flow (schema + controller + regenerated
FE types via `just gen-api`; dev server needs a full restart after spec edits).

**B1 — Workbench counts (phase 1).** `GET /v1/coach/workbench` →
`{check_ins, replies, programming, expiring, new_clients}` (later `quiet`). One
DB round-trip batch, scoped by `for_visible_clients`/tenancy like everything else.
This also gives the mobile chip row and the sidebar dot their data.

**B2 — Per-flag client filters (phase 1).** The `/v1/coach/clients/attention` endpoint
is an all-or-nothing OR of three flags. Add a `filter` enum param to `GET /v1/coach/clients`
(`needs_programming | expiring_soon | new_client`) reusing the existing
`attention_facts` subqueries, so each queue is independently pageable, searchable, and
sorted server-side. Each returned row includes its `reasons` array.

**B3 — Replies derivation (phase 2).** Persist `last_message_role` (`:coach | :client`)
on `Conversation` (denormalized next to the existing `last_message_at`; backfill
migration derives it from the newest message). `waiting=true` filter on
`GET /v1/coach/conversations` + the count in B1. Cheap, race-safe, no per-request
message scans.

**B4 — Programming lookahead (phase 2).** New flag `needs_programming` superseding
`needs_plan` in the queue definition (keep `needs_plan` on the client payload until the
FE fully migrates): no in-force plan, OR in-force plan whose final scheduled day is
≤3 days out with no plan scheduled after it. The per-discipline `active_for_clients`
subqueries already exist; this un-ANDs them and adds the end-date horizon. Expose
per-discipline booleans so the row can show "Training ✓ · Nutrition —".

**B5 — Quiet (phase 3).** Schedule-aware: for each active client with an in-force
training plan, count consecutive scheduled session dates in the past with no completed
`training_session`; threshold ≥2. Include clients whose latest check-in assignment
lapsed to `:missed` (that status already exists and is set automatically). This needs
its own small design pass against the plan-schedule model — do not approximate it with
`last_active_at`, which blends workouts, check-ins, food logs and weight into one
timestamp and cannot distinguish a rest day from a lapse.

**B6 — Snooze (phase 3).** `client_queue_snoozes` (client_id, queue, snoozed_until).
Snoozed items are excluded from the queue and its count until expiry, then reappear
automatically. Snooze is the pressure valve every serious triage product ships (only
CoachRx has it in fitness); without it, the coach's only options for "on holiday" are
ignoring the queue or lying to it.

## 9. Frontend changes

| Area | Change |
|---|---|
| `@components/app-shell.tsx` | Remove Messages from `PRIMARY`; Clients nav gets dot-when-nonzero; `BOTTOM_NAV` unchanged (Messages stays) |
| New `workbench/` module | Rail component (grouped items, counts, active state), workbench shell wrapping clients+messages route families, queue screens |
| `router.tsx`, `@config/routes.ts` | Workbench shell around `/clients` + `/messages` families; `?view=` param; no route renames |
| `clients/list-clients.tsx` | Becomes the All-clients view inside the workbench; drops its own "Needs attention" pill (the rail replaces it); filters/search/sort otherwise intact |
| `messages/messages-inbox.tsx`, `conversation-page.tsx` | Rendered inside the workbench shell; internals untouched |
| `dashboard/components/priority-queue.tsx` | Rows keep inline verbs but "View all" deep-links into the matching queue (`/clients?view=…`); consider slimming the dashboard to counts-only cards once the rail proves out (phase 3 decision) |
| `api/` | `workbenchKeys` in `keys.ts`; counts hook; `filter` param on clients hooks; `waiting` param on conversations hooks; invalidations from review/plan-assign/renew/message mutations |
| Reuse | `BrowseListBox` + `LIST_ITEM_CLASS` for rows; `Tone`/stripe/chip system from `priority-queue.tsx`; `daysSince`/`formatRelativeTime` from `dashboard/lib/date-format.ts` |

## 10. Phasing

**Phase 1 — the rail, with today's data.** B1 + B2, workbench shell, rail, queues 1/3/4/5
(Programming uses the current lapsed `needs_plan` definition temporarily), All clients
and Messages views, both empty states each, mobile chip row. Messages stays in the
desktop sidebar during this phase. Ships standalone; nothing depends on later phases.

**Phase 2 — the merge + honest definitions.** B3 + B4: Replies queue, Messages leaves
the desktop sidebar, Programming becomes lookahead. This is the phase where the surface
starts replacing the coach's mental checklist rather than mirroring the old screens.

**Phase 3 — the hard signal + polish.** B5 + B6: Quiet queue, snooze on Quiet/Expiring,
dashboard slimming decision, and (if wanted) keyboard triage (`j/k` move, `enter` open,
one-key primary action — the Superhuman/Linear mechanic).

Each phase is independently shippable and independently valuable; end users can get
phase 1 without waiting on the rest.

## 11. Rules to hold onto (from the research, in one place)

1. A segment is a saved query. The coach never files anyone anywhere.
2. Totals, not unreads, on queues. Only a total reaches zero by working.
3. Badge only the queues where the number changes the coach's next action.
4. Schedule-aware, never calendar-aware, for "missed" — or don't ship it.
5. Lookahead, not lapsed, for programming — warn before the client is affected.
6. Exits are automatic when computed, domain actions when manual; never a fake "done".
7. Items re-enter automatically when the condition recurs (Front's auto-reopen).
8. Streams (activity feeds) never sit next to queues in the rail.
9. Two empty states per queue, always.
10. Conversations are never queue items; the Replies *condition* is.

## 12. Open decisions

1. **Default landing view for `/clients`** — first non-empty queue (spec's choice: the
   rail asserts itself) vs always All clients (calmer, one less surprise). Cheap to flip.
2. **"New clients" 14-day window and 3-day invite threshold** — both are guesses;
   Trainerize uses 3 days for un-set-up accounts. Tune after use.
3. **Rail item naming** — spec uses terse labels (Check-ins / Replies / Programming /
   Expiring / New). Alternative is verb-first ("Review", "Reply", "Program", "Renew",
   "Welcome"), which reads as a to-do list but is less scannable as nouns. Copy-level
   decision, zero structural impact.
4. **Dashboard's fate** — the priority queue and the rail overlap ~80% after phase 2.
   Options: keep both (dashboard as summary, rail as workspace) or make the dashboard
   counts-only. Defer to phase 3 with real usage.
5. **Whether phase 2 also removes Messages from the mobile bottom nav** — spec says no;
   revisit only if mobile analytics say the chip row wins.
