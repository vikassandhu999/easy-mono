# 02 — Rebuild Training storage and create Training Templates

**What to build:** Replace the disposable planning and execution storage with the canonical Training schema and make Training Template creation and listing work through Programming, the HTTP contract, and the coach interface.

**Blocked by:** 01 — Move exercise ownership into Training Library.

**Status:** ready-for-agent

- [ ] One destructive migration drops and recreates planning, schedule, prescription, session, and performed-history tables while preserving Library tables.
- [ ] The plan aggregate has an explicit Template or Client Plan kind, archive timestamp, revision, tenant ownership, and database checks for kind-specific fields.
- [ ] Workouts and Prescribed Exercises have explicit deterministic positions; Workout Schedule rows are sparse and tenant-aware.
- [ ] Execution storage contains the final state, closing-time, versioned snapshot, stable snapshot reference, and frozen exercise-name fields needed by later tickets.
- [ ] A coach can create and list Training Templates through Programming and the generated HTTP contract.
- [ ] The coach interface can create and display Training Templates using generated types.
- [ ] Factories, seeds, and development fixtures create valid canonical Training records.
- [ ] Focused Template, schema-constraint, controller-contract, and coach-interface checks pass on an empty database.

