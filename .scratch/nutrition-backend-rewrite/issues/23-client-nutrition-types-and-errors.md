# Client Nutrition types and errors

Type: task
Status: resolved

## Question

Can the client Nutrition flow preserve generated Meal Slot and summary types, infer API responses, and map Diary errors without unchecked casts or backend copy matching?

## Scope

- Remove the unused plan-detail hook and response assertions.
- Preserve schema-derived Meal Slot and summary types through screens, sheets, and command fingerprints.
- Parse API errors through validated shared helpers and stable error codes.
- Add focused checks for Diary errors and Nutrition Day behavior.
- Simplify the small Diary test smells recorded by review.

## Finish

- Client checks and build pass.

## Answer

Removed the unused detail hook and mutation response assertions. Meal Slot and summary types now derive from generated schemas end to end. Diary errors use stable server codes and have a sibling check. The client build, typecheck, and check suite pass.
