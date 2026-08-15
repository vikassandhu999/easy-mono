# 10 — Finalize sessions and inspect immutable history

**What to build:** Let clients complete or discard Training Sessions explicitly and let clients and authorized coaches inspect immutable, paginated history.

**Blocked by:** 09 — Record Performed Sets during active sessions.

**Status:** complete

- [x] Clients can update allowed notes and soreness only while a Training Session is active.
- [x] Explicit complete and discard operations set a terminal state and server closing time consistently.
- [x] Repeating the same terminal command is idempotent; attempting the opposite terminal transition returns a conflict.
- [x] Terminal Training Sessions and their Performed Sets reject every mutation.
- [x] Completion stamps client activity in the same transaction as the terminal transition.
- [x] Client and authorized coach history reads are paginated and deterministically ordered.
- [x] Malformed and reversed date filters return validation errors rather than being ignored.
- [x] Deleting plans, workouts, Prescribed Exercises, or live exercise references does not change snapshot content, frozen names, or historical readability.
- [x] Client and coach applications use generated history and terminal-command contracts.
- [x] Focused transition, immutability, history, deletion-survival, authorization, contract, and frontend tests pass.
