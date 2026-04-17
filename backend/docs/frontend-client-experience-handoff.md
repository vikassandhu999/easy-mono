# Frontend Handoff — Client Experience Improvements

Backend changes for the client experience UX spec are complete. This page is the single entry point for the frontend team: what was built, what to render, what to call.

- **Spec reference:** "UX Spec: Client Experience Improvements" dated 2026-04-15
- **Test status:** 445 passing, clean `--warnings-as-errors` compile
- **Contract:** `docs/api_contract.yaml` (source of truth for request/response shapes)
- **Scope:** Must-have for launch items only. Weight tracking, progress photos, PR detection, achievements, notifications are deferred.

---

## TL;DR — what changed

### New endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/client/training_plans/today?date=YYYY-MM-DD` | Single aggregate endpoint powering the Today screen. Everything in one call. |

### Updated endpoints

| Method | Path | What changed |
|--------|------|--------------|
| `GET` | `/v1/client/me` | Now includes `workout_streak` and `coach.photo_url`. |
| `PATCH` | `/v1/client/me` | Response now matches GET (includes `workout_streak`). |
| `GET` | `/v1/client/training_plans/:id` | Now includes `coach_note`. |
| `GET/POST/PATCH` | `/v1/client/workout_sessions/*` | All show-type responses now include `mood`, `last_performed_by_element`. |
| `POST` | `/v1/client/workout_sessions/:id/complete` | Accepts `mood` field. Response includes `summary` block with celebration data. |
| `GET` | `/v1/client/nutrition_plans/today` | Now includes `nutrition_summary` with headline + per-macro comparison. |

### New fields on existing schemas

| Schema | New field | Type |
|--------|-----------|------|
| `ClientWorkoutSession` | `mood` | `"tough" \| "solid" \| "strong" \| null` |
| `ClientWorkoutSession` | `last_performed_by_element` | `Record<element_id, LastPerformedEntry>` |
| `ClientTrainingPlan` | `coach_note` | `string \| null` |
| `ClientProfile` | `workout_streak` | `{ current: number, includes_today: boolean }` |
| `ClientCoach` | `photo_url` | `string \| null` |

---

## Type definitions

Copy these into your TS client. These extend the existing types.

```ts
// ── Today Screen (Surface 1) ──────────────────────────────────

type TodayResponse = { data: TodayData };

type TodayData = {
  greeting: {
    first_name: string | null;
    day_name: string;           // "Monday", "Tuesday", etc.
    date: string;               // ISO date
  };
  coaching_context: {
    coach_first_name: string | null;
    week_number: number | null; // weeks since plan.start_date, null if no plan
  };
  coach: CoachCard | null;
  today: TodayCard;
  this_week: WeekDay[];         // always 7 entries (Mon..Sun) when plan exists
  plan: PlanSummary | null;
  workout_streak: WorkoutStreak;
};

type CoachCard = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  photo_url: string | null;
  business_name: string;
};

type TodayCard = {
  kind: "workout" | "rest" | "empty" | "no_plan";
  coach_note: string | null;
  planned_workout: TodayPlannedWorkout | null;
  last_session_recap: LastSessionRecap | null;
  last_performed_by_element: Record<string, LastPerformedEntry>;
};

type TodayPlannedWorkout = {
  id: string;
  name: string;
  day_number: number;           // 1=Mon..7=Sun
  notes: string | null;
  exercise_count: number;
  workout_elements: WorkoutElement[];
};

type LastSessionRecap = {
  session_id: string;
  ended_at: string | null;
  headline: string | null;      // "Bench Press 80.0kg x 9"
};

type WeekDay = {
  day_number: number;
  day_name: string;
  date: string;
  is_today: boolean;
  kind: "done" | "upcoming" | "rest" | "empty";
  planned_workout_name: string | null;
  session_id: string | null;
};

type PlanSummary = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type WorkoutStreak = {
  current: number;              // consecutive days
  includes_today: boolean;      // true if a session was completed today
};

// ── Active Workout (Surface 2) ────────────────────────────────

type LastPerformedEntry = {
  source: "element" | "exercise"; // "element" = same plan slot; "exercise" = fallback
  session_id: string;
  started_at: string;
  ended_at: string | null;
  exercise_id: string | null;
  sets: LastPerformedSet[];
};

type LastPerformedSet = {
  position: number;
  actual_reps: string | null;
  load_value: string | null;    // Decimal as string, e.g. "80.0"
  load_unit: string | null;     // "kg" | "lbs" | "bodyweight" | ...
  rpe: string | null;
  rir: number | null;
  duration_seconds: number | null;
  distance_value: string | null;
  distance_unit: string | null;
};

// ── Workout Completion (Surface 3) ────────────────────────────

type CompleteRequest = {
  mood?: "tough" | "solid" | "strong" | null;
  soreness_rating?: number | null;  // legacy, prefer mood
  notes?: string | null;            // "Note for Coach Rajat"
};

type CompleteSummary = {
  duration_minutes: number | null;
  sets_count: number;
  total_volume_kg: number;
  volume_delta_kg: number | null;   // null for freestyle
  prs: any[];                       // empty for launch
  workout_streak: WorkoutStreak;
};

// summary is ONLY on the complete response, not on show/active/index
type CompleteSessionResponse = {
  data: WorkoutSession & { summary: CompleteSummary };
};

// ── Nutrition (Surface 4) ─────────────────────────────────────

type NutritionSummary = {
  headline: string | null;      // "Crushing protein", "200 cal under target", etc.
  calories: MacroComparison;
  protein: MacroComparison;
  carbs: MacroComparison;
  fats: MacroComparison;
};

type MacroComparison = {
  actual: number;               // sum of logged entries, 0.0 if nothing logged
  target: number | null;        // from plan.macros_goal, null if not set
  unit: "cal" | "g";
};

// nutrition_summary is included in the existing today nutrition response
type NutritionTodayResponse = {
  data: {
    date: string;
    day: string;
    plan_id: string;
    meals: NutritionTodayMeal[];
    nutrition_summary: NutritionSummary;
  };
};

// ── Profile (Surface 6) ──────────────────────────────────────

type ClientProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: "active" | "pending" | "inactive" | "archived";
  coach: CoachCard | null;
  workout_streak: WorkoutStreak;
};
```

---

## Surface-by-surface implementation guide

### Surface 1: Today Screen

**Endpoint:** `GET /v1/client/training_plans/today?date=YYYY-MM-DD`

Call this on app launch and whenever the Today tab is focused. The `date` param defaults to today UTC; pass it for testing or timezone-aware clients.

Never 404s. A client with no active plan gets `today.kind = "no_plan"`.

```ts
const res = await api.get("/v1/client/training_plans/today");
const { greeting, coaching_context, coach, today, this_week, plan, workout_streak } = res.data;
```

**Rendering rules:**

1. **Greeting:** `"Hey {greeting.first_name}"` + time-of-day if you want ("evening session?"). Fall back to just the day_name if first_name is null.

2. **Coaching context:** `"Week {coaching_context.week_number} with Coach {coaching_context.coach_first_name}"`. Hide if week_number is null (no plan or no start_date).

3. **Streak:** `"{workout_streak.current}-day streak"` with fire emoji. Hide when 0. If `includes_today` is true, the client already trained today — show the streak as-is. If false and > 0, it's the count up through yesterday ("let's keep it going").

4. **Today card — by kind:**

   | `today.kind` | Render |
   |---|---|
   | `workout` | Workout card: `today.planned_workout.name`, `exercise_count` exercises, `"about {estimated_duration} minutes"`. Show coach_note below. Show "Start workout" button. |
   | `rest` | Rest day card. Show coach_note if present. "Rest day — recovery matters." |
   | `empty` | No workout scheduled. "No workout today." Show coach_note if present. |
   | `no_plan` | "Your coach hasn't assigned a plan yet." No coach_note, no workout card. |

5. **Last session recap** (only when kind=workout): `today.last_session_recap.headline` renders as "Last time: {headline}". Example: "Last time: Bench Press 80.0kg x 9". Hide when null.

6. **Coach note:** `today.coach_note` renders as a quote block: `"Coach {coach.first_name}'s note for this week: \"{coach_note}\""`. Hide when null.

7. **This-week strip:** Render 7 circles Mon-Sun. For each `WeekDay`:
   - `kind: "done"` = filled circle (completed)
   - `kind: "upcoming"` = open circle (scheduled but not done)
   - `kind: "rest"` = dash or "R" label
   - `kind: "empty"` = dash
   - `is_today: true` = "you are here" indicator (arrow or highlight)
   - `planned_workout_name` = tooltip text on hover/long-press

8. **Coach card** (footer, every tab): Use `coach` from the Today response or from `GET /v1/client/me`. Render: photo (`photo_url`, placeholder avatar when null), name, "Message" button that opens `tel:{phone}` or WhatsApp deep link. Always visible.

9. **Post-workout state:** After the client completes today's workout, refetch the Today endpoint. `this_week` will show today as `kind: "done"` with `session_id`. The greeting area can show "Today's workout done" and tomorrow's plan.

**Last-performed preview on Today card:** `today.last_performed_by_element` is a map of element_id to prior performance. Use it to show a per-exercise preview under each exercise name on the workout card, e.g. "Last: 9, 10, 8, 8 @ 80kg". See Surface 2 for formatting.

---

### Surface 2: Active Workout — Last-Time Comparison

**Data source:** `last_performed_by_element` on every workout session response (create, show, active, complete, discard, update).

The map is keyed by `workout_element_id`. For each element in the `planned_snapshot.elements`, look up the matching entry.

```ts
const session = await api.post("/v1/client/workout_sessions", { planned_workout_id });
const lastPerformed = session.data.last_performed_by_element;

// For each element in the planned snapshot:
for (const element of session.data.planned_snapshot.elements) {
  const last = lastPerformed[element.element_id];
  if (last) {
    // Render "Last time: {formatSets(last.sets)}"
  }
}
```

**Formatting "Last time":**

```ts
function formatLastTime(entry: LastPerformedEntry): string {
  const sets = entry.sets;
  if (sets.length === 0) return "";

  // All sets at same load? Compact format: "9, 10, 8, 8 @ 80kg"
  const loads = sets.map(s => s.load_value).filter(Boolean);
  const uniqueLoads = [...new Set(loads)];

  if (uniqueLoads.length === 1 && uniqueLoads[0]) {
    const reps = sets.map(s => s.actual_reps ?? "?").join(", ");
    const unit = sets[0].load_unit ?? "";
    return `${reps} @ ${uniqueLoads[0]}${unit}`;
  }

  // Mixed loads: "9@80kg, 8@85kg"
  return sets
    .map(s => {
      const reps = s.actual_reps ?? "?";
      const load = s.load_value ? `@${s.load_value}${s.load_unit ?? ""}` : "";
      return `${reps}${load}`;
    })
    .join(", ");
}
```

**Per-set view:** When showing the set input for Set N of an element, show:
- `"Plan: {planned_set.target_reps} @ {planned_set.load_value}{planned_set.load_unit}"`
- `"Last time: {last.sets[N].actual_reps} @ {last.sets[N].load_value}{last.sets[N].load_unit}"`

If `last.source === "exercise"`, the data comes from a different plan slot. You can show "Last time (any workout)" instead of just "Last time" to be precise. Or just show "Last time" — the client doesn't care about the distinction.

**Rest timer (Surface 2.3):** Between sets, show what's coming next:
- "Up next: Set {N} of {exercise_name}"
- "Plan: {target_reps} @ {load_value}{load_unit}"
- "Last time: {last.sets[N].actual_reps} @ {last.sets[N].load_value}"

This is all frontend logic using the `planned_snapshot` + `last_performed_by_element` data that's already in the session response.

**Mid-workout pacing (Surface 2.4):** After completing exercise 3 of 5, show a brief encouragement line. Pure frontend — pick from a list:
- "3 down. Halfway there."
- "You're crushing it."
- "Two more, stay strong."
- "Last one, finish strong."

Show for 3 seconds, then auto-dismiss.

---

### Surface 3: Workout Completion

**Endpoint:** `POST /v1/client/workout_sessions/:id/complete`

```ts
const res = await api.post(`/v1/client/workout_sessions/${sessionId}/complete`, {
  mood: "solid",          // "tough" | "solid" | "strong"
  notes: "Bench felt amazing today, tried 85kg",
});

const { summary, ...session } = res.data;
```

**Rendering the celebration screen:**

```
                Workout complete

        {planned_snapshot.workout_name} - {summary.duration_minutes} minutes

        {summary.sets_count} sets - {formatVolume(summary.total_volume_kg)} total volume
        {summary.volume_delta_kg !== null
          ? `${summary.volume_delta_kg > 0 ? "+" : ""}${summary.volume_delta_kg} kg vs your last ${workoutName}`
          : ""}

        {summary.workout_streak.current}-day streak
        {summary.workout_streak.includes_today ? "(+1)" : ""}

        How did it feel?
        [tough]  [solid]  [strong]

        Note for Coach {coachFirstName} (optional)
        [                                          ]

        [Send to Coach {coachFirstName}]
```

**Mood emojis:** Map the three values to emojis in the frontend:
- `tough` = frustrated/sweating face
- `solid` = smiling face
- `strong` = fire/flexing

The mood is sent as part of the complete request. The `notes` field is the "Note for Coach" text box.

**Volume formatting:**
```ts
function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`; // unlikely but safe
  return `${kg.toLocaleString()} kg`;
}
```

**Volume delta:** Show only when `volume_delta_kg !== null`. Format with a +/- sign. Always show "vs your last {workout_name}" to give context.

**After dismissing the celebration:** Navigate back to the Today screen. The Today endpoint will now show today as `kind: "done"` in `this_week`, and the greeting area should switch to "Today's workout done. Tomorrow: {next_workout_name}."

**Summary is ONLY on the complete response.** It is not returned on `show`, `active`, or `index`. If you need to re-display the celebration screen later, cache the complete response client-side or re-derive duration/volume from the raw session data.

---

### Surface 4: Nutrition Daily View

**Endpoint:** `GET /v1/client/nutrition_plans/today?date=YYYY-MM-DD`

The response now includes a `nutrition_summary` block alongside the existing `meals` array.

```ts
const res = await api.get("/v1/client/nutrition_plans/today", { params: { date } });
const { nutrition_summary, meals } = res.data;
```

**Headline:** `nutrition_summary.headline` is the lead. Render it prominently above the macro bars. Examples:
- `"Crushing protein"` — protein is >= 90% of target
- `"200 cal under target"` — calories are below target
- `"On point today"` — all macros are within 85-110% of target
- `"Slightly over on calories"` — calories > 105% of target
- `null` — plan has no macro targets; hide the headline row entirely

**Macro bars:** For each of `calories`, `protein`, `carbs`, `fats`:
```ts
const { actual, target, unit } = nutrition_summary.calories;
// Render: "Calories  [=========>    ]  1,450 of 1,700 cal"
// Fill percentage: target ? Math.min(actual / target, 1.0) : 0
```

When `target` is null, show the actual value without a bar (no target to compare against).

**Meal sections:** Use the existing `meals` array. The spec says to use sentence case ("Lunch" not "LUNCH"), rename "Log all" to "Just ate this", and show a "Log everything I planned today" button at the bottom.

The meal-level log action uses the existing `POST /v1/client/meal_logs/log_meal` endpoint (unchanged).

The "Log everything" button calls `POST /v1/client/meal_logs/log_day` (unchanged).

After logging, refetch the nutrition today endpoint to update `nutrition_summary.headline` and macro actuals.

---

### Surface 6: Coach Presence

**Coach card data** is available from two sources:
1. `GET /v1/client/training_plans/today` — `data.coach` (full card)
2. `GET /v1/client/me` — `data.coach` (same shape)

Render the coach card as a persistent thin bar above the bottom tab navigation on every screen:

```
  [avatar]  Coach {first_name}  {last_name}       [Message ->]
            {status_line}
```

- **Avatar:** `coach.photo_url`. Show a placeholder (initials circle) when null.
- **Name:** `"Coach {coach.first_name}"` — use first name only for the card, full name for settings.
- **Message button:** Opens WhatsApp or phone dialer. Deep link: `https://wa.me/{phone}` (strip spaces/dashes from phone number).
- **Status line:** "online - last seen today" (post-MVP — for now, just show the business name or omit).

The coach card should be cached client-side from either the Today or profile endpoint. No need to fetch separately.

---

### Surface 7: Streaks

`workout_streak` is returned on:
1. `GET /v1/client/training_plans/today` — `data.workout_streak`
2. `GET /v1/client/me` — `data.workout_streak`
3. `POST /v1/client/workout_sessions/:id/complete` — `data.summary.workout_streak`

**Rendering rules:**

- `current: 0` — hide the streak entirely. Don't show "0-day streak".
- `current: 1+, includes_today: false` — `"{current}-day streak — let's keep it going"`. The client hasn't worked out today yet.
- `current: 1+, includes_today: true` — `"{current}-day streak"`. Already includes today's workout.
- On the completion screen: `"{current}-day streak (+1)"` — the "+1" indicates this workout just extended the streak.

**Streak rules (for your understanding, handled server-side):**
- Rest days don't break the streak (they're skipped).
- Freestyle workouts count.
- Only completed sessions count (not active or discarded).
- The streak walks backwards from yesterday. Today is added only if a completed session exists.

---

### Surface 8: Tone and Copy

This is a frontend-only pass. No backend changes needed. Apply these rules across all client screens:

**First names:** "Hey Vikas" not "Welcome user." The greeting first_name comes from `GET /v1/client/training_plans/today` → `greeting.first_name`. Coach is "Coach Rajat" not "your coach."

**Sentence case:** "Today's workout" not "Today's Workout". "Log this meal" not "Log This Meal."

**Conversational verbs:**
| Old | New |
|-----|-----|
| Log meal | Just ate this |
| Log all | Just ate this |
| Begin session / Start session | Start workout |
| Workout complete | Workout complete (keep this one) |
| Submit notes | Send to Coach {name} |

**Celebrate wins, soften losses:**
| Old | New |
|-----|-----|
| Workout completed | Workout complete |
| Goal not met | Keep going |
| Streak broken | Welcome back. Ready to start a new streak? |
| Failed protein goal | Behind on protein (never "failed") |

**Emoji rules:** Use sparingly, deliberately. Only for: greetings (wave), celebrations (fire, flexing, party), and streak indicators. Never decorative.

---

## Endpoint reference — quick lookup

### GET /v1/client/training_plans/today

```
Query: ?date=YYYY-MM-DD (optional, defaults to today UTC)
Auth: client bearer token
Response: 200 TodayResponse (never 404s)
```

### POST /v1/client/workout_sessions/:id/complete

```
Auth: client bearer token
Body: { mood?: "tough"|"solid"|"strong", notes?: string }
Response: 200 { data: WorkoutSession & { summary: CompleteSummary } }
```

### GET /v1/client/me

```
Auth: client bearer token
Response: 200 { data: ClientProfile }
New fields: workout_streak, coach.photo_url
```

### GET /v1/client/nutrition_plans/today

```
Query: ?date=YYYY-MM-DD (optional)
Auth: client bearer token
Response: 200 NutritionTodayResponse
New field: nutrition_summary
```

### All workout session show-type endpoints

```
GET  /v1/client/workout_sessions/:id
GET  /v1/client/workout_sessions/active
POST /v1/client/workout_sessions (create)
POST /v1/client/workout_sessions/:id/complete
POST /v1/client/workout_sessions/:id/discard
PATCH /v1/client/workout_sessions/:id

New fields on all: mood, last_performed_by_element
```

---

## Implementation priority

Match the spec's "must-have for launch" order:

| # | What | Endpoint | Effort |
|---|------|----------|--------|
| 1 | Today screen with greeting, streak, coach note, week strip | `GET .../today` | Large — new screen |
| 2 | Coach card on every tab | `GET .../today` or `GET /me` | Medium — layout component |
| 3 | Last-time comparison in active workout | `last_performed_by_element` on session | Medium — data overlay |
| 4 | Workout completion celebration | `POST .../complete` | Medium — new screen |
| 5 | Mood emoji on complete | `POST .../complete` | Small — 3 buttons |
| 6 | Nutrition headline + macro bars | `GET .../nutrition_plans/today` | Medium — headline + bars |
| 7 | Streak display (today + complete + profile) | `workout_streak` | Small — display only |
| 8 | Tone and copy pass | None (string changes) | Small — search-and-replace |

Items 1-2 are the highest-impact for retention. Items 7-8 are easy wins that can ship alongside anything else.

---

## What's NOT in this handoff (deferred)

| Feature | Spec surface | Why deferred |
|---------|-------------|--------------|
| Weight moving average + goal line | Surface 5.1 | Architecture pending |
| Progress photos before/after | Surface 5.2 | Architecture pending |
| PR detection and celebration | Surface 2.2 | Nice-to-have week 1-2 |
| Mid-workout pacing feedback | Surface 2.4 | Pure frontend, polish tier |
| Nutrition logging streak | Surface 4.4 | Separate streak type |
| Achievements system | Surface 7 | Standalone feature |
| Notifications | Surface 9 | Push infra needed |
| Streak freeze / grace period | Surface 7 | Post-MVP edge cases |
| Coach reactions feed | Surface 6.4 | Needs coach UI |
| Time-with-coach indicator | Surface 6.5 | Backend computation deferred |

---

## Testing

Backend tests covering these changes: **445 passing**, 0 failures. Notable new suites:

- `test/easy_web/controllers/clients/training_plan_controller_test.exs` — 22 tests: today endpoint (no_plan, workout, rest, empty, week strip, coach note, last session recap, streak, last_performed_by_element, coach card)
- `test/easy_web/controllers/clients/workout_session_controller_test.exs` — 30 tests: mood on complete, summary (volume, delta, duration), last_performed_by_element (element vs exercise fallback, exclusion, tenant isolation)
- `test/easy_web/controllers/clients/profile_controller_test.exs` — 8 tests: workout_streak on profile, coach photo_url
- `test/easy_web/controllers/clients/nutrition_plan_controller_test.exs` — 15 tests: nutrition_summary, headline, per-macro targets

When in doubt, look at the controller tests — they are the most precise behavioral spec for each endpoint.

---

## Questions / sharp edges

**Q: Does the Today endpoint ever return 404?**
A: No. A client with no active plan gets `today.kind = "no_plan"` with a valid greeting, empty this_week, null plan. Always 200. The nutrition today endpoint still 404s when no plan exists (pre-existing behavior, unchanged).

**Q: What happens if `last_performed_by_element` has no entry for an element?**
A: The element is new to the client (never performed). Don't show "Last time" — just show the planned sets. This is the normal state for the first session of any plan.

**Q: Can the client set mood AND soreness_rating?**
A: Yes, both fields are independent and nullable. New clients should use `mood` (the 3-emoji picker). `soreness_rating` (1-5) exists for backward compatibility. Frontend should only show the mood picker.

**Q: Is the nutrition headline localized?**
A: No. Headlines are English strings computed server-side. If you need i18n, the frontend should compute headlines from `nutrition_summary.{calories,protein,...}` using the same rules. For MVP, use the server string directly.

**Q: When does `volume_delta_kg` show up?**
A: Only when the session has a `planned_workout_id` (not freestyle) AND a prior completed session of the same planned workout exists. Freestyle sessions always get `null`.

**Q: Can I use the Today endpoint for all days or just today?**
A: Pass `?date=2026-04-15` to get any day's view. Useful for "swipe between days" in a weekly view. The endpoint resolves the plan, rest days, and completed sessions for that specific date.
