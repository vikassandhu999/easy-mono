# 05 — Author Meals through atomic Menu replacement

**What to build:** Let a coach author the Meals and Menu Items inside a Template through one authoritative Menu replacement. The backend resolves every selected Food or Recipe through Library, and the coach builder saves one coherent plan revision.

**Blocked by:** 04 — Reset Programming and deliver Template lifecycle

**Status:** ready-for-agent

- [ ] One plan operation replaces the complete submitted Menu transactionally and requires the expected plan revision.
- [ ] Persisted Meals and Menu Items retain server IDs, while unsaved nodes use request-local references unique within the replacement request.
- [ ] Omitted persisted Meals and Menu Items are removed as part of the authoritative replacement.
- [ ] Meals and Menu Items use deterministic nonnegative positions with stable IDs separate from presentation order.
- [ ] Every Menu Item references exactly one visible Food or Recipe from the same business scope.
- [ ] Every Menu Item carries a valid Food or Recipe Portion resolved through the Library batch interface.
- [ ] Food serving selections retain display values and resolved grams; Recipe gram and serving Portions follow Recipe conversion rules.
- [ ] Planned nutrient values preserve nullable fields and calculation precision, and responses round canonical values to one decimal.
- [ ] A stale Menu replacement returns a conflict with the latest plan revision and does not partially update the Menu.
- [ ] The coach builder can add, edit, reorder, and remove Meals and Menu Items through the aggregate replacement rather than child mutations.
- [ ] Programming, database, controller, contract, and coach-builder tests cover identity, omission, order, cross-tenant rejection, Portions, nutrient calculation, and revision conflicts.

