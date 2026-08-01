# Performed-set append concurrency plan

**Goal:** Auto-positioned performed sets append without duplicate positions when requests race for the same training session.

**Design:** Keep explicit positions unchanged. For an omitted position, run authorization and insertion in one transaction and lock the tenant/client-scoped training-session row with `FOR UPDATE` before reading `max(position)`. The parent-row lock serializes only writers for that session.

## Tasks

1. Add an unboxed Postgres concurrency regression that releases several same-session appends together and asserts positions are contiguous.
2. Add a normal-path query assertion: one session read, one exercise read, one max read, one insert, and no client identity query.
3. Reuse the authorization query as the locked parent lookup; roll back domain errors so the public return contract stays flat.
4. Run focused tests, `mix precommit`, `just check-rm`, and `git diff --check`; commit this concern alone.
