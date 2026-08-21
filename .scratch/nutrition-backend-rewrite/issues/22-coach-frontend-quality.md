# Coach frontend quality

Type: task
Status: resolved

## Question

Can the coach Nutrition UI derive contract types, keep helpers in their owning feature, and test its non-trivial mappers?

## Scope

- Move Coverage and nutrition-summary helpers to owning feature modules and fix cross-boundary imports.
- Remove unchecked impact, Meal Slot, adherence, and fixture casts/redeclarations.
- Add checks for plan-tree and Nutrition Day mapping helpers.
- Share the repeated Library deletion-protection UI where the extraction stays small.
- Remove the stale `MacroCalc` comment.

## Finish

- Coach checks and build pass.

## Answer

Moved Coverage and client nutrition helpers into their owning feature libraries, deriving
their types from the generated contract. Removed the unchecked impact, Meal Slot,
adherence, and fixture assertions/redeclarations, and extracted the plan-tree mutations
and Nutrition Day mapping logic behind focused checks. Food and recipe deletion now share
one small dialog component, and the stale `MacroCalc` comment is gone.

`pnpm -C apps/coachapp-v2 check` and `pnpm -C apps/coachapp-v2 build` pass. The build retains
the existing vendor CSS and large-chunk warnings. Live browser checks covered the shared
Food in-use dialog and Recipe deletion confirmation at 375×812 and 1280×900. Both dialogs
fit the viewport without horizontal overflow.
