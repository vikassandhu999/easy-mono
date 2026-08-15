# 05 — Duplicate Templates and handle stale revisions

**What to build:** Let coaches duplicate complete Training Templates and recover safely when another write has made their plan revision stale.

**Blocked by:** 04 — Replace a complete Prescription atomically.

**Status:** ready-for-agent

- [ ] Only an unarchived Training Template can be duplicated; archived Templates must be restored and Client Plans are never valid sources.
- [ ] Duplication copies metadata, exact workout order, Prescribed Exercises, Prescribed Sets, and Workout Schedule into independent identities.
- [ ] Generated duplicate names remain distinguishable and within field limits.
- [ ] A stale metadata, lifecycle, or Prescription write returns a conflict with the current revision and makes no changes.
- [ ] The coach interface refetches after a stale-revision conflict and asks the coach to reapply the intended edit; it does not merge automatically.
- [ ] Cross-tenant and inaccessible sources return not found.
- [ ] Focused duplication, ordering, conflict-contract, and coach-interface tests pass.

