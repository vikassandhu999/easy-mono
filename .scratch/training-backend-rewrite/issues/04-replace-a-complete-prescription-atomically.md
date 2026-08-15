# 04 — Replace a complete Prescription atomically

**What to build:** Let a coach save one authoritative Prescription containing ordered workouts, Prescribed Exercises, Prescribed Sets, and the Workout Schedule in one atomic operation.

**Blocked by:** 03 — Manage Training Template lifecycle.

**Status:** ready-for-agent

- [ ] Prescription replacement requires the expected plan revision and increments it once on success.
- [ ] Persisted workouts and Prescribed Exercises retain server identities; unsaved nodes resolve unique request-local references.
- [ ] Omitted persisted nodes are deleted as part of the same transaction.
- [ ] Workout and Prescribed Exercise order round-trips exactly and does not depend on timestamps.
- [ ] The complete Monday–Sunday interface maps sparse schedule rows to workouts or rest and accepts the same workout on several weekdays.
- [ ] Cross-plan schedule references, duplicate weekdays, duplicate request-local references, invalid positions, and invisible exercises are rejected without partial writes.
- [ ] Prescribed Sets round-trip as validated values without independent identities or tracking-type field restrictions.
- [ ] One plan-structure HTTP operation replaces workout, Prescribed Exercise, reorder, and schedule mutation operations.
- [ ] The coach builder saves and reloads the complete Prescription through that operation.
- [ ] Focused Programming, constraint, contract, generated-type, and builder checks pass.

