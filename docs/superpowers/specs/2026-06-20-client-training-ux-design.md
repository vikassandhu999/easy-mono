# Client training — UX design

## Goal

The client-side training experience: see today's workout, log it in the gym
one-handed, wrap up, and review history. Mobile-first, built for someone tired
between sets.

Backs the schema/API in
`2026-06-20-coaching-profile-training-schema-api-design.md` and is the sibling
of the coach builder spec (`2026-06-20-training-plan-builder-ux-design.md`),
reusing its keyboard-aware input rule and exercise picker.

Validated mockups are preserved in `assets/client-training/` (open in a
browser). ASCII wireframes below are the durable record.

## Reconciliation with existing code

The current `clientapp-v2` training screens are built on the **old** schema and
must be migrated:

| Old (remove) | New |
|---|---|
| `workout_elements` | `training_workout_exercises` |
| `plan_items`, `workout_type: primary/alternative` | `training_schedule_entries`, one workout per day |
| `rest_days[]` | no entry for a weekday = rest |
| `sessionStorage` skip/replace/added flags | implicit: performed sets vs `planned_snapshot` |

The new model makes session edits implicit — no client-only flags:

- **Skip** = a planned exercise with no performed sets.
- **Swap** = performed sets carrying a different `exercise_id` than planned.
- **Add** = performed sets whose `exercise_id` isn't in the snapshot.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Home role | **Lean today-launcher, training-only** | Get into the gym fast; nutrition lives in its own tab. |
| Home Start button | **In the hero card** (not sticky) | A sticky bar would stack on the bottom tab bar; the short launcher keeps the hero visible on load. |
| Active workout layout | **Continuous list** (Hevy/Strong) | See the whole session, scroll as you finish, jump anywhere, supersets adjacent. |
| Current focus | **Current exercise glows + "● Now"; current set is a big block** | Unmistakable at low energy. |
| Logging primitive | **Pre-filled set + ± steppers + one giant ✓** | Most sets = one tap; type only when reality differs. |
| Number entry | **Keypad docks above the keyboard** | Same rule as the coach weight picker; edited field stays visible. |
| Fields per set | **Driven by `tracking_type`** | 1–2 fields the type names; duration gets a live hold-timer. |
| Rest | **Auto-start from planned `rest_seconds`** | Ring countdown, Skip / +15s; next set carries last weight. |
| Exercise actions | **Labeled buttons on the current card** (no kebab) | Words + icon, zero guessing; only the current card shows them. |
| Finish | **Wrap-up: summary → soreness → note → Save**; skip/unlogged warned not blocked | Soft-intake philosophy. |
| Discard | **Confirmed, names what's lost** | Destructive. |

## Surface 1 — Home (today launcher)

```
┌──────────────────────────┐
│ Hey Ava 👋               │
│ Wednesday                │
│ ┌──────────────────────┐ │
│ │ TODAY                │ │  ← hero card
│ │ Push Day             │ │
│ │ 5 exercises · ~50 min│ │
│ │ Chest Shoulders Tris │ │
│ │ [ ▶ Start workout ]  │ │  ← Start in-card
│ └──────────────────────┘ │
│ M T W T F S S            │ │  ← week strip: dot = workout, dim = rest,
│ Push Rest Push Pull…     │ │     today highlighted
│ [ History ›        ]     │
├──────────────────────────┤
│ 🏋️Train 🍽️Nutr 📈Prog 👤│  ← bottom tab bar (one bar only)
└──────────────────────────┘
```

States:
- **Mid-session** — amber "In progress · N sets logged" banner with ▶ Resume,
  replaces the hero. Freestyle disabled until finished/discarded.
- **Rest day** — empty schedule → "🌙 Rest day", freestyle still available.
- **No plan yet** — "🏗️ Plan on the way", freestyle available.

Data: `GET /training-plans/today` (today's workout), active session check,
`GET /training-plans` (week strip). One active plan assumed (schema-enforced).

## Surface 2 — Active workout (the heart)

### Structure: continuous list
Timer + Finish in a top bar. Every exercise's set rows visible; scroll as you
progress. Done exercises shrink to green summary rows; the current one glows.

```
┌─ Push Day        ⏱12:34  Finish ─┐
│ Bench Press            3/3 ✓     │  ← done, dim
│ ╔═ Incline DB Press   ● Now ═══╗ │  ← CURRENT, glowing
│ ║ 1   30kg × 10            ✓   ║ │  ← logged set (compact)
│ ║ Set 2 of 3 · target 30×10   ║ │
│ ║ [− 30 KG +] [− 10 REPS +]   ║ │  ← ± steppers, tap value = keypad
│ ║ [    ✓  Log set         ]   ║ │  ← one giant button
│ ║ [🔄 Swap exercise] [⏭ Skip] ║ │  ← labeled actions (current only)
│ ╚══════════════════════════════╝ │
│ Cable Fly             0/3        │  ← upcoming, dim
│ [ ＋ Add exercise ]              │
└──────────────────────────────────┘
```

### Logging loop
1. Current set is pre-filled from the plan. Hit target → tap **✓**. Small
   adjustments → ± steppers. No keyboard.
2. Different number → tap the value → **keypad docks above the keyboard**, the
   set stays visible. (Same rule as the coach builder.)
3. ✓ saves the performed set → **rest timer auto-starts** from planned
   `rest_seconds` (ring countdown, Skip / +15s) → next set lights up and
   **carries the last weight forward**.

### Fields by `tracking_type`
The block shows the 1–2 fields the exercise's `tracking_type` names; everything
else identical.

```
weight_reps         [KG] [REPS]
bodyweight_reps     [REPS]
weighted_bodyweight [+KG] [REPS]
assisted_bodyweight [−KG] [REPS]
reps_only           [REPS]
duration            [▶ hold-timer → TIME]
weight_duration     [KG] [TIME]
distance_duration   [METERS] [TIME]
weight_distance     [KG] [METERS]
```

- **Duration** fields get a live **hold-timer** (▶ counts up, stop → fills the
  value) — no typing for planks/timed carries.
- **RPE-based** plans show a small "how hard? 1–10" after ✓.

### Rest timer
Docked bar above the tab bar: ring countdown, "Rest · before set N", Skip / +15s.
Starts from the just-completed set's planned rest. Optional end notification.

### Exercise actions (labeled, current card only)
- **🔄 Swap exercise** → exercise picker sheet (shared with coach) → new exercise
  + "swapped from …" note; log fresh sets.
- **⏭ Skip** → card goes dashed/struck, undoable; ignored by "all done".
- **＋ Add exercise** (list bottom) → picker → appended with "Added" chip.
- **Remove** (labeled) only on added/unplanned exercises.

### Persistence
Each ✓ writes a performed set immediately (`POST /performed-sets`); steppers/edits
`PATCH`. Session survives reload/background — state lives server-side, no
`sessionStorage` flags.

## Surface 3 — Finish vs Discard

```
┌──────────────────────────┐
│ Nice work, Ava 💪        │
│ Push Day · 48 min        │
│ [14 SETS][5 EX][4.2t VOL]│  ← summary
│ ⏭ 1 skipped · 1 set left │  ← gentle warning, not a block
│ How worked do you feel?  │
│ 😎 🙂 😮‍💨 🥵 💀          │  ← soreness 1–5 → soreness_rating
│ Note for your coach…     │  ← optional → notes
│ [   ✓ Save workout   ]   │
│   Discard workout        │  ← subtle, destructive
└──────────────────────────┘
```

- **Save** → `PATCH state: completed`, `ended_at`, `soreness_rating`, `notes`.
- **Discard** → confirm dialog naming what's lost → `PATCH state: discarded`.
- Skipped/unlogged sets warned, never blocked.
- Volume = Σ(weight × reps) over **working** sets only (warmups excluded).

## Surface 4 — History

```
LIST                          DETAIL
┌ History ─────────┐          ┌ Push Day ──────────────┐
│ JUNE             │          │ Wed·Jun18·48m·😮‍💨 Solid │
│ Wed Jun18 PushDay│          │ Sets 14 · Vol 4.2t · 5ex│
│  48m·14·4.2t  😮‍💨›│          │ Bench Press            │
│ Mon Jun16 PullDay│          │  100×8   target 100×8 ✓ │
│  52m·16·5.1t  🥵 ›│          │  102.5×8 target 100×8 ↑ │
│ Fri Jun13 LegDay │          │ Pec Deck [swapped]     │
│  61m·18·8.0t  💀 ›│          │  50×12                 │
└──────────────────┘          │ Triceps PD [added]     │
                              │ Lateral Raise [skipped] │
                              │ "shoulder tight…"       │
                              └─────────────────────────┘
```

- List: reverse-chron, grouped by month; date · workout · duration · sets ·
  volume · soreness.
- Detail: per exercise, **actual vs faint target** with ↑/↓ vs target;
  swap/added/skipped badges; soreness + note.
- Both read `GET /training-sessions`; detail reconstructs plan-vs-actual from
  `planned_snapshot` + `performed_sets`. The coach sees the identical detail via
  the read-only coach endpoint.

## Cross-cutting

- **Keyboard-aware rule** (shared with coach): any numeric entry uses a sheet
  docked above the keyboard; the edited field never hides.
- **Shared components**: exercise picker sheet, set field layout by
  `tracking_type`.
- **One active plan / one active session** — schema-enforced; UI assumes both.

## API mapping

| Action | Endpoint |
|---|---|
| Today's workout | `GET /v1/client/training-plans/today?date=` |
| Week strip / plan | `GET /v1/client/training-plans` |
| Start session | `POST /v1/client/training-sessions` (captures `planned_snapshot`) |
| Log / edit / delete set | `POST` / `PATCH` / `DELETE /v1/client/.../performed-sets` |
| Swap / add exercise | reuse `GET /v1/client/training-exercises` (picker) |
| Finish / discard | `PATCH /v1/client/training-sessions/:id` (state + ended_at + soreness + notes) |
| History list / detail | `GET /v1/client/training-sessions?from=&to=`, `/:id` |

## Visual references

`assets/client-training/`:

- `01-home.html` — home with tab bar
- `02-active-structure.html` — continuous list vs accordion vs focus
- `03-set-logging.html` — the logging loop (steppers, keypad, rest timer)
- `04-set-measurables.html` — set block across tracking types
- `05-exercise-actions.html` — labeled skip/swap/add
- `06-finish-discard.html` — wrap-up and discard
- `07-history.html` — list and session detail

## Out of scope

- Nutrition on the training home (separate tab)
- PR/progression surfacing (data supports it; not in v1 — see schema spec)
- Offline-first / queued-write logging (writes are online per action)
- Day-first / calendar editing (client never edits the plan)
- Coach-side review UI (covered by the read-only coach endpoints)
</content>
