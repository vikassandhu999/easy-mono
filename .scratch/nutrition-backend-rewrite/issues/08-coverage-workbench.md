# 08 — Resolve Coverage and Programming queues

**What to build:** Give Client Nutrition Plans precise local-date Coverage and expose the same lifecycle facts to clients, coaches, and Workbench. Missing Coverage is a normal result, while overlapping plans are rejected.

**Blocked by:** 07 — Assign Templates and manage Client Plans

**Status:** resolved

- [x] A Client Plan without a start date is incomplete and supplies no Coverage.
- [x] At most one unarchived incomplete Client Plan exists for a client.
- [x] Start and end dates are inclusive client-local dates, and an absent end date represents open-ended Coverage.
- [x] Unarchived Coverage ranges for one client cannot overlap, including during restore or date edits.
- [x] Several non-overlapping future Client Plans are accepted.
- [x] Incomplete, upcoming, current, ended, and archived lifecycle labels are derived from dates, archive state, and the client's applied timezone.
- [x] Programming resolves either one covering Client Plan with its selected Day Pattern and Meal Options or successful guidance absence.
- [x] Client Plan reads expose lifecycle and Coverage without recreating the rules in either frontend.
- [x] Workbench and client-list callers use one bounded batch Coverage projection rather than issuing one plan query per client.
- [x] The coach Client Plan flow edits Coverage and reports incomplete, overlap, stale-revision, and archived errors clearly.
- [x] Programming, database, controller, contract, Workbench, and frontend tests cover local-date boundaries, incomplete uniqueness, overlap exclusion, lifecycle, nullable guidance, and bounded batching.

## Answer

Programming owns Coverage: a Client Plan without a start date is incomplete and covers nothing; unarchived incomplete plans are unique per client; inclusive start/end dates (open-ended when end is absent) cannot overlap. `resolve_client_coverage/2` and `resolve_coverage_for_client/3` return one covering plan plus its Day Pattern and Meal Options, or `{:ok, nil}`. Lifecycle is stamped from dates, archive state, and the client's applied timezone; JSON views serialize that field and do not recompute it. `covering_plans_for_clients/3` is the one-query batch for Workbench and client-list chips. Coaches edit Coverage in the Client Plan builder; overlap, incomplete, archived, and stale-revision errors surface from the server. Workbench queue horizon still uses UTC `today` so training queue tests stay stable across the IST boundary; nutrition reads use the client timezone.
