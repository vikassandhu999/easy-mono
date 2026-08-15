# 08 — Start planned and freestyle Training Sessions

**What to build:** Let a client begin one planned or freestyle Training Session and read its active state through Execution and the client application.

**Blocked by:** 07 — Read Client Plans and resolve Coverage.

**Status:** ready-for-agent

- [ ] Execution asks Programming for one resolved, startable Prescription instead of querying plan storage independently.
- [ ] A client can start any workout in the Client Plan supplying Coverage on the UTC start date, regardless of Workout Schedule guidance.
- [ ] A client can start a Freestyle Training Session without a Client Plan or workout.
- [ ] Only one active Training Session may exist per client, including concurrent start attempts.
- [ ] A planned Training Session freezes a versioned snapshot with plan and workout identities and names, ordered exercises, tracking types, and every Prescribed Set field.
- [ ] A Freestyle Training Session has no planned snapshot.
- [ ] Active-session reads are tenant-scoped and client-self scoped; inaccessible sessions return not found.
- [ ] Plan changes or deletion after start do not change the Training Session snapshot or make the active session unreadable.
- [ ] The client application can start and resume both session kinds using generated types.
- [ ] Focused resolution-seam, concurrency, snapshot, authorization, contract, and client-interface tests pass.

