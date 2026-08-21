# Library runtime cleanup

Type: task
Status: resolved

## Question

Can Food, Recipe, and Menu runtime code match the backend contract without unloaded media, artificial pagination limits, redundant coach lookups, or dead helpers?

## Scope

- Load Food media in Recipe ingredient payloads.
- Honor the shared pagination maximum and use trusted `ctx.coach_id` for creates.
- Add the failed Recipe replacement rollback test.
- Correct public specs and remove dead Library, Recipe, and Programming helpers.

## Finish

- Focused Library and Recipe tests pass.
- Backend format and Credo pass for touched files.

## Answer

Recipe ingredient Foods now preload media, Library lists honor the shared maximum of 100, and Food and Recipe creation trust `ctx.coach_id`. Added rollback and regression coverage, removed dead Library and Recipe helpers, and corrected the impossible `replace_menu/4` return type.

Focused checks: 74 Library, Recipe, and Recipe controller tests passed. Format passed for touched files. Strict Credo passed for all 11 touched backend source and test files.
