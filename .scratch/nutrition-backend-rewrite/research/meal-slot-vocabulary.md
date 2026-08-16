# Nutrition meal-slot vocabulary

## Recommendation

Use a closed vocabulary of 11 timing anchors. Eight describe ordinary parts of a local day and three describe intake relative to a workout.

| Machine value | Display label | Kind | Meaning |
| --- | --- | --- | --- |
| `early_morning` | Early morning | Day period | After waking and before breakfast |
| `breakfast` | Breakfast | Meal | The first main meal of the day |
| `mid_morning` | After breakfast | Day period | Between breakfast and lunch |
| `lunch` | Lunch | Meal | The midday main meal |
| `afternoon` | After lunch | Day period | Between lunch and the evening period |
| `evening` | Evening | Day period | The period before dinner |
| `dinner` | Dinner | Meal | The evening main meal |
| `pre_sleep` | Before sleep | Sleep-relative | Intake deliberately placed near the person's main sleep period |
| `pre_workout` | Before workout | Workout-relative | Intake deliberately placed before a workout |
| `during_workout` | During workout | Workout-relative | Intake consumed during a workout |
| `post_workout` | After workout | Workout-relative | Intake deliberately placed after a workout |

The machine values describe stable concepts. Display copy can change without migrating data. `mid_morning` and `afternoon` are preferable machine names to `post_breakfast` and `post_lunch`: they remain meaningful when a client skips or moves the preceding meal. The requested relative wording can remain in the interface.

`during_workout` should be included. Sports-nutrition guidance treats intake before, during, and after exercise as separate scenarios. The joint position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine treats the type, amount, and timing of food and fluid as dependent on the training or competition scenario. The ISSN position stand gives specific during-exercise carbohydrate guidance for prolonged, high-intensity activity and also discusses intake during resistance exercise. This supports the slot's existence, but not its use for every workout. [ACSM joint position statement](https://pubmed.ncbi.nlm.nih.gov/26891166/), [ISSN nutrient-timing position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/)

## What the evidence does and does not define

### Conventional meal occasions

Official guidance supports breakfast, lunch, dinner, and smaller eating occasions, but it does not provide a universal fine-grained slot taxonomy. The 2024 ICMR-National Institute of Nutrition example diets for Indian adults use Breakfast, Lunch, Evening, and Dinner. A pregnancy example also uses Early Morning. These examples support the proposed local-day anchors in the product's main market; they do not establish that every person must eat at each anchor. [ICMR-NIN Dietary Guidelines for Indians 2024](https://www.nin.res.in/dietaryguidelines/pdfjs/locale/DGI24thJune2024fin.pdf)

The U.S. Dietary Guidelines Advisory Committee reports that eating occasions commonly include breakfast, lunch, dinner, and snacks, while also stating that no consensus definition exists for eating occasions. The CDC's current NHANES dietary recall likewise records a participant-selected occasion name and explicitly does not define those names for the participant. Its list includes breakfast, lunch, dinner, supper, brunch, snack, drink, and other culturally specific labels. The evidence therefore supports a product taxonomy, not a claim that labels such as "after breakfast" have a fixed physiological meaning. [Dietary Guidelines Advisory Committee meal-frequency review](https://www.dietaryguidelines.gov/sites/default/files/2024-12/Part%20D_Ch%206_Frequency%20of%20Meals%20and%20or%20Snacking_FINAL_508.pdf), [CDC NHANES dietary codebook](https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2021/DataFiles/DR1IFF_L.htm#DR1_030Z)

The proposed day-period labels fill schedule positions around the three main meals:

* `early_morning` covers "before breakfast."
* `mid_morning` displays as "After breakfast."
* `afternoon` displays as "After lunch."
* `evening` covers a later snack or intake before dinner.

These are interface-friendly positions. Research does not require each position or define an exact clock range for it.

### Exercise-relative nutrition

`pre_workout`, `during_workout`, and `post_workout` are defensible as separate anchors. Position statements distinguish interventions before and after exercise, and give scenario-specific advice for intake during exercise. The ISSN also notes that the size and timing of a pre-exercise meal affects the need for post-exercise protein, which is another reason not to collapse the three phases into a generic `workout` slot. [ISSN nutrient-timing position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/)

The product must avoid turning slot availability into advice. During-workout carbohydrate is most clearly relevant to prolonged or demanding activity, and the amount depends on duration, intensity, the athlete, and the broader plan. The IOC similarly describes sports foods as potentially useful before, during, or after a session when the scenario has a limiting nutrition need. [IOC dietary-supplement consensus statement](https://bjsm.bmj.com/content/52/7/439)

Use the product term `workout` rather than `exercise` because it maps to the Training domain. Use `during_workout` rather than `intra_workout`; it is plain language and means the same thing.

### Sleep-relative nutrition

`pre_sleep` has a narrower evidence basis than the workout phases. The ISSN protein position stand reports evidence for pre-sleep protein in healthy exercising people, including overnight muscle-protein synthesis. That supports a distinct label when a coach deliberately schedules intake around sleep. It does not establish a universal recommendation to eat before sleep, and it does not make "after dinner" a separate physiological window. [ISSN protein and exercise position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/)

Use `pre_sleep`, not `bedtime`. Sleep is the relevant event, while bedtime can mean time spent in bed before sleep. The applied client timezone determines which local date contains the slot, but the enum itself carries no clock time.

### Product taxonomy rather than scientific rules

The following labels are useful product choices but are not separate evidence-backed nutrition windows:

* "After breakfast" and "After lunch" are display names for `mid_morning` and `afternoon`.
* "Before breakfast" is the meaning of `early_morning`.
* "Before dinner" is covered by `evening`.
* "After dinner" is normally covered by `pre_sleep` when sleep-relative timing is intended. Otherwise the Meal can be named "After-dinner snack" inside `evening` or `dinner`.

The distinction matters for future changes. A display label can be localized or revised. Adding a machine value creates a permanent API, database, Programming, and Diary concept.

## Values not recommended

Do not add these values to the enum:

* `snack`: snack describes the size or social role of an eating occasion, not when it occurs. A Meal named "Fruit snack" can be placed in any timing slot.
* `brunch`: brunch typically replaces or combines breakfast and lunch. It is a Meal name placed in `mid_morning`, not another independent daily position.
* `after_dinner`: this substantially overlaps `pre_sleep` and would make the distinction depend on an arbitrary interval.
* `before_lunch` and `before_dinner`: these duplicate `mid_morning` and `evening`.
* `late_night`: this overlaps `pre_sleep` and can cross the person's main sleep boundary. If the product later supports shift workers, the applied sleep schedule needs a model rather than another fixed label.
* `anytime`: this removes the temporal identity that Diary Slot relies on. Flexible guidance belongs in a separate plan concept if the product needs it.
* `hydration`, `supplements`, `medication`, `rest_day`, or `training_day`: these describe content or day type, not an intake time. Day type belongs in Day Pattern; item type belongs in Library or a separate clinical scope.

## Ordering and identity constraints

The enum cannot define one truthful global order. The eight local-day anchors have a conventional sequence, but workout-relative anchors move with the workout. A morning `post_workout` may precede breakfast, while an evening `post_workout` may follow dinner. `pre_sleep` can also overlap an evening `post_workout`.

For that reason:

* Store an explicit presentation position for each populated slot in a Day Pattern. Do not derive order from the enum's declaration order.
* Keep at most one configuration for a given slot value within a Day Pattern.
* Treat slots as mutually exclusive Diary buckets. One recorded intake belongs to one slot, even when a person could describe it as both `post_workout` and `breakfast`.
* Do not infer a workout timestamp from `pre_workout`, `during_workout`, or `post_workout`. They are coach-authored relative labels unless a later design explicitly links them to Training.
* Do not assign fixed clock boundaries in the backend. A later optional target time could help reminders and display ordering without changing slot identity.

Explicit per-pattern order lets a coach put the workout sequence in the correct place for that Day Pattern and keeps the vocabulary closed.

## Blind spots requiring a product decision

### Multiple workouts on one local date

The proposed enum and a Diary identity of client, local date, and slot can represent only one pre/during/post sequence per day. Two-a-day training would collapse both sessions into the same three buckets. Adding `pre_workout_1` and `pre_workout_2` is not a durable fix.

Recommended boundary for this rewrite: support one workout-relative sequence per Day Pattern and document that limitation. If two-a-day programming is required, add a workout-occurrence identity and key the three relative phases to that occurrence.

### Relationship to Training

A workout-relative slot may be a label chosen by the nutrition coach, or it may point to a scheduled Training workout. Automatic linkage changes Coverage, rescheduling, and history behavior across two bounded contexts.

Recommended boundary for this rewrite: keep the nutrition slot independent and coach-ordered. Treat Training linkage as separate product work. The machine term `workout` still provides vocabulary consistency without creating a cross-module dependency.

### Overlapping meanings

A post-workout breakfast or pre-sleep recovery meal has two legitimate descriptions. The proposed Diary model gives each intake one primary slot. If the product needs the same intake to fulfil two timing instructions, slot identity is the wrong abstraction; it would need tags or instruction fulfilment separate from the Diary bucket.

Recommended boundary for this rewrite: one primary slot per planned or actual item. The coach chooses the label that communicates the main intent.
