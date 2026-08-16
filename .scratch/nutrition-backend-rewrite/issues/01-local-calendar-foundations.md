# 01 — Install local-calendar and Nutrition foundations

**What to build:** Add the shared calendar, timezone, vocabulary, and ownership foundations that every Nutrition slice will use. Business and Client records should carry an internal applied timezone without adding a frontend setting, while database timestamps continue to represent UTC instants.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Business and Client records store validated IANA timezone names, with retained rows backfilled to `Asia/Kolkata`.
- [ ] Business and Client creation stamps `Asia/Kolkata` at the application boundary and does not accept an unvalidated timezone.
- [ ] Client timezone is authoritative and Business timezone is the fallback used by shared calendar helpers.
- [ ] UTC timestamps remain UTC instants; local calendar dates are represented as dates rather than UTC-midnight timestamps.
- [ ] The closed Meal Slot vocabulary and its canonical ordinary/workout grouping have one application-owned definition.
- [ ] The project glossary records the approved Nutrition terms, and the ownership decision records Library, Programming, and Diary as the three modules.
- [ ] Focused tests cover timezone stamping, fallback, IANA validation, UTC timestamp behavior, and Meal Slot ordering.

