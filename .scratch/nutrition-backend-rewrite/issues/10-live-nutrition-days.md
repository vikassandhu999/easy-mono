# 10 — Reset Diary and serve live Nutrition Days

**What to build:** Replace the raw-log read model with one Nutrition Day interface for a client-local date. Before a Diary Slot starts, the result shows nullable live Programming guidance without classifying inactivity.

**Blocked by:** 08 — Resolve Coverage and Programming queues

**Status:** resolved

- [x] Legacy Diary data is discarded and the canonical Diary storage begins empty without altering Library or Programming data.
- [x] A Nutrition Day request identifies intake by local calendar date and resolves the Client timezone with Business fallback.
- [x] Client and authorized coach/owner reads return the same Nutrition Day row and Meal Slot vocabulary.
- [x] An unstarted slot on the client's local day shows the covering plan's live options without `pending` or `skipped` status.
- [x] Missing Coverage returns a successful Nutrition Day with no live guidance.
- [x] Past dates do not join mutable Programming when no frozen Diary data exists.
- [x] Meal Slots are returned in canonical ordinary order followed by the workout-relative group, without stored slot positions.
- [x] Future Nutrition Days may be read but remain write-ineligible for later commands.
- [x] The client Today view and coach client-Nutrition view consume Nutrition Day rather than combining plan and raw meal-log responses.
- [x] Raw meal-log reads are no longer needed by the migrated screens, while final route deletion remains in the cutover ticket.
- [x] Diary, controller, contract, timezone-boundary, authorization, and frontend tests cover live guidance, no Coverage, local dates, ordering, and common rendering.

## Answer

`Easy.Nutrition.Diary` is the Nutrition Day read model. For today and future local dates it calls one Programming Coverage op and returns live Meal Options in canonical slot order with empty rows (no `pending`/`skipped`). Past dates skip Programming. A data-only migration deletes meal-log rows. Client Today and the coach client Nutrition Day screen read that payload; `write_eligible` is false on future dates. Writes, freezing, and meal-log route deletion stay on tickets 11 and 16.

