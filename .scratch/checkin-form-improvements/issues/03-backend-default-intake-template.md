# 03 — Backend: business default intake template setting + invite flow

**What to build:** A business can name the intake template auto-assigned when a coach invites a client. The business record gains a nullable reference to a form template, as a foreign key with nilify-on-delete so deleting the chosen template clears the setting with no application code. At write time the referenced template must belong to the business, have intake purpose, and be active — an archived or check-in-purpose template is rejected with a 422. The invite flow consults the setting first and falls back to today's behavior (oldest active intake template, creating the system default if none exists) when the setting is null or the referenced template has since been archived. Clients invited before a change keep their already-assigned intake; the setting never rewrites live assignments. The setting is read and written through the existing business update endpoint; the OpenApiSpex business schema gains the field and both generated frontend schemas are regenerated. Demoable via API: set the default, invite a client, see the chosen template assigned.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Migration: nullable default-intake-template reference on business, FK with nilify-on-delete
- [ ] Invite with the setting set assigns the chosen template
- [ ] Invite with the setting null preserves today's oldest-active-or-create behavior exactly
- [ ] Invite after the chosen template is archived falls back to today's behavior
- [ ] Setting an archived template or a check-in-purpose template as default returns 422
- [ ] Setting a template belonging to another business returns 422 (or not-found per existing convention)
- [ ] Deleting the default template nils the setting; later invites fall back
- [ ] Changing the default does not touch existing clients' assignments
- [ ] Business update endpoint reads/writes the field; OpenApiSpex updated; both frontend `schema.ts` files regenerated
- [ ] `mix precommit` passes
