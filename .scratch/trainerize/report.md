# Trainerize research for Easy

Research date: 5 October 2026. Account: instwiz. Method: read-only browser inspection, local design documents, and official Trainerize help.

The main recommendation is to keep Easy's separation of plans, revisions, occurrences, and records. Add clear calendar exceptions and a way to prescribe progression across weeks. Do not replace the Review model with form submissions or compliance scores.

## Evidence and limits

- **UI** means a screen or form inspected in the signed-in account. Screenshot numbers refer to the map below.
- **Help** means documented behavior from Trainerize's official help. It was not tested by changing this account.
- **Inference** means a proposed explanation of the UI. It is not a verified database schema.
- **Proposal** means a suggestion for Easy. It is not an existing requirement.
- **API:** Sections 1–7 record the first, UI-focused pass. Section 8 adds a second pass through native browser DevTools, with seven verified business-route response bodies. Route IDs establish addressable resources, not table names or foreign keys.

The account uses the Free plan. One coaching client and one owner were visible in the inspected lists. Some features require a paid plan or an add-on. The client has a small amount of old activity and many empty current views. Empty views do not prove that the product lacks a feature.

No client, program, meal, habit, form, message, setting, payment, or integration was saved or changed. No communication was sent. Forms were closed without submission. The workout builder asked to discard an unsaved session even though no prescription values were entered; that session was discarded. The login's default persistent sign-in option was cleared. Normal login and page access can still update service access logs.

The report compares **documented Easy design**, not shipped code. The core overview and training document explicitly say “Not implemented.” Existing source was not audited. The screenshots contain account information and must remain with this private research.

Easy sources:

- [Core overview](../core-domains/overview.md): sections 2–10 define identity, values, time, records, and reviews.
- [Training model](../core-domains/training.md): sections 2, 4, and 5 define storage, prescriptions, and dated occurrences.
- [Check-ins spec](../check-ins/spec.md): the coach workflow, Tracker experience, and excluded scope.
- [Coaching terms spec](../coaching-terms/spec.md): decisions E1–E8, M1–M7, and A1–A4 define lifecycle and access.

## 1. Map of the app

Screenshots are in [screenshots](screenshots/). Each link below opens one saved screen. These are viewport captures, not complete exports of long pages.

| Area inspected | Screens and observations | Screenshots |
|---|---|---|
| Coach overview | Attention tags, recent activity, business growth, sign-ins, workouts, and compliance. The new Overview switch was not used because it changes a preference. | [01-overview.jpg](screenshots/01-overview.jpg) |
| Client roster | Prospects, Pending, Coaching, Basic, Deactivated. Summary, Exercise, Nutrition, Weight, Payment, and Engagement view controls. Filters include trainer, type, location, tag, program, group, challenge, and client type. | [02-clients.jpg](screenshots/02-clients.jpg) |
| Client profile | Summary, Consultation, Attachments, Sales, Invoices, and Forms. Summary includes trainer, location, access type, units, time zone, look-ahead, program, goals, and attention tags. Sales and Invoices require payment setup. | [03-client-summary.jpg](screenshots/03-client-summary.jpg), [04-client-forms.jpg](screenshots/04-client-forms.jpg) |
| Client workspace | Dash, Calendar, Goals and Habits, Training Program, Meal Plan, Progress, Badges Earned, and Classes. The Dash says the client sees the same view without editing controls. This is a coach preview, not a separate client login. | [05-client-dashboard.jpg](screenshots/05-client-dashboard.jpg) |
| Logged activity | A completed workout shows its date, start, duration, prescription, RPE, and comments. A meal shows its time, nutrient totals, goal comparison, and comments. | [06-logged-workout.jpg](screenshots/06-logged-workout.jpg), [07-logged-meal.jpg](screenshots/07-logged-meal.jpg) |
| Client programs | Main program, custom program, dated phases, expiry warnings, and a read-only master link. The selected expired phase had no workouts to display. | [08-linked-client-program.jpg](screenshots/08-linked-client-program.jpg) |
| Client calendar | Program filters, scheduled/completed legend, monthly activity counts, and scheduling for workouts, cardio, body stats, photos, auto messages, and forms. Repeat form has frequency, interval, weekdays, and duration. | [09-client-calendar.jpg](screenshots/09-client-calendar.jpg), [10-recurrence-form.jpg](screenshots/10-recurrence-form.jpg) |
| Goals and habits | Upcoming, current goals, current habits, and past habits. Goal menu offers body weight/custom fitness goals, nutrition, water, steps, and habits. Custom habit has a name, start date, weeks, and weekdays. | [11-goals.jpg](screenshots/11-goals.jpg), [12-habit-form.jpg](screenshots/12-habit-form.jpg) |
| Client meal plan | No plan was available to view. The page offers a PDF, smart meal plan, or flexible meal plan. No plan was started. | [13-meal-plan-options.jpg](screenshots/13-meal-plan-options.jpg) |
| Progress | Insights, photos, biometrics, body measurements, calipers, nutrition center, nutrition graphs, steps, sleep, exercise, cardio, habits, weekly compliance, and workout review. Each main progress category was opened. | [14-progress-insights.jpg](screenshots/14-progress-insights.jpg), [15-nutrition-center.jpg](screenshots/15-nutrition-center.jpg), [16-weekly-compliance.jpg](screenshots/16-weekly-compliance.jpg) |
| Master programs | Shared/personal libraries, tags, trainer browsing, summary/subscribers, calendar, and phases. An eight-week program has two four-week phases. | [17-master-program.jpg](screenshots/17-master-program.jpg) |
| Workout tools | Builder and progression spreadsheet inspected without saving. Builder supports supersets, circuits, sets, targets, and rest. Spreadsheet shows Day 1, 8, 15, and 22. | [18-workout-builder.jpg](screenshots/18-workout-builder.jpg), [19-progression.jpg](screenshots/19-progression.jpg) |
| Exercises and master workouts | Exercise search, media variants, system/custom content, and a paid gate for custom creation. Master workouts expose copy, move, import, duplicate, tags, and print. Existing regular and circuit workouts were listed. | [20-exercise-paid-gate.jpg](screenshots/20-exercise-paid-gate.jpg), [21-master-workouts.jpg](screenshots/21-master-workouts.jpg) |
| Meals, recipes, foods | Recipe library, meal category and calories per serving, recipe detail, ingredients, directions, and tags. Custom foods list was empty. Adding food requires a paid plan and Advanced Nutrition Coaching. | [22-meal-library.jpg](screenshots/22-meal-library.jpg), [23-food-library.jpg](screenshots/23-food-library.jpg), [36-food-paid-gate.jpg](screenshots/36-food-paid-gate.jpg), [37-recipe-detail.jpg](screenshots/37-recipe-detail.jpg) |
| Master habits | Nutrition Portion Guides, Nutrition, Active Living / Movement, Mindfulness, and Sleep. Nutrition includes slow eating, meal preparation, hydration, and alcohol avoidance. | [24-habit-library.jpg](screenshots/24-habit-library.jpg) |
| Master forms | All, Check-in, and Onboarding filters. System onboarding preview and a blank check-in builder were inspected. | [25-onboarding-form.jpg](screenshots/25-onboarding-form.jpg), [26-check-in-builder.jpg](screenshots/26-check-in-builder.jpg) |
| Communication | Message list with active/archive controls. Example group with posts, file sharing, reactions, program attachment, and Summary/Files/Timeline/Members. No message thread was opened or reply sent. | [27-group.jpg](screenshots/27-group.jpg), [28-messages.jpg](screenshots/28-messages.jpg) |
| Team and permissions | Owner, location assignment, client count, compliance/engagement views. Permission matrix for five team roles and four client access types. | [29-team.jpg](screenshots/29-team.jpg), [30-permissions.jpg](screenshots/30-permissions.jpg) |
| Settings and automation | About, location navigation, event types, custom tags, automatic tags, onboarding events, and automatic message triggers. No controls were changed. | [31-auto-messages.jpg](screenshots/31-auto-messages.jpg) |
| Coach scheduling | Appointment/class/personal-event calendar, default availability, date overrides, vacation link, and Google Calendar connection option. | [32-availability.jpg](screenshots/32-availability.jpg), [33-coach-calendar.jpg](screenshots/33-coach-calendar.jpg) |
| Business and payments | Manage, business dashboard, announcements, client referrals, payments, FitMetrics, add-ons, and integrations were opened. Business tools and FitMetrics have paid gates. Payments offers setup. | [34-business-gates.jpg](screenshots/34-business-gates.jpg), [35-add-ons.jpg](screenshots/35-add-ons.jpg), [38-payments.jpg](screenshots/38-payments.jpg) |

Challenges had no joined challenges. Badges showed one workout milestone. Classes had no upcoming sessions. Client roster requests produced an error while moving between lifecycle categories; category descriptions were visible, but counts in those categories were not verified. No attempt was made to repair the account.

## 2. Their domain model

The names below describe concepts visible in the product. They are not claims about Trainerize's internal tables.

### People, business, and access

**UI:** A business has a unique sign-in address, locations, trainers, and clients. A client has an assigned trainer and location. Its profile includes time zone, height, activity level, units, access type, and meal workflow. Weight, distance, and body-stat units can differ. The inspected profile used kg, miles, and inches together. [03, 29, 30]

**UI:** Prospects come from consultation booking. Pending describes coaching clients above the account limit. Coaching consumes a paid seat. Basic permits booking and payment functions. Deactivated cuts off app access. These meanings differ from Easy's invitation and term-derived states.

**UI:** Client access types are Basic, Full Access 2-way messaging, Full Access 1-way messaging, and Offline. Team roles are Owner, Admin, Manager, Shared Trainer, and Regular Trainer. Client visibility can cover all locations, assigned locations, or only assigned clients. Library-edit permissions are separate. [30]

**Inference:** Lifecycle, seat entitlement, communication permission, and team access are distinct concerns, even though some client labels bundle them together. No term-history model was visible. This does not prove that the service lacks internal history.

### Training libraries, programs, and records

**UI:** Master programs contain phases and a program calendar. Phases contain workouts. A workout contains exercise references, instructions, target text or time, set counts, and rests. A workout has an author and creation/update dates. Exercise media and instructions appear with the workout. Shared and personal libraries have tags. [17–21]

**UI:** The client can have a main program and other programming. A subscribed program has its own client route and a master-link indicator. It cannot be edited from the inspected client phase. The master summary lists subscribers. The UI also offers a custom client program. [08, 17]

**Help:** Subscribing connects clients to a master. Master edits apply to subscribers. Copying makes a standalone client version that can be customized independently. [Subscribe versus copy](https://help.trainerize.com/hc/en-us/articles/11402922731540-What-is-the-Difference-Between-Subscribing-and-Copying-a-Program-to-a-Client).

**UI:** The progression spreadsheet has different instructions, sets, and targets for scheduled days. It offers per-day editing and copying of progressions between days. This is distinct from changing the base workout. [19]

**UI:** A completed workout has a dated completion state, start time, elapsed duration, a prescription display, RPE, and comments. Its menu offers Edit, Workout progress, Print, and Delete. The inspected workout did not expose useful performed-set measurements. The presence of Edit does not establish an audit trail. [06]

**Inference:** Template identity, client program identity, a scheduled day, and a completion are separate concepts. Their exact links, revision IDs, and history storage remain unknown.

### Nutrition and habits

**UI:** Nutrition has separate recipe/meal libraries, custom foods, client meal plans, daily goals, and logged meals. Goals display calories plus macro percentages and grams. Meal plans can use a PDF or structured smart/flexible planning. [11, 13, 22, 23]

**UI:** A recipe has servings, ingredient amounts, units, calories/macros, meal categories, dietary labels, preparation/cooking information, directions, and tags. Fast Thai Wrap showed household measures beside some gram weights. A serving selector can choose the original recipe portion. [37]

**UI:** The Nutrition Center has daily targets and weekly summaries: logged meals, calories, macros, protein sources, water, recipes, and other nutrients. The inspected week had no entries. The older logged meal showed zero calories and “No macros”; the screen alone cannot establish whether the value meant empty input or genuine zero intake. [07, 15]

**UI:** Habits are a library concept and a client assignment concept. Custom assignments have a name, start date, duration, and weekdays. Goals and habits have current/upcoming/past views. The library includes nutrition behaviors that do not require calorie logging. [11, 12, 24]

**Inference:** A habit definition is separate from its practice schedule and its completion. No general custom numeric Tracker builder was found. Do not treat “not found” as “not supported.”

### Measures, forms, reviews, and communication

**UI:** Progress has predefined measures: weight, fat, lean mass, BMI, resting heart rate, blood pressure, body circumferences, calipers, steps, and sleep. Sleep supports manual entry and external data. The integration catalogue describes nutrition and device imports. These are product capabilities, not evidence that the inspected client connected a device. [14, 30]

**UI:** Forms have a name, coach-only description, type, questions, system/custom origin, and active state. The blank builder offers paragraph, single answer, multiple answers, text answer, and 1–10 rating. Onboarding asks about goals, experience, equipment, availability, and other context. The client Forms view offers a date and Compare. [04, 25, 26]

**Inference:** A form definition, scheduled request, and submitted answers are distinct. The UI does not establish immutable question revisions. No core screen equivalent to Easy's saved Review with a private assessment and change-sequence boundary was verified.

**UI:** Messages support private one-to-one and group threads. Community groups have members, content, files, and optional add-on programming. The example group explains trainer-only announcements and automatic achievement posts. That example is product demonstration content, not evidence of real member behavior. [27, 28]

**UI:** FitMetrics advertises AI check-ins, meal-photo analysis, drafted messages, and team visibility. Its paid gate prevented inspection of those workflows. Marketing claims are not verified behavior.

### Calendars, attention, and permissions

**UI:** Client programming and coach appointments have separate calendars. Availability distinguishes a weekly default from date-specific overrides. Event types distinguish classes, one-to-one appointments, and prospect bookings. Session credits and booking/cancellation controls appear in event settings. [09, 10, 32, 33]

**UI:** Automatic tags derive attention from workout compliance, nutrition compliance, sign-ins, inbound/outbound messages, and missed forms. The settings describe weekly compliance calculations on Sunday night. Workout compliance uses completed coach-scheduled workouts/cardio; nutrition compliance uses days that meet a goal. Exact rounding and historical recalculation were not tested.

**UI:** Strict Mode is selected in this account. Clients can reschedule workouts but cannot delete them. The page says uncompleted items remain missed. Loose Mode allows both moving and deletion. Program-update notifications, client-built workouts, water tracking, and calendar look-ahead are separate controls. [30]

## 3. How they handle change over time

| Change | Evidence | Meaning for Easy |
|---|---|---|
| Edit a master with subscribers | **UI + Help:** Client phase is read-only. Official help says master edits propagate; independent copies do not receive them. The handling of completed history is not established. [08, subscribe/copy source above] | Keep copy-on-assignment as the default. If linked delivery is added later, publish explicit revisions with effective dates. |
| Change one scheduled workout's prescription | **UI:** The progression spreadsheet varies scheduled days. **Help:** It can also swap exercises for particular workouts. [19, source below] | Give progression an explicit value and occurrence association. Do not encode it only in prose. |
| Move or reschedule a progressed workout | **Help:** Unscheduling, rescheduling, or moving removes progressions. The source does not say that logged performance is deleted. | A move must preserve occurrence identity and its selected prescription. This is the strongest reason to bring forward occurrence exceptions. |
| Move an item across phases | **Help:** The phased-program guide permits dragging within a phase, not into another phase. | Define what crossing a plan or term boundary means. Do not silently attach an old occurrence to a new plan. |
| Skip or remove scheduled work | **UI + Help:** Strict/Loose permissions govern deletion. A separate explicit skipped-workout outcome was not verified. [30] | Keep missing, skipped, cancelled, and completed distinct. A client decision is a stored fact; missed is a derived interpretation. |
| Correct a completed workout | **UI:** An Edit option exists. It was not used. | Audit retention, PR recomputation, and historical prescription rules remain open for Trainerize. Easy already journals record corrections. |
| Change a nutrition goal | **Help:** Past meal details retain the goal from logging time, while compliance uses the current goal. Updating a past meal can update that day's compliance. The timing of all recalculations is unclear. | Show intake against the applicable dated target. Do not let a current goal silently redefine an old review. |
| Correct a custom food | **Help:** Food editing/deletion is supported. Effects on recipes, assigned plans, and logged nutrients are not specified. | Keep Easy's copied nutrient values at publication and as eaten. |
| Change exercise information | **Help:** Exercise Notes are shared across past/future workouts and have no edit history. This says nothing conclusive about library names, media, or logged sets. | Keep current reusable coaching notes separate from historical session notes. |
| Edit a form already scheduled | **Help:** Definition edits do not automatically change already scheduled forms. They must be scheduled again. Submitted forms can be compared. | If forms are added later, bind each request and answer to a fixed question version. |

Official sources for the table:

- [Progressions Spreadsheet](https://help.trainerize.com/hc/en-us/articles/212130826-Progressing-Regressing-Workouts-with-the-Progressions-Spreadsheet).
- [Phased programs](https://help.trainerize.com/hc/en-us/articles/115004404763-What-is-a-phased-program-and-how-to-build-one).
- [Workout permissions](https://help.trainerize.com/hc/en-us/articles/208689106-How-to-Manage-Client-Permissions-for-Workouts).
- [Nutrition goals](https://help.trainerize.com/hc/en-us/articles/360001127403-How-to-Create-a-Nutrition-Goal-for-a-Client).
- [Custom foods](https://help.trainerize.com/hc/en-us/articles/7454634818580-How-to-add-a-custom-food-to-the-Foods-Master-library).
- [Exercise Notes](https://help.trainerize.com/hc/en-us/articles/48453656208660-How-to-Use-Exercise-Notes-in-Workouts).
- [Check-in forms](https://help.trainerize.com/hc/en-us/articles/31369316335124-Sharing-Check-In-Forms-with-Clients).

## 4. Feature inventory

“Yes” means specified in the supplied Easy design. “Partly” includes deferred detail or a narrower design. “No” means absent or explicitly excluded in those documents, not necessarily absent from the repository.

| Feature | What it does | User | Easy design | Evidence or distinction |
|---|---|---|---|---|
| Client roster and filters | Finds clients by service/access and attention | Coach | Yes | Coaching terms U1; check-ins roster. Trainerize uses different categories. |
| Returning-client history | Separates periods of coaching | Coach/client | Yes | Coaching terms E1/E6. Trainerize term history was not verified. |
| Offline client | Coach works with a client who does not use the app | Coach | No | Deferred in E8; Trainerize Offline appears in permissions. |
| Training library | Reuses exercise and plan definitions | Coach | Yes | Core sections 3–4. |
| Independent client copy | Customizes a template for one client | Coach | Yes | Assignment creates revision 1. |
| Linked master subscription | Propagates one program to many clients | Coach | No | Easy templates do not control assigned plans. |
| Shared/personal libraries | Controls reusable content ownership | Coach/team | Partly | Easy has business scope and creator; no personal/shared access policy in these docs. |
| Concurrent main/add-on programs | Offers more than one training program | Coach/client | No | Easy permits one plan per domain per date. |
| Supersets and circuits | Groups exercise work | Coach/client | Yes | Training content supports straight, superset, circuit. |
| Timed exercise targets | Prescribes duration | Coach/client | Yes | Set duration exists. A dedicated interval protocol builder remains unverified in Trainerize. |
| Warmup/working/drop sets | Gives sets different meanings | Coach/client | Yes | Specified by Easy; Trainerize set-kind controls were not verified. |
| RPE, RIR, tempo | Prescribes or records effort and execution | Coach/client | Yes | Typed in Easy. Trainerize RPE record and RIR prose were visible; full typed support was not verified. |
| Multi-week progression | Varies prescription across scheduled weeks | Coach | Partly | Effective revisions exist; reusable relative-week progression is not defined. |
| Calendar recurrence | Repeats prescriptions | Coach/client | Partly | Easy currently supports a one-week cycle. |
| Move/cancel one occurrence | Changes one date without rewriting the series | Coach/client | Partly | `occurrence_exceptions` is deferred. |
| Workout history and PRs | Reviews completed training | Coach/client | Yes | Session/set records and calculated PRs. |
| Recipe and food library | Builds meals from ingredient portions | Coach/client | Yes | Core nutrition library and content. |
| Recipe labels/preparation time | Helps a client select and cook meals | Coach/client | Partly | Easy has tags/instructions; prep time and dietary-label rules are not defined. |
| Nutrition targets | Shows calories and macros against goals | Coach/client | Yes | Target ranges and dated plan revisions. |
| Smart plan generation | Creates nutrition plans from preferences | Coach | No | Trainerize add-on advertised; builder not tested. |
| Meal diary and nutrient totals | Records actual intake | Coach/client | Yes | Diary rows, as-eaten nutrients, derived totals. |
| Habit practice schedule | Reminds clients to perform a behavior | Coach/client | Partly | Tracker timings exist; binary practice and selected weekday patterns are not explicit. |
| Custom measures and documents | Records flexible client values | Coach/client | Yes | Tracker kinds cover number, rating, text, photo, document. |
| Trends and photo comparison | Reviews change across dates | Coach/client | Partly | Trends and latest/previous comparison specified; arbitrary dates deferred. |
| Wearable imports | Imports steps, sleep, and biometrics | Client/coach | No | Not defined by these four docs. |
| Onboarding questionnaires | Collects structured starting context | Client/coach | No | Explicitly excluded by check-ins. |
| Scheduled check-in forms | Requests a dated set of answers | Client/coach | No | Easy uses ongoing records and Reviews. |
| Saved coach Review | Records assessment, private note, and reply | Coach/client | Yes | Core section 8. Equivalent core Trainerize workflow not verified. |
| Changes since last review | Surfaces late edits and removals | Coach | Yes | `record_changes` and `reviewed_through_seq`. Trainerize equivalent not verified. |
| Messages and record comments | Discusses a record in context | Coach/client | Partly | Easy chat references records; separate comment/reaction threads not specified. |
| Community groups/challenges | Shares content and group achievements | Coach/client | No | Not defined by supplied design. |
| Attention filters | Identifies work or clients needing review | Coach | Yes | Derived due/open request views and manual assessment. |
| Calculated compliance scores | Rates completion against goals | Coach | No | Explicitly excluded. Raw done/expected counts are included. |
| Automatic messages | Sends event-triggered engagement content | Coach/client | No | Excluded beyond Tracker reminders. |
| Appointment booking/classes | Schedules coach time | Coach/client | No | Not defined by supplied design. |
| Location-based team permissions | Shares clients by team/location | Team | Partly | Easy owner/all and coach/assigned access; location hierarchy not specified. |
| Client units/time zone | Interprets dates and measurements | Coach/client | Yes | Coaching terms M1/M7; core record time zone and base units. |
| AI check-in and meal analysis | Drafts feedback or estimates food values | Coach/client | No | FitMetrics is gated. Easy defers AI report parsing, which is a different feature. |

## 5. What works well, and what is weak or confusing

### What works well

1. **The attention list has concrete reasons.** “Need new training phases” and “Not messaged lately” lead to client work. Easy can use similarly direct labels without adding stored risk scores. [01, 03]
2. **Linked content is clearly marked.** The client phase explains that it is read-only because it comes from a master. This prevents a coach from assuming a local edit is available. [08]
3. **Progression is visible across days.** A spreadsheet makes changing targets over four weeks easy to inspect. It exposes time as part of the prescription. [19]
4. **Nutrition supports several coaching styles.** Goals, full meal logging, recipe plans, PDFs, and habits are separate choices. A client need not start with a detailed recipe plan. [11–13, 24]
5. **The client preview reduces uncertainty.** The coach can see today's tasks, goals, progress, and achievements in one workspace. [05]
6. **Roles are explained by capability.** The permission matrix shows scope and allowed work, not only role names. [30]

### Weak or confusing points

1. **Moving a workout can remove its progression.** This is documented behavior, not a reproduced account defect. Date and prescription are too closely coupled from the user's perspective. See section 3.
2. **Free-text targets mix different facts.** A rep range and execution instruction occupy the same field. Easy's typed target plus notes is easier to validate and compare. [18]
3. **A meal display can look precise without useful input.** The inspected meal showed zero calories, no macros, and zero goal values. The underlying missing-data meaning was not visible. Easy must keep unknown and zero distinct. [07]
4. **The client summary and meal-plan page disagree at a glance.** The summary displayed a meal-plan name, but the Meal Plan page said there was no plan to view. The cause was not established. Avoid presenting a plan label as proof that a usable plan exists. [03, 13]
5. **The recipe metadata can contradict its directions.** Fast Thai Wrap said “Cooking No,” while its directions used an air fryer. This is a content consistency issue in the inspected recipe. [37]
6. **The first dashboard has much promotional content.** Coaching attention competes with classes, referrals, resources, and upgrades. Easy's first screen should prioritize reviews and client records. [01]
7. **Some labels combine unrelated decisions.** Full Access plus messaging direction combines service access and communication policy. Keep lifecycle dates separate from permissions.
8. **Compliance changes can confuse history.** Official nutrition help distinguishes saved meal goals from current-goal compliance. Easy should identify the target date and revision behind every comparison.

## 6. Suggestions for Easy, ranked by value

These are proposals only. None of the referenced specifications was edited.

### 1. Bring forward individual occurrence exceptions

**Value: high. Change:** Core overview section 4 and training occurrence selection.

The core design already reserves `(plan_id, entry_id, original_date)` as an occurrence identity. Keep it when an occurrence moves. Add the deferred exception mechanism before a calendar permits dragging, cancelling, or skipping.

An exception needs the occurrence key, the decision, a destination date when moved, actor, and change time. Decide whether client “skip” is separate from coach “cancel”; do not infer either from no record. Journal later corrections. Use the original key for completion matching and denominator calculation. A move must not erase the selected prescription or progression.

**Trainerize example:** Repeat options exist, but official help says moving removes progressions. [10, 19; section 3]

**Simple Made Easy test:** Separate identity from placement. Store the decision once. Calculate the displayed date and fulfillment.

### 2. Define progression across relative weeks

**Value: high. Change:** Training content in `training.md` section 4 and overview plan content.

An effective-dated client revision can change a plan, but it does not fully define a reusable eight-week template with different weekly targets. `cycle_weeks = 1` cannot express that by itself.

Specify the smallest initial requirement: different targets for a stable exercise/set identity on selected relative weeks. Store those prescription values in immutable plan content. Preserve IDs where the prescribed item is the same. Show a preview across weeks before publishing. Avoid a general progression rule language until concrete programs require one.

Decide how the template's relative week maps to the client's start date. Then decide how a moved occurrence retains that week's value. Do not add a separate authoritative calendar prescription and let it drift from the plan.

**Trainerize example:** Two four-week phases and Day 1/8/15/22 progressions. [17, 19]

### 3. Make every summary show its evidence and target date

**Value: high. Change:** Check-ins summary rules and core overview section 10. No new score table.

Show completed/expected counts, not an unexplained percentage. Link each count to occurrences and records. Show extra sessions separately. For food, distinguish days with entries, missing intake, and known zero. Display which target revision applies and flag a target changed during the day.

Retain the existing `record_changes` sequence and Review snapshot boundary. These already handle late edits more precisely than any review workflow verified in Trainerize.

**Trainerize example:** Attention filters are useful, but meal/compliance displays need clear denominators and historical target rules. [01, 07, 15, 16]

### 4. Separate habit practice from numeric measurement

**Value: medium to high. Change:** Tracker kinds, entries, and assignments in core sections 3, 5, and 6; check-ins Tracker experience.

First decide whether Easy must support “I practiced this habit today.” The current kinds do not express a binary practice directly. A rating of 1 is a poor substitute.

If required, add one explicit binary entry kind with defined values. No entry remains unknown. An explicit “not done” is a recorded answer. Do not store streaks or compliance states. Calculate them only when their definition is clear.

Add selected weekdays only when needed; do not introduce full calendar recurrence rules. Keep assignment date history when timing changes.

**Trainerize example:** Custom habits use a practice schedule, while weight and sleep use measurements. [12, 24]

### 5. Improve library content and client previews before adding new domains

**Value: medium. Change:** Library UI, plan builder, and nutrition library fields.

Add useful seed habits, exercise filters, recipe tags, and a preview of the client's Today screen. Much of this fits the current model. A preview should explain future revisions and the active date without changing account preferences.

For recipes, consider optional `preparation_minutes` and `cooking_minutes`. Use structured dietary/allergen facts only when the source and maintenance rules are defined. Do not infer safety from a free-text tag. Keep servings, ingredient amounts, and copied nutrients as the single nutrition basis.

**Trainerize example:** Recipe cards, portions, and directions make food plans practical; the inspected preparation label also shows why metadata needs consistent rules. [22, 37]

### 6. Keep copies independent; postpone live subscriptions

**Value: medium. Change:** Clarify assignment semantics in overview section 4. No immediate new table.

Make “Copy for this client” explicit. Show template provenance without suggesting that the plan remains linked. For team-scale bulk updates, first consider a previewed batch publication of new client revisions.

If subscriptions become necessary, define a separate relationship and a published master revision. Specify opt-out, client overrides, effective dates, and what happens to completed records. Do not point historical sessions at a mutable template.

**Trainerize example:** Linked masters reduce repeated work but prevent local editing. [08, 17]

### 7. Keep forms, appointments, and community features separate

**Value: later, dependent on demand. Change:** New specifications, rather than additions to the Review table.

A one-time intake form may be useful, but it should not make reviews depend on submitted forms. If adopted, use form identity, immutable published questions, a request, and answers referencing those questions. Do not turn every Tracker into a form question.

Appointments represent reserved coach time. Training occurrences represent client work. Keep them separate even if a calendar displays both. Community membership and program subscription also need distinct relations.

**Trainerize example:** Forms, booking calendars, groups, and client programs are separate screens with different timing and permission rules. [09, 25–27, 33]

### 8. Preserve a small access model until team needs require more

**Value: later. Change:** Coaching terms M1 and access policy, only after a team use case exists.

Keep coaching state derived from terms. Keep seats sourced from billing. If a shared trainer or location manager is needed, add explicit access scope instead of another client status. Do not copy five roles solely because the competitor has them.

**Trainerize example:** The role matrix shows useful boundaries, but those boundaries are independent of client lifecycle. [30]

### Things not to copy

- Do not let a date move delete a progression.
- Do not let a current goal silently redefine past nutrition evidence.
- Do not store due, open, fulfilled, or at-risk as automatic lifecycle fields. Easy's manual assessment is a separate coach judgment.
- Do not treat a missed form as a missing coach Review. Easy deliberately permits review of ongoing records.
- Do not use mutable shared notes as the record of what was said during a particular workout.
- Do not add automatic birthday messages, engagement campaigns, or risk scores to the first Review release. They are outside the agreed scope.
- Do not replace coaching terms with access-type labels or seat-limit states.
- Do not reproduce the broad promotional dashboard before the daily coaching workflow is complete.

### Resolve document conflicts before implementation

The later core model is the most specific source for storage. The report uses it where earlier specs differ.

1. Coaching terms still mentions contiguous review periods and a four-day minimum. The newer check-ins spec explicitly removes both.
2. Check-ins defers future plan changes. The 5 October core model defines scheduled effective revisions.
3. Check-ins calls “On request” a timing. Core section 5 correctly makes requests separate rows.
4. Check-ins defers links to specific workouts/meals. Core entries already include `about_session_id` and `about_meal_id`.
5. Check-ins says only four new tables are needed. The core redesign adds revisions, assignments, and the change journal.
6. Check-ins says workouts and meals stay client-only. Core record fields support a coach actor. Decide the write permission separately from storage capability.
7. The training example labels 6 October 2026 Monday and 10 October Friday. They are Tuesday and Saturday. Correct the example before using it as a test fixture.

## 7. Open questions

### Questions that need a disposable account or further evidence

- Does a master edit preserve the prescription displayed for completed sessions? Which revision identifies it?
- Do moved workouts keep their original occurrence identity? What exactly is removed with progression, and can it be recovered?
- Can a coach record a skipped workout separately from cancellation, deletion, or absence?
- How are corrected logged sets audited? When do PRs and compliance recalculate?
- Do food, recipe, exercise-name, media, or tracking-type edits affect earlier plans or logs?
- Does a meal correction retain old values and the actor? Which historical nutrition views use current versus recorded goals?
- Can submitted form answers be corrected? Are original question text and choices preserved?
- Which interval protocols and set types are supported beyond the inspected regular/circuit builder?
- How do smart/flexible meal builders handle substitutions, serving yield, missing nutrients, and per-day targets? The account's paid restrictions prevented this check.
- What does a populated body-stat, progress-photo comparison, habit history, or submitted check-in look like? Those records were absent in the inspected views.
- Can client units be configured independently for each measure in all flows? The profile displayed mixed units, but settings were not changed.
- How do time-zone changes affect an existing schedule, day boundary, and historical records?
- What data is retained when access is deactivated or a client returns? No lifecycle action was performed.
- What read receipts or last-viewed metadata are updated by normal page access? No unread conversation or notification item was opened deliberately.

### Areas with limited inspection

All requested primary areas were reached, including every client profile tab and each main client workspace tab. This was not an exhaustive test of every nested control.

Custom exercise creation and custom food creation were blocked by paid requirements. The client had no viewable meal plan. FitMetrics and the Business Dashboard exposed marketing or upgrade screens. Payments was not set up. No paid feature was enabled.

Billing changes, account-security controls, third-party authorization, broadcasts, uploads, assignments, and notifications were not exercised. The notification icon was visible, but individual notifications were not opened because they can change read state. Integration, branding, education, and expert-service destinations were inspected only to the extent relevant to this product/model comparison.

The first pass used no network payloads, database definitions, request replays, or mobile-device tests. The API pass below adds observed payloads. Neither pass establishes Trainerize's internal database schema or complete historical guarantees.

## 8. API responses and comparison

API inspection date: 5 October 2026. This section adds actual response evidence to the UI report.

### Method and coverage

The second pass used the existing authenticated Trainerize session in Brave. Native DevTools recorded requests made by normal read screens. The Network filter restricted the export to `api.trainerize.com`. The capture began after authentication; no login request was included. No request was replayed and no write endpoint was invoked directly.

A temporary sanitized HAR export contained ten responses. Two were feature-flag responses, which are excluded from the comparison. Two were observations of the same unread-count route. This leaves **seven unique business routes with complete response bodies**. All seven returned HTTP 200.

The examples below remove names, contact details, IDs, media addresses, and unrelated preferences. Field names preserve the captured spelling and case. A field's observed type is not a guarantee that other responses use the same type. Empty arrays do not reveal item schemas. Observed string values are not complete enums.

Later page navigation exposed further read routes, including workout records and calendar data. Their bodies had not been exported when repeated changes of the active Brave window interrupted inspection. They appear separately under coverage limits. Do not treat those route names as verified response schemas.

The public integration API and the API used by the web app are different access questions. Trainerize's official help limits integration API access and webhook registration to Studio and Enterprise plans. Observing the Free account's own web requests does not grant an integration API entitlement. No API key was created. [Official API and webhook access](https://help.trainerize.com/hc/en-us/articles/37082084919060-Using-API-and-Webhooks-With-ABC-Trainerize).

A Trainerize-named ReadMe reference was found, but its ownership link and currency were not established. It was not used as evidence for the response fields below. Third-party modeled API specifications were also excluded.

### Important routes with verified response bodies

Base address: `https://api.trainerize.com`. All paths below are captured routes. These reads use **POST** with JSON request bodies. HTTP method alone therefore does not identify whether an operation changes data.

| Route | Observed request fields | Returned data | Easy comparison |
|---|---|---|---|
| `POST /v03/user/getClientList` | `userID`, `view`, `sort`, `start`, `count`, `verbose`, `filter` | `users[]`, `total`. Each user includes identity, `type`, `status`, `role`, assigned trainer, last sign-in, trial status, and optional details. | A roster projection is useful. Derive Easy's coaching state from terms; keep the assigned coach separate from that state. |
| `POST /v03/User/getProfile` | `usersid`: integer array | `usrProfile[]`, even for one requested user. Contains profile, setup, permissions, units, attention, integration, and meal-plan metadata. | Split identity, client preferences, access policy, and calculated attention in Easy's typed contract. A read response can assemble them without storing them together. |
| `POST /v03/User/getClientSummary` | `userID`, `unitWeight` | Activity totals, weekly arrays, dated weekly statistics, body-stat points, programs, current phase, meal-plan summary, and goals. | Build a dashboard read model over Easy's separate facts. Expose date ranges, units, and source records for every summary. |
| `POST /v03/program/getList` | `type`, `includeHQ` | `programs[]`: library identity, description, duration, owner, access level, source, and tags. | This resembles Easy's template library, not its client plans or recorded workouts. |
| `POST /v03/user/getTrainerList` | `sort`, `start`, `count` | `users[]`, `total`. Trainer identity, type, role, status, location field, and profile metadata. | Easy separates User and Coach. Preserve that distinction even when the list flattens both for display. |
| `POST /v03/user/getSettings` | `userid` | `stats` object with units, time zone, nutrition workflow, integration state, notification options, client permissions, and onboarding state. | Prefer explicit preference groups. Avoid making onboarding flags or display preferences part of the core client model. |
| `POST /v03/message/getUnreadCount` | `view`, `userID` | `unread`: boolean; `count`: integer. | Useful roster data. Keep unread chat separate from Review due and open Tracker requests. |

The path case and parameter spelling vary: `User` versus `user`, `userID` versus `userid`, and `usersid`. This is an observed contract detail, not a recommendation.

### A. Client list, profile, and access

Both client and trainer list items expose these fields:

```text
users[].id                    integer
users[].firstName             string
users[].lastName              string
users[].email                 string
users[].type                  string
users[].status                string
users[].role                  string
users[].profileName           string
users[].profileIconVersion    integer
users[].profileIconUrl        null in the samples
users[].trainerID             integer for client; null for trainer
users[].latestSignedIn        string for client; null for trainer
users[].trialStatus           string "None" for client; null for trainer
total                         integer
```

The client item also has `details.phone` and `details.trainer`. The latter embeds trainer identity and profile-icon fields. The trainer item has `locations`, which was null in this response. Null does not prove that the trainer lacks location access.

Observed classification triples were `client / active / fullAccess` and `trainer / active / owner`. Thus, `type`, `status`, and `role` carry different meanings. Do not map all three to Easy's derived client state.

The profile response is much broader. Important paths include:

| Profile paths under `usrProfile[]` | Observed type or meaning |
|---|---|
| `trainerID`, `locationID`, `createdBy.id` | Integer references. The response also embeds names for display. |
| `status`, `role`, `trialStatus` | Classification strings. |
| `created`, `latestSignedIn`, `birthDate`, `trainingPlanVisibleDate` | Strings with different date purposes. |
| `setup.password`, `setup.profile`, `setup.consultation`, `setup.setup` | Booleans for setup steps. `setup.password` is a boolean, not a credential. |
| `setup.joinedDate`, `setup.lastSignedInDate`, `setup.setupDate` | Date strings. They do not all use the same format. |
| `timezone` | Integer. The payload does not provide its time-zone lookup table. |
| `height` | String, not a JSON number. |
| `unitBodystats`, `unitDistance`, `unitWeight`, `waterUnit` | Unit strings. The three primary units also occur under `settings.units`. |
| `attention.doesRequireAttention` | String, despite its boolean-like name. |
| `attention.attentionMessage`, `attention.attentionLevel` | String and integer. Their calculation rules are not in this response. |
| `tags.system`, `tags.user` | String array and empty array in this sample. |
| `hasMealPlan`, `mealPlanID`, `mealPlanType`, `mealPlanStatus` | Boolean, integer, and strings. These are metadata, not plan contents. |
| `settings.enableSignin`, `settings.enableMessage` | Booleans. Access and messaging are separate. |
| `settings.trainingPlanVisibleDay` | Integer visibility setting. |
| `settings.clientCanEditMealPlan`, `settings.clientCanSetOwnGoal` | Permission booleans. |
| `addons` | Connection state for Fitbit, Google Health, MyFitnessPal, Withings, HealthKit, and Health Connect. |
| `nutritionTrackingPerference`, `nutritionTrackingWorkflow` | Strings. The first spelling is exact. |
| `externals` | Empty array. Item shape unverified. |

**Comparison:** Easy's `Client`, `User`, `Coach`, and `CoachingTerm` separate identity and service history. Keep that model. A profile API can return related facts in one response without collapsing their storage. The response should make the scope of preferences explicit: business default, coach preference, or client override.

### B. Program library, client program, and phase are distinct

The program list returned six items. Each item had this shape:

```text
programs[].id              integer
programs[].name            string
programs[].description     string; can be empty
programs[].durationType    "phased" or "onDemand" in this capture
programs[].duration        integer or null
programs[].userID          integer
programs[].accessLevel     "mine" or "shared" in this capture
programs[].fromHQ          boolean
programs[].programSource   integer; meaning unverified
programs[].tags            array; empty in these samples
programs[].categoryTags    null in these samples
```

The captured request was:

```json
{"type":"all","includeHQ":true}
```

Phased library items returned `duration: 56`; on-demand items returned null. The response does not label the duration unit. The earlier UI showed an eight-week program, but a general duration rule requires further evidence.

The client summary's `programs[]` has a different shape:

```text
userProgramID   integer or null
id              integer
name            string
durationType    string
subscribeType   "core" or "addon" in this capture
startDate       date string
endDate         date string
isEmpty         boolean
accessLevel     "custom" or "shared" in this capture
programSource   integer
userGroup       null in these samples
```

The same summary also returns a selected `program` and a `trainingPlan`:

```text
program       { id, name, startDate, endDate }
trainingPlan  { id, type, name, startDate, durationType, duration, endDate }
```

The inspected `trainingPlan` has `type: "regular"`, `durationType: "week"`, and `duration: 4`. This confirms that the phase duration is expressed differently from the library program duration.

**Comparison:** Do not translate every Trainerize `program` or `trainingPlan` into Easy's `plans` table. The library maps most closely to `templates`. A client assignment maps to a plan identity. A phase or progressed prescription requires an explicit mapping to dated revision content. The captured `core` and `addon` subscriptions confirm a design difference: Trainerize supports multiple programming sources, while Easy permits one plan per domain per date.

### C. Client summary is a composed read response

`User/getClientSummary` returns several classes of information together:

- Activity totals: `workoutsTotal`, `cardioTotal`, `photosTotal`, `messageTotal`, and `workoutsUpcomingScheduled`.
- Latest values: `lastWeight`, `lastFat`, `lastWeightDate`, `lastPhotoID`, `lastMessageDate`, `latestResponseDate`, and `lastFMS`.
- Chart inputs: `workoutsByWeek`, `cardioByWeek`, `scheduledByWeek`, `nutritionByWeek`, and `bodystats`.
- Programming: `programs`, `program`, `trainingPlan`, `nextTrainingPlan`, and `mealPlan`.
- Goals and dated summaries: `goal` and `weeklyStats`.
- Commercial metadata: `currentSubscription`, `nextSubscription`, and `defaultCard`, all null in this sample.

The short weekly arrays had different lengths: 4 workout values, 4 cardio values, 5 scheduled values, and 2 nutrition values. The separate `weeklyStats` array had six dated rows. **Do not join the short arrays by array position without a documented alignment rule.**

Each `weeklyStats[]` row includes:

```text
week, startDate, endDate
workoutCompleted, workoutScheduled
cardioCompleted, cardioScheduled
clientWorkoutCompleted, clientCardioCompleted
nutritionCompleted
habitsCompleted, habitsMissed
numberOfSignIn
workoutCompliance, nutritionCompliance, habitsCompliance
goal
```

Counts were integers. Compliance values could be null; `nutritionCompliance` also contained numeric zero. When `goal` was present, it contained a nutrition goal with calories, macro grams, and deviation. This provides more date context than the undated short arrays.

The returned body-stat point had `date`, numeric `weight`, nullable `fat`, and **`isProjected: true`**. It must not be described as a measured entry solely because it appears on a graph.

**Comparison:** Easy should return explicit date buckets, counts, units, and target references. A chart projection belongs in the read response with provenance. It must not become a measured `tracker_entries` row. This distinction follows the existing rule that one recorded fact has one source.

### D. Nutrition target and meal-plan metadata

The summary's `goal.nutrition` returns:

```text
id
caloricGoal
carbsGrams, carbsPercent
proteinGrams, proteinPercent
fatGrams, fatPercent
nutritionDeviation
trackingType
from
type
progress
achieved
```

The numeric target values are JSON numbers. Observed strings include `trackingType: "trackWithTZ"`, `from: "tr"`, and `type: "nutritionGoal"`. `progress` and `achieved` were null. The meaning of the abbreviated `from` value is not established.

The summary also returns `mealPlan: {id, name, type, status}` with `type: "planner"` and `status: "published"`. Earlier UI inspection found no viewable meal-plan contents. The API therefore confirms the presence of published-plan metadata, not a usable or retrievable plan body. The reason for the UI/API difference remains unknown.

**Comparison:** Easy's target ranges make minimum, maximum, and exact-target intent explicit. Keep nutrient units in field names and retain as-eaten values. A future summary response should reference the applicable `plan_revision_id`; a current goal object alone cannot explain historical target selection.

### E. Settings and message counts

`user/getSettings` returns one large `stats` object. It includes `unitWeight`, `unitDistance`, singular `unitBodystat`, integer `timezone`, nutrition workflow, and water units. It also includes integration booleans, client permissions, separate `email` and `notification` option objects, onboarding fields, and display preferences.

The account settings and client profile contain different values. They describe different users, so this is not evidence of inconsistency. However, a consumer must track whose preferences it is using. `unitBodystat` in settings and `unitBodystats` in profile are different spellings.

The unread-count route is compact:

```text
request:  { view: string, userID: integer }
response: { unread: boolean, count: integer }
```

No message body was captured. The response does not establish message-thread structure, edit history, record references, or read-receipt behavior.

**Comparison:** Keep three questions separate: Does the client have unread chat? Is a coach Review due? Is the coach waiting for a Tracker entry? A single attention flag cannot answer all three reliably.

### F. Nulls, dates, and history guarantees

The capture contains JSON null, empty strings, empty arrays, numeric zero, and the string `"None"`. These are different wire values. Do not normalize them all into zero or false.

Date-only values use `YYYY-MM-DD`. Many activity timestamps use `YYYY-MM-DD HH:mm:ss` without a UTC offset. One setup date uses a textual day/month/year format. The integer `timezone` requires a mapping not present in these responses. Do not assume that timestamps without offsets are UTC.

None of the seven complete responses exposes an immutable plan revision key, an original occurrence key, or a client change sequence. This limits what the capture proves. It does **not** prove that Trainerize lacks such internal data.

Easy should retain its explicit `local_date`, `timezone`, immutable revision reference, occurrence identity, and `record_changes` sequence. A dashboard response is a projection of those facts, not a substitute for them.

### G. Routes observed, with response bodies still to inspect

These requests appeared in native DevTools when the client dashboard and completed-record screens loaded. They were not replayed. Their full body schemas are not claimed here.

| Observed path under `/v03/` | Screen or purpose that triggered it | What remains unverified |
|---|---|---|
| `dailyWorkout/get` | Completed workout detail | Performed sets, prescribed targets, revision links, completion timestamps, corrections. |
| `comment/getList` | Completed workout detail | Comment identity, actor, message references, edit state. |
| `Timeline/getListV2` | Client dashboard activity feed | Event types, pagination, record references, removed/edited events. |
| `calendar/getList` | Client dashboard | Series versus occurrence IDs, scheduled/completed state, original and moved dates. |
| `program/getUserProgramList` | Client dashboard | Full assignment and subscription shape. |
| `goal/getList`, `goal/getNutrition` | Client goals/dashboard | Goal dates, history, habit relationships, and target versions. |
| `dailyNutrition/get`, `dailyNutrition/getList` | Daily nutrition/dashboard | Meals, food entries, portions, copied nutrients, historical goals. One visible `get` request returned 404; the response body was not inspected. |
| `healthData/getList`, `healthData/getListSleep` | Progress widgets | Recorded values, source device, units, and date/time meaning. |
| `graph/getBodystats` | Body-stat widgets | Measured versus projected points and raw-entry links. |
| `photos/getList` | Progress photo widget | Capture date, upload date, positions, attachment metadata. |
| `waterTracker/get` | Client dashboard | Units, daily entries, and totals. |
| `accomplishment/getList` | Client dashboard | Achievement identity and links to source records. |
| `appointment/getClassOfferingList` | Client dashboard classes | Event/occurrence identity, booking, attendance, recurrence. |

An existing exercise Network response was also inspected on screen. It exposed `id`, `name`, `alternateName`, `description`, `type`, `recordType`, typed `tags`, `lastPerformed`, `version`, and media variants. The `exercise/search` route was selected, but the complete body was not exported. The observed `version` looked like a timestamp; it is not proof of immutable exercise revisions.

No complete habit, custom-form, recipe-detail, workout-template, or progressed-day response body was captured in this pass. Those are the next priorities once browser focus is stable.

### H. API-specific recommendations

1. **Return composed read models with explicit sources.** A client summary is useful, but each date bucket should identify its range, units, counts, and applicable plan revision.
2. **Keep roster responses small.** Return the state and coach needed by the list. Load large settings, permissions, and history separately.
3. **Name identity levels explicitly.** Use distinct template, plan, revision, workout, occurrence, and session references. Do not call every programming object a plan.
4. **Keep measured and projected values separate.** Mark projections in graph responses. Never count them as client records.
5. **Use consistent dates and units.** Return offset-bearing instants, date-only local dates, and an explicit time-zone identifier. Do not require undocumented integer lookups.
6. **Keep missing values meaningful.** State which fields are optional and what null means. Use date-keyed summary rows instead of arrays with unclear positional alignment.
7. **Expose review provenance.** Include the snapshot sequence used by a Review. Preserve late additions, corrections, and removals through the existing journal design.

These recommendations change Easy's proposed read contracts and presentation rules. They do not justify replacing its core identity/value/time model.
