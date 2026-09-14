# Nutrition menu editing

Coaches need to change a selected food from grams to a named serving, prescribe recipes by serving or prepared weight, and remove an unnecessary day variation. These changes stay in the plan draft until Save nutrition plan.

## Interaction

Each meal item keeps its inline quantity. Change portion opens a small dialog with the food or recipe's server-provided portion options and a quantity. Choosing a type starts with that option's standard amount; no weight conversion or nutrition calculation runs in the browser. Recipes without prepared weight do not offer grams. Cancelling leaves the draft unchanged. Failed option reads expose Retry, and background failures preserve the dialog's entered quantity.

Inline quantities retain decimal input while the coach types. Empty, zero, negative and nonnumeric quantities show a field error and fail the worksheet's existing validation. Removing an item offers Undo at its original position without reverting other quantities.

Remove day menu names the menu and affected weekdays, asks for a replacement from the remaining menus, and explains that meals exclusive to the removed menu will also be removed. The final day menu cannot be removed. Undo restores its position and referenced meals, keeps later edits to shared meals, and restores only weekdays that still use the selected replacement. A coach's subsequent weekday choice stays intact.

## Verification

`tests/nutrition/menu-editing.browser.mjs` uses the real API at 375px and 1280px. It covers portion load/retry, background errors, cancellation and focus return, positive quantities, typed fractional servings, food serving and recipe gram persistence, server-calculated nutrients, unavailable recipe gram choices, item removal/Undo, shared and exclusive meals, replacement weekdays, selective Undo, failed plan saves, reload and final-menu protection.

The existing nutrition creation/assignment and client personalization browser suites remain regression gates. On 2026-09-14, build, scoped Biome and repository rules passed. Full backend precommit passed all four gates with 1,778 tests and zero failures. Screenshots are written to the nutrition artifacts directory.

Menu and item ordering and the complete application navigation/role/device audit remain to be checked against the full goal.
