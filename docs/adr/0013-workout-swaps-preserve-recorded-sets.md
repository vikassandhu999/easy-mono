---
status: accepted
date: 2026-10-18
---

# Apply exercise swaps to unrecorded sets and preserve recorded work

A client can change exercise partway through a session. A swap selects the replacement for the remaining unrecorded sets of one prescribed workout entry. Changing that choice must preserve what the client already recorded and leave the coach's workout unchanged.

For three prescribed sets of back squats, a client may record one back-squat set, then select goblet squats for the remaining two. All three sets keep the same prescribed occurrence reference, while each set records its actual exercise and values. The swap action must not delete or rewrite the first set.

## Selection and recorded results

`WorkoutLog.swaps` contains typed `ExerciseSwap` embeds with two required UUIDs:

- `workout_exercise_id`: the specific prescribed occurrence inside the log's workout.
- `exercise_id`: the selected replacement Exercise.

There is at most one current replacement per prescribed occurrence. Using the occurrence ID allows two uses of the same catalogue exercise to be swapped independently. An empty collection means no replacement choices. Returning to the original exercise removes that occurrence's selection without changing recorded sets.

The selection can be saved before the client records any set. It therefore cannot be derived only from completed work. It stores exercise references, not snapshots, following the existing decision to use Exercise IDs.

`ExerciseSet.exercise_id` identifies what was actually performed. Recorded sets must resolve and validate their own exercise references; they cannot be required to match the log's latest swap selection. Separate, explicit corrections to a recorded set remain possible under the log's editing rules.

## Replacement targets: copy on request

The client or coach recording the session can choose replacement targets and change the remaining set count and rest. Selecting a replacement opens directly into logging, with no required target-review step.

Start with the original remaining count and rest as editable defaults. Show the original prescription as reference. Replacement metric targets start blank. The recorder may enter targets directly or explicitly copy compatible targets from the original exercise. Copying targets does not record a set as performed.

Compatibility means the replacement supports the metric and the copied target passes that metric's validation. Matching metric names alone does not justify automatic copying or claim that the target suits the replacement.

We considered automatic copying, retaining only count/rest, starting with one empty replacement set, suggesting previous results, and copying original targets on request. The selected direction preserves useful structure while giving the recorder control over which numeric targets carry over.

## Typed session instructions

The two reference IDs are extended with these fields in the review draft:

| Field | Meaning |
|---|---|
| rounds | Total planned rounds for this prescribed entry within this log, including recorded rounds. Initialize from its prescribed group count. |
| targets_mode | same_for_all or per_round, using the existing target structure. |
| targets | Typed RoundTargets, including rest. One entry for same_for_all, or one per planned round for per_round. |

Store the total round count and derive the remaining work from recorded sets. For example, with one of three rounds recorded, rounds remains 3 and two rounds remain. Adding one more planned round changes rounds to 4. Reducing the count must not exclude any recorded round. These changes belong only to this entry in this log, not its prescribed group or other exercises.

Per-round targets use the original round numbers. The current replacement targets apply only to unrecorded sets. Recorded sets retain their exercise and values. Reuse RoundTargets.rest rather than adding a separate rest representation; on initial selection, copy the original rest instructions without copying metric targets.

## Assumption to check

The original count and rest are useful starting defaults even when the exercise changes. Try similar replacements and replacements with different metrics; check whether recorders keep or immediately change these defaults.

This slice adds no mandatory swap wizard, automatic target conversion, or suggestions from previous sessions. These can be reconsidered only if the basic flow proves insufficient.

## Implementation boundary

The [review draft](../../.scratch/workout/models.ex) includes `ExerciseSwap.changeset/5` and `WorkoutLog.swaps_changeset/4`. The first validates one selection against the resolved workout, supplied Exercise definitions, and recorded sets. The second validates the whole collection, checks the workout matches the log's client and business, and requires the recorded sets to be loaded and scoped to that log.

Replacement definitions must be built-in or belong to the workout's business. New selections reject archived exercises; an already stored selection can retain its archived exercise. Selecting the original exercise as a replacement is rejected with an instruction to remove the swap instead.

The parent matches existing selections by their canonical workout_exercise_id. A supplied array defines the complete selection membership and order. Omitted fields within a matched selection retain their values. Omitted swaps retain and revalidate the collection; an empty array clears it. Null and non-object entries are invalid. Duplicate occurrence IDs are rejected, while separate occurrences of the same catalogue exercise can have different replacements.

Initial count defaults to the larger of the prescribed group count and the highest recorded round for that occurrence. Initial mode and rest come from the original entry, with all metric targets blank. A subsequent replacement change keeps the current count, mode, and rest but clears metric targets unless the request explicitly supplies new ones. Supplying a targets array replaces the complete list; omitting it retains and revalidates the current instructions when the replacement is unchanged.

`RoundTargets.cast_many/3` supplies shared list-shape, metric, and target-count validation for swaps and prescribed workout entries. Per-round target arrays are not padded or truncated automatically when counts change. If extra recorded rounds increase the initial count beyond the original per-round list, the caller must supply the complete replacement target list. The UI can prepare this input without adding a required review screen.

The draft requires positive round counts and prevents reductions below the highest recorded round of the selected occurrence. Left/right rows for one round count once. Sets from other occurrences and unlinked extra sets do not increase that minimum. Swap changes do not cast or modify recorded sets, including sets performed with earlier replacements.

Standalone checks cover these behaviors, malformed input, partial updates, mixed performed exercises, archive handling, and target preservation during selection reordering. The existing RoundTargets, WorkoutExercise, and ExerciseGroup checks also pass after sharing target-list validation.

This is not a complete WorkoutLog save. The [log metadata and lifecycle changesets](0014-workout-log-validation-and-lifecycle.md) now call swap validation for insert, update, and finish; updates and finishing require active state. The future writer must authorize the actor, load and lock the complete stored sets, and persist changes atomically. The explicit target-copy action, migrations, and runtime integration remain pending. The supplied definition lookup must include authorized retained references as well as new choices.

The running UI currently offers “Swap and clear sets,” and the backend validates prescribed sets against the current replacement. Both need to change to preserve mixed recorded exercises within one prescribed entry. Runtime behavior and stored data are unchanged by this draft.

The UI must distinguish target instructions, unrecorded input values, and recorded results when selecting or changing a replacement. Only the explicit copy action may carry original metric targets into the replacement instructions.

This records W74–W76 in the [workout concept](../../.scratch/workout/concept.md).
