# Workout concept

Status: in design, 9 October 2026. Replaces the training part of `.scratch/core-domains/` (plans, plan revisions, schedule entries) when accepted.

## Decisions

| # | Decision |
|---|---|
| W1 | A Workout is an instruction for one training occasion. It belongs to one owner (W10). |
| W2 | Workout type says **what** is done: `prescribed` (exercise groups, W4), `video` (an uploaded video or a URL), or `open` (no content; the leader decides on the spot). **When, where and with whom** belong to the schedule row (W16). A live virtual class or an in-person session is an `open` or `prescribed` workout on a schedule row with a time, a place or link, and a coach. (Replaces `follow_along`, 9 Oct 2026.) |
| W3 | What is performed is described by facets (W22). Only `kind` has behaviour; every other facet is for search, filters and reports. (Replaces the single category tag, 9 Oct 2026.) |
| W4 | A prescribed workout has exercise groups. A group has an optional name and `rounds`. "How many times" lives only in `rounds`. One exercise with 3 rounds is a straight set; two exercises in one group is a superset. |
| W5 | A workout exercise has targets the same for all rounds, or one target for each round. |
| W6 | Schedule: workout + client, one `date` or a `day_of_week` between `from_date` and `until_date`, optional `time`. An appointment is not a separate concept: a schedule row with a time is enough. |
| W7 | WorkoutLog: what the client did. `workout_history_id` null = free workout. Sets record `round` and values. |
| W8 | WorkoutHistory keeps each version of a workout that the client actually did. A coach edit does not enter the history until the client does the workout. When a log starts: same as the open row → use it; different → close it (`ended` = today) and open a new row with a copy. The log points to its history row. The check and the new row are one step, in the transaction that starts the log. Why: the history rebuilds the client's whole programme as they actually did it; a version they never did is not in it, and the schedule still shows missed days. |
| W9 | Copy on assign, never linked. This is the cornerstone: a library or program workout is copied to the owner that receives it, and the copy has no link back. |
| W10 | One `workouts` table with three owners: library (`client_id` and `program_id` null), program (`program_id`), client (`client_id`). Never both. A workout has no time in it, so one shape serves all owners. |
| W11 | Two schedule tables, one time system each. `schedules` (client) uses dates; `program_schedules` uses week numbers. Same shape: one occasion, or a weekday rule between two bounds. Assign translates week `w` to `start + 7 × (w − 1)` days. |
| W12 | Metrics are decided in W24–W29 and the "Metric catalogue" section. |
| W13 | An occurrence is one expected workout on one date: `(schedule_id, date)`. It is calculated from schedule rows, never stored. A log claims it with `schedule_id` + `scheduled_date` (both null for a free workout). The log date can differ from the scheduled date. Done = a log exists for the pair. |
| W14 | A schedule row never changes its facts. Fact dates: every date before today, and today only if a log claims today's occurrence; future dates are never facts. Change or delete = set `until_date` to the last fact date (and, for a change, start a new row after it); a row with no fact dates is deleted. A same-day replace is therefore a clean delete. There is no separate archive: an ended row is the archive. (Rule refined 9 Oct 2026.) |
| W15 | A change to one occurrence: `ScheduleSkip { schedule_id, date }`. Skip = one skip row; a skipped occurrence is not expected and does not count as missed. Move = a skip plus a new one-off schedule row. |
| W16 | A schedule row carries the occasion: optional `time`, `place` or `meeting_url` (at most one), and `coach_id` (the coach who leads). Example: a prescribed leg workout on "Tue 18:00, Gold's Gym, with Sam". |
| W17 | Anyone who takes part can record a log: the client, or a coach with access to the client. The log stores `recorded_by` (client or coach); the journal stores who made each change. The app offers recording to the leader: an occurrence with a `coach_id` shows "Start session" in that coach's app, other occurrences show "Start workout" to the client. One log per occurrence at a time; the other person sees "<name> is recording this session". Replaces M17. |
| W18 | Log states: `active` → `completed` or `discarded`. One active log per client. Workout feedback (difficulty, pain, pain note; roadmap row 1) is on the log. |
| W19 | Every log can have sets, whatever the workout type; for `video` and `open` they are optional. A set stores `workout_exercise_id`: the id of the prescribed exercise inside the log's WorkoutHistory copy (not a foreign key to the live workout, so later edits never break it), so only sets of a `prescribed` workout can link. Calculated, not stored: planned set (link, same exercise), swap (link, other exercise), extra set (no link). `is_quick_add` is removed. |
| W20 | `Program { id, business_id, name, description, weeks }`. Assign: the coach picks a client and a start date; each program workout is copied to the client with new ids; each program schedule row becomes a client schedule row that points to the copy. The client's existing schedule is not touched; two workouts on one day are allowed. |
| W21 | Week 1 is the calendar week (Monday to Sunday) that contains the start date. Occurrences before the start date are not created, so the first week can be short. The coach can start on any day. |
| W22 | Exercise taxonomy is locked: the facets in "Exercise taxonomy" below. Exactly one `kind`; one or more `goals` and `places`; equipment and muscles stay as tags. `kind` gives the default metrics when a coach creates an exercise. |
| W23 | If a change alters the movement, it is a separate exercise (freestyle and breaststroke; back squat and front squat). |
| W24 | Metrics come only from our catalogue. A count metric (`reps`, `successes / attempts`) can carry the exercise's own label ("waves", "rounds", "skips"); reports still treat it as a count. A new kind of value is added to the catalogue once, for everybody. No coach-made metrics. |
| W25 | One target shape for every numeric metric: `exact` (value), `range` (min, max), `max` (as much as possible), or empty (the client chooses and records). "For time" = distance exact, duration empty. "Weight for RPE 8" = weight empty, effort exact 8. A target exists only on the exercise's metrics. |
| W26 | Weight has a fourth target mode: `percent` of the client's 1RM for that exercise. The 1RM is the newest of: an entered max (`ExerciseMax`, coach or client) or a logged completed single (1 rep). No estimates from formulas. The logger shows "75% · 105 kg (of 140 kg, 3 Oct)", or "no max yet: choose your weight". The logged value is always real kg. |
| W27 | `unilateral` is a property of the exercise. The coach writes one target ("10 each side"). The log has one set for each side (`side` = left or right), both pre-filled from the target. Sums ignore side; "left vs right" filters by it. Bilateral sets have `side` null. |
| W28 | Logged metric values are typed columns on `exercise_sets`, one per catalogue metric (`reps int`, `weight_kg numeric`, `duration_s int`, `distance_m numeric`, …), nullable. Base units plus the unit the person typed (M14). A new metric is one migration. Targets are JSON inside the workout (and its WorkoutHistory copy), checked by the app on save. |
| W29 | The metric catalogue is locked (section "Metric catalogue"). A missing value later is added to the catalogue once, by a dated decision. |
| W30 | Rest has one field with one meaning: `rest` on the workout exercise = the rest after doing this exercise. The rest after the last exercise of a group is the rest between rounds. It uses the target shape (exact or range) and W5 (same for all rounds or per round). Not logged; the client's rest timer uses it. Real rest, if ever needed, is calculated from set times. |
| W31 | Everything on an exercise is editable (metric list, `kind`, `unilateral`, name). An exercise describes how to show and log it from now on; it never changes data that already exists. Removed metrics stay in old logs and reports. WorkoutHistory copies keep old names. Replaces M13. |
| W32 | Deleting a workout: apply W14 to its schedule rows first. If any row remains, the workout is archived (`archived_at`); otherwise it is deleted. Done work never needs the original: logs point to WorkoutHistory copies, so `WorkoutHistory.workout_id` is a plain id, not a foreign key. Library and program workouts have no schedule facts, so they are deleted. One sentence for W14 and W32: keep every date that is a fact; remove everything else; a row or a workout with no facts is deleted. |
| W33 | Progression across weeks needs no new concept: a program schedules a separate workout per week where targets change ("Lower A (week 1)" on a `week` row, "Lower A (week 2)" on the next). The builder offers "Duplicate for next week". Replaces the "Not now" for progression (M8). |
| W34 | `WorkoutLog` and `ExerciseSet` are records on the shared spine: shared record fields, `Easy.RecordJournal` writes, `record_changes`, `clients.last_change_seq` (M9, M10). "New since the last review" and "pain reported" work for them unchanged. |
| W35 | Every table carries `business_id` (tenant). A library workout is `business_id` set, `client_id` and `program_id` null. Built-in exercises keep `business_id` null. |

## Model

```
Exercise         { id, business_id?, name, kind, goals[], places[], metrics[] (ordered), count_label?, grade_scale?, unilateral, equipment[], muscles[], media? }
Program          { id, business_id, name, description, weeks }
Workout          { id, business_id, client_id?, program_id?, name, description, type: prescribed | video | open, video?, archived_at? }
ExerciseGroup    { id, workout_id, name?, rounds }
WorkoutExercise  { id, group_id, exercise_id, rest (target), targets: same_for_all | per_round, [ metrics (W28) ] }
Schedule         { id, workout_id, client_id, date? | day_of_week + from_date + until_date?, time?, place? | meeting_url?, coach_id? }
ProgramSchedule  { id, workout_id, program_id, week? | day_of_week + from_week + until_week }
WorkoutHistory   { id, client_id, workout_id, started, ended?, workout: jsonb }
WorkoutLog       { id, business_id, client_id, shared record fields (M9), state, date, time, at_utc, text, difficulty?, pain?, pain_note?, workout_history_id?, schedule_id?, scheduled_date?, recorded_by }
ScheduleSkip     { id, schedule_id, date }
ExerciseMax      { id, client_id, exercise_id, kg, date, entered_by }
ExerciseSet      { id, log_id, workout_exercise_id?, exercise_id, round, side?, metrics (W28) }
```

## Exercise taxonomy (locked)

Each facet answers one question. Its values do not overlap.

| Facet | Question | Values | Per exercise |
|---|---|---|---|
| **Kind** | What shape does the effort have? | **movement**: repeated in sets (squat, push-up, plank) · **activity**: continuous, covers time or distance (run, swim, cycle, hike, row) · **sport**: play with rules and a result (football, tennis, basketball) · **practice**: a guided form (yoga, Pilates, meditation, breathwork, martial-arts forms, drills) | exactly 1 |
| **Goal** | What does it train? | strength, endurance, power, mobility, balance, skill, recovery | 1 or more |
| **Place** | Where is it done? | gym, home, outdoor, pool, court/field, studio | 1 or more |
| Equipment | What is needed? | existing tags | 0 or more |
| Muscles | What does it load? | existing tags | 0 or more |

## Metric catalogue (locked)

Rules:
- We define the catalogue, so reports work for every exercise.
- An exercise chooses an ordered list of metrics. The coach builder, the client logger and the reports show only those.
- Store what the person entered. Calculate the rest (pace, volume, accuracy). No formula estimates (W26).

| Group | Metric | Stored as | Shown as | Report |
|---|---|---|---|---|
| Amount | reps | count | "reps" or the exercise's label ("laps", "waves") | sum |
| | weight | kg (negative = assistance) | kg, lb | max; volume = weight × reps |
| | duration | seconds | s, min, h:mm:ss | sum |
| | distance | metres | m, km, mi, yd | sum |
| | elevation gain | metres | m, ft | sum |
| | height | cm | cm, in | max |
| | calories | kcal | kcal | sum |
| Intensity | speed | m/s | km/h, mph, pace min/km, min/mi, min/100 m | avg, best |
| | incline | % | % | avg |
| | level | 1–N (machine setting) | "Level 8" | avg |
| | power | watts | W | avg, max |
| | cadence | per minute | rpm, spm | avg |
| | heart rate | bpm | bpm | avg, max |
| | effort | RPE 1–10 | RPE | avg |
| | reserve | RIR 0–10 | RIR | avg |
| Outcome | successes / attempts | 2 counts | "7 / 10" | accuracy % |
| | score | number | points | sum, best |
| | result | win / draw / loss | — | record (W–D–L) |
| | grade | a step on the exercise's `grade_scale` (V0–V17, YDS, belts) | "V5" | best |
| Set facts | side | left / right (null = bilateral, W27) | "L / R" | per side |
| | tempo | text (target only) | "3-1-1-0" | — |

Default metrics by kind: movement → reps, weight · activity → distance, duration · sport → duration, result, score · practice → duration.

Examples: treadmill → duration, distance, speed, incline · free throws → successes / attempts · climbing → grade, attempts · hike → distance, duration, elevation gain, weight (pack).

## Relation to the core-domains decisions

| Old | Status |
|---|---|
| M2 templates vs plans, M3 plan revisions, M6 schedule entries, M16 one plan per domain | Replaced for training by W8–W11, W13. Nutrition keeps them until it gets its own concept. |
| M7 session points to prescription and occurrence | Replaced by W8 (history row) and W13 (`schedule_id`, `scheduled_date`). |
| M8 occurrence exceptions; progression "Not now" | Replaced by W15 (skips) and W33 (progression). |
| M13 measures fixed at creation | Replaced by W31. |
| M17 only the client records workouts | Replaced by W17. |
| M9, M10 record spine; M14 base units; M18 counts, not scores | Kept (W34, W28). |

## Open questions

1. `bodyweight` (load adds to body weight) and `mechanics` / `force` on today's exercises: keep, change, or drop?
2. Targets for non-numeric metrics: can a coach set a `grade` target ("climb V4") or a `result` target? W25 covers numeric metrics only.
3. Must program schedule rows stay inside `Program.weeks`?
4. Build plan: how we move from the S1 training model to this concept in complete slices.
