# 07 — Assign Templates and manage Client Plans

**What to build:** Let a coach assign a Template as an independent Client Nutrition Plan and manage that plan through the same aggregate contract. Assignment copies the complete Menu and changes onboarding in one transaction.

**Blocked by:** 06 — Author Day Patterns, Meal Slots, and Week Schedules

**Status:** resolved

- [x] Assignment accepts an unarchived visible Template, a visible client, and the expected source Template revision.
- [x] Assignment copies the complete ordered Menu and Week Schedule into a distinct Client Plan with optional source provenance.
- [x] Assignment and the client's onboarding-stage transition commit together or roll back together.
- [x] Later Template edits and deletion do not alter the Client Plan, and later Client Plan edits do not alter the Template.
- [x] Client Plans cannot be assigned or duplicated as sources.
- [x] Business owners may mutate every Client Plan in the business; a coach may mutate a Client Plan only while coaching that client.
- [x] Creator provenance does not grant a former coach continued Client Plan access.
- [x] Client Plan archive, restore, active deletion, archived deletion, metadata changes, and Menu replacement use expected revisions.
- [x] Coaches can assign from the Template flow and manage the resulting Client Plan from the client's Nutrition area.
- [x] Clients can list and read their unarchived Client Plans through the generated contract.
- [x] Template list results derive the distinct count of unarchived Client Plans originating from each Template.
- [x] Programming, database, controller, contract, and frontend tests cover copy independence, source revision conflicts, onboarding atomicity, permissions, provenance, and assigned-client counts.

## Answer

`Programming.assign_template_to_client/5` copies an unarchived Template's Menu into a Client Nutrition Plan at the expected source revision, records optional `source_template_id`, and advances onboarding in the same transaction. `POST /v1/coach/clients/:client_id/nutrition-plans/:id/assign` is the HTTP seam. Later Template or Client Plan edits do not affect the other; deleting the Template leaves the copy and may null provenance. Owners can mutate any Client Plan in the business; a coach can only while assigned to that client; creator identity does not keep access after reassignment. Client-self list/show return unarchived plans. Template lists keep a derived distinct unarchived assigned-client count. Coaches assign from the Template builder and the client's Nutrition tab; both apps consume the generated contract.

