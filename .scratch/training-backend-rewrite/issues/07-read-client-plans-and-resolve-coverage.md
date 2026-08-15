# 07 — Read Client Plans and resolve Coverage

**What to build:** Let clients inspect their unarchived Client Plans and resolve the Client Plan and scheduled workout supplying Coverage for a UTC date.

**Blocked by:** 06 — Assign Templates and manage Client Plans.

**Status:** complete

- [x] A client can list and inspect only their own incomplete, upcoming, current, and ended unarchived Client Plans.
- [x] Lifecycle labels are derived consistently from archive state and inclusive UTC period rules.
- [x] Date resolution returns the one Client Plan supplying Coverage and its scheduled workout guidance.
- [x] No Coverage returns a successful nullable result rather than not found.
- [x] An open-ended Client Plan resolves on and after its start date.
- [x] Archived, incomplete, future, ended, other-client, and other-business plans cannot supply Coverage for an ineligible date.
- [x] Client plan responses expose the plan kind and complete Prescription fields needed by the client app.
- [x] Generated types and client plan screens use the replacement contract.
- [x] Focused client-context, contract, authorization, date-resolution, and client-interface tests pass.
