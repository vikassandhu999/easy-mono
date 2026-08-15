# 09 — Record Performed Sets during active sessions

**What to build:** Let clients record and edit ordered Performed Sets while a Training Session is active without weakening historical exercise identity.

**Blocked by:** 08 — Start planned and freestyle Training Sessions.

**Status:** ready-for-agent

- [ ] A Performed Set accepts either a visible exercise reference or a nonblank explicit exercise name.
- [ ] Every Performed Set freezes the resolved exercise name and may retain a stable reference to a Prescribed Exercise in the versioned snapshot.
- [ ] Invisible and cross-tenant exercise references are rejected.
- [ ] Performed Set order is deterministic under sequential and concurrent appends.
- [ ] Clients can create, update, and delete only Performed Sets owned by their active Training Session.
- [ ] Exercise identity and snapshot references cannot be changed through an update that should require replacement.
- [ ] Session reads return ordered Performed Sets through the explicit contract.
- [ ] The client logging interface supports planned, substituted, added, and explicitly named work.
- [ ] Focused context, concurrency, validation, authorization, contract, and client-interface tests pass.

