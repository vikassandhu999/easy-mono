# 13 — Switch frozen Meal Options safely

**What to build:** Let the client change the active offered Meal Option on the same local day without deleting intake or consulting mutable Programming. Original frozen-item associations survive so switching back restores their meaning.

**Blocked by:** 12 — Log planned intake and derive statuses

**Status:** ready-for-agent

- [ ] A client may switch only among options frozen in the Diary Slot and only during that slot's local date.
- [ ] Switching requires the expected Diary Slot revision and increments the revision after a successful change.
- [ ] Selecting the active option is idempotent and does not rewrite snapshots or entries.
- [ ] Switching changes only the active frozen option; it does not reload Programming or Library data.
- [ ] Entries retain their original frozen option and planned-item associations when another option becomes active.
- [ ] An entry associated with an inactive option is derived as an `added` extra under the slot's frozen Coverage.
- [ ] Switching back restores the entry's original `as_planned` or `swapped` relationship without creating another entry.
- [ ] Planned totals and unfulfilled statuses use only the active option, while actual intake includes every surviving entry.
- [ ] Switching never deletes actual intake, including fulfilments and independent extras.
- [ ] The switch command uses the shared idempotency wrapper and resolves simultaneous switch attempts through the slot revision.
- [ ] The client Today flow presents frozen choices in canonical order and updates the active option without client-owned reconciliation.
- [ ] Diary, database, controller, contract, concurrency, and client-app tests cover same-day limits, stale revisions, preserved associations, switch-back behavior, and totals.

