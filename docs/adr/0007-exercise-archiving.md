---
status: accepted
date: 2026-10-16
---

# Archive exercises without breaking existing uses

Coaches need to stop offering an exercise for new selection while existing workouts and recorded activity still reference it. Add nullable `Exercise.archived_at`. Null means selectable; a timestamp means archived. Archive changes availability for new selection without deleting the exercise or its references.

The [review draft](../../.scratch/workout/models.ex) contains the field and proposed archive/restore changesets. Runtime endpoints, query scopes, UI, and database migrations remain unchanged.

## Lifecycle rules

- Archive sets a server-generated UTC timestamp. Repeating Archive preserves the current archive timestamp.
- Restore clears the timestamp and makes the exercise selectable again.
- Ordinary create/update parameters cannot set `archived_at`. Archive and Restore are explicit actions, authorized by the context using the existing ownership rules.
- Existing workouts can still display the exercise, its instructions, and its media, and clients can continue logging it. Archiving on Monday does not remove it from an existing Tuesday workout.
- Permanent deletion remains blocked while workouts, recorded sets, swaps, or other activity reference the exercise. Archiving never deletes those references or attachments.

## Queries and implementation

Normal exercise pickers exclude archived exercises, including pickers used to select a new exercise or swap. Provide a way for an authorized coach to find archived exercises and restore them.

Keep selection queries separate from lookups for existing uses. Do not add a blanket archive filter that makes an authorized workout or history lookup lose its exercise. Existing ownership and access checks still apply. Saving an existing workout must allow it to retain an already referenced archived exercise.

The timestamp is sufficient; do not add an `is_archived` boolean or another status field. Archiving does not create a snapshot or freeze exercise metadata. Workouts continue to reference `exercise_id` under the existing design.

Retain deletion checks and foreign-key protection during production implementation. A later migration and app slice must verify both picker exclusion and continued display/logging for existing references. The draft checks only the schema and changeset behavior.

This decision applies to Exercise archiving. Workout archiving and prescription-history rules keep their separate meanings. Record a superseding ADR if future requirements change these lifecycle rules.
