# Coaching trackers: evidence, product benchmark, and recommendation

Date: 2026-07-12

## Decision

Do **not** turn every available health metric into a required tracker. Public-health guidance and current coaching products support a small, customizable core, while clinical and highly sensitive metrics stay opt-in or outside a general fitness coach's scope.

Build/support this core catalog:

1. workout/activity completion and volume (mostly derived from existing workout logs),
2. nutrition adherence (derived from existing food logs, with a low-friction check-in fallback),
3. weight (already first-class),
4. sleep duration and quality,
5. hydration,
6. readiness/recovery (energy, stress, soreness, hunger),
7. progress photos (private, explicit opt-in),
8. waist circumference for clients whose goals make it useful, and
9. configurable habits.

Steps, performance markers, body composition, resting heart rate, and additional circumferences are useful optional trackers. Blood pressure, glucose, laboratory values, ECG/SpO2, diagnostic mental-health scores, reproductive health, and detailed symptoms require a separate medical/sensitive-data product decision; they should not ship as ordinary coach-defined numbers.

## Decision-ready matrix

Cadences below are product recommendations unless a cited authority explicitly supplies one. "Weekly review" means daily/per-event data can be summarized into the client's weekly coaching check-in.

| Tier | Tracker | Collection and unit | Product rule | Evidence |
|---|---|---|---|---|
| Core | Workout/activity | Each session; activity type, minutes, and intensity; retain sets/reps/load or distance/pace already captured by the workout domain | Derive rather than ask the client to re-enter it. Summarize moderate/vigorous minutes and strength days weekly. | CDC recommends at least 150 min moderate or 75 min vigorous activity plus muscle strengthening on 2 days/week; some activity is better than none. [CDC](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html) |
| Core | Nutrition adherence | Daily food/meal logs; weekly plan adherence | Derive from existing nutrition logs. Keep the current 1-5 check-in question only as the subjective/context layer, not a second factual log. | CDC supports food diaries and notes that calorie counting is not always necessary; healthy patterns emphasize variety. [CDC](https://www.cdc.gov/healthy-weight-growth/about/tips-for-balancing-food-activity.html) |
| Core | Weight | Weekly default; kg or lb; allow daily entries | Reuse `WeightEntry`; show trends, not single-reading judgments. NIDDK recommends checking weight weekly in a structured weight-management program. Existing server validation (`>0`, `<1000`) is a technical guard, not a clinical range. | [NIDDK](https://www.niddk.nih.gov/health-information/weight-management/choosing-a-safe-successful-weight-loss-program) |
| Core | Sleep | Daily hours plus optional quality 1-5; weekly average | Duration and quality belong together. For adults 18-60, show the CDC reference of at least 7 hours, but adjust by age and do not diagnose sleep disorders. Semantic duration is 0-24 h; this is not a clinical "healthy range." | CDC says sufficient duration and good quality both matter; age-specific adult guidance is 7+ h (18-60), 7-9 h (61-64), 7-8 h (65+). [CDC](https://www.cdc.gov/sleep/about/index.html) |
| Core | Hydration | Daily volume; store mL, display mL/L or fl oz/cups; weekly adherence | Goal must be coach/client configurable. Do not turn 2.7/3.7 L total-water adequate intakes into universal plain-water goals: needs vary and total water includes foods and all beverages. No evidence-backed universal maximum was found. | CDC says needs vary by age, sex, pregnancy/breastfeeding, activity, and climate, and water also comes from foods and other drinks. [CDC](https://www.cdc.gov/healthy-weight-growth/water-healthy-drinks/index.html) |
| Core | Readiness/recovery | Weekly 1-5 ratings: energy, stress, muscle soreness, hunger; optional note/pain flag | Keep these in `FormSubmission` check-ins. They are coaching conversation signals, not diagnoses. A pain/injury answer should prompt human review, never an automated training prescription. | Practice Better's first-party journal supports mood, activity context, sleep, hunger/wellness-style notes and review workflows. [Practice Better](https://help.practicebetter.io/hc/en-us/articles/360002760611-Providing-Clients-with-Access-to-Journals) |
| Core, opt-in | Progress photos | Coach-assigned, commonly front/side/back; no authoritative health cadence found | Never required by default. Private storage, explicit consent, deletion, and restricted visibility are baseline requirements. | Trainerize organizes date-stamped front/side/back photos; Everfit supports assigned photo tasks. [Trainerize](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress), [Everfit](https://help.everfit.io/en/articles/5885389-client-app-tasks) |
| Core, goal-specific | Waist circumference | Coach-defined cadence; cm or in | This is the only additional circumference with strong general health relevance. Capture measurement instructions; do not treat it as a diagnosis. | NHLBI explains that waist adds abdominal-fat risk context and specifies measurement just above the hipbones after breathing out. [NHLBI](https://www.nhlbi.nih.gov/health/heart-healthy-living/healthy-weight) |
| Core capability | Habits | Yes/no or count on assigned days | Generic assigned habits are more useful than hard-coding dozens of lifestyle trackers. Start with 2-3 relevant habits per client, not the whole catalog. | Trainerize and major peers expose assigned habits/compliance rather than one universal mandatory list. [Trainerize](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress) |
| Optional | Steps / sedentary time | Daily integer steps; wearable source preferred; weekly average | Do not hard-code 10,000. Official activity guidance is time/intensity based. Preserve source/device and allow manual data only if clearly labeled. | CDC's adult target is minutes/intensity, while Trainerize tracks synced daily steps. [CDC](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html), [Trainerize](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress) |
| Optional | Performance / personal bests | Derive per exercise: load, reps, estimated volume; cardio distance, time, pace | Do not create a parallel manual tracker for values already present in training sessions. | Trainerize graphs exercise and cardio performance; Everfit surfaces personal bests. [Trainerize](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress), [Everfit](https://help.everfit.io/en/articles/3591889-client-app-you) |
| Optional | Other body measurements | Chest, hips, limbs; cm/in; coach-defined cadence | Goal-specific and off by default. Keep measurement site and unit stable so trends are comparable. | Trainerize supports a broad list; TrueCoach allows arbitrary graphed metrics. [Trainerize](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress), [TrueCoach](https://help.truecoach.co/en/articles/3047471-metrics) |
| Optional | Body fat / lean mass | Percent or mass plus method/device/source | Never infer precision. Different methods are not interchangeable; show trends only within a consistent method. | Major products expose these, but even NHLBI describes BMI as screening rather than diagnosis, reinforcing the need to avoid false precision. [Trainerize](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress), [NHLBI](https://www.nhlbi.nih.gov/health/overweight-and-obesity/symptoms) |
| Optional | Resting/exercise heart rate | bpm, preferably synced with device/source and timestamp | General-wellness trend only. No alerts, diagnosis, or training clearance without a designed clinical boundary. | Trainerize includes resting HR; FDA distinguishes low-risk general wellness from diagnosis/treatment functions. [Trainerize](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress), [FDA](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices) |
| Medical boundary | Blood pressure | Paired systolic/diastolic mm Hg, measurement context, validated cuff | Do not model as one generic number or let coaches set clinical targets. Only add with clinician-directed workflow, technique guidance, escalation, and auditability. | CDC says home monitoring should be discussed with the health-care team and gives required technique. [CDC](https://www.cdc.gov/high-blood-pressure/measure/index.html) |
| Medical boundary | Blood glucose/A1C, labs, ECG, SpO2 | Clinical units, timing/context, source/device | Do not add to the ordinary tracker catalog. These create interpretation, escalation, device-quality, and regulatory obligations beyond general coaching. | FDA's general-wellness boundary excludes software intended for diagnosis, cure, mitigation, prevention, or treatment of disease. [FDA](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices) |
| Sensitive boundary | Menstrual/reproductive health, bowel/digestive symptoms, detailed pain/injury, diagnostic mental-health screens | Only after a separate product/privacy design | Explicit opt-in, least-privilege visibility, purpose limitation, deletion/export, and no ad/analytics reuse. A free-text check-in flag is safer than prematurely building a diagnostic tracker. | FTC advises health apps to minimize data and obtain affirmative express consent before collecting or sharing health data. [FTC](https://www.ftc.gov/business-guidance/resources/mobile-health-app-developers-ftc-best-practices) |

## Product benchmark

The market pattern is breadth plus customization, not mandatory breadth:

- **Trainerize** covers photos, weight/body composition, circumferences, resting heart rate and blood pressure, nutrition, steps, sleep, exercise/cardio progress, habits, and weekly compliance. [First-party overview](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress)
- **Everfit** supports customizable body metrics, metric goals and weekly averages, wearable syncing, progress-photo tasks, steps, and personal bests. [Metrics](https://help.everfit.io/en/articles/2836313-track-body-metrics), [client tasks](https://help.everfit.io/en/articles/5885389-client-app-tasks)
- **TrueCoach** uses fully customizable metric sets and graphs; examples include body measurements, basic health data, strength, movement, and aerobic tests. [Metrics](https://help.truecoach.co/en/articles/3047471-metrics)
- **Practice Better** journals cover food, mood, activity, water, bowel, measurements, and sleep, with practitioner review rather than making all categories mandatory. [Journals](https://help.practicebetter.io/hc/en-us/articles/360002760611-Providing-Clients-with-Access-to-Journals)
- **MyFitnessPal** centers daily food/macros, water, exercise, steps, weight/measurements, and sleep/progress views; additional measurements are configurable and limited to one value per measurement per day. [Today](https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Introducing-the-brand-new-Today-tab), [additional measurements](https://support.myfitnesspal.com/hc/en-us/articles/360032624891-Can-I-track-additional-measurements-or-change-the-default-measurements)

Parity therefore means offering the relevant catalog and assignment controls. It does not mean putting 20 tiles on every client's dashboard.

## Fit with easy-mono

The current architecture already has the right split:

- `FormTemplate -> FormAssignment -> FormSubmission` is the configurable, scheduled check-in substrate. The supported question types already cover `number`, `rating`, `weight`, and `photo` (`backend/lib/easy/forms/form_template.ex`). Subjective readiness, habits, pain flags, sleep quality, and weekly reflections belong here.
- `WeightEntry` is a first-class dated time series with unit, note, client/business scope, and optional `form_submission_id` provenance (`backend/lib/easy/fitness/weight_entry.ex`). A check-in weight already flows into the same history as a self-log. Preserve this model.
- The current preset bank already includes most of the recommended catalog (`frontend/apps/coachapp-v2/src/checkins/question-presets.ts`): measurements, training/nutrition adherence, soreness, pain, hunger/cravings, water, sleep, energy, stress, steps, and mindset.
- The default weekly check-in already covers weight, photos, energy, sleep quality, stress, training/nutrition adherence, hunger, wins/challenges, and coach questions (`backend/lib/easy/default_check_in.ex`). It is already longer than a minimal weekly pulse; adding every tracker to it would be counterproductive.
- Nutrition meal logs and training sessions already contain the factual data needed for adherence and performance. Derive summaries from those tables instead of asking the same facts again.
- The Progress screen remains weight-only and explicitly says photos are deferred (`frontend/apps/clientapp-v2/src/progress/progress-home.tsx`). A photo gallery can query existing private check-in attachments; it does not need a second upload store.

### Recommended implementation boundary

1. Keep configurable/subjective items as check-in questions.
2. Add first-class daily time series only for **sleep duration/quality** and **hydration**; these need quick daily entry, charts, and weekly averages outside a once-weekly form.
3. Add **waist** as the first measurement time series; leave hips/chest/limbs as check-in numbers until real chart demand exists.
4. Build the **progress-photo gallery** over existing attachments rather than a parallel photo model.
5. Derive **activity, workout adherence, nutrition adherence, and performance** from existing logs.
6. Add wearable-backed **steps/resting HR** only when integration work is approved; preserve source and timestamp.
7. Keep medical/sensitive trackers out of this batch.

This is the smallest complete set that matches health guidance, market expectations, and the repo's existing seams without creating one table and API per preset.

## Validation and cadence rules

- Store canonical units and convert only at the display/input edge: weight kg, lengths cm, water mL, sleep/activity minutes, heart rate bpm.
- Store the source (`manual`, `check_in`, future device/integration) and timestamp/date for every first-class entry.
- Reject negative quantities and structurally impossible values (for example, sleep over 24 hours/day); do not label broad technical caps as clinical ranges.
- Ratings remain integers 1-5, matching the existing answer validator.
- Do not set universal 10,000-step or fixed plain-water targets; neither is supported by the cited public-health guidance.
- Use weekly weight by default; daily sleep/hydration/steps; per-session training; daily nutrition logs; weekly readiness review; coach-defined waist/photo cadence.
- Let coaches assign only relevant trackers. Default required fields should be rare; progress photos and sensitive questions must always be optional/consented.

## Privacy and safety requirements

All tracker data should be treated as sensitive health data even when HIPAA does not apply. HHS states that consumer apps that are neither covered entities nor business associates may fall outside HIPAA protections. [HHS](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/access-right-health-apps-apis/index.html) The FTC's Health Breach Notification Rule expressly reaches many health apps and connected products outside HIPAA. [FTC](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)

Before adding new first-class trackers:

- disclose purpose at collection and obtain affirmative consent for health data;
- make photo and sensitive tracker visibility explicit and least-privilege;
- support export, correction, deletion, and retention limits;
- keep health fields and photo routes out of advertising/analytics payloads;
- preserve an audit trail for coach access and edits;
- distinguish manual from device-derived values; and
- never diagnose, prescribe, change medication, or auto-adjust clinical targets from tracker data.

## Bottom line

The repo already contains most of the *questions*. The missing product value is not a larger preset bank; it is a few coherent time-series trackers, derived summaries from existing training/nutrition data, and one Progress surface that respects consent and medical boundaries. Ship sleep, hydration, waist, and the photo gallery around the existing weight tracker; derive activity/nutrition/performance; keep everything else optional or out of scope.
