# 08 — Resolve Coverage and Programming queues

**What to build:** Give Client Nutrition Plans precise local-date Coverage and expose the same lifecycle facts to clients, coaches, and Workbench. Missing Coverage is a normal result, while overlapping plans are rejected.

**Blocked by:** 07 — Assign Templates and manage Client Plans

**Status:** ready-for-agent

- [ ] A Client Plan without a start date is incomplete and supplies no Coverage.
- [ ] At most one unarchived incomplete Client Plan exists for a client.
- [ ] Start and end dates are inclusive client-local dates, and an absent end date represents open-ended Coverage.
- [ ] Unarchived Coverage ranges for one client cannot overlap, including during restore or date edits.
- [ ] Several non-overlapping future Client Plans are accepted.
- [ ] Incomplete, upcoming, current, ended, and archived lifecycle labels are derived from dates, archive state, and the client's applied timezone.
- [ ] Programming resolves either one covering Client Plan with its selected Day Pattern and Meal Options or successful guidance absence.
- [ ] Client Plan reads expose lifecycle and Coverage without recreating the rules in either frontend.
- [ ] Workbench and client-list callers use one bounded batch Coverage projection rather than issuing one plan query per client.
- [ ] The coach Client Plan flow edits Coverage and reports incomplete, overlap, stale-revision, and archived errors clearly.
- [ ] Programming, database, controller, contract, Workbench, and frontend tests cover local-date boundaries, incomplete uniqueness, overlap exclusion, lifecycle, nullable guidance, and bounded batching.
