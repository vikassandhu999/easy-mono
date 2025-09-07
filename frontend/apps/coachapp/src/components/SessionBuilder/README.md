Session Builder (Taxonomy-Aware)
================================

MVP implementation of a taxonomy-driven Session Definition builder aligned with backend domain models (`session_def.go`, `content.go`).

Core Concepts
-------------
Session Types:
 - workout: composed of exercise content only.
 - meal: composed of food + recipe content.

Allowed Content Mapping:
 - workout -> exercise
 - meal -> food, recipe

Metadata Capture:
 - Workout metadata: warmup/cooldown flags, rest_between_sets, form_cues[], notes, injury_considerations[], progression_options[].
 - Meal metadata: serving_size, meal_prep_friendly, equipment_needed[], storage_instructions[], shopping_list[] (future), optional macro overrides.

Item Configuration Fields (JSONB items array):
 - workout items (exercise): sets_count, reps_target, weight_target, rest_seconds, custom_instructions, is_optional.
 - meal items (food/recipe): quantity, unit, custom_instructions, is_optional.

Component Overview
------------------
SessionCreateForm: Creates a new SessionDef with type-specific metadata.
SessionDefCard / SessionItemsManager: Manage ordered list of items (drag & drop, edit, delete).
EditableFields: Contextual editing UI switching fields by content type.
TypedContentSelect: Restricts selectable content to taxonomy-allowed types.

API Layer Updates
-----------------
`session_defs.ts` extended schemas:
 - Item config supports workout + meal specific fields.
 - Added workout_metadata / meal_metadata on create & update schemas with validation guard.

Workflow
--------
1. Coach chooses session type (passed into SessionBuilder externally).
2. Fill base form + type metadata.
3. Add content items (filtered by taxonomy).
4. Reorder & refine item-specific fields.
5. Persist -> backend stores JSONB structure and typed metadata.

Extensibility Notes
-------------------
Future session types (assessment, habit, challenge) can plug into same pattern:
 - Add enum value backend & frontend SessionType.
 - Append allowed content mapping.
 - Provide metadata schema & form section.

Deferred / Next Enhancements
----------------------------
 - Auto-suggest sets/rest from exercise content metadata.
 - Aggregate meal macros dynamically from constituent foods/recipes.
 - Bulk edit & duplication of items.
 - Inline creation of content from picker (quick add exercise/food).

