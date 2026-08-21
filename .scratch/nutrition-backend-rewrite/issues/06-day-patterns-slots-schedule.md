# 06 — Author Day Patterns, Meal Slots, and Week Schedules

**What to build:** Complete Menu authoring with Day Patterns, the closed Meal Slot vocabulary, ordered Meal Options, and a seven-day Week Schedule. The coach builder submits the whole arrangement through the same authoritative Menu replacement.

**Blocked by:** 05 — Author Meals through atomic Menu replacement

**Status:** resolved

- [x] Every Menu contains at least one Day Pattern, while a Day Pattern may contain no populated Meal Slots.
- [x] Every Week Schedule maps Monday through Sunday to exactly one Day Pattern, and the same pattern may be reused on several weekdays.
- [x] The database rejects incomplete schedules at transaction commit and rejects cross-plan or cross-business schedule references.
- [x] Each Day Pattern may populate each of the 11 Meal Slots at most once.
- [x] A populated Meal Slot contains one or more ordered Meal Options, with position zero as the default.
- [x] Programming accepts any ordered Meal Option count; neither application validation nor the database imposes a maximum.
- [x] A slot cannot reference the same Meal twice, and every referenced Meal belongs to the same plan and business.
- [x] Meal Slot values use application enum validation and a database string check constraint rather than a database enum.
- [x] Slot positions are not stored. Responses and both frontend displays use the canonical ordinary order followed by the pre-, during-, and post-workout group.
- [x] The coach builder can create, rename, reorder, and remove Day Patterns; place and reorder Meal Options; and replace the complete Week Schedule in one Menu save.
- [x] The generated contract removes the builder's need to coordinate Day Pattern, option, schedule, Meal, and Menu Item child writes.
- [x] Programming, database, controller, contract, and builder tests cover seven-day completeness, slot vocabulary, unlimited options, ownership, order, defaults, and authoritative deletion.

## Answer

`Programming.replace_menu/4` now replaces the complete Menu: Meals, Day Patterns, Meal Options, and the seven-day Week Schedule at the expected revision. A Menu must keep at least one Day Pattern; empty slots are allowed; the same pattern can cover several weekdays. Postgres rejects an incomplete schedule at commit (deferred trigger), cross-plan and cross-business parentage, unknown Meal Slot strings, duplicate Meal-or-position in a slot, and does not cap option count. Slot order is not stored — JSON and the coach builder emit ordinary day-period slots, then the workout group. The coach builder create/rename/reorder/remove Day Pattern, place/reorder Meal Option, and weekday-assignment paths all serialize through `PUT /v1/coach/nutrition-plans/:id/menu`. Child Day Pattern, option, and schedule writes are gone from the generated contract. Client Diary still uses the legacy six-slot list until ticket 16.
