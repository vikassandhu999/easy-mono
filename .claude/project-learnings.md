# Project learnings

## Cognitive patterns

### Nutrition keeps three public contexts

Library, Programming, and Diary are the public Nutrition interfaces. Keep this ownership split and do not add a pass-through Nutrition facade. If a context becomes too broad, extract a deep internal workflow module while preserving the public boundary.

### Opaque references keep one meaning

A field that can refer to a live builder row or a frozen snapshot row should be named as an opaque reference, not as one concrete resource `_id`. Contract tests should cover the value before and after the state transition.

Idempotency compatibility can require a separate internal vocabulary. Public Diary maps and commands use `planned_item_ref`, while fingerprint payloads retain `meal_item_id` until the ledger retention window expires. Normalize serialized replay outcomes at the public boundary and never expose both keys.

### Context dependencies should be acyclic

If context A calls context B, context B should not call A's facade or delete A's schemas directly. Shared authorization and lifecycle rules belong below both contexts; reporting orchestration belongs above them.

### Extract invariant clusters

Extract a module when it can own a complete transactional or stateful workflow. Do not extract small helpers that merely move lines. Nutrition's Menu replacement, Diary idempotency, and Nutrition Day assembly are candidate invariant clusters.

### Complex maps need names

Aggregate read models, commands, and resolved values should have named types or structs. A public `map()` type forces maintainers to reconstruct the contract from implementation, OpenAPI, JSON, and tests.

### One operation uses one clock instant

Capture a UTC instant once for a read or command, then derive each applicable local date from that instant and the stored timezone. Passing the instant through correction checks and response assembly prevents a local-midnight crossing from producing contradictory eligibility or status.

### Ambient rollback is transaction coupling

A helper that calls `Repo.rollback/1` depends on a transaction owned elsewhere. Keep such helpers behind the transaction runner until the whole call chain returns tagged tuples. Extracting the transaction owner does not remove this coupling by itself.

### Resolved specs can still become stale

When a later specification replaces a resolved design, mark the earlier file as superseded and link to the authoritative spec or ADR. Keeping contradictory resolved specs increases onboarding cost even when the implementation is correct.
