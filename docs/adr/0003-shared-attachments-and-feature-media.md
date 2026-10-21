---
status: accepted
date: 2026-10-15
---

# Share Attachment assets and keep feature relationship tables

Exercises, foods, recipes, workouts, messages, and tracker entries need files or external links. Use one common `Easy.Attachments.Attachment` model for the asset. Collections have separate feature relationship tables; a single asset slot can use a direct foreign key. Features are defined in code, each feature manages its attachments, and there is no requirement for a central attachment-use manager.

This decision is accepted for the design. The [review draft](../../.scratch/workout/models.ex) contains `Attachment`, `ExerciseMedia`, and the workout video association; runtime schemas, migrations, APIs, and apps have not been changed.

## Common asset and feature relationships

`Attachment` owns the source and file details. Keep the existing `business_id`, `client_id`, `uploaded_by_type`, `uploaded_by_id`, `storage_key`, `content_type`, `byte_size`, `duration_ms`, `captured_on`, and timestamps. Add `source` (`upload` or `external_link`) and `external_url` for the common model. An upload has a storage key, content type, and positive byte size. An external link has an HTTP or HTTPS URL. The two source locations cannot coexist.

The target design replaces the separate `LibraryMedia.Media` asset model with `Attachment`. This is not a second asset table named `Media`, and it does not require a broader shared kernel. Each feature can limit accepted content types while sharing upload and file infrastructure.

| Feature | Relationship | Shared asset |
|---|---|---|
| Exercise | `ExerciseMedia` | `Attachment` |
| Food | `FoodMedia` | `Attachment` |
| Recipe | `RecipeMedia` | `Attachment` |
| Message | `MessageAttachment` | `Attachment` |
| Tracker entry | `EntryAttachment` | `Attachment` |

Each relationship has a direct foreign key to its parent and to `Attachment`. Position and caption, where used, describe that relationship. They do not belong to the shared asset. Sharing an asset model does not require a media-library screen or cross-feature reuse controls.

## Exercise gallery

Coaches add media directly to an exercise. Clients view the gallery during a workout. The gallery accepts multiple uploaded images or videos, platform links such as YouTube and Vimeo, and direct media URLs. Supported sources play inside the app; other links open externally. An accepted link does not guarantee inline playback. Client form-review submissions are outside this gallery.

`ExerciseMedia` has a stable UUID, required `exercise_id` and `attachment_id`, optional `caption`, required `position`, and timestamps. `Exercise.media` becomes an association ordered by position, replacing its single URL string.

- Positions are nonnegative and unique within an exercise. Gaps are allowed. Use a deferrable unique constraint on `(exercise_id, position)` and defer it during a reorder transaction.
- Captions are plain text. Trim outer whitespace and store a blank caption as null.
- Reordering or editing a caption preserves the relationship ID.
- Deleting an exercise cascades to its gallery rows. Removing a gallery row does not delete the attachment or stored file.
- The attachment foreign key restricts deletion while the gallery row references it.

## Workout video

A video workout has one follow-along video, referenced by `Workout.video_id` through `belongs_to :video, Easy.Attachments.Attachment`. The attachment owns its uploaded-file or external-link source. This replaces the scalar `Workout.video` URL.

Video workouts require the reference. Prescribed and open workouts must leave it null. The feature must check that the selected attachment is suitable video content and that its use is authorized; an attachment ID alone does not prove either condition.

The slot has no ordering or per-item caption, so it needs no `WorkoutMedia` relationship table. A foreign key must prevent deletion of an attachment while a workout references it, including archived workouts. Removing or changing the reference does not delete the asset.

These content checks and foreign-key rules remain proposed until the workout writer and migration are implemented. Convert existing video URLs to attachment references without losing their content or access rules before removing the old database column.

## Alternatives and consequences

Separate relationship tables repeat a small schema, but retain direct foreign keys and let each feature change independently. The current message and tracker relationships already use this structure. Common application functions and UI components can still be shared.

We rejected `thing_type` plus `thing_id`: ordinary foreign keys cannot check a parent in different tables. Application or trigger logic would have to enforce parent existence and deletion. The product does not need user-defined parent types.

We also rejected one table with nullable parent foreign keys. A few null columns are inexpensive in PostgreSQL; storage was not the reason. Every new parent would change the shared table, indexes, and exactly-one-parent constraint without serving a current cross-feature query requirement. See [PostgreSQL row storage](https://www.postgresql.org/docs/current/storage-page-layout.html).

A shared parent registry or embedded JSON links add lifecycle or integrity work without a current requirement. A reusable media library and central attachment-use screen are outside this scope.

## Deferred decisions and implementation

Access rules are explicitly deferred. This ADR does not choose public versus private delivery, ownership nullability, a visibility field, or tenant authorization constraints. Retain the existing ownership and uploader information so a later access design can preserve private client files. Physical file cleanup, upload completion, provider playback details, and migration of existing data also need implementation decisions.

Implement the exercise slice first. Food and recipe relationship tables follow when those features are built. Preserve existing attachment and library-media data during consolidation; acceptance of this ADR does not authorize deleting assets.

The common `Attachment` name and separate feature relationship tables are settled. Revisit them only for a new requirement or evidence that changes the trade-off, and record a superseding ADR.
