---
status: accepted
date: 2026-10-17
---

# Allow empty prescribed workouts while building, before scheduling

A coach can save a named prescribed workout before adding its first exercise. A client must receive usable content when the workout is scheduled. Keep separate content checks for saving and scheduling, without adding a draft/published status field.

| Workout content | Save | Schedule |
|---|---|---|
| Prescribed, no groups yet | Allowed | Rejected |
| Prescribed, valid nonempty groups | Allowed | Allowed |
| Any empty or invalid group | Rejected | Rejected |
| Video attachment, no groups | Allowed for video type | Allowed for video type |
| No video or groups | Allowed for open type | Allowed for open type |

These rows describe content readiness, not authorization or all save requirements. Required metadata, valid references, and nested validation must also pass.

Prescribed and open workouts must not have `video_id`. Video and open workouts must not have exercise groups. A video workout requires `video_id`; the context must also verify that the referenced Attachment exists, is suitable video content, and can be used by this owner.

## Scheduling and edits

Validate the complete proposed content before scheduling a client workout. A save that leaves the workout on an active or future client schedule must use the same scheduling-level check. Otherwise removing the last group could leave an empty prescribed workout on the client's schedule.

The context chooses which check to apply from the operation and existing schedules. A user-supplied flag must not bypass scheduling readiness. History-preserving copies and schedule changes must apply the check before committing their transaction.

An unscheduled empty workout remains editable so the coach can add content gradually. An empty group is still invalid under U6 and W52. The UI creates a group when its first exercise is added.

## Workout changesets

`Workout.insert_changeset/4` takes trusted business/client ownership, input, and resolved Exercise definitions. `Workout.update_changeset/3` takes the existing workout, input, and those definitions. The current scope supports a business library workout or a client-owned workout. Business, name, and type are required; type defaults to prescribed. Name is trimmed and contains 1–200 characters. Description is optional trimmed text, with blank text stored as null.

Ordinary input cannot change the workout ID, business, client, or archive state. Reference IDs must be valid UUIDs. Planned foreign-key constraints cover business, client/business membership, and the video attachment; registering them in a changeset does not create database constraints.

Both changesets validate every resulting group and nested target before applying the save-content policy. The supplied Exercise lookup is restricted to built-in definitions or definitions owned by the workout's business. Missing or mismatched references fail nested validation. This scope check supplements the caller's authorization; it does not replace it.

## Embedded identity and edits

- A supplied groups array defines membership and order. Omitted groups retain and revalidate the stored structure. Existing IDs select entries for updates; new entries receive generated IDs when persisted.
- Group IDs and exercise-occurrence IDs must each be valid and unique within the workout. Repeated library exercise IDs are allowed when their occurrence IDs differ.
- The root passes only its own prior occurrences into group validation. Moving an occurrence between groups retains its ID and targets, then revalidates them against the destination group's rounds. The source group must remove the occurrence or be omitted; retaining it in both locations is rejected.
- Creating a separate workout from copied input does not reuse embedded IDs from another workout. New groups and occurrences receive new IDs. Moving between groups within the same workout is a different operation.
- Changing workout type requires explicit compatible content. Switching a prescribed workout to video must clear its groups; switching away from video must clear `video_id`. Content is not silently discarded.

## Implementation boundary

The [review draft](../../.scratch/workout/models.ex) includes the structural insert/update changesets and `Workout.validate_content_for_save/1` and `Workout.validate_content_for_schedule/1`. Insert/update changesets apply the save policy. A context scheduling or retaining scheduled content must additionally apply the schedule policy to that validated changeset. The checks preserve existing errors.

Checks cover metadata, protected ownership, nested validation, tenant-scoped exercise references, global IDs, reordering, moves, copies, and content readiness. Ecto's embedded preparation was checked without a database connection: moved occurrences retain IDs, while copied content receives new IDs.

The persistence context still needs database lookups, coach/client authorization, new versus retained archived-exercise selection rules, video suitability and access checks, history-preserving saves, and transactional reference-table synchronization. The scheduling writer must resolve the client-owned workout, apply this content policy, and write its schedule. Runtime endpoints, database migrations, and app flows remain unchanged.

This decision builds on [typed target and group validation](0008-numeric-target-validation.md) and the [workout video attachment](0003-shared-attachments-and-feature-media.md). Record a superseding ADR if the readiness policy changes.
