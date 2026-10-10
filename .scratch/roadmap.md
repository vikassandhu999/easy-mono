# Implementation scope, 10 October 2026

Reviews and attention signals are deferred. First complete workout, nutrition, Tracker, and chat-reference domains from their agreed concept documents. The feature table below is retained planning history; its previous next markers do not override this scope. Detailed slice plans come before implementation.

# Roadmap

> Training is redesigned in `.scratch/workout/concept.md` (9 Oct 2026). Training rows below follow it once its build plan exists.

Status: 6 October 2026. This is the one planning doc. Build from the **Build order** table, one row at a time, top to bottom. When a row is done, set its status and the commit.

Other docs that stay:

| Doc | What it is |
|---|---|
| `.scratch/core-domains/decisions.md` | Frozen model decisions M1–M18, P1–P4 |
| `.scratch/core-domains/overview.md` | The built model: tables, rules, calculated values |
| `.scratch/core-domains/training.md` | Training in Postgres (DDL, write protocol, queries) |
| `.scratch/check-ins/spec.md` | Reviews spec (built in slice 4) |
| `.scratch/coaching-terms/spec.md` | Coaching terms spec (built) |

Reference: SparkyFitness at `~/Desktop/10x/SparkyFitness` (about 100 tables). Its licence is non-commercial: we take **ideas only**, never code or schema.

---

## 1. Principles

1. **Each case gets its own model.** Sleep, cycle, goals, symptoms and fasting each get their own small table and the best screen for them. We do not stretch one generic model to fit everything (decision of 6 October 2026).
2. **Facts with one value stay Trackers.** Weight, waist, mood rating, water, a supplement yes/no, photos and documents have the same shape, so one model is correct for them (M15).
3. **One shared spine for all records.** Every record table has the shared record fields, writes through `Easy.RecordJournal` (`record_changes`, `last_change_seq`) and joins the `records` view. Then the timeline, "New since last review", corrections and removals work with no extra code.
4. **Calculate, don't store.** Phase of cycle, goal pace, duration of sleep, due reviews: calculated from records.
5. **Counts, never scores** (M18).
6. **The coach is not a doctor.** The client reports medical facts; the coach reads them and cannot plan them.
7. **Small rows.** One row of the build order = one Codex task, verified and committed before the next row starts.

---

## 2. Concepts

| Concept | Meaning | Example |
|---|---|---|
| **Library** | Things the coach chooses from. Built-ins plus the business's own. | Exercises, foods, recipes, trackers |
| **Template** | A reusable plan the coach edits. Copied to a client, never linked. | "Upper/lower 4 days" |
| **Plan** | The client's own copy, with dates and immutable revisions. One per domain per date. | Training plan from 1 Oct |
| **Tracker** | A thing in the library that the client records one value for. Kinds: number, rating, yes_no, text, photo, document. | Body weight (kg), Energy (1–5) |
| **Tracker list** | Which trackers the client records and when: daily, weekly, after workout, after meal. | Weight daily, Reflection on Sunday |
| **Record** | Something that happened, written by the client (or a coach for trackers). | A workout session, a meal, a weight entry |
| **Shared spine** | Shared record fields + record journal + `records` view. | Gives history and "new since" to every record |
| **Review** | The coach's check-in: reads what is new, saves an assessment, a private note and an optional reply. | Weekly review on Monday |
| **Focus** | One line: the client's one priority now. | "Sleep before 23:00" |
| **Request** | The coach asks for one tracker entry now. | "Send a blood report" |
| **Workout feedback** | How the workout felt and if it hurt, on the session itself. | "Too hard", pain: "left knee on lunges" |
| **Check-in screen** | One client screen that records several body measurements for one date. | Weight, waist, hips in one save |
| **Quick amount** | A one-tap value on a number tracker. | Water: 250 / 500 / 750 ml |
| **Goal** | The end result with a date. Pace and projection are calculated. | 82 → 75 kg by 1 March |
| **Health notes** | Conditions, injuries, medications, allergies and doctor's limits. The client writes, the coach reads. | "Knee surgery 2024", "Lactose intolerant" |
| **Sleep** | Bed time, wake time, quality. Duration calculated. | 23:10–06:40, 7 h 30 min |
| **Cycle** | Period start dates. Day of cycle and phase calculated. | Day 22, luteal phase |
| **Symptom** | A symptom with severity, body location and trigger, optionally with a start and an end. | Bloating 3/5 after dinner |
| **Fast** | A fasting window. Can be running now. | 20:00 → 12:00, 16 h |
| **Import** | Data from a phone or watch, written as normal records with a `source`. | Steps from Apple Health |
| **Insight** | A calculated view across records. Never stored. | Weight trend, PRs, workouts done vs expected |

---

## 3. SparkyFitness features and our decision

Status: **Have** = built · **Build #n** = row n of the build order · **Later** = good, not now · **No** = not for a coaching app.

### Nutrition

| Feature in SparkyFitness | What it does | Our status | Where it fits |
|---|---|---|---|
| Food diary by meal | Log foods into breakfast, lunch, … | Have | Nutrition: diary meals |
| Food database + online providers | Search foods, import from OpenFoodFacts, USDA | Partly: 55k seeded foods, no online lookup | Nutrition library |
| Custom foods with servings | Own foods, several serving sizes | Have | Nutrition library |
| Saved meals (food groups) | Log a group of foods at once | Have as recipes and planned meals | Nutrition |
| Quick add calories | Log calories with no food | Have | Nutrition diary |
| Recent and favourite foods | Re-log in two taps | **Build #4** | Nutrition diary |
| Copy foods from another day | Copy yesterday's breakfast | **Build #5** | Nutrition diary |
| Meal plan templates and calendar | Plan meals by day | Have | Nutrition plan |
| Macro and micro goals | Daily targets | Have (targets in the plan) | Nutrition plan |
| Goal presets per weekday | Different targets on training days | Have (day patterns) | Nutrition plan |
| Meal % distribution | Split calories across meals | No | Coach sets meal portions directly |
| Allergens | Mark foods and the user's allergens | Later (with Health notes #8) | Health notes + library |
| Water with containers | One tap = my 750 ml bottle | **Build #3** | Trackers: quick amounts |
| Caffeine and alcohol | Daily totals | Later | Nutrition nutrients |
| Barcode scan | Scan a product | Later (#14) | Nutrition library |
| Food photo AI estimate | Photo → foods | No (now) | — |
| Adaptive TDEE | Calculated energy need from weight and intake | Later (#16) | Insights |
| Nutrient trends | Charts per nutrient | Have (food metrics, day totals) | Insights |
| CSV import | Import diary | No | — |

### Training

| Feature in SparkyFitness | What it does | Our status | Where it fits |
|---|---|---|---|
| Exercise library + custom exercises | Search, filter, own exercises | Have | Training library |
| Body map filter, alternatives | Find by muscle, swap suggestions | Later | Training library |
| Workout presets and plans | Weekly plan of workouts | Have | Training plan |
| Workout logging with sets | Reps, load, RIR | Have | Training sessions |
| Guided workout with rest timer | Step through sets | Have (session screen). No rest timer: Later | Training sessions |
| Cardio with distance and heart rate | Cardio entries | Partly: duration and distance measures. No heart rate | Training sessions |
| **Workout feedback** | Difficulty + pain + pain note after a workout | **Build #1** | Training sessions |
| PR progression | Best sets over time | Have | Insights |
| Training consistency, heatmap | Done vs planned over weeks | Have (expected vs done) | Insights |
| Muscle group recovery | Load per muscle | Later | Insights |
| GPS, laps, HR zones | Device workouts | No | — |
| Hevy / Strava / Liftosaur import | Import workouts | Later (#15) | Imports |

### Body and progress

| Feature in SparkyFitness | What it does | Our status | Where it fits |
|---|---|---|---|
| Body measurements | Weight, waist, hips, neck, body fat, muscle mass | Partly (body weight, waist, steps) | Trackers |
| **Measurements on one screen** | Record many for one date | **Build #2** | Trackers: check-in screen |
| Custom measurements | Own measurement types | Have (custom trackers) | Trackers |
| Progress photos and compare | Front/side/back, side by side | Have | Trackers (photo) |
| Photo timelapse | Animate photos over time | Later | Insights |
| Target weight | Onboarding goal | **Build #6** | Goals |

### Wellbeing and health

| Feature in SparkyFitness | What it does | Our status | Where it fits |
|---|---|---|---|
| Mood | Mood value + tags | **Build #7** (rating). Tags: Later | Trackers |
| Energy, hunger, soreness, bloating, stress | Daily ratings | Have (energy, hunger, soreness, bloating); stress **Build #7** | Trackers |
| Vitals | Blood pressure, glucose, temperature | **Build #7** (seeded number trackers) | Trackers |
| Supplements taken | Daily yes/no | Have (yes_no trackers) | Trackers |
| Sleep | Bed/wake, stages, sleep need | Have "Sleep hours" tracker; full sleep **Build #9** (bed, wake, quality) | Sleep |
| Symptoms | Severity, location, triggers, episodes, treatments | **Build #11** | Symptoms |
| Medications, GLP-1 pens, titration | Schedules, doses, inventory | Client-reported only, in **Health notes #8**. No schedules | Health notes |
| Doctor report, appointments | Share with a doctor | No | — |
| Fasting timer | Start/stop fasts | **Build #12** | Fasting |

### Women's health

| Feature in SparkyFitness | What it does | Our status | Where it fits |
|---|---|---|---|
| Cycle tracking and phase | Period dates, predictions, phase | **Build #10** | Cycle |
| Cycle daily log | Flow, energy, libido | Later (use trackers) | Trackers |
| Fertility (BBT, tests, fertile window) | Trying to conceive | No | — |
| Pregnancy (kicks, contractions, checklist) | Pregnancy companion | No | — |

### Access, platform, devices

| Feature in SparkyFitness | What it does | Our status | Where it fits |
|---|---|---|---|
| Family access with permissions | Others can see your data | Have (coach access, teams) | Client |
| Onboarding questions | Sex, goal, weight, activity | Have (intake forms) | Client |
| Customizable dashboard | Arrange widgets | No | — |
| Reports per area | Charts and tables | Partly (review summary, metrics) | Insights |
| Apple Health / Health Connect | Phone data | **Later #15** | Imports |
| Garmin, Fitbit, Oura, Polar, Withings… | Watch and scale data | Later, after #15 | Imports |
| AI chat logging | Log by chat | No | — |
| MFA, OIDC, backups, admin | Platform | Have or not needed | — |

---

## 4. Build order

One row = one Codex task (gpt-6-astra high, elixir-production skills for the backend, frontend quality kept). Status: `next`, `planned`, `done <commit>`.

| # | Slice | Model change | Coach sees | Client does | Size | Status |
|---|---|---|---|---|---|---|
| 0 | Core domains + reviews + coaching terms | — | — | — | — | done `1e6177a1` |
| 1 | **Workout feedback** | 3 columns on `training_sessions`: `difficulty`, `pain`, `pain_note` | "Pain reported" on the roster; pain at the top of the review | Answers 2 questions on the finish screen | S | done |
| 2 | **Check-in screen** | None. Seed built-ins: neck, hips, chest, arm, thigh, body fat %, muscle mass | One trend per measurement | Records many measurements for one date in one save | S | next |
| 3 | **Quick amounts** | `quick_amounts` (up to 4) on `tracker_assignments` | Sets amounts on the tracker list | One tap records water | S | planned |
| 4 | **Recent and favourite foods** | `favourite_foods` (client, food or recipe) | — | Re-logs a food in two taps | S | planned |
| 5 | **Copy a meal** | None (new entries, normal journal write) | Copied entries show as normal records | Copies a meal from another day | S | planned |
| 6 | **Goals** | `goals` table | Progress, pace, projected date, line on the chart | Sees the goal and progress | M | planned |
| 7 | **More built-in trackers** | None. Seed: mood, stress, resting heart rate, blood pressure (systolic, diastolic), blood glucose, body temperature | Trends | Records them | S | planned |
| 8 | **Health notes** | `health_notes` table | Notes at the top of the client page; new notes in "New since" | Adds and ends notes | M | planned |
| 9 | **Sleep** | `sleep_entries` table | Average sleep, bed-time pattern | Records bed, wake, quality | M | planned |
| 10 | **Cycle** | `period_starts` table | Day of cycle and phase; marks on the weight chart | Records "period started" | M | planned |
| 11 | **Symptoms** | `symptom_entries` table | Symptom counts, triggers | Records a symptom | M | planned |
| 12 | **Fasting** | `fasts` table | Fasts done, average length | Starts and ends a fast | M | planned |
| 13 | Occurrence exceptions + calendar | `occurrence_exceptions` (shape agreed, M8) | Moved/skipped workouts | Moves a workout | L | later |
| 14 | Barcode scan | Food lookup by barcode | — | Scans a product | M | later |
| 15 | Imports (Apple Health / Health Connect) | `source` on imported records | Imported values marked | Connects the phone | L | later |
| 16 | Insights: energy balance (TDEE), muscle recovery, timelapse | None (calculated) | New insight cards | — | M | later |

Rows 1–5 make logging quick and catch pain early. Rows 6–12 add the special health models one at a time.

---

## 5. Slices in detail

### 1. Workout feedback
- **Idea from:** SparkyFitness `workout_feedback` (difficulty, pain, pain note).
- **Why:** a coach must know at once when a client gets hurt or a workout is too hard or too easy.
- **Model:** three columns on `training_sessions`, all nullable (null = not answered):
  - `difficulty`: `too_easy`, `just_right`, `too_hard`.
  - `pain`: boolean.
  - `pain_note`: text, 1–500 chars, trimmed (blank becomes null). Check constraint: `pain_note IS NULL OR pain`.
  - The fields are written with the session through the journal, so a change shows in "New since".
- **API:**
  - The `Session` type adds `difficulty`, `pain` and `pain_note`.
  - `Session.update` (used by update and complete) accepts the same three fields.
  - A note without `pain: true` gets 422.
  - Repeating a complete compares these fields too.
  - Roster row: `pain_reported` (boolean) and a `pain` filter.
  - Review screen: `pain_reports` (session id, date, title, difficulty, note), newest first.
- **Rule for "pain reported":** a completed session with `pain = true` that has a `record_changes` row after the "New since last review" cutoff. One query serves the roster (all listed clients in one query) and the review screen.
- **Client:**
  - The "Finish this workout?" dialog asks "How did it feel?" (Too easy / Just right / Too hard) and "Any pain or discomfort?" (No / Yes). Yes opens "What hurts, and when?" (500 chars). Both answers are optional.
  - A completed workout shows the answers.
  - "Correct this workout" can change the answers.
- **Coach:**
  - Roster: a "Pain reported" badge and a filter.
  - Review screen: a "Pain reported" section before "New since last review".
  - Session page: a "Client feedback" section.
  - Training history: a "Pain" badge on rows that have pain.
- **Not in this row:** sharing the pain note to chat. The note stays on the session.
- **Done when:** a client finishes a workout with pain and a note. The coach sees "Pain reported" on the roster and the note first on the review screen. After the coach saves a review, the badge goes away.

### 2. Check-in screen
- **Idea from:** SparkyFitness `check_in_measurements` (many measurements on one date).
- **Why:** body measurements are taken together, once a week. One form for each is slow.
- **Model:** no change. New built-in number trackers. Each value is its own tracker entry and keeps its own trend.
- **Client:** "Measurements" screen shows the assigned body trackers for one date; one save writes all entries in one journal sequence.
- **Done when:** a client records weight, waist and hips together, and the coach sees three trends.

### 3. Quick amounts
- **Idea from:** SparkyFitness `user_water_containers`.
- **Why:** water and steps are recorded many times a day. One tap beats a form.
- **Model:** `tracker_assignments.quick_amounts` (array of up to 4 numbers in the base unit, number trackers only).
- **Done when:** a client records 750 ml of water with one tap.

### 4. Recent and favourite foods
- **Idea from:** SparkyFitness `food_favorites`.
- **Model:** `favourite_foods` (client, food or recipe, exactly one). "Recent" is calculated from diary entries.
- **Done when:** a client adds yesterday's breakfast food again in two taps.

### 5. Copy a meal
- **Model:** none. Copying writes new diary entries with new ids through the journal.
- **Done when:** a client copies Monday's lunch to today in two taps.

### 6. Goals
- **Model:** `goals`: client, tracker or exercise (exactly one), `start_value`, `start_on`, `target_value`, `target_on` (nullable), `ended_at`, `end_reason` (achieved, changed, stopped). One active goal per tracker or exercise. A change ends the old goal and starts a new one.
- **Calculated:** progress, rate needed, rate now (last 4 weeks), on pace / behind by N, projected date, achieved. Direction comes from start vs target.
- **Done when:** a coach sets 82 → 75 kg by 1 March; the client page shows progress and pace; the weight chart shows the goal line.

### 7. More built-in trackers
- **Model:** none. Seed only.
- **Done when:** the coach can add each new tracker to a client's list.

### 8. Health notes
- **Model:** `health_notes`: client, `type` (condition, injury, medication, allergy, limit), `text`, `started_on`, `ended_on`. A record table on the shared spine.
- **Rule:** only the client writes. The coach reads. No doses, schedules or reminders.
- **Done when:** a client adds "knee pain, no deep squats"; the coach sees it at the top of the client page and in "New since".

### 9. Sleep
- **Idea from:** SparkyFitness `sleep_entries`. Replaces the "Sleep hours" tracker for clients who use it.
- **Model:** `sleep_entries`: client, `bed_at`, `woke_at`, `quality` (1–5, nullable), note. The date is the wake date. Duration is calculated.
- **Done when:** a client records a night; the coach sees average duration and bed times for the week.

### 10. Cycle
- **Idea from:** SparkyFitness `cycles`.
- **Model:** `period_starts`: client, `started_on`. Cycle length, day of cycle and phase are calculated from the last starts.
- **Done when:** a client records a start; the coach sees "Day 22, luteal" and phase marks on the weight chart.

### 11. Symptoms
- **Idea from:** SparkyFitness `symptom_entries`, `user_custom_symptoms`. Existing "Bloating" rating tracker stays for simple use.
- **Model:** `symptom_entries`: client, symptom (from a small library), severity 1–5, body locations, triggers, `started_at`, `ended_at` (nullable), note.
- **Done when:** a client records bloating 3/5 after dinner; the coach sees symptom counts and common triggers.

### 12. Fasting
- **Idea from:** SparkyFitness `fasting_logs`.
- **Model:** `fasts`: client, `started_at`, `planned_end_at`, `ended_at` (nullable while running).
- **Done when:** a client starts and ends a 16 h fast; the coach sees fasts done this week.

---

## 6. Not for us

AI chat and food-photo estimates, fertility and pregnancy tools, GLP-1 pen inventory and medication schedules, doctor reports, GPS maps and 50-column watch summaries, customizable dashboards, meal % distribution, CSV imports.

## 7. Rules for every slice

- Backend: `elixir-production` skills, `%Ctx{}` first, typed routes, `rtk just gen-api`.
- Frontend: match existing quality and patterns; follow the app `AGENTS.md`.
- Every new record table uses the shared spine (rule 3).
- Tests for the slice's rules. Gates: `rtk mix precommit`, `gen-api`, both app builds, `rtk pnpm -C frontend lint:ci`, the existing browser flows, and one new browser flow (coach 1280 and 375, client 375).
- No new research. A question gets the simplest option, written in the slice report.
- Commit only when the user agrees.

---

## Appendix A. SparkyFitness structure

SparkyFitness is a single-user app with about 100 tables. It makes one table for each kind of fact. Its generic pair `custom_categories` + `custom_measurements` is the same idea as our Trackers. It has no shared history spine, so each feature builds its own history and sharing.

| Group | SparkyFitness tables | For us |
|---|---|---|
| Who the client is | `profiles`, `onboarding_data`, `user_allergen_preferences`, `family_access` | Client, intake forms, coaching terms, coach access |
| Library | `foods`, `food_variants`, `meals`, `exercises`, `custom_categories`, `user_custom_symptoms`, `user_custom_moods`, `medications`, `user_water_containers` | Exercises, foods, recipes, trackers |
| Intent | `workout_plan_templates`, `workout_presets`, `meal_plan_templates`, `user_goals`, `goal_presets`, `weekly_goal_plans`, `medication_schedules`, `medication_titration_steps` | Training plan, nutrition plan, tracker list; Goals #6 |
| Records | `exercise_entries` + sets, `food_entries`, `water_intake_entries`, `check_in_measurements`, `check_in_photos`, `mood_entries`, `sleep_entries`, `vitals_entries`, `symptom_entries`, `medication_entries`, `injection_entries`, `fasting_logs`, `cycle_daily_entries`, `custom_measurements`, `workout_feedback` | Sessions, meals, tracker entries; own tables in #1, #9–#12 |
| Device data | `daily_health_metrics`, `health_metric_samples`, `sleep_entry_stages`, GPS, laps, HR zones, `external_data_providers` | Imports #15 |
| Life stage and medical | `cycles`, `cycle_test_entries`, `pregnancies`, kick and contraction logs, `health_appointments`, `medication_pens` | Cycle #10, Health notes #8; the rest: No |
| Calculated insights | `day_classification_cache`, `sleep_need_calculations`, correlations, adaptive TDEE, PR charts, muscle recovery | Insights (calculated, never stored) |
| Platform | auth, MFA, OIDC, backups, admin, AI chat, rate limits | Have or not needed |

## Appendix B. What a coach needs

1. **See the client whole:** goal, focus, intake, health notes, cycle phase today. → #6, #8, #10
2. **Plan:** training, nutrition targets, what to track and when. → Have
3. **Know what happened:** workouts, meals, body numbers, photos, sleep, mood, pain, symptoms. → Have, #1, #2, #7, #9, #11
4. **Catch problems early:** pain, sleep down, weight stalled, missed workouts, no records. → #1, reviews (have)
5. **Judge progress against a goal:** current vs target, pace, time left. → #6
6. **Respond:** review, reply, change the plan, request a tracker. → Have
