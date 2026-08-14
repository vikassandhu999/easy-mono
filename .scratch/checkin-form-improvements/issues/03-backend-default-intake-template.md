# 03 — Backend: business default intake template setting + invite flow

**What to build:** A business can name the intake template auto-assigned when a coach invites a client. The business record gains a nullable reference to a form template, as a foreign key with nilify-on-delete so deleting the chosen template clears the setting with no application code. At write time the referenced template must belong to the business, have intake purpose, and be active — an archived or check-in-purpose template is rejected with a 422. The invite flow consults the setting first and falls back to today's behavior (oldest active intake template, creating the system default if none exists) when the setting is null or the referenced template has since been archived. Clients invited before a change keep their already-assigned intake; the setting never rewrites live assignments. The setting is read and written through the existing business update endpoint; the OpenApiSpex business schema gains the field and both generated frontend schemas are regenerated. Demoable via API: set the default, invite a client, see the chosen template assigned.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Migration: nullable default-intake-template reference on business, FK with nilify-on-delete
- [x] Invite with the setting set assigns the chosen template
- [x] Invite with the setting null preserves today's oldest-active-or-create behavior exactly
- [x] Invite after the chosen template is archived falls back to today's behavior
- [x] Setting an archived template or a check-in-purpose template as default returns 422
- [x] Setting a template belonging to another business returns 422 (or not-found per existing convention)
- [x] Deleting the default template nils the setting; later invites fall back
- [x] Changing the default does not touch existing clients' assignments
- [x] Business update endpoint reads/writes the field; OpenApiSpex updated; both frontend `schema.ts` files regenerated
- [x] `mix precommit` passes

## Comments

Implemented 2026-08-14.

**Design change (user decision, 2026-08-14):** the default does NOT live on the business record as the spec text says. A first implementation followed the spec (FK on `businesses`, written via the business update endpoint) and was rejected in review discussion — the setting is a Forms-domain concern, and the business-record shape coupled `Orgs` to `Forms`. Rebuilt as a **flag on `form_templates`**:

- Migration adds `form_templates.is_default_intake` (boolean, default false) with a partial unique index (`one per business WHERE is_default_intake`) and a CHECK that only intake-purpose templates can carry it. No FK/nilify needed at all: deleting the default deletes the row; archiving it just stops the invite query matching (checkbox 1 and 7 are satisfied by construction rather than by SET NULL).
- Write path is template-centric, not the business endpoint (supersedes checkbox 9's wording): `PUT /v1/coach/form-templates/{id}/default-intake` sets (moving the flag off any previous default in one transaction, DB-backed by the partial index) and `DELETE .../default-intake` clears. Archived/non-intake → 422 on `form_template_id` (`:invalid_default_intake_template`); cross-tenant → 404 per the `get_form_template` convention (allowed by the checkbox).
- The invite path consults `active_intake() + is_default_intake` and falls back to the untouched oldest-active-or-create behavior. Existing assignments never rewritten.
- `ClientProfileFormTemplate` (response schema + JSON view) gains `is_default_intake`, so the forms list carries the badge ticket 04 needs with no extra read endpoint.
- Ticket 04's line "reads and writes go through the existing business update endpoint" is superseded: reads come from the template list's `is_default_intake`, writes go through the two template endpoints above.
- `mix precommit` green (1192 tests).
