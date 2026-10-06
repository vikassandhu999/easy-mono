# Core data-model research

**Design conclusion — inference:** Training, Nutrition, and Trackers should share the lifecycle of reusable definitions, client assignments, dated expectations, recorded evidence, and coach review. They need distinct structures for workout execution, food composition, and health observations.

This report distinguishes documented product behavior and public schemas from **model inferences**. Product documentation reveals supported workflows, not proprietary database designs. Sources were checked on October 3, 2026.

## Training

### Programs describe both a sequence and a calendar

Training plans operate at several scales, but their terminology does not form one universal hierarchy. Trainerize has phased programs with relative program days that become actual dates on client calendars. RP calls the same planning object a *mesocycle* and a *training block*, with training days, muscle priorities, and a final deload week. [Trainerize phased programs](https://help.trainerize.com/hc/en-us/articles/115004404763-What-is-a-Phased-Program-and-How-to-Build-One), [RP mesocycle creation](https://hypertrophy.zendesk.com/hc/en-us/articles/43746811808023-Mesocycle-Creation)

**Model inference:** support the following vocabulary without requiring every level:

| Concept | Meaning the model should accommodate |
|---|---|
| Program | A sustained training plan with goals, instructions, and an intended audience or client. |
| Block, phase, mesocycle | An optional named period with a purpose, duration, priorities, and progression approach. Coaches may use these terms differently or interchangeably. |
| Week or microcycle | A repeatable training sequence. Its length need not equal seven calendar days. |
| Training day | A position in the sequence, potentially including rest or multiple sessions. |
| Session | A concrete workout prescription, later scheduled and performed. |
| Scheduled occurrence | A particular expectation on a date or within a window. |
| Performed session | What happened, possibly on another date or without any prior assignment. |

The distinction between sequence and calendar is practical. TeamBuildr documents both dated programs and dateless programs athletes complete at their own pace. Its template updates protect completed days. [TeamBuildr BUILD](https://www.teambuildr.com/build)

**Model inference:** “Week 3, Day 2” and “performed Thursday evening” should remain separate facts. Rescheduling a session should not require changing its identity or rewriting earlier results.

### Exercise order and workout formats are structural

TrainHeroic distinguishes supersets that retain individual exercise results from circuit blocks used when detailed results are unnecessary. Everfit has Regular, Interval, AMRAP, Timed, and Freestyle sections; its AMRAP sections fix time and record rounds, while Timed sections fix rounds and record duration. [TrainHeroic supersets](https://support.trainheroic.com/hc/en-us/articles/18156598268429-For-Coaches-Creating-Supersets), [Everfit workout sections](https://help.everfit.io/en/articles/4620511-add-a-workout-section)

CrossFit defines AMRAP as rounds or repetitions within a timeframe and EMOM as work performed at minute boundaries. These are different execution and scoring rules. [CrossFit terminology](https://www.crossfit.com/essentials/crossfit-terms-explained)

**Model inference:** represent named formats through ordered members, repetition rules, timing, recovery, termination, and scoring:

| Format | Structure that must survive storage and logging |
|---|---|
| Sequential exercises | Finish the prescribed work for one exercise before proceeding, unless the client changes order. |
| Superset | Interleave specified exercises across rounds; preserve individual set results and transition rest. |
| Giant set | A larger named exercise group. Preserve the coach’s label rather than imposing a universal member-count definition. |
| Circuit | Ordered stations or exercises, repeated for rounds or time, with station and round recovery. |
| EMOM | Start work at recurring boundaries. Generalize to every specified number of seconds or minutes. |
| AMRAP | A time limit, ordered work, and a score such as rounds plus additional repetitions. |
| For-time | A fixed task, elapsed-time score, optional time cap, and a result for incomplete work. |
| Intervals | Work and recovery phases, repeated according to a schedule. |
| Freestyle or follow-along | Instructions or video, with completion and optional measurements. |

The same exercise may appear in a warm-up, a strength section, and a finisher. These are three **exercise occurrences** referencing one library exercise, each with its own prescription.

An AMRAP strength set also differs from an AMRAP workout section: “as many repetitions as possible at this load” does not inherently specify a timed circuit.

### Sets have purpose, internal structure, and outcome

Strong and Hevy expose normal, warm-up, drop, and failure labels. These labels combine different dimensions: preparation, execution technique, and outcome. Strong excludes warm-ups from certain metrics; Hevy changes rest-timer behavior for drop sets. [Strong set tags](https://help.strongapp.io/article/166-set-tags), [Hevy set types](https://help.hevyapp.com/hc/en-us/articles/34896293707927-Set-Types-in-Hevy-Explained-Drop-Sets-Warm-Up-Sets-and-More)

NSCA describes cluster structures through changes to rest or loading within sets. Its rest-pause examples accumulate work through efforts separated by short rests. RP separately documents myo-reps and myo-rep-match techniques. [NSCA cluster sets](https://www.nsca.com/education/videos/cluster-sets--current-methods-for-introducing-variations-to-training-sets/), [NSCA rest-pause programming](https://www.nsca.com/education/articles/ptq/time-efficient-training/), [RP intensity techniques](https://rpstrength.com/blogs/articles/intensity-techniques-for-maximum-mass)

**Model inference:** separate set role, technique, and outcome. Allow an effort to contain ordered segments or mini-sets.

| Prescription | Information to preserve |
|---|---|
| Straight sets | Separate efforts with repeated or individually specified targets and ordinary recovery. |
| Warm-up sets | Preparatory role, targets, and optional relationship to the working set. |
| Top set and back-off sets | Their relationship, with back-off targets potentially calculated from the top set. |
| Drop sets | Connected segments, each with its own load and repetitions; load reductions and transition recovery. |
| Cluster sets | Rep clusters, recovery within the set, and any segment-specific loading. |
| Rest-pause sets | Initial effort, short rests, continuation efforts, and a stopping rule. |
| Myo-reps | Activation effort, mini-sets, recovery, and the prescribed termination rule. |
| Myo-rep match | A reference repetition result and subsequent efforts intended to match it. |
| Pyramid or reverse pyramid | An ordered sequence of changing load and repetition targets across sets. |

A single enum cannot adequately describe “a back-off set performed with rest-pause, stopped before failure.” Those properties are independent.

### Prescription dimensions extend beyond repetitions and weight

**Model inference:** the prescription should preserve both the coach’s original expression and its structured meaning.

| Dimension | Required expressiveness |
|---|---|
| Repetitions | Fixed count, range, minimum, maximum, AMRAP, or a stopping condition such as technical failure. |
| Absolute load | Value, unit, and convention: total load, per implement, or another defined basis. |
| Relative load | Percentage plus its reference: tested 1RM, estimated 1RM, training max, previous set, or another explicit baseline. |
| Effort | RPE or RIR target, scale, scope, and optional range or cap. Effort can accompany an absolute or percentage load. |
| Bodyweight and assistance | Bodyweight execution, added resistance, quantified assistance, or named resistance such as a band. |
| Tempo | Original notation and optional phases: eccentric, pause, concentric, pause. Support explosive intent rather than requiring every phase to be numeric. |
| Rest | Recovery between segments, sides, sets, exercises, rounds, or sections. |
| Unilateral work | Left, right, both, or alternating; repetitions per side versus total; load per implement versus combined. |
| Cardio and conditioning | Duration, distance, pace, speed, power, cadence, heart rate, zones, calories, repetitions, or rounds. |
| Mobility and holds | Repetitions, hold duration, side, range-of-motion instructions, breathing instructions, or completion alone. |
| Coaching content | Instructions, notes, demonstration media, exercise-specific cues, and requested client video. |

Relative loads particularly require provenance. TrainHeroic’s working max may be actual or estimated; explicit testing or manual updates change its automatic-update behavior. Everfit documents Epley-based estimation and percentage targets that can update with new personal records. [TrainHeroic working maxes](https://support.trainheroic.com/hc/en-us/articles/18170920165645-Testing-and-Updating-Athletes-Maxes), [Everfit percentage progression](https://help.everfit.io/en/articles/3060080-program-workouts-using-1rm-tracking-auto-progression)

A training max is also a programming control, not necessarily a permanently fixed fraction of current 1RM. [Jim Wendler on training maxes](https://www.jimwendler.com/blogs/jimwendler-com/101082310-the-training-max-what-you-need-to-know)

**Model inference:** retain the percentage expression, reference value and date, calculation method, rounding policy, and resolved load presented to the client. Otherwise, a later PR can silently change the apparent prescription of an earlier workout.

RIR records estimated repetitions remaining when the set stops. It should retain that meaning rather than being treated as interchangeable with every exertion score. [RP’s RIR definition](https://hypertrophy.zendesk.com/hc/en-us/articles/13514639103767-What-does-RIR-mean)

**Model inference:** do not universally convert RPE to `10 − RIR`. Identify the scale and conversion method. A session-level exertion rating also differs from set-level proximity to failure.

Unilateral and bodyweight conventions directly affect analytics. Strong’s documentation describes configurable dumbbell doubling on iOS and automatic doubling on Android. Hevy includes bodyweight in volume only for selected exercise cases and distinguishes added weight from assistance. [Strong dumbbell counting](https://help.strongapp.io/article/101-how-are-dumbbell-exercises-counted), [Hevy bodyweight conventions](https://help.hevyapp.com/hc/en-us/articles/38386262243223-Bodyweight-Exercises-in-Hevy-Bodyweight-vs-Assisted-vs-Weighted)

**Model inference:** “20 kg × 10” is insufficient to determine volume. Preserve implement count, side convention, and the historical bodyweight used in any calculation. A heart-rate zone likewise needs its zone definition and reference values; “Zone 2” alone is not a numerical boundary.

### What clients actually log

Strong permits finishing a workout without completing every exercise. Hevy distinguishes routine notes from notes specific to a performed workout. These are concrete examples of execution diverging from a reusable plan. [Strong workout logging](https://help.strongapp.io/article/229-my-first-workout), [Hevy workout logging](https://www.hevyapp.com/features/track-workouts/)

**Model inference:** capture results at their appropriate scope:

- Per exercise occurrence, set, or segment: actual exercise, repetitions, load and convention, side, RPE or RIR, duration or distance, actual recovery if recorded, completion outcome, notes, and media.
- Per section: rounds, additional repetitions, elapsed time, time-cap outcome, interval results, and any section-level score.
- Per session: actual date and start/end times, elapsed and active duration when available, completed/partial/aborted status, session RPE, notes, readiness or post-session feedback, and links to the assigned prescription.
- Per deviation: skipped work, extra work, substitution, changed order, changed targets, and an optional reason.

A failed attempt can contain useful information even with zero successful repetitions. Strong explicitly permits zero-repetition failed maximal attempts, while Hevy’s documented interface disallows zero repetitions. [Strong failed attempts](https://help.strongapp.io/article/166-set-tags), [Hevy failure logging](https://help.hevyapp.com/hc/en-us/articles/34896293707927-Set-Types-in-Hevy-Explained-Drop-Sets-Warm-Up-Sets-and-More)

Session exertion also has established analytical uses: Foster’s work quantified training load using global session RPE multiplied by duration. [Foster et al., training load](https://pubmed.ncbi.nlm.nih.gov/8693756/)

**Model inference:** store the underlying rating and duration separately from the derived score. Similarly, an unchecked set, a skipped set, and an attempted zero-repetition set must remain distinguishable.

### Progression, deloads, and substitutions

JuggernautAI documents adaptation across sets, sessions, weeks, blocks, and programs, using readiness and training feedback. RP describes adjustments based on pump, soreness, and perceived workload. [JuggernautAI](https://www.juggernautai.app/), [JuggernautAI V3](https://www.juggernautai.app/blog/juggernautai-v3-0-is-here), [RP Hypertrophy](https://apps.rpstrength.com/)

**Model inference:** a progression rule needs a scope, input evidence, decision point, output change, and override policy:

| Approach | Example of the rule’s structure |
|---|---|
| Linear progression | Add a specified load or repetition increment after an eligible exposure. |
| Double progression | Increase repetitions within a range; increase load after a defined success condition, then reset repetitions. |
| Autoregulation | Adjust load, repetitions, sets, or exercise choice using effort, readiness, performance, or recovery feedback. |
| Planned variation | Change targets by cycle position, such as percentage waves or alternating session priorities. |
| Deload | Apply a temporary reduction or other adjustment to volume, intensity, frequency, duration, or exercise selection. |

The success condition must be explicit: all working sets, any qualifying set, an average, or a coach decision are different policies. Preserve the decision applied to a session, including its rule version.

Everfit supports exercise alternatives globally and for individual workouts. TeamBuildr uses tags for exercise choices and substitutions. [Everfit alternatives](https://help.everfit.io/en/articles/3365668-add-an-alternate-exercise), [TeamBuildr exercise choices](https://blog.teambuildr.com/3-ways-to-use-tags-in-teambuildr)

**Model inference:** retain the prescribed exercise, permitted alternatives, chosen replacement, reason, and replacement scope. A substitution does not automatically inherit the original exercise’s PRs, maximum, or progression history.

### What the requested products demonstrate

The following is a comparison of documented capabilities, not an exhaustive feature ranking.

| Product | Documented workflow | Model implication — inference |
|---|---|---|
| TrainHeroic | Exercise blocks, detailed superset results, separate circuit blocks, and working-max policies. [Supersets](https://support.trainheroic.com/hc/en-us/articles/18156598268429-For-Coaches-Creating-Supersets) | Grouping, logging granularity, and load-reference policy are separate concerns. |
| TrueCoach | Calendar workouts with open-text warm-ups, exercise prescriptions, circuits, cooldowns, and linked supersets. [Workout builder](https://help.truecoach.co/en/articles/3047972-the-workout-builder-basics) | Preserve expressive instructions alongside structured fields. |
| Trainerize | Phased programs and regular, circuit, interval, and video workouts. [Workout formats](https://help.trainerize.com/hc/en-us/articles/208688896-What-Types-of-Workouts-Can-I-Create) | Program structure, execution format, and delivery media differ. |
| Everfit | Configurable tracking fields including effort and conditioning measures, plus multiple section formats. [Tracking fields](https://help.everfit.io/en/articles/3060079-edit-tracking-fields-rpe-rir-hr-cadence-calories-and-more) | Measurement requirements can vary by exercise and prescription. |
| CoachRx | Calendar programming with reusable conditioning pieces, benchmarks, warm-ups, and cooldowns. [Program design](https://intercom.help/coachrx/en/articles/5829040-program-design-calendar) | A reusable multi-exercise benchmark deserves identity and version history. |
| TeamBuildr | Dated and dateless programs, custom set inputs, progression views, and completed-day protection. [BUILD](https://www.teambuildr.com/build) | Sequence-based delivery and historical protection belong in the core. |
| Hevy | Reusable routines, live workouts, per-set results, supersets, and distinct routine/session notes. [Workout logging](https://www.hevyapp.com/features/track-workouts/) | Reusable intent and performed records have different lifecycles. |
| Strong | Editable workouts, templates, set tags, and failed-attempt logging. [Workout logging](https://help.strongapp.io/article/229-my-first-workout) | Completion, set purpose, and outcome must remain independent. |
| JuggernautAI | Feedback-driven adjustment across multiple training scales. [Overview](https://www.juggernautai.app/) | Feedback requires scope and links to resulting adaptation decisions. |
| RP Hypertrophy | Mesocycles, priorities, deloads, and native myo-rep techniques. Its documentation describes supersets and drop sets through manual workflows rather than dedicated features. [Intensity techniques](https://rpstrength.com/blogs/articles/intensity-techniques-for-maximum-mass) | An app permitting a technique through notes does not establish structural support for it. |

### Public schemas provide complementary precedents

**wger** exposes `Routine → Day → Slot → SlotEntry`, with separate configurations for load, repetitions, sets, RIR, and rest. Multiple entries in a slot form a superset. Progression attaches to iterations, which need not be calendar weeks. Its performed data uses `WorkoutSession → WorkoutLog`; each log represents a set and preserves both actual and prescribed values. [wger routine API](https://wger.readthedocs.io/en/stable/api/routines.html)

**FHIR’s Physical Activity implementation guide** separates exercise prescriptions, care plans, goals, referrals, and activity observations. It provides a useful clinical workflow vocabulary for expectations and outcomes. [FHIR physical-activity interventions](https://www.hl7.org/fhir/us/physical-activity/STU1/interventions.html)

**Health Connect** has a particularly relevant public training model: planned sessions contain repeated blocks and steps; each step separates its completion goal from its performance targets. Performed sessions can link back to the plan. Its targets include heart rate, speed, power, cadence, weight, RPE, and AMRAP. [Health Connect training plans](https://developer.android.com/health-and-fitness/health-connect/features/training-plans), [Performance targets](https://developer.android.com/reference/androidx/health/connect/client/records/ExercisePerformanceTarget)

**Model inference:** these sources support several useful distinctions, but none should be adopted wholesale as the complete coaching model. Clinical activity prescriptions, mobile workout interchange, and detailed strength-program execution solve different problems.

### The minimum vocabulary a future-ready model must express

- Program, template, revision, assignment, optional planning period, cycle, day, session, and scheduled occurrence.
- Exercise identity, variant, occurrence, equipment, classification, and substitution.
- Ordered section/group, rounds, intervals, termination condition, and score.
- Set, segment, role, technique, side, and outcome.
- Typed target, range, effort scale, tempo, rest boundary, load expression, and reference maximum.
- Actual performance, skipped/extra work, session feedback, notes, and video.
- Progression rule, deload, adaptation decision, override, and supporting evidence.
- Prescription snapshot, calculation method, source, and correction history.

## Nutrition

### Coaching styles are composable prescriptions

Nutrition coaching need not begin with foods or calorie counting. Trainerize supports calorie-only, calorie-plus-protein, and full macro goals. Everfit distinguishes scheduled structured meals from flexible recipe choices. Precision Nutrition’s hand-portion method uses palms, fists, cupped hands, and thumbs with approximate nutrient translations. [Trainerize flexible meal planner](https://help.trainerize.com/hc/en-us/articles/47042957643156-Flexible-Meal-Planner), [Everfit structured plans](https://help.everfit.io/en/articles/9423729-client-app-structured-meal-plans), [Everfit flexible plans](https://help.everfit.io/en/articles/9895949-introducing-flexible-meal-plan), [Precision Nutrition hand portions](https://www.precisionnutrition.com/hand-portion-math-to-track-macros)

**Model inference:** support combinations of these prescription forms:

| Coaching style | Concepts required |
|---|---|
| Fixed meal plan | Meal slots, foods or recipes, portions, timing, and instructions. |
| Meal options and swaps | Alternative choices for a slot; eligibility and equivalence criteria; the choice actually made. |
| Macro-only | Nutrient targets without mandatory food prescriptions. |
| Calorie-only | An energy target without manufactured macro targets. |
| Habit-based | Defined behaviors, recurrence, completion criteria, and observations. |
| Hand portions | Food-group portion counts and the method used; optional approximate nutrient estimates. |
| Carb cycling and day types | Named target sets for training, rest, high/low carbohydrate, or other days. |
| Refeeds and maintenance breaks | Temporary target changes, purpose, duration, and effective dates. |
| Fasting or eating windows | Planned and actual intervals, timezone, recurrence, and exceptions. |
| Supplements | Product, dose, instructions, schedule, taken/skipped status, and nutrient contribution when known. |
| Hydration and additional nutrients | Water, fiber, sodium, vitamins, minerals, and other separately defined targets. |

A client might simultaneously receive a protein minimum, breakfast options, a vegetable-portion habit, and a water target.

MacroFactor documents day-specific adjustments, carb cycling, refeeds, and maintenance breaks. Carbon’s calorie planner can redistribute a weekly allocation across unlocked days. [MacroFactor day variation](https://help.macrofactorapp.com/en/articles/30-does-macrofactor-support-refeeds-diet-breaks-or-carb-cycling), [Carbon calorie planner](https://help.joincarbon.com/en/articles/6004818-using-the-calorie-planner)

**Model inference:** distinguish a weekly budget from its daily allocations. If a training day becomes a rest day, the system needs an explicit policy for whether it changes that day alone or redistributes the week.

Cronometer supports recurring and open-ended fasts with actual start/end times. It also distinguishes drinking-water tracking from water contributed by foods and beverages. [Cronometer fasting](https://support.cronometer.com/hc/en-us/articles/360036371551-Fasting), [Cronometer water tracking](https://support.cronometer.com/hc/en-us/articles/18020279636628-Water-Tracking)

**Model inference:** an overnight fast cannot be represented reliably as “zero calories today.” Drinking water and total dietary water also need distinct identities even if both appear in milliliters.

Targets need more than equality. Cronometer supports nutrient minima, maxima, both, or neither. [Cronometer nutrient targets](https://support.cronometer.com/hc/en-us/articles/360018069532-Nutrient-Targets-Summary)

**Model inference:** a target needs a metric, unit, comparator or range, time scope, tolerance, and effective period. Protein minimums, sodium ceilings, and energy ranges should not inherit one generic “higher is better” interpretation.

### Food identity, composition, and portions are separate

USDA FoodData Central contains distinct data types with different origins and purposes. Foundation Foods includes analytical information and food-specific portions; descriptions distinguish preparation states such as raw and cooked. Branded-food information comes from industry providers and includes serving and labeling information. [USDA Foundation Foods](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/), [USDA branded-food documentation](https://fdc.nal.usda.gov/docs/Branded_Foods_Documentation_Apr2024.pdf)

Open Food Facts distinguishes nutrition supplied per 100 grams or per serving, nutrition that is absent, and prepared-product values. It also exposes revision information. [Open Food Facts API reference](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ref-cheatsheet/)

**Model inference:** the food-data model needs these boundaries:

| Concept | Why it matters |
|---|---|
| Food identity | Generic food, branded product, or custom food; source IDs and barcodes are identifiers, not the whole identity. |
| Composition revision | A particular set of nutrient facts with provenance and preparation context. |
| Nutrient definition | Stable meaning and unit: protein, sodium, fiber, a particular vitamin form, and so forth. |
| Composition basis | Per 100 g, per 100 mL, per serving, or another explicitly defined amount. |
| Serving definition | Quantity, unit, description, and any known mass or volume equivalent. |
| Household measure | A food-specific conversion for “cup,” “slice,” “scoop,” or “medium fruit.” |
| Consumed portion | The quantity the client actually ate, referencing the relevant serving and composition. |

A cup is not a universal gram weight. A volume-to-mass conversion needs food-specific information. Raw rice, cooked rice, and a branded rice meal also cannot safely share one undifferentiated composition record.

USDA explicitly warns that missing nutrient values do not mean zero, and that label rounding differs from analytical measurement. Product history may contain corrections rather than a physical reformulation. [USDA branded-food documentation](https://fdc.nal.usda.gov/docs/Branded_Foods_Documentation_Apr2024.pdf)

**Model inference:** preserve unknown, reported zero, estimated, and qualified values separately. Keep external source, source version, and import time. Do not silently resolve conflicting records merely because their names or barcodes match.

### Recipes need ingredients and a finished yield

Cronometer supports recipes portioned by serving count or weight, including a cooked recipe weight that can differ from the sum of ingredient weights. It also distinguishes custom foods from recipes. [Cronometer recipes](https://support.cronometer.com/hc/en-us/articles/360018510311-Create-Custom-Recipe), [Cronometer custom foods](https://support.cronometer.com/hc/en-us/articles/360018240312-Create-a-Custom-Food)

**Model inference:** distinguish:

- A reusable recipe and revision.
- Ingredients with quantities and composition references.
- An optional preparation batch with actual substitutions.
- Finished yield, expressed as mass, volume, count, or servings.
- The portion consumed from that batch or recipe.

A recipe yielding four servings and a cooked batch weighing 1,150 grams provide different portioning information. Changing the ingredients also differs from changing the yield.

A reusable meal can instead be a group of independently meaningful items. “Eggs, toast, and coffee” need not become one homogeneous recipe.

Supplements can use food-composition machinery where appropriate, while retaining dose and adherence semantics. A taken-supplement event should link to its nutrient contribution so a habit completion and food entry do not count the same intake twice. This is a **model inference**.

### Intake logs, completeness, and targets

Everfit’s structured plans let clients log actual servings and remove that logged intake later. A scheduled meal therefore does not inherently establish consumption. [Everfit structured meal logging](https://help.everfit.io/en/articles/9423729-client-app-structured-meal-plans)

The requested logging products demonstrate materially different target and evidence policies:

| Product | Documented behavior | Model implication — inference |
|---|---|---|
| MyFitnessPal | Net calories subtract exercise calories from food calories. A completed diary can receive further entries and be completed again. [Net calories](https://support.myfitnesspal.com/hc/en-us/articles/360032273692-What-are-Net-Calories), [Diary completion](https://support.myfitnesspal.com/hc/en-us/articles/360032624131-How-does-the-Complete-This-Entry-or-Finish-logging-for-today-feature-work) | Separate consumed energy, expenditure adjustments, goal policy, and diary status. |
| Cronometer | Completing a day prevents editing until it is reopened. An empty day can be explicitly completed when fasting. [Diary settings](https://support.cronometer.com/hc/en-us/articles/360018305371-Diary-Settings) | Confirmed zero intake differs from an absent diary. |
| MacroFactor | Estimates expenditure from logged intake and weight changes. Recommendations are adherence-neutral; incomplete days can be excluded. [Expenditure](https://help.macrofactorapp.com/dashboard/expenditure), [Partial logging](https://help.macrofactorapp.com/en/articles/241-what-is-partial-logging) | Logging completeness and target adherence are different variables. |
| Carbon | Check-ins distinguish full tracking, partial tracking, unlogged-but-met-targets, and external tracking with entered totals or averages. Partial tracking holds targets steady. [Carbon check-ins](https://help.joincarbon.com/en/articles/6004812-weekly-check-in-in-carbon-how-it-works-and-what-to-expect) | Food-level evidence, aggregate intake, and self-attestation have different evidential strength. |
| Trainerize | Compliance uses a configurable variance around daily goals and counts qualifying days toward weekly compliance. [Compliance targets](https://help.trainerize.com/hc/en-us/articles/360036911152-Setting-Targets-for-Client-Nutrition-Compliance) | Compliance is a calculation under a policy, not an intrinsic property of a food log. |
| Everfit | Structured meals and flexible recipe choices are separate workflows; actual servings drive logged intake. [Flexible plans](https://help.everfit.io/en/articles/9895949-introducing-flexible-meal-plan) | Available choices, scheduled content, selection, and consumption must remain distinct. |

MacroFactor’s adherence-neutral approach means its recommendations use actual intake and weight changes rather than requiring the user to hit the prescribed intake. Its documentation separately explains that partial logging can distort expenditure estimation. [MacroFactor expenditure](https://help.macrofactorapp.com/dashboard/expenditure), [Partial logging](https://help.macrofactorapp.com/en/articles/241-what-is-partial-logging)

**Model inference:** a consumption record should support a food or recipe portion, quick nutrient totals, imported aggregate intake, or photo/text evidence. These should retain their granularity and method. A meal photo may support coaching without establishing defensible nutrient quantities.

At day or period level, distinguish at least:

- Unknown or unlogged.
- Partially logged.
- Confirmed complete.
- Confirmed zero intake.
- Self-attested adherence without detailed intake.
- Excluded from a particular calculation, with a reason.

Completeness also exists at the nutrient level. MacroFactor’s nutrient-completeness score accounts for foods that do not report particular micronutrients. [MacroFactor nutrient completeness](https://help.macrofactorapp.com/en/articles/135-what-is-the-nutrient-completeness-score)

**Model inference:** “all meals logged” does not imply “all micronutrients known.” A comparison needs the applicable target revision, eligible time window, source coverage, and tolerance. Energy consumed, energy remaining, net calories, and estimated expenditure should remain separately named values.

### Historical nutrition must retain its meaning

MacroFactor explicitly preserves historical food-log entries when a custom food or recipe is edited. Conversely, adding intake to an earlier date can update expenditure and coaching recommendations. [Food and recipe edits](https://help.macrofactorapp.com/en/articles/240-does-editing-a-recipe-or-custom-food-item-affect-my-food-log-history), [Logging previous days](https://help.macrofactorapp.com/en/articles/228-log-food-to-previous-days)

**Model inference:** distinguish editing a reusable recipe from correcting yesterday’s consumption. Preserve the composition and portion conversion used by each historical entry.

An expenditure estimate should record its method, input window, calculation time, evidence quality, and version. It is a derived estimate, not measured intake or a prescribed target. A later correction may produce a revised estimate without erasing what the coach previously saw.

### The minimum vocabulary a future-ready model must express

- Nutrition goal, phase, prescription, revision, and effective period.
- Nutrient or behavior target, unit, comparator, tolerance, and daily/weekly scope.
- Day type, dated allocation, period budget, override, and fasting/eating interval.
- Meal slot, option, swap, selected alternative, and prescribed portion.
- Food identity, barcode/external reference, preparation state, composition revision, and nutrient definition.
- Serving, household measure, hand portion, conversion, recipe, ingredients, batch, and yield.
- Consumption event, evidence method, actual portion, supplement dose, hydration, and habit observation.
- Diary completeness, nutrient-data completeness, adherence calculation, derived expenditure, and correction history.

## Trackers and health observations

### Standards model observations through meaning, value, time, and context

| Standard | Documented representation | Model implication — inference |
|---|---|---|
| HL7 FHIR Observation | Observation code and status; typed `value[x]`; effective time; components; method, device, body site, reference ranges, and relationships. [FHIR Observation](https://hl7.org/fhir/R4/observation.html) | Measurement identity is separate from its result and acquisition context. |
| Apple HealthKit | Quantity samples, category samples, and correlations, with start/end times. [HealthKit samples](https://developer.apple.com/documentation/healthkit/samples?language=objc) | Numeric, categorical, composite, and interval data need distinct semantics. |
| Google Health Connect | Typed records with measurement-specific fields, time, zone offsets, and provenance metadata. [Data format](https://developer.android.com/health-and-fitness/health-connect/data-format) | Preserve source identity and civil-time context alongside normalized values. |
| Open mHealth | A metadata header and measurement body; effective instants or intervals and measurement-specific context. [Schema design principles](https://www.openmhealth.org/documentation/schema-docs/schema-design-principles/) | Share an observation envelope while keeping meaningful domain-specific payloads. |
| UCUM | Machine-readable unit codes and mathematical relationships; presentation is separate. [UCUM specification](https://ucum.org/ucum) | Store units as codes, with independent human-readable labels. |

FHIR’s `effective[x]` describes when a result applies; `issued` describes when that version became available. Its result can be a quantity, coded value, string, boolean, integer, range, ratio, sampled data, or temporal value. [FHIR Observation](https://hl7.org/fhir/R4/observation.html)

**Model inference:** a weight measurement taken Monday, entered Tuesday, and imported Wednesday has several legitimate timestamps. A date-only recollection should remain date-only rather than receive a fabricated exact time.

Open mHealth’s repository also states that its sleep, physical-activity, and metadata schemas are superseded by IEEE 1752.1 equivalents. Integrations must therefore identify schema versions rather than treat every Open mHealth example as the current contract. [Open mHealth repository](https://github.com/openmhealth/schemas)

### Composite measurements differ from grouped observations

FHIR’s blood-pressure profile uses one observation with systolic and diastolic components, each carrying a code and result or absence reason, using UCUM `mm[Hg]`. [FHIR vital signs](https://hl7.org/fhir/R4/observation-vitalsigns.html)

FHIR distinguishes inseparable components from separately identified observations grouped through `hasMember`. It separately uses `derivedFrom` to connect a result to supporting information. [Observation relationships](https://hl7.org/fhir/R4/observation-definitions.html)

**Model inference:**

- A blood-pressure reading is one event with named components.
- A check-in containing weight, waist, and resting heart rate groups independently meaningful observations.
- A calculated trend or estimate links to its inputs through derivation.
- A wearable heart-rate stream requires individual samples or a series representation, not an unexplained daily average.

These distinctions affect editing, timestamps, provenance, and aggregation.

### Custom metrics need definitions and assignments

TrueCoach supports reusable metric sets, client-specific metric sets, and links between exercise results and metrics. Everfit exposes custom metric name, type, and unit, with dated entries, goals, and charts. It separately schedules tasks requesting measurements or progress photos. [TrueCoach metrics](https://help.truecoach.co/en/articles/3047471-metrics), [Everfit body metrics](https://help.everfit.io/en/articles/2836313-track-body-metrics), [Everfit collection tasks](https://help.everfit.io/en/articles/4098673-assign-tasks-to-track-progress-photos-and-body-metrics)

**Model inference:** distinguish:

1. The metric definition: what is measured and how to interpret it.
2. The client assignment: which metrics matter for this client.
3. The collection expectation: when and under what conditions to record it.
4. The observation: the result.
5. The target: a desired outcome or range.
6. The presentation: chart, summary, or comparison policy.

For body measurements, definition context may include anatomical site, side, posture, and method. For ratings, it includes the scale, endpoints, and direction. “Energy 7/10” and “soreness 7/10” share a numeric representation but have different meanings.

A task to record weight can be completed without reaching a weight goal. A valid weight observation can also occur without a scheduled task.

### Questionnaires preserve questions and response context

Trainerize check-in forms support single-choice, multiple-choice, text, and rating answers, with required or optional questions and recurrence. Its documentation says template edits do not automatically update already scheduled forms. [Trainerize check-in forms](https://help.trainerize.com/hc/en-us/articles/31369316335124-Sharing-Check-In-Forms-with-Clients)

FHIR’s `QuestionnaireResponse` preserves question organization and typed answers, including attachments. It distinguishes the respondent from the person recording the response and supports different submission states. [FHIR QuestionnaireResponse](https://hl7.org/fhir/R4/questionnaireresponse.html)

**Model inference:** retain a questionnaire definition and version, scheduled request, submission, item identifiers, and answers. Selected answers can produce linked observations for charts, but the original response must survive.

“How energetic do you feel now?” and “How was your average energy this week?” should not silently populate the same series. Text reflections should remain readable in their original context; any later extracted score is a separate derived result.

### Progress photos and attachments have their own structure

Everfit’s progress-photo workflow includes capture dates, front/left/right/back views, batch uploads, optional weight/body-fat context, and side-by-side comparison. [Everfit progress photos](https://help.everfit.io/en/articles/2836175-progress-photos)

**Model inference:** model a photo submission or session containing individual assets. Each asset can have a pose/view, capture time, notes, and links to associated measurements. Pose vocabulary should be extensible. Comparisons should normally match compatible views.

A file’s upload time differs from its capture time. An image-derived body-composition estimate also differs from the source image and needs a method and provenance.

FHIR’s `DocumentReference` represents PDFs, scanned documents, images, and other document formats. `DiagnosticReport` can link atomic results while retaining the formatted report. [FHIR DocumentReference](https://hl7.org/fhir/R4/documentreference.html), [FHIR DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html)

**Model inference:** a laboratory PDF can initially remain a document with subject, document date, type, issuer, and access scope. If values are extracted later, connect them to the document and preserve their original units, reference ranges, and qualifiers. A reported `<5` must not become an exact `5`.

### Missingness, provenance, and aggregation are first-class concerns

FHIR defines absence reasons such as unknown, not asked, and declined, and statuses such as preliminary, final, amended, corrected, and entered-in-error. [FHIR absence reasons](https://hl7.org/fhir/R4/valueset-data-absent-reason.html), [FHIR observation statuses](https://hl7.org/fhir/R4/valueset-observation-status.html)

HealthKit objects expose source revision, device, UUID, and metadata. Health Connect carries corresponding origin and recording information. [HealthKit objects](https://developer.apple.com/documentation/healthkit/hkobject), [Health Connect metadata](https://developer.android.com/reference/androidx/health/connect/client/records/metadata/Metadata)

**Model inference:** preserve whether a result was manually reported, measured by a device, imported, transcribed by a coach, or calculated. Zero steps, an unanswered question, and a disconnected wearable are different states.

Health Connect’s aggregation documentation describes source-priority deduplication for overlapping Activity and Sleep records, while other types do not receive identical treatment. [Health Connect aggregation](https://developer.android.com/health-and-fitness/health-connect/aggregate-data)

**Model inference:** distinguish importing the same source record twice from receiving two independent measurements. Two nearby 80 kg readings may both be valid. Two apps reporting the same walk may overlap. Derived summaries need a window, statistic, input policy, and calculation version.

### The minimum vocabulary a future-ready model must express

- Metric identity, definition, version, owner, and optional standard terminology mapping.
- Typed result, unit, scale, permitted values, precision, and qualifiers.
- Observation, named component, group, series, and derivation relationship.
- Effective date/instant/interval, reporting timezone, entry/import times, and uncertainty.
- Method, body site/side, conditions, respondent, recorder, source, and device.
- Status, absence reason, correction, supersession, and external identity.
- Client assignment, collection request, recurrence, target, and completion outcome.
- Questionnaire/version/submission/answer; photo session/pose/asset; document/report and extracted results.

## Cross-cutting patterns and what to build together

### A shared lifecycle, with distinct domain content

FHIR itself separates reusable `PlanDefinition` and `ActivityDefinition` resources from applying those definitions in a specific context. A definition is neither a commitment to act nor evidence that an action happened. [FHIR PlanDefinition](https://hl7.org/fhir/R5/plandefinition.html)

**Model inference:** the following common lifecycle can be designed across all three domains:

| Shared concept | Training | Nutrition | Trackers |
|---|---|---|---|
| Library definition | Exercise, benchmark, reusable section | Food, recipe, meal option | Metric, questionnaire, photo protocol |
| Template | Session or program | Meal plan, target schedule, habit plan | Metric set or check-in template |
| Client assignment | Personalized program | Personalized nutrition prescription | Assigned metrics and collection protocol |
| Dated expectation | Scheduled session | Daily targets, meal slot, supplement reminder | Weigh-in request, questionnaire, photo request |
| Recorded evidence | Performed sets/session | Consumption, fasting interval, habit observation | Measurement, response, photograph, document |
| Derived result | Volume, estimated 1RM, adherence | Nutrient totals, expenditure estimate, adherence | Trends, aggregates, calculated scores |
| Review | Performance and recovery assessment | Intake and target assessment | Measurement and response assessment |
| Adjustment | Progression, substitution, deload | Target revision, changed options | Changed collection frequency or goals |

These are conceptual boundaries, not a requirement for one table per row or one universal table for every domain.

### Copying, subscribing, and snapshotting are different operations

Trainerize explicitly distinguishes subscribing a client to a master program, where updates propagate, from copying a standalone program that can be customized independently. [Trainerize subscription versus copy](https://help.trainerize.com/hc/en-us/articles/11402922731540-What-is-the-Difference-Between-Subscribing-and-Copying-a-Program-to-a-Client)

Everfit Live Sync applies updates to unlogged workouts from today onward, and its instructions discuss the ordering of program edits and individual client changes. [Everfit Live Sync](https://help.everfit.io/en/articles/3366220-what-is-live-sync)

**Model inference:** make update behavior explicit:

- A library item has a stable identity and revisions.
- A template references specific content or a documented update policy.
- An assignment records its source and personalization.
- A scheduled expectation records the applicable prescription revision.
- Execution preserves what the client actually received, including resolved values.
- Corrections create an explainable revision rather than silently rewriting history.

The same issue appears in foods, recipes, metric scales, questionnaire wording, demonstration videos, and coaching instructions.

### Share typed values and targets without erasing semantics

UCUM distinguishes machine-readable unit meaning from display notation. Its annotations do not supply measurement semantics. A unit label therefore cannot define whether a count means steps, repetitions, or completed habits. [UCUM specification](https://ucum.org/ucum)

**Model inference:** use a shared value vocabulary with domain-specific definitions:

| Value family | Examples | Required context |
|---|---|---|
| Quantity | Body mass, protein, distance, load | Measurement identity, numeric value, unit, precision. |
| Duration | Sleep, plank hold, fasting | What interval counts and the time unit. |
| Count | Repetitions, steps, portions | What is counted and any per-side or per-period basis. |
| Rating | RPE, soreness, hunger | Scale identity/version, anchors, range, and direction. |
| Category | Sleep stage, meal category | Stable option codes and meanings. |
| Boolean | Supplement taken, habit completed | The proposition and applicable time period. |
| Text | Reflection, set note | Prompt or context, author, and time. |
| Media/document | Form video, meal photo, lab PDF | Asset identity, type, capture/document time, and role. |
| Composite | Blood pressure, multi-part result | Named components and shared context. |
| Series | Heart-rate samples, sleep stages | Sample times or intervals, source, and aggregation rules. |

Targets add operators and scope: exact, minimum, maximum, range, relative expression, or a stopping condition. Results record what was observed. A range prescription and a range-valued laboratory result may share a data type while carrying different meanings.

Conversions also require semantic compatibility. Kilograms can convert to pounds. A hand portion cannot become an exact gram quantity without an explicit estimation method. A rating cannot become another scale merely because both contain numbers.

### Expectations need their own time model

**Model inference:** distinguish:

- Relative plan position.
- Scheduled local date or time window.
- Recurrence rule and exceptions.
- Effective period of a target or assignment.
- Actual event time or interval.
- Time of recording, import, correction, and review.

A daily nutrition target is usually evaluated over a reporting period. A workout may be expected within a flexible window. A sleep episode crosses midnight. A weekly reflection describes a period rather than its submission timestamp.

Dated expectations also define the denominator for adherence. Future sessions, excused sessions, paused coaching, rescheduled tasks, and optional activities need explicit treatment.

### Coach review is a shared workflow

Everfit’s check-in dashboard combines workout completion, logged nutrition days and macro comparisons, tasks, forms, and coach notes. It separately supports marking forms as reviewed and configuring status thresholds. [Everfit review dashboard](https://help.everfit.io/en/articles/16000596-check-in-dashboard-review-client-insights), [Everfit status configuration](https://help.everfit.io/en/articles/15999847-configure-your-check-in-dashboard)

**Model inference:** represent a review with:

- Client, reviewer, and review period.
- Evidence examined and its cutoff or versions.
- Findings and private/shared notes.
- Decisions, overrides, and resulting prescription changes.
- Review status and any follow-up.

This makes “the client submitted,” “the coach reviewed,” and “the plan changed” separate events. If a client later corrects food intake or a wearable imports delayed data, the system can explain why the earlier review differs from today’s dashboard.

### Pitfalls evidenced by mature products and standards

The sources establish documented behavior. The lessons below are **model inferences**, not claims about undocumented vendor development history.

1. **Do not turn shared labels into universal semantics.** “Block,” “set,” “complete,” “calories,” and “compliance” vary across products. Store their precise role and policy.

2. **Do not use position as identity.** Reordering an exercise, meal option, or questionnaire item should not attach historical results to a different item.

3. **Do not treat prescribed values as observed values.** Prefilled weights, scheduled meals, and requested measurements remain expectations until execution or reporting supplies evidence.

4. **Do not collapse missing, zero, skipped, and failed.** Strong’s zero-repetition attempts, Cronometer’s completed fasting days, and FHIR absence reasons illustrate different legitimate meanings. [Strong](https://help.strongapp.io/article/166-set-tags), [Cronometer](https://support.cronometer.com/hc/en-us/articles/360018305371-Diary-Settings), [FHIR](https://hl7.org/fhir/R4/valueset-data-absent-reason.html)

5. **Do not let template edits rewrite history.** wger preserves prescribed values with logs, and MacroFactor preserves historical food entries after recipe edits. [wger](https://wger.readthedocs.io/en/stable/api/routines.html), [MacroFactor](https://help.macrofactorapp.com/en/articles/240-does-editing-a-recipe-or-custom-food-item-affect-my-food-log-history)

6. **Do not hide calculation conventions.** Dumbbell doubling, assistance, recipe yield, nutrient basis, and averaging windows can materially change results.

7. **Do not equate completeness with accuracy or adherence.** A complete diary can miss micronutrient data; an accurate diary can show intake far from target; an incomplete diary cannot reliably establish either.

8. **Do not conflate an observation with a derived estimate.** Estimated 1RM, expenditure, readiness scores, and weekly averages need methods and input provenance.

9. **Do not deduplicate only by matching values and timestamps.** Health Connect supports external record identity and version for synchronization; overlapping independent sources need additional domain rules. [Health Connect synchronization](https://developer.android.com/health-and-fitness/health-connect/sync-data)

10. **Do not force all evidence into numbers.** Notes, photos, videos, questionnaires, and PDFs are meaningful records. Any quantitative extraction should retain its relationship to the original evidence.

### What should be designed and built together

**Model inference:** the strongest shared work packages are:

| Shared work | Include across all three domains | Keep domain-specific |
|---|---|---|
| Definition and assignment lifecycle | Ownership, visibility, revisions, cloning, assignment, update policy, archival | Exercise structure, recipe composition, metric semantics |
| Calendar and expectations | Relative/absolute scheduling, recurrence, due windows, rescheduling, exceptions | Workout execution order, nutrient allocation rules, measurement protocols |
| Values, units, and targets | Typed values, unit handling, scales, bounds, ranges, qualifiers | Load resolution, nutrient calculations, clinical component meaning |
| Evidence and history | Provenance, external IDs, corrections, snapshots, attachments, import lineage | Set/segment logs, consumption entries, observation payloads |
| Questionnaires and media | Form versions, answers, assets, annotations, access scope | Pose comparison, technique review, meal evidence, lab-result extraction |
| Review and reporting | Review periods, evidence references, notes, decisions, calculation provenance | Progression engines, nutrition adaptation, metric-specific aggregation |

The shared infrastructure should allow domain-specific records to participate in one timeline and review process. It should not require every performed set, consumed food, and blood-pressure reading to use an identical payload.

Useful acceptance scenarios for this design include:

- A coach changes a program after a client completes half a session; completed work retains its original prescription.
- A client substitutes an exercise and logs a failed attempt without inventing a successful repetition.
- A rest day replaces a training day; nutrition allocation follows an explicit policy.
- A recipe’s cooked yield changes; earlier food logs retain their original composition and portion basis.
- A rating scale changes; historical answers retain the earlier scale.
- A laboratory PDF gains reviewed extracted values while remaining available as source evidence.
- Two integrations report the same activity; the displayed total avoids duplication without deleting independent source records.
- A late correction changes analytics while preserving what the coach reviewed previously.

### The minimum vocabulary a future-ready model must express

- Definition, library item, template, revision, assignment, and source relationship.
- Expectation, schedule, effective period, occurrence, exception, and rescheduling.
- Prescription, target, observed result, completion state, and absence reason.
- Value type, measurement identity, unit, scale, context, and qualifier.
- Source, author, external identity, snapshot, correction, and supersession.
- Asset, questionnaire response, supporting evidence, and derivation.
- Calculation policy, input window, aggregate, estimate, and version.
- Review, decision, override, follow-up, and resulting plan revision.