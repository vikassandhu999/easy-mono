# 01 — Install local-calendar and Nutrition foundations

**What to build:** Add the shared calendar, timezone, vocabulary, and ownership foundations that every Nutrition slice will use. Business and Client records should carry an internal applied timezone without adding a frontend setting, while database timestamps continue to represent UTC instants.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Business and Client records store validated IANA timezone names, with retained rows backfilled to `Asia/Kolkata`.
- [x] Business and Client creation stamps `Asia/Kolkata` at the application boundary and does not accept an unvalidated timezone.
- [x] Client timezone is authoritative and Business timezone is the fallback used by shared calendar helpers.
- [x] UTC timestamps remain UTC instants; local calendar dates are represented as dates rather than UTC-midnight timestamps.
- [x] The closed Meal Slot vocabulary and its canonical ordinary/workout grouping have one application-owned definition.
- [x] The project glossary records the approved Nutrition terms, and the ownership decision records Library, Programming, and Diary as the three modules.
- [x] Focused tests cover timezone stamping, fallback, IANA validation, UTC timestamp behavior, and Meal Slot ordering.

## Answer

Business and Client now store a validated IANA `timezone`, stamped to `Asia/Kolkata` on create and backfilled for retained rows. `Easy.LocalCalendar` owns IANA checks, Client-over-Business fallback, and UTC-instant to local `Date` conversion. The rewrite Meal Slot list and ordinary/workout order live in `Easy.Nutrition.MealSlot`. Glossary terms and ADR 0002 record Library, Programming, and Diary.
