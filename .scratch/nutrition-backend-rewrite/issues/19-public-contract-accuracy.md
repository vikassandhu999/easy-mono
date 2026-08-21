# Public contract accuracy

Type: task
Status: resolved

## Question

Do Nutrition request and response schemas describe the JSON the server accepts and emits?

## Scope

- Remove ignored Recipe Ingredient positions from the request contract and frontend mapper.
- Mark always-present Food impact and Nutrition Day fields required.
- Bound Diary notes at 255 characters in OpenAPI and changesets.
- Document reachable switch-option statuses.
- Make exact-date Nutrition Day filters ignore range fields.
- Regenerate both frontend API schemas and keep hooks compiling.

## Finish

- Focused controller/changeset tests pass.
- `just gen-api` completes.
- Both frontend builds pass before handoff.

## Answer

Removed the ignored Recipe Ingredient position, made emitted Food impact and Nutrition Day fields required, bounded Diary notes, documented switch errors, and made exact-date reads ignore range fields. Regenerated both frontend schemas. The two Nutrition Day controller suites pass with 34 tests.
