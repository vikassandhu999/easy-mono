# 10 — Reset Diary and serve live Nutrition Days

**What to build:** Replace the raw-log read model with one Nutrition Day interface for a client-local date. Before a Diary Slot starts, the result shows nullable live Programming guidance without classifying inactivity.

**Blocked by:** 08 — Resolve Coverage and Programming queues

**Status:** ready-for-agent

- [ ] Legacy Diary data is discarded and the canonical Diary storage begins empty without altering Library or Programming data.
- [ ] A Nutrition Day request identifies intake by local calendar date and resolves the Client timezone with Business fallback.
- [ ] Client and authorized coach/owner reads return the same Nutrition Day row and Meal Slot vocabulary.
- [ ] An unstarted slot on the client's local day shows the covering plan's live options without `pending` or `skipped` status.
- [ ] Missing Coverage returns a successful Nutrition Day with no live guidance.
- [ ] Past dates do not join mutable Programming when no frozen Diary data exists.
- [ ] Meal Slots are returned in canonical ordinary order followed by the workout-relative group, without stored slot positions.
- [ ] Future Nutrition Days may be read but remain write-ineligible for later commands.
- [ ] The client Today view and coach client-Nutrition view consume Nutrition Day rather than combining plan and raw meal-log responses.
- [ ] Raw meal-log reads are no longer needed by the migrated screens, while final route deletion remains in the cutover ticket.
- [ ] Diary, controller, contract, timezone-boundary, authorization, and frontend tests cover live guidance, no Coverage, local dates, ordering, and common rendering.

