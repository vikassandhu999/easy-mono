# Nutrition menu order

Arrange menus opens one compact view for ordering day menus, meal alternatives and the foods and recipes within a meal. Open a row to reach the next level; Back returns to its parent. Apply order changes the worksheet draft, while Cancel leaves it unchanged. Save nutrition plan persists the change.

Meal times keep the server's fixed order. `Easy.Nutrition.Menu.format_pattern/1` formats slots using `MealSlot.values/0`, and `meal_slot_test.exs` establishes the closed ordinary-then-workout order. The arrangement view exposes meal times for navigation and does not offer an order the server would discard.

Moved rows keep keyboard focus, boundary controls are disabled, and a status message announces the destination position. Moving a shared meal's items preserves its identity and applies wherever that meal is referenced. Quantities, notes, server nutrient values and weekday assignments remain unchanged.

The audit found repeated meal placements sharing HTML IDs. Worksheet labels and quantity inputs now use a placement-specific scope, so the same meal can appear at different meal times with correctly associated labels.

## Verification

The real API `tests/nutrition/menu-order.browser.mjs` scenario passes at 375px and 1280px. It covers all editable ordering levels, fixed meal times, keyboard focus, boundary controls, navigation, cancellation, explicit application, server preview, failed-save recovery and save/reopen. It also checks unchanged portions, nutrients and weekday assignments, shared references and repeated meal placement labels. Screenshots are in `tests/nutrition/artifacts/arrange-*.png`.

The portion/removal/Undo regression passes at both widths. Build, scoped Biome and repository rules pass. Backend precommit passes all four gates with 1,778 tests and zero failures. The complete application and physical-device audits remain in the completion ledger.
