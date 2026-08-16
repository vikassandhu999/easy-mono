# 07 — Assign Templates and manage Client Plans

**What to build:** Let a coach assign a Template as an independent Client Nutrition Plan and manage that plan through the same aggregate contract. Assignment copies the complete Menu and changes onboarding in one transaction.

**Blocked by:** 06 — Author Day Patterns, Meal Slots, and Week Schedules

**Status:** ready-for-agent

- [ ] Assignment accepts an unarchived visible Template, a visible client, and the expected source Template revision.
- [ ] Assignment copies the complete ordered Menu and Week Schedule into a distinct Client Plan with optional source provenance.
- [ ] Assignment and the client's onboarding-stage transition commit together or roll back together.
- [ ] Later Template edits and deletion do not alter the Client Plan, and later Client Plan edits do not alter the Template.
- [ ] Client Plans cannot be assigned or duplicated as sources.
- [ ] Business owners may mutate every Client Plan in the business; a coach may mutate a Client Plan only while coaching that client.
- [ ] Creator provenance does not grant a former coach continued Client Plan access.
- [ ] Client Plan archive, restore, active deletion, archived deletion, metadata changes, and Menu replacement use expected revisions.
- [ ] Coaches can assign from the Template flow and manage the resulting Client Plan from the client's Nutrition area.
- [ ] Clients can list and read their unarchived Client Plans through the generated contract.
- [ ] Template list results derive the distinct count of unarchived Client Plans originating from each Template.
- [ ] Programming, database, controller, contract, and frontend tests cover copy independence, source revision conflicts, onboarding atomicity, permissions, provenance, and assigned-client counts.

