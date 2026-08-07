# "Add to client": the picker becomes a placement decision

**Date:** 2026-08-07
**Status:** Proposed.
**Scope:** The modal opened by the **Add to client** button in the training and
nutrition plan builders (`@components/plan-add-to-client.tsx`, template plans
only). The reverse direction — picking a plan *from a client's tab*
(`plan-assign-control.tsx`) — is a different surface and out of scope here.
**Inputs:**
- [`2026-08-06-coach-workbench-spec.md`](2026-08-06-coach-workbench-spec.md) §2 (totals), §3 (queue vocabulary), §9 (no second vocabulary)
- Current implementation: `@components/plan-add-to-client.tsx`, `@components/client-picker.tsx`, `Easy.TrainingPlans.assign_plan_to_client/4`, `Easy.NutritionPlans.assign_plan_to_client/4`

---

## 1. The problem with today's modal

The modal is an identity lookup: an empty pane saying "Type to search
clients", rows of name + email behind a generic icon, and a tap that assigns
instantly. Three things are wrong with that:

1. **It answers the wrong question.** The coach isn't asking "does Maya
   exist" — they're asking **"who should get this plan, and does it collide
   with what they already have?"** Assigning is placing programming coverage
   on a client. The modal shows no coverage, so the coach decides blind.
2. **It starts empty.** A roster of ~50 is a browsable set; requiring a
   keystroke before showing anyone is a search box cosplaying as a picker.
3. **It invents nothing to say.** Every client list row already carries
   `needs_programming` and `covered_until` — the workbench vocabulary. The
   modal ignoring them is §9's two-vocabularies trap: the Programming queue
   says "No plan in force" while the assign surface says only "maya@x.com".

## 2. What the modal shows

Shell, title, and search stay as they are (canonical `PickerModal` /
`KeyboardSheet`, title `Add "{plan}" to client`, autofocused search field).
The body changes from "empty until you type" to a grouped default list:

```
┌─ Add "Hypertrophy 8wk" to client ────────────┐
│ [🔍 Search clients…                        ] │
│                                              │
│ NEEDS PROGRAMMING                            │
│  MS  Maya Santos          No plan in force   │
│  JK  Jon Kim              Coverage ends 9 Aug│
│                                              │
│ EVERYONE ELSE                                │
│  AL  Ana López [Invited]  No plan in force   │
│  TW  Tom Wells            Covered until 2 Sep│
│  RD  Rio Devi             On an open-ended…  │
└──────────────────────────────────────────────┘
```

### 2.1 Groups

| Group | Who | Order | Why first |
|---|---|---|---|
| **Needs programming** | `needs_programming = true` | Soonest coverage end first, no-coverage first of all (the Programming queue's order) | Assigning a plan is the Programming queue's exit verb — the people the plan is *for* are one tap away |
| **Everyone else** | The rest | Alphabetical | Lookup, not triage |

Group labels use the eyebrow style (`type-eyebrow uppercase text-muted`).
While a search query is active the groups collapse into one flat result list;
rows keep the same anatomy.

### 2.2 Row anatomy

| Slot | Content |
|---|---|
| Leading | Initials avatar (the app-wide treatment), not the generic `Users` icon |
| Primary | Full name; `[Invited]` chip when `status = pending` |
| Sub-line | **Email.** Identity, not decoration: names duplicate (the seed DB alone has two Taylor Jacksons), and a picker whose rows can't be told apart assigns plans to the wrong person. *(Amended 2026-08-07 — v1 put the coverage fact here and the duplicate-name failure showed up in the first live audit.)* |
| Trailing | The coverage fact, workbench vocabulary (table below); never truncated |

Coverage sub-line, derived from fields already on the row:

| Row state | Copy | Tone |
|---|---|---|
| `needs_programming`, no `covered_until` | "No plan in force" | warning (same as queue) |
| `needs_programming`, `covered_until` set | "Coverage ends {d MMM}" | warning |
| covered, `covered_until` set | "Covered until {d MMM}" | muted |
| covered, `covered_until` null | "On an open-ended plan" | muted |

Known imprecision, accepted: `covered_until` is cross-discipline ("last day
*either* discipline is covered"). The honest per-discipline fact needs a
backend field (§5). The cross-discipline line is still strictly more useful
than an email address.

### 2.3 Who is listed

- **Active** and **invited** clients. Assignment to an invited client is
  legal and useful (backend auto-advances stage to coaching on first
  assignment) — the chip is information, not a blocker.
- **Inactive clients are excluded.** Assigning programming to someone who
  can't log in is a mistake the picker should make impossible, not confirm.
- Default list is the first page (limit 30). No load-more inside a picker —
  search is the tool for the tail.

## 3. What a tap does

- **Client needs programming (the common case): one tap assigns.** No
  confirmation — frictionless in exactly the case the modal exists for.
  Modal closes immediately; failure surfaces as the existing error toast.
- **Client already covered: one `AlertDialog` confirm.**
  *"{Name} is covered until {date} · Add "{plan}" as well? It will run as a
  second active plan."* Buttons: **Add anyway** / Cancel. The dialog exists
  because two active plans is a legitimate but unusual state — the coach
  should choose it, never stumble into it.
- **The assignment now carries `start_date = today`.** The backend has
  accepted `start_date`/`end_date` since the beginning; the frontend sends
  neither, so every assigned copy is dateless until someone edits it. Default
  the start to today (end stays open — open-ended coverage is a deliberate
  model, spec 2026-08-06). No date controls in the modal: dates beyond
  "starts now" are builder work on the assigned copy.
- **Success toast gains an action:** `"{plan}" assigned to {name}` +
  **Open their copy** (navigates to the assigned plan's builder). Setting an
  end date or tweaking the copy is the natural next step ~half the time;
  the toast offers the hop without forcing it.

## 4. States

| State | Treatment |
|---|---|
| Loading default list | 3 skeleton rows (avatar + two lines) — never a spinner-only pane |
| List/search error | "Couldn't load clients." + Retry (existing `ErrorState`) |
| No search matches | "No clients match your search." |
| Roster empty | "Invite your first client to get started." + Invite button |
| Assign in flight | Modal already closed; trigger button keeps its pending state (constant width) |

## 5. Backend items

| Item | Needed for | Size |
|---|---|---|
| None — ship with cross-discipline `covered_until` | §2.2 as specced | — |
| *(Later, optional)* per-discipline coverage on list rows (`training_covered_until`, `nutrition_covered_until`) | Sub-line says "Training ends 9 Aug" instead of the blended fact; also sharpens the client-tab panels | Small — `plan_coverage` already computes per schema; expose both instead of the max |

## 6. Explicitly out of scope

- Multi-select / bulk assign. One plan, one client, per gesture.
- Date or schedule editing inside the modal (start = today is the only date
  opinion the modal holds).
- Replace/end-current-plan semantics — ending a plan lives on the client's
  plan panel; the modal only ever *adds*.
- The client-tab assign surface (reverse direction) — separate spec if it
  wants the same treatment.

## 7. Decisions taken (veto here)

1. Default list shown immediately, grouped **Needs programming / Everyone
   else** — the picker is triage-aware, not alphabet-first.
2. Inactive clients excluded outright.
3. One-tap assign when the client needs programming; confirm dialog only
   when adding on top of live coverage.
4. `start_date = today` sent by the frontend; end date stays open.
5. Success toast carries **Open their copy**.
6. Cross-discipline coverage copy accepted for v1; per-discipline fields are
   a later backend nicety.
