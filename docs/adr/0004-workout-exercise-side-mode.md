---
status: accepted
date: 2026-10-16
---

# Choose side tracking on each workout exercise

The same personal physical activity can be prescribed with a combined repetition count or duration, or with a target for each side. Store this choice as `WorkoutExercise.side_mode`, with values `combined` and `per_side` and a default of `combined`. Replace the Exercise-level `unilateral` field and the proposed repetition-only `reps_scope` field.

The [review draft](../../.scratch/workout/models.ex) records this decision. Runtime code, migrations, and app behavior are not changed by this ADR.

## Target and logging rules

The mode applies to the whole workout exercise, across its rounds. It is required when the embedded prescription is saved. It is independent of whether targets are the same for every round or vary by round.

| Mode | Repetition and duration targets | Results for each round |
|---|---|---|
| `combined` | Cover the whole round. An equal split between sides is not required. | One combined result with `ExerciseSet.side = null`. |
| `per_side` | Apply to each side separately. | Separate left and right results, each with the same round number. |

Three rounds of ten repetitions per side remain three rounds. Each round has a left result and a right result. A client can record ten repetitions on the left and eight on the right. The logger must retain both values.

The same rule applies to timed activities. A thirty-second side-plank target per side means thirty seconds on the left and thirty seconds on the right. A combined thirty-second target covers both sides together.

Rest follows completion of both sides, once for that exercise in the round. For example: ten repetitions on the left, ten on the right, then sixty seconds of rest. Do not start the prescribed rest period after only the first side. If this is the last exercise in its group, this pause is the rest between group rounds.

`RoundTargets.rest` already describes this pause; no separate side-rest field is needed. The rule applies to repetitions and duration. Blank rest still means the client chooses the duration, and `none` explicitly means no rest.

The mode does not change measurement units or prescribe summing every metric. A twelve-kilogram target remains twelve kilograms for each side. The existing typed result fields and `ExerciseSet.side` identify the recorded values; separate left/right value columns are unnecessary.

## Reason and consequences

An Exercise-level boolean forces every use of an activity to follow the same logging rule. The coach needs to choose that rule for each workout prescription. `reps_scope` is too narrow because duration needs the same behavior.

The workout prescription owns the mode, and logs follow that prescription. Existing saved results must not be relabeled or split when a future prescription changes its mode. Production migration must preserve the meaning of existing unilateral prescriptions and their side values.

This decision covers personal activities and combined versus per-side recording. It does not add left-only or right-only prescriptions, different prescribed targets for each side, or anatomical classification of the exercise.

Revisit this decision only when a new requirement changes its meaning, and record a superseding ADR.
