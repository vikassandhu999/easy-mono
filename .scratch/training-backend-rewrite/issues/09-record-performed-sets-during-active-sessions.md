# 09 — Record Performed Sets during active sessions

**What to build:** Let clients record and edit ordered Performed Sets while a Training Session is active without weakening historical exercise identity.

**Blocked by:** 08 — Start planned and freestyle Training Sessions.

**Status:** complete

- [x] A Performed Set accepts either a visible exercise reference or a nonblank explicit exercise name.
- [x] Every Performed Set freezes the resolved exercise name and may retain a stable reference to a Prescribed Exercise in the versioned snapshot.
- [x] Invisible and cross-tenant exercise references are rejected.
- [x] Performed Set order is deterministic under sequential and concurrent appends.
- [x] Clients can create, update, and delete only Performed Sets owned by their active Training Session.
- [x] Exercise identity and snapshot references cannot be changed through an update that should require replacement.
- [x] Session reads return ordered Performed Sets through the explicit contract.
- [x] The client logging interface supports planned, substituted, added, and explicitly named work.
- [x] Focused context, concurrency, validation, authorization, contract, and client-interface tests pass.
