# 10 — Finalize sessions and inspect immutable history

**What to build:** Let clients complete or discard Training Sessions explicitly and let clients and authorized coaches inspect immutable, paginated history.

**Blocked by:** 09 — Record Performed Sets during active sessions.

**Status:** ready-for-agent

- [ ] Clients can update allowed notes and soreness only while a Training Session is active.
- [ ] Explicit complete and discard operations set a terminal state and server closing time consistently.
- [ ] Repeating the same terminal command is idempotent; attempting the opposite terminal transition returns a conflict.
- [ ] Terminal Training Sessions and their Performed Sets reject every mutation.
- [ ] Completion stamps client activity in the same transaction as the terminal transition.
- [ ] Client and authorized coach history reads are paginated and deterministically ordered.
- [ ] Malformed and reversed date filters return validation errors rather than being ignored.
- [ ] Deleting plans, workouts, Prescribed Exercises, or live exercise references does not change snapshot content, frozen names, or historical readability.
- [ ] Client and coach applications use generated history and terminal-command contracts.
- [ ] Focused transition, immutability, history, deletion-survival, authorization, contract, and frontend tests pass.

