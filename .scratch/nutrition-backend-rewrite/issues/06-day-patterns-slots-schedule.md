# 06 — Author Day Patterns, Meal Slots, and Week Schedules

**What to build:** Complete Menu authoring with Day Patterns, the closed Meal Slot vocabulary, ordered Meal Options, and a seven-day Week Schedule. The coach builder submits the whole arrangement through the same authoritative Menu replacement.

**Blocked by:** 05 — Author Meals through atomic Menu replacement

**Status:** ready-for-agent

- [ ] Every Menu contains at least one Day Pattern, while a Day Pattern may contain no populated Meal Slots.
- [ ] Every Week Schedule maps Monday through Sunday to exactly one Day Pattern, and the same pattern may be reused on several weekdays.
- [ ] The database rejects incomplete schedules at transaction commit and rejects cross-plan or cross-business schedule references.
- [ ] Each Day Pattern may populate each of the 11 Meal Slots at most once.
- [ ] A populated Meal Slot contains one or more ordered Meal Options, with position zero as the default.
- [ ] Programming accepts any ordered Meal Option count; neither application validation nor the database imposes a maximum.
- [ ] A slot cannot reference the same Meal twice, and every referenced Meal belongs to the same plan and business.
- [ ] Meal Slot values use application enum validation and a database string check constraint rather than a database enum.
- [ ] Slot positions are not stored. Responses and both frontend displays use the canonical ordinary order followed by the pre-, during-, and post-workout group.
- [ ] The coach builder can create, rename, reorder, and remove Day Patterns; place and reorder Meal Options; and replace the complete Week Schedule in one Menu save.
- [ ] The generated contract removes the builder's need to coordinate Day Pattern, option, schedule, Meal, and Menu Item child writes.
- [ ] Programming, database, controller, contract, and builder tests cover seven-day completeness, slot vocabulary, unlimited options, ownership, order, defaults, and authoritative deletion.

