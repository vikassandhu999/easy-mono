# 13 — Switch frozen Meal Options safely

**What to build:** Let the client change the active offered Meal Option on the same local day without deleting intake or consulting mutable Programming. Original frozen-item associations survive so switching back restores their meaning.

**Blocked by:** 12 — Log planned intake and derive statuses

**Status:** resolved

- [x] A client may switch only among options frozen in the Diary Slot and only during that slot's local date.
- [x] Switching requires the expected Diary Slot revision and increments the revision after a successful change.
- [x] Selecting the active option is idempotent and does not rewrite snapshots or entries.
- [x] Switching changes only the active frozen option; it does not reload Programming or Library data.
- [x] Entries retain their original frozen option and planned-item associations when another option becomes active.
- [x] An entry associated with an inactive option is derived as an `added` extra under the slot's frozen Coverage.
- [x] Switching back restores the entry's original `as_planned` or `swapped` relationship without creating another entry.
- [x] Planned totals and unfulfilled statuses use only the active option, while actual intake includes every surviving entry.
- [x] Switching never deletes actual intake, including fulfilments and independent extras.
- [x] The switch command uses the shared idempotency wrapper and resolves simultaneous switch attempts through the slot revision.
- [x] The client Today flow presents frozen choices in canonical order and updates the active option without client-owned reconciliation.
- [x] Diary, database, controller, contract, concurrency, and client-app tests cover same-day limits, stale revisions, preserved associations, switch-back behavior, and totals.

## Answer

`POST /v1/client/nutrition-days/:date/active-option` switches the Diary Slot's active frozen option on the client-local day at the expected revision. First same-day selection freezes offered options with the chosen one active; later switches only change `active_frozen_option_id` and bump revision. Entries keep their frozen associations, so inactive-option intake is derived as `added` and switching back restores `as_planned`/`swapped` without new rows. Today posts `Idempotency-Key` and the slot revision through the generated contract and no longer overlays a local pick. Substitution/`swapped` writes remain on ticket 14.
