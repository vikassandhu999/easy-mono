# 06 — Assign Templates and manage Client Plans

**What to build:** Let coaches assign Training Templates to visible clients and manage the resulting independent Client Plans and Coverage periods.

**Blocked by:** 04 — Replace a complete Prescription atomically.

**Status:** complete

- [x] Assignment accepts only an unarchived Training Template and a client visible to the actor.
- [x] Assignment clones the complete ordered Prescription and advances onboarding in the same transaction.
- [x] The resulting Client Plan has client-plan kind, independent identities, source provenance while available, and its own revision.
- [x] A Client Plan without a start date is incomplete and supplies no Coverage; a missing end date after a start is open-ended.
- [x] At most one unarchived incomplete Client Plan exists per client, and unarchived Coverage periods cannot overlap.
- [x] Coaches can list, inspect, edit periods and metadata, archive, restore, replace the Prescription of, and delete visible Client Plans.
- [x] Client Plan edits never change the source Training Template or another Client Plan.
- [x] Coach interfaces use generated Client Plan kinds, revisions, lifecycle labels, field validation, and stale-write handling.
- [x] Focused Assignment, transaction, Coverage, constraint, authorization, contract, and coach-interface tests pass.
