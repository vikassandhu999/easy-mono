# Nutrition concept

Status: core concepts agreed, 9 October 2026. Detailed model and storage design remains open. Records the nutrition restart. Replaces the earlier N1–N8 draft in this file. These are domain decisions, not implemented tables. The current code does not constrain the design.

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
| N19 | Target schedules use regular weekday rules and one-off replacements, like prescription schedules. One client-local calendar date resolves to one complete target set. A replacement replaces the whole set; it does not add to regular targets. The regular rule continues after the replacement date. |
| N20 | Each nutrient target is exact, minimum, maximum, or range. An omitted nutrient has no target. |
| N21 | Foods, consumption records, and targets use one nutrient catalogue. Each nutrient has one code and registered unit. Catalogue entries and storage are still to be designed. |

## Model responsibilities

These are concepts, not a final list of PostgreSQL tables.

| Model | Responsibility |
|---|---|
| NutritionTargets | One complete set of daily nutrient targets |
| NutritionPreset | Name, instructions, type, and prescribed content |
| MealOption | One complete alternative within a meal preset |
| MealItem | Item reference, prescribed amount, and unit within an option |
| Food / Supplement catalogue | Item identity, units, nutrients, and preparation where applicable; separate versus shared models remains open |
| NutritionSchedule | Preset reference and timing |
| Target schedule | Target-set reference and applicable days; canonical model name and table boundary remain open |
| Nutrient catalogue | Shared nutrient codes and registered units |
| NutritionLog | Consumption occasion, type, time, and optional prescription reference |
| FoodLog | Consumed item and amount within a log |

```text
Target schedule -> NutritionTargets -> nutrient targets
                                     exact / minimum / maximum / range

NutritionSchedule -> NutritionPreset
                       meal -> MealOption[] -> MealItem[]
                       food -> Food + amount + unit
                       supplement -> Supplement + dose + unit

NutritionLog
  meal -> FoodLog[1 or more]
  food -> FoodLog[exactly 1 food]
  supplement -> FoodLog[exactly 1 supplement]
```

Each preset has exactly one content shape selected by its type. It cannot contain both meal options and a standalone item. Saved logs obey the item-count and item-kind rules. Incomplete drafts have not been decided.

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

A grouped tab can show Sun, Mon, Tue together. Adding a schedule there selects those days. Grouping is a view over schedule facts, not an EatingDay or a separate group entity. Divergent schedules must remain visible rather than being silently changed to match a tab.

The editor must distinguish content edits from schedule edits. Proposed UX, to validate during screen design:

| Action | Visible scope |
|---|---|
| Edit shared breakfast contents | Show all scheduled uses and a clear save action for those uses |
| Change Monday's time | Change only that schedule; if its row covers several days, split its timing explicitly |
| Give Monday different contents | Copy the preset and change Monday's reference, splitting the schedule if needed |
| Replace breakfast on one date | Replace only that occurrence; retain the regular rule |

## Daily targets

| Target form | Example |
|---|---|
| Exact | Energy: 2,200 kcal |
| Minimum | Protein: at least 160 g |
| Maximum | Sodium: at most 2,000 mg |
| Range | Fat: 60–80 g |

A shared target set can apply on Sun, Mon, Tue through its target schedule. A one-off Monday replacement can supply 2,500 kcal and protein at least 170 g. That Monday uses the replacement set as a whole. Following Mondays use the regular rule again.

One date means one calendar date in the client's timezone. Preset schedules can supply several consumption occasions on that date; target schedules resolve to one complete daily target set. Target sets and presets have independent schedules. Editing one never silently edits the other.

## Prescription archive

The archive answers: what was prescribed in a given day or week? Consumption records separately answer: what was recorded as consumed?

```text
Date -> schedule that applied -> preset version that applied
Date -> target schedule that applied -> daily target values
Log  -> exact prescription version used, when prescribed
```

Preserving unused future drafts is not required. Preserving prescriptions that applied on past dates is required, including dates without logs. Target history must support the same daily archive; its version mechanism is an open storage decision. No background job or specific history table has been chosen.

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

The core concepts are agreed. Detailed design is required before implementation. A common selection UI does not by itself justify combining catalogue tables.

## Open questions

1. Catalogue: shared or separate Food and Supplement models; recipe and ingredient storage.
2. Targets: catalogue entries and units, validation, target-set ownership, schedule overlap resolution, and history storage. Daily scope, four target forms, and complete-set replacement are agreed.
3. Ownership: library, program, and client presets. Copy on assign, never linked, is the user's stated principle; nutrition ownership fields and program schedules need explicit decisions.
4. Schedule shape: weekday masks are agreed; exact bounds, occurrence identity, overlapping schedules, and replacement representation remain open.
5. Past facts: exact schedule change/deletion and same-day rules, including days with no log.
6. History: snapshot/version storage, log references, and same-day boundaries. Past prescriptions survive without logs; log-only history is superseded.
7. Logging: drafts, photo-only records, substitutions, corrections, duplicates, permissions, and type changes. Saved log counts are agreed; draft counts are not.
8. Portions and nutrients: base amounts, servings, recipe calculations, unknown values, and preservation of consumed nutrient values.
9. Water, medicine, and tracker boundaries. Earlier draft decisions are not carried forward as locked rules.
10. Integration: tenancy, journal, reviews, coaching-term access, API, and complete implementation slices.

No code or migrations are changed by this document.
