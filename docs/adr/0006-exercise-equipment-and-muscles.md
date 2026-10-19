---
status: accepted
date: 2026-10-16
---

# Describe equipment in text and keep muscle names as a free-text array

Keep exercise metadata small. `Exercise.equipment` is optional free text so a coach can describe required equipment, alternatives, and optional items. `Exercise.muscles` remains an array of free-text muscle names, with one name per entry.

```elixir
equipment: "Barbell and plates, or dumbbells. Mat optional.",
muscles: ["chest", "triceps"]
```

The [review draft](../../.scratch/workout/models.ex) records this shape and its proposed changesets. Runtime schemas, APIs, and app behavior are not changed by this ADR.

## Rules

- Equipment has no predefined vocabulary. Trim surrounding whitespace; blank text becomes null. Preserve internal text and line breaks.
- Null equipment means no description was supplied. It does not assert that no equipment is needed. A coach can state that explicitly in the text.
- Muscles default to an empty array, meaning not classified. Null is invalid. Trim each entry and reject blank names, null entries, and exact duplicates after trimming.
- Muscle names remain coach-defined; the app does not infer aliases, anatomical identity, or primary/secondary roles. List order does not establish those roles.
- The app displays the equipment description. It does not parse required/optional flags or calculate which equipment setup is usable.

## Alternatives and implementation

We considered controlled catalogues with custom additions, primary/secondary relationship roles, and complete equipment setups. The user chose free text to avoid that management and schema complexity. We also rejected one text field for muscles: separate entries keep individual names available for display and filtering.

Equipment can no longer use the existing exact array-tag filter. When implementing this design, update that query and its API/UI contract. Muscle filtering retains its current exact-name behavior; spelling variants remain distinct until there is a separate requirement for normalization.

A later production migration must preserve existing equipment entries in the new description without inventing required/optional or alternative relationships. Database constraints should enforce nullable trimmed equipment text and non-null arrays of valid muscle names. The review draft does not create those constraints.

Do not introduce equipment catalogues, muscle catalogues, or setup tables without a new requirement and a superseding decision.
