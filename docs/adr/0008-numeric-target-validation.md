---
status: accepted
date: 2026-10-16
---

# Validate typed targets within workout exercises and groups

A target describes the coach's instruction for one metric in one round. Keep separate typed `CountTarget` and `NumericTarget` embedded schemas: count values are integers and numeric values are decimals. Both use the same four modes and field-combination rules, enforced by shared `TargetRules`.

## Allowed shapes

| Mode | Required fields | Fields that must be null |
|---|---|---|
| `client_chooses` | None of the numeric fields | `value`, `min`, `max` |
| `exact` | `value` | `min`, `max` |
| `range` | `min`, `max`, with `min <= max` | `value` |
| `max` | None of the numeric fields | `value`, `min`, `max` |

Mode is required after defaults; a new empty target defaults to `client_chooses`. Explicit null or unsupported modes are invalid. A missing metric target means no prescription for that metric. Equal range bounds are allowed. Mode `max` means as much as possible; the numeric field `max` is the upper bound of a range.

Unused numbers must be cleared explicitly when changing modes. Do not silently discard a contradictory target. Validate all resulting fields on updates, including unchanged values. For example, updating only the minimum from 8 to 13 must fail when the stored maximum is 12.

Targets do not restrict the actual result the client may record. A client can record 8 repetitions against a target of 10.

## Metric limits

Use the existing metric conventions and base units:

- Counts are whole, nonnegative numbers. Machine level starts at 1.
- Duration, distance, elevation gain, height, calories, speed, and power are nonnegative.
- Effort is 1 through 10; reserve is 0 through 10. Range endpoints obey the same limits as exact values.
- Weight, incline, and score can be negative under the existing catalogue meanings. Negative weight represents assistance.
- Numeric values use finite decimals. The typed casts reject nonnumeric values, NaN, and infinity supplied as JSON strings.

The same numeric shape serves different metrics, so its changeset requires the metric key. For example, `NumericTarget.changeset(target, attrs, :duration)` rejects a negative duration while the weight variant can accept a negative assistance value. The metric key comes from the containing field, not from an editable target property.

## Round validation

`RoundTargets.changeset/3` receives the round, its input, and the selected Exercise definition. It casts each target through the related typed changeset and supplies the containing metric key to numeric targets.

- Each supplied target must be an object or null. Unknown target names are rejected. A metric target can be present only if that metric is selected on the Exercise; rest is independent of that selection.
- Selected metrics do not require prescriptions. An empty round, or a round containing only rest, is valid even when the Exercise has no selected metrics.
- Omitted targets retain their values on update and are revalidated. This catches invalid retained values and targets whose metric was removed from the Exercise. Explicit null removes a metric target.
- Omitted rest retains an existing instruction, including explicit no rest. Clearing rest with null resets it to `client_chooses` with no duration fields. A new empty round has the same default.
- Grade remains representable for historical reads, but cannot be newly prescribed because it is absent from the active Exercise metric catalogue.

Rest uses the numeric shape rules with fields `value_s`, `min_s`, and `max_s`, all nonnegative seconds. Its allowed modes are `client_chooses`, `none`, `exact`, and `range`; both modes without a duration require all numeric fields to be null.

Text targets require a nonblank, trimmed value in exact mode. Result targets require win, draw, or loss in exact mode. Both require an empty value in client-choice mode. Their remaining modes are rejected by their enums.

## Workout-exercise validation

`WorkoutExercise.changeset/4` receives the workout exercise, input, resolved Exercise, and the group's positive integer round count. Its `exercise_id` must match the resolved Exercise so target validation uses the correct metric selection. Side mode and target mode are required after their defaults.

| Target mode | Required target entries |
|---|---|
| `same_for_all` | Exactly one, applied to all group rounds. |
| `per_round` | Exactly one per group round, in round order. |

Side mode does not change this count. Three per-side rounds still use three target entries in `per_round`, not six. The left and right results are separate logs for the same prescribed round.

Each supplied entry must be a round-target object and passes through `RoundTargets.changeset/3`. An empty object is valid and leaves the metrics unprescribed, with client-chosen rest. An empty target list is invalid; a shared unprescribed target is represented by `[{}]` in JSON.

A supplied target array replaces the complete ordered list. Omitted arrays retain existing round targets and revalidate them against the resolved Exercise and current group round count. Changing modes or group rounds does not silently pad, truncate, or duplicate targets. Caller-supplied updates do not change the workout exercise's existing occurrence ID.

## Exercise-group validation

`ExerciseGroup.changeset/3` receives the group, input, and a map of authorized Exercise definitions keyed by ID. Its four-argument form also receives prior occurrences from the same workout so moves between groups can preserve their IDs. The group owns its round count and the order of its workout exercises.

- Name is optional. Trim surrounding whitespace and store a blank name as null.
- Rounds default to 3 and must be an integer from 1 through 100, preserving the existing backend and builder limits.
- The exercises field must be a nonempty array of objects. This preserves concept U6: adding an exercise creates a group; empty groups are not saved.
- Supplied occurrence IDs must be valid UUIDs and unique within the group. Existing IDs match retained entries during reordering; the same library `exercise_id` can appear in several separate occurrences. New entries use the schema's generated IDs when persisted.
- A supplied array defines membership and order, with supplied IDs selecting existing entries for updates. Omitted arrays retain all entries and revalidate them. Changing group rounds or the resolved Exercise definitions cannot bypass child target validation.

Missing Exercise definitions are rejected. The caller must include all retained and newly submitted exercise references in its authorized lookup. Nested changesets perform no database lookup themselves. An existing group's ID is not changed by ordinary edit parameters.

## Implementation boundary

The [review draft](../../.scratch/workout/models.ex) includes changesets for individual targets, `RoundTargets`, `WorkoutExercise`, and `ExerciseGroup`. Its checks cover nested validation, selected metrics, defaults, clearing, retained targets, partial updates, reference matching, target counts, nonempty groups, and within-group ordering and occurrence IDs.

The Workout structural changeset now validates metadata and the whole group tree, checks IDs across groups, and preserves occurrence IDs during moves within the workout. The persistence context must still resolve and authorize each Exercise, apply the rules for new versus retained archived references, and synchronize the workout/exercise reference table in the save transaction.

[ADR 0009](0009-workout-content-readiness.md) defines the Workout changesets and separate content policies for saving and scheduling. The content policies run after the nested validation described here.

No migration, runtime backend, API, or app is changed by this ADR. These draft changesets are not a complete workout-save validation path. Record a superseding decision if the target meanings change.
