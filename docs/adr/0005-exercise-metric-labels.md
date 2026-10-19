---
status: accepted
date: 2026-10-16
---

# Give each exercise metric its own optional label

One personal physical activity can contain several distinct counts. A climbing practice block can record moves completed, route attempts, and routes completed. One Exercise-level `count_label` cannot describe all three. Store each selected metric as a typed `ExerciseMetric` embed with a fixed catalogue `key` and an optional `label`.

The [review draft](../../.scratch/workout/models.ex) includes the schema and proposed changesets. Runtime code, database constraints, API types, and apps are not changed by this ADR.

## Representation and rules

`Exercise.metrics` is a JSONB array of typed entries and can be empty. Only name and kind are required Exercise inputs. Array order controls display order. An entry has no separate UUID or position: the unique catalogue key identifies the metric within the exercise.

```elixir
metrics: [
  %{key: :reps, label: "Moves completed"},
  %{key: :attempts, label: "Route attempts"},
  %{key: :successes, label: "Routes completed"}
]
```

- Each key is required, comes from the fixed catalogue, and occurs at most once per exercise. Coaches cannot create new metric keys.
- Every selected metric can have its own plain-text label. Trim outer whitespace; a blank or omitted label is null and uses the catalogue label. Labels do not need to be unique.
- Labels change presentation only. Targets, recorded values, units, validation, and calculations continue to use the metric key.
- On creation, omitting the metrics field selects the kind's default metrics, with null labels. An explicit empty array stays empty. Null is invalid for this collection; use an empty array to select no metrics.
- On update, omitting metrics preserves the complete list and its labels, even if kind changes. Providing metrics replaces the complete ordered list; omitted labels in that replacement use the standard labels.

Use an embedded Ecto schema rather than arbitrary maps. This replaces the key-only enum array and the separate `count_label` field. A label on each entry keeps the key and label together; a separate label map could drift from the selected keys.

## Current scope and grade deferral

The current scope is one person's physical activities. Defer `grade`, `Exercise.grade_scale`, and a new generic choice-metric system until there is a concrete need. Other existing catalogue keys are unchanged by this decision.

The draft retains grade fields in historical targets and results so those values remain representable. New exercise definitions cannot select grade. A later production migration must preserve existing historical data; this decision does not authorize deleting recorded values.

## Implementation consequences

Migrate the stored metric list to typed JSONB entries before changing API consumers. When replacing `count_label`, preserve each metric's previously displayed label, including the existing successes/attempts prefix behavior. Standard labels stay in the catalogue rather than being copied into every exercise.

Backend validation and database constraints must accept empty arrays and reject invalid entries and duplicate keys. The draft changesets cover application validation; database constraints remain proposed until the production migration is implemented. Rendering code must use the catalogue label whenever an entry's label is null.

Per-workout side tracking remains governed by [ADR 0004](0004-workout-exercise-side-mode.md). This decision adds no custom metric types, grade editor, or choice-list editor. Revisit it only for a new requirement, with a superseding ADR.
