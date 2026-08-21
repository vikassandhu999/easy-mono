# 05 — Author Meals through atomic Menu replacement

**What to build:** Let a coach author the Meals and Menu Items inside a Template through one authoritative Menu replacement. The backend resolves every selected Food or Recipe through Library, and the coach builder saves one coherent plan revision.

**Blocked by:** 04 — Reset Programming and deliver Template lifecycle

**Status:** resolved

- [x] One plan operation replaces the complete submitted Menu transactionally and requires the expected plan revision.
- [x] Persisted Meals and Menu Items retain server IDs, while unsaved nodes use request-local references unique within the replacement request.
- [x] Omitted persisted Meals and Menu Items are removed as part of the authoritative replacement.
- [x] Meals and Menu Items use deterministic nonnegative positions with stable IDs separate from presentation order.
- [x] Every Menu Item references exactly one visible Food or Recipe from the same business scope.
- [x] Every Menu Item carries a valid Food or Recipe Portion resolved through the Library batch interface.
- [x] Food serving selections retain display values and resolved grams; Recipe gram and serving Portions follow Recipe conversion rules.
- [x] Planned nutrient values preserve nullable fields and calculation precision, and responses round canonical values to one decimal.
- [x] A stale Menu replacement returns a conflict with the latest plan revision and does not partially update the Menu.
- [x] The coach builder can add, edit, reorder, and remove Meals and Menu Items through the aggregate replacement rather than child mutations.
- [x] Programming, database, controller, contract, and coach-builder tests cover identity, omission, order, cross-tenant rejection, Portions, nutrient calculation, and revision conflicts.

## Answer

`Easy.Nutrition.Programming.replace_menu/4` is the only Menu write. `PUT /v1/coach/nutrition-plans/:id/menu` sends the observed revision plus the complete Meal tree: persisted nodes keep their ids, new nodes use request-local refs, omitted nodes are deleted, and positions are explicit. Library `resolve_items/2` validates Food/Recipe visibility and Portions in the same business; Food servings keep unit/label plus resolved grams; Recipe gram Portions require cooked weight. Stored nutrients stay full precision with nullable fields; JSON rounds to one decimal. A stale revision returns 409 `stale_revision` with `current_revision` and writes nothing. Child meal/item routes are gone. The coach builder add/edit/reorder/remove path serializes through that one replacement, the same way Training saves a Prescription. Day Patterns and slot placement stay on ticket 06.
