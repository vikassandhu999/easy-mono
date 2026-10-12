# Nutrition concept

Status: core concepts agreed, 9 October 2026; preset model reaffirmed and refined, 12 October 2026 (N29–N34). Detailed model and storage design remains open. Records the nutrition restart. Replaces the earlier N1–N8 draft in this file. These are domain decisions, not implemented tables. The current code does not constrain the design.

Reference: [Workout concept](../workout/concept.md). Only the workout rules explicitly agreed below carry over.

## Decisions

| # | Decision |
|---|---|
| N1 | NutritionTargets are a complete set of daily nutrient targets, independent of presets. Different days can have different target sets. Targets alone, presets alone, or both are valid. |
| N2 | A day is a planning view that groups schedules. There is no stored EatingDay and no IsLockedDay flag. The coach can design a week through this view. |
| N3 | NutritionPreset defines what is prescribed. Its type is exactly one of `meal`, `food`, or `supplement`. NutritionSchedule defines when it applies. |
| N4 | A meal preset contains one or more MealOptions. Each option is a complete choice. One option means a fixed meal; several options give alternatives. No has_options flag is needed. |
| N5 | Each MealOption contains one or more MealItems. Each item specifies a food or supplement, amount, and unit. Like ExerciseGroups, an option groups items; unlike workout groups, the client chooses one complete option. |
| N6 | A food preset prescribes exactly one food with an amount and unit. A supplement preset prescribes exactly one supplement with a dose and unit. Neither needs an artificial meal or an IsStandaloneFood flag. |
| N7 | NutritionSchedule refers to NutritionPreset. For a meal, all its options are available. Several schedules can refer to a preset. A preset can exist without a schedule. |
| N8 | A schedule describes a one-off date or repeating weekdays selected by `weekdays_mask`, optional time, and applicable start and end dates. Repeating masks use Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64. Every day=127. A repeating mask must be 1–127; null does not mean every day. Exact one-off and replacement fields remain open. |
| N9 | A one-off addition leaves other schedules in place. A one-off replacement identifies one scheduled item and replaces it on one date. The regular schedule continues after that date. |
| N10 | A lasting replacement ends the old schedule and starts a new one. As with workouts, past schedule facts stay unchanged. Precise fact-date and deletion rules still need confirmation for nutrition. |
| N11 | Prescription history must rebuild what was prescribed on any client date, even if nothing was logged. Keep the schedule that applied and the preset version it used. Content that applied on past dates must remain available; future-only content can change without retaining unused versions. Logs keep the exact version they used. This replaces history triggered only by logging, for nutrition and workouts. The boundary for edits today and the storage mechanism remain open. |
| N12 | NutritionLog records one consumption occasion, with type `meal`, `food`, or `supplement`. It can exist without a preset. It replaces MealLog as the top-level log concept. |
| N13 | FoodLog records one consumed item and amount within NutritionLog. A meal log has one or more FoodLogs. A food log has exactly one food FoodLog. A supplement log has exactly one supplement FoodLog. A meal can contain foods and supplements. |
| N14 | Log type describes the occasion, not its item count. A banana eaten as breakfast can be a meal log. A banana recorded by itself can be a food log. One-item meals are valid. |
| N15 | A recipe describes ingredients and preparation of a prepared food. Prepared foods can be selected, prescribed, and logged as food. Ingredient is a role: milk is a food and can be an ingredient in porridge. Catalogue storage remains open. |
| N16 | Log nutrient totals are calculated from FoodLogs. Prescribed and consumed amounts remain separate. Nutrient storage and snapshot rules need their own decisions. |
| N17 | A preset is the shared content. Editing it changes all its future scheduled uses. Editing one schedule changes that schedule only. Grouped weekday tabs introduce no further prescription owner. |
| N18 | Weekday groups come from schedule masks. Matching masks can be displayed under one tab, but do not permanently link records. Preset and target schedules remain independent even when their masks match. |
| N19 | Target schedules use regular weekday rules and one-off replacements, like prescription schedules. One client-local calendar date resolves to at most one complete target set; overlapping target schedules are rejected. A replacement replaces the whole set; it does not add to regular targets. The regular rule continues after the replacement date. |
| N20 | Each nutrient target is exact, minimum, maximum, or range. An omitted nutrient has no target. |
| N21 | Foods, consumption records, and targets use one nutrient catalogue. Each nutrient has one code and registered unit. Catalogue entries and storage are still to be designed. |
| N29 | (12 Oct 2026) The preset model N3–N7 and N17 stands. A draft from 10–11 Oct (N22–N28: Meal plus a ScheduledMeal join that put alternatives on the schedule) is withdrawn: it gave the schedule two jobs, timing and choice, and copied the same alternatives into every schedule. NutritionSchedule holds only `preset_id`, `weekdays_mask`, optional time, `from` and `until`; it has no label. The preset name is the occasion ("Breakfast"). Breakfast at 08:00 Mon–Fri and 10:30 Sat–Sun is two schedules of one preset. |
| N30 | A MealOption has an optional name ("Oats bowl"). Without a name it is shown by its foods ("Greek yogurt, Mixed berries"). |
| N31 | The UI never says "preset". A meal preset is a **Meal**, and its options are **Option 1, Option 2** joined by "or". A food or supplement preset is shown as its item ("Creatine monohydrate · 5 g"). A day's Add offers Meal, Food and Supplement. |
| N32 | Catalogue (from the Cronometer study): a supplement is a food with `kind = supplement`, so food and supplement share portion and nutrient rules. Preset type `food` or `supplement` must match its item's kind. A food's nutrients are per 100 g, per 100 ml or per 1 unit (capsule, tablet); servings convert into that basis, and a gram mass is optional. A nutrient that is not listed is unknown, never zero. Recipes stay a separate aggregate (ADR 0002). |
| N33 | Targets (from the Cronometer study): a nutrient target is stored as bounds `{min?, max?}` with at least one bound; exact is `min = max`. The editor derives exact / at least / at most / between, and keeps the N20 wording. Negative or inverted bounds are rejected; an empty input removes the target. NutritionTargets hold only values; their target schedules (N19) hold the weekdays, at most one per weekday. Energy, protein, carbs (total) and fat are always shown; other nutrients are added per set. |
| N34 | A calculated total adds the known values. When any value is unknown, the total says "incomplete"; a total of only unknown values says "Nutrients not listed". |
| N35 | (12 Oct 2026) Presets and NutritionTargets belong to one client (`client_id`). There is no nutrition library and no sharing between clients. Within the client, several schedules can use one preset (N7). Program nutrition stays open. |
| N36 | History without version tables (answers N11). A preset or NutritionTargets row that applied on a past date never changes. An edit before that is made in place. An edit after it copies the row (with its options and items); every schedule that uses it ends on its last fact date and a new row starts on the copy (W14); the old row is archived (W32). A log points to the preset and option it used, which never change. |
| N37 | A food edit changes the catalogue from now on (as W31). Meal items keep their amounts; food logs keep a copy of the nutrients they used. |

## Tables (12 Oct 2026)

One table per concept, with the concept's name. Every table also has `id`, `business_id` (W35) and timestamps. There are no other tables: a day is a query (N2), totals are calculated (N16, N34), and history is the rows themselves (N36).

| Concept | Table | Columns |
|---|---|---|
| Nutrient catalogue | `nutrients` | `code` (PK, `protein_g`), `name`, `unit` |
| Food catalogue | `foods` | `name`, `kind` (`food \| supplement`), `basis` (`100g \| 100ml \| 1unit`), `unit_label` (capsule), `nutrients` jsonb by code (a missing key is unknown), `servings` jsonb `[{label, amount}]` in the basis unit |
| NutritionPreset | `nutrition_presets` | `client_id`, `type` (`meal \| food \| supplement`), `name`, `instructions`; `food_id`, `amount`, `unit` only for food or supplement (N6); `archived_at` |
| MealOption | `meal_options` | `nutrition_preset_id` (type meal), `name` (optional, N30), `position` |
| MealItem | `meal_items` | `meal_option_id`, `food_id`, `amount`, `unit` (basis unit or serving label), `position` |
| NutritionSchedule | `nutrition_schedules` | `client_id`, `nutrition_preset_id`, `date` or `weekdays_mask` + `from_date` + `until_date` (N8), `time`, `coach_id` |
| NutritionTargets | `nutrition_targets` | `client_id`, `name`, `targets` jsonb `{code: {min?, max?}}` (N33), `archived_at` |
| Target schedule | `target_schedules` | `client_id`, `nutrition_targets_id`, `date` or `weekdays_mask` + `from_date` + `until_date` (N19) |
| NutritionLog | `nutrition_logs` | `client_id`, `type`, `logged_on`, `logged_at`, `nutrition_schedule_id` + `scheduled_date` (the occurrence, as W13), `nutrition_preset_id`, `meal_option_id` |
| FoodLog | `food_logs` | `nutrition_log_id`, `food_id`, `amount`, `unit`, `nutrients` jsonb (copy at save) |

Rules: a meal preset has one or more options, each with one or more items, and no `food_id`. A food or supplement preset has `food_id`, `amount` and `unit`, no options, and its food's kind matches its type. `weekdays_mask` is 1–127 and `until_date >= from_date`. Saved logs obey N13; drafts are not decided.

```text
target_schedules -> nutrition_targets -> {code: {min?, max?}}

nutrition_schedules -> nutrition_presets
                         meal -> meal_options[] -> meal_items[] -> foods
                         food | supplement -> foods + amount + unit

nutrition_logs -> food_logs[] (nutrients copied)
```

## Examples

| Prescription | Preset type | Schedule |
|---|---|---|
| Breakfast: oats + milk OR eggs + toast | meal | Every day at 08:00 |
| Banana, 1 | food | Tuesday at 16:00 |
| Creatine, 5 g | supplement | Daily, without a fixed time |
| Different breakfast this Friday | meal | Replaces only the usual breakfast on Friday |

If Monday prescribed oats and the client recorded nothing, a Tuesday edit to eggs must still leave Monday showing oats. A consumption log keeps the exact prescription version it used. The rule for edits during the same date remains open.

## Week planning and shared content

The coach selects weekdays with buttons. Every day selects all seven bits. Sun, Mon, Tue is `64 | 1 | 2 = 67`. The mask is stored data, not a coach-facing number. Membership uses `(weekdays_mask & day_bit) != 0`.

Content edits and schedule edits are separate; NU4 and NU7 show their scope on screen.

## Daily targets

| Target form | Example |
|---|---|
| Exact | Energy: 2,200 kcal |
| Minimum | Protein: at least 160 g |
| Maximum | Sodium: at most 2,000 mg |
| Range | Fat: 60–80 g |

A shared target set can apply on Sun, Mon, Tue through its target schedule. A one-off Monday replacement can supply 2,500 kcal and protein at least 170 g. That Monday uses the replacement set as a whole. Following Mondays use the regular rule again.

One date means one calendar date in the client's timezone. Preset schedules can supply several consumption occasions on that date; target schedules resolve to one complete daily target set. Target sets and presets have independent schedules. Editing one never silently edits the other.

## Nutrition week and meal editor UX (decided 12 Oct 2026)

Settled with a clickable prototype in the coach app: `/prototype/nutrition-week` (`frontend/apps/coachapp/src/nutrition-week-prototype/`). The meal editor opens inside it and shares its state. It follows the training week UX (workout concept V1–V7).

| # | Decision |
|---|---|
| NU1 | The coach designs one repeating week, Monday to Sunday, with no dates. Date-specific changes (N9) are deferred, as for workouts. |
| NU2 | Each day shows its target set first, as its name and energy only ("Training day · 2500–2700 kcal"), then its schedules in time order. A schedule without a time shows "Any time". |
| NU3 | A schedule card shows time and meal name, then the options joined by "or". A food or supplement card shows time and name, then its amount; a supplement has a pill icon. |
| NU4 | The schedule dialog edits time and weekdays. For a meal it lists the options and offers "Edit meal" and "Use a different meal". For a food or supplement it edits the amount and unit in place. It names the other days that use the same preset ("Also on Sat–Sun at 10:30") and what an edit changes there. It also has "Remove from <day>" and Save. |
| NU5 | "Add" on a day offers Meal, Food and Supplement as tabs. Meal picks one of this client's meals (the same preset, N35) or "Create a new meal". Food and Supplement search the catalogue, then ask for amount and unit. Every path ends on one step that asks for the time. |
| NU6 | The targets dialog chooses the day's set (or none, or a new set) and edits its values: no target, exactly, at least, at most, between. "Add nutrient" shows further nutrients. When other days share the set, the dialog names them first and offers "Use a copy for <day> only". Errors show after a Save attempt, on the field ("Enter both numbers", "From must not be above to"). |
| NU7 | The meal editor edits name, instructions and options. Each option has an optional name, foods (amount, serving unit, calculated values) and a total. "Add option" adds a choice; two or more read "The client chooses one of these N options". It lists the days that use the meal and saves explicitly, naming the days ("Save for every day"); a new meal saves as "Add to <day>". Days and times are edited in the week. |
| NU8 | Every change applies from today; earlier weeks stay as they were. Add, remove and save show Undo for 8 seconds. From 1280px the week shows seven columns; below that it shows one day at a time with Mon–Sun tabs. |
| NU9 | Recovery rules: a dialog with unsaved edits does not close on an outside click or Escape and has Cancel. "Edit meal" is disabled while the schedule dialog has unsaved changes, with the reason shown. The meal editor's Save shows its errors in place and moves focus to the first ("Add a name", "Add a food to option 2"); leaving or Discard with unsaved edits asks first. Removing a food or an option offers Undo. Focus returns to the card or the day's Add after a dialog closes. |

## Prescription archive

The archive answers: what was prescribed in a given day or week? Consumption records separately answer: what was recorded as consumed?

```text
Date -> nutrition_schedules that applied -> nutrition_presets they point to (never changed, N36)
Date -> target_schedules that applied -> nutrition_targets they point to
Log  -> nutrition_preset + meal_option it used
```

Preserving unused future drafts is not required. Preserving prescriptions that applied on past dates is required, including dates without logs; N36 does this with the concept tables only.

## Check against Simple Made Easy

| Concern | Assessment |
|---|---|
| Content and timing | Separate. A preset can be reused without storing dates in it. |
| Prescription and consumption | Separate. An instruction edit cannot change a recorded fact. |
| Day planning | A view over schedules. No day entity or repeated lock flag must stay in sync. |
| Complete alternatives | MealOption owns the choice; MealItem owns the prescribed amount. Fixed and choice meals share one structure. |
| Different content shapes | An explicit type selects the shape. Supplements do not need meal options. |
| Consumption grouping | NutritionLog groups FoodLogs. Its type has precise rules instead of standalone booleans. |
| Nutrient totals | Calculated from FoodLogs, so duplicate totals do not need synchronisation. |
| History | Rows that applied never change (N36), so the past is read, not reconstructed. No version tables. |

The core concepts are agreed. Detailed design is required before implementation. A common selection UI does not by itself justify combining catalogue tables.

## Open questions

1. Recipes: ingredient storage and yield calculation (ADR 0002).
2. Programs: whether nutrition has program presets and program schedules (as W11).
3. One-off changes (N9): how a replacement names the occurrence it replaces (as W15).
4. Same-day edits: W14 makes today a fact only when a log claims today's occurrence, but NU8 and V5 always end the old row yesterday. Proposed: W14 wins; a change starts tomorrow when today's occurrence is already logged.
5. Logging: drafts, photo-only records, substitutions, corrections, duplicates, permissions, and type changes. FoodLog may carry a prescribed-item reference, to tell "rice replaced toast" from "toast skipped, rice added". From the Cronometer study, not decided: one "Add food" with no occasion type (against N12–N14), corrections that rescale from the copied nutrients, and "Not recorded" for an empty day.
6. Water, medicine, and tracker boundaries.
7. Integration: tenancy, journal, reviews, coaching-term access, API, and complete implementation slices.

No code or migrations are changed by this document.
