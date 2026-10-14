# Client side concept

Status: agreed 13 Oct 2026. The client app (mobile only) shows today's plan and records what the client did. It uses the workout and nutrition models without new concepts: occurrences (W13), WorkoutLog and ExerciseSet (W18, W19, W27, W28, W38), and NutritionLog and FoodLog (N12–N16, N38–N42). Clickable prototype: the client app at `/prototype/today` (`frontend/apps/clientapp/src/today-prototype/`).

## Decisions

| # | Decision |
|---|---|
| C1 | **Today** is the home screen. It lists today's workouts, meals, foods and supplements in time order, with items that have no time last ("Any time"), and today's targets as "recorded / target". Each item shows Not recorded, In progress or Done. Existing tracker prompts, check-ins and messages stay. |
| C2 | A **day strip** (Mon–Sun) moves to other days. A past day shows each prescribed item next to what was recorded; a future day shows the plan, read only. A day with no records says "Not recorded" (N42). |
| C3 | **Workout logger.** "Start workout" creates the active log (W18). Sets are pre-filled from the targets, one set for each side of a one-side exercise (W27). Ticking a set records it; the client can change values, swap an exercise, add a set, then Finish: difficulty (too easy, just right, too hard), pain (yes or no) and an optional pain note. Discard asks first. Finish asks about planned sets that are not ticked: "Record them as planned" or "Finish without them"; an unticked set is not done. A video or open workout records "Done" plus the same feedback. An occurrence led by a coach (W16, W17) shows "<coach> records this session" in place of Start. |
| C4 | **Meal logger.** Tapping a meal opens its options; with two or more, the client chooses one. Its items are pre-filled with the prescribed amounts. The client can change an amount, replace or remove an item, add a food, set the time eaten, then Save. A food or supplement item is one tap: "Taken" with the prescribed amount; changing the amount opens the logger. |
| C5 | **Add food** records food that was not planned, from Today or any past day: search, amount, save (N38 sets the type). |
| C6 | **Correct a record.** A saved record opens in the same logger. Values recalculate from the copy in the record (N40). A finished workout offers Edit (it reopens) and Delete. Delete asks first, in a red confirm that names what is lost. |
| C7 | Prescribed amounts, recorded amounts and targets are shown apart. Totals add known values and say "incomplete" when a value is unknown (N34). Totals use only what was recorded; a slot with alternatives adds nothing until it is recorded (N42). |
| C8 | Out of scope now: copying a day, quick add with energy only, photo-only records, the 1RM display (W26), the coach's view of client records, and offline sync rules beyond keeping unsaved input on the device (N41). |
| C9 | (13 Oct 2026, dembrandt review) Unsaved input stays on the device (N41): a meal draft is kept per day and slot and restored with "Discard changes"; typed set values and added rounds stay on the active workout. Every change shows a message with Undo for 8 seconds. Each screen focuses its title on open; Back returns focus to the card that was opened. Cards always open something: a logger, or a read-only view for the future or a workout not started. Only the next item due today has a filled action. |
