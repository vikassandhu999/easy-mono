Context: we are designing the core data model of an online fitness-coaching platform. A coach builds training and nutrition plans for clients; clients log workouts, meals and other tracked values; the coach regularly reviews them. The three core domains are **Training**, **Nutrition** and **Trackers** (anything else a client records: body weight, measurements, sleep, ratings, progress photos, text reflections, lab-report PDFs). The owner wants the models complete and future-ready, and wants to know which parts share structure so they can be designed and built together. We need a thorough survey of how these domains really work and how mature systems model them. Use web search extensively and cite sources. Do not modify any files in this repository; your final message is the report, in Markdown.

Research and report on:

**Training**
- Everything a coach prescribes: programs, blocks, phases, mesocycles, weeks, days/sessions, exercise order, supersets, circuits, giant sets, EMOM, AMRAP, for-time; straight, drop, cluster, rest-pause, myo-rep, pyramid and back-off sets; warm-up sets; reps (fixed, range, AMRAP, to failure); load (absolute, %1RM, %training max, RPE/RIR, bodyweight, added or assisted); tempo; rest; unilateral work; time, distance, pace, heart-rate zones and calories for cardio and conditioning; mobility and holds; progression rules (linear, double progression, autoregulation); deloads; substitutions; notes and video.
- What gets logged per set and per session (actual reps, load, RPE, skipped, substituted, notes, duration, session RPE).
- How products model it: TrainHeroic, TrueCoach, Trainerize, Everfit, CoachRx, TeamBuildr, Hevy and Strong (logging), Juggernaut AI, the RP Hypertrophy app, and public schemas (for example the open-source wger, and FHIR or Open mHealth exercise schemas).

**Nutrition**
- Coaching styles: fixed meal plans, meal options and swaps, macro-only targets, calorie-only, habit-based, hand-portion methods, carb cycling and day types (training vs rest day), refeeds, fasting windows, supplements, water, fiber, sodium and micronutrients.
- Food data: USDA FoodData Central, Open Food Facts, branded foods and barcodes, nutrients per 100 g vs per serving, serving sizes and household measures, recipes with yields, custom foods.
- Logging models: MyFitnessPal, Cronometer, MacroFactor (expenditure estimates, adherence-neutral logging), Carbon, Trainerize and Everfit nutrition, and how they compare logged intake with targets.

**Trackers and health observations**
- How health-data standards model observations: HL7 FHIR Observation (code, value[x], unit, effective time, components such as blood pressure), Apple HealthKit (quantity, category and correlation samples, units), Google Health Connect, Open mHealth schemas, UCUM units.
- How coaching apps model custom metrics, progress photos and poses, questionnaires vs metrics, and attachments.

**Cross-cutting**
- Structural patterns common to all three: library item, template, assigned copy; prescribed vs performed; dated expectations; versioning and snapshots; units; taxonomies of measurement types (quantity, duration, rating, count, boolean, text, media).
- Pitfalls mature products learned the hard way.

Structure the report with a heading per domain, then cross-cutting. End each domain with "The minimum vocabulary a future-ready model must express" as a concise list. Report facts with citations and label your own inferences.
