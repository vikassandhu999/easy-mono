# Backend boundary cleanup

Type: task
Status: resolved

## Question

Can the remaining Nutrition backend cleanup follow module, Ctx, preload, and schema boundaries without dead fields or misleading tests?

## Scope

- Tighten Local Calendar validation coverage and preserve the context-boundary placement of Meal Slot.
- Remove stale Plan, Day Pattern, Meal creator, and transaction/portion helpers.
- Remove the dual-key weekday probe and the parent filter from the preload builder.
- Align archived client Nutrition Plan list/detail behavior.

## Finish

- Focused Local Calendar, Programming, and Diary tests pass.
- Backend format and Credo pass for touched files.

## Answer

Removed dead timezone validation and Nutrition schema fields, preserved Meal Slot at the root context boundary required by `Easy.ContextLayoutTest`, removed the dead Meal creator column, collapsed Portion serialization, removed the dual-key schedule probe and preload filter, and made archived client plans readable from their listed detail route. The focused backend run passed 107 tests.
