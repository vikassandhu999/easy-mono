# Add an api-change skill

Type: task
Status: ready-for-agent
Blocked by: None — can start immediately.
Parent: [Agent development process](../map.md)

## Question

What is the exact sequence an agent must follow when a public JSON endpoint or response field changes, so OpenApiSpex, the JSON view, generated frontend types, and hand-written React Query hooks cannot drift?

## What to add

A repo-owned skill at `.claude/skills/api-change/SKILL.md`. This is not a vendored plugin skill (RM-302). Keep it short — a checklist, not a second OpenAPI chapter. `backend/AGENTS.md` remains the contract authority.

Sequence to encode (current truth, including RM-004 until ticket 08 lands):

1. Change the OpenApiSpex schema and the JSON view in the same edit (RM-002).
2. Controller/request tests go through the real router; write responses use `OpenApiSpex.TestAssertions.assert_schema/3`; nested request schemas that feed `cast_embed`/`cast_assoc` set `struct?: false` (RM-007).
3. `just gen-api` (spec dump → split → both app `schema.ts` files). Never hand-edit `schema.ts`.
4. Hand-written hooks in `src/api/*.ts` consume the new types. Invalidation lives in the mutation hook via `src/api/keys.ts` factories (RM-118, RM-143). No `as unknown as` on API objects (RM-106).
5. Until ticket 08 is resolved: fully restart `phx.server` before hitting the endpoint in the browser. Code-reload does not bust the spec cache (RM-004). If 08 is already `resolved` when this ticket is implemented, omit this step and point at the reload behaviour instead.
6. Do not finish until the focused controller test and `just gen-api` have been run.

Root `AGENTS.md` "When changing an API" should point at this skill in one sentence. Do not paste the checklist into root AGENTS.

## Edit surface

* `.claude/skills/api-change/SKILL.md` (new)
* Root `AGENTS.md` — one-line pointer under Working rules / When changing an API

## Acceptance

- [ ] The skill is in `.claude/skills/` and does not collide with a plugin skill name.
- [ ] An agent following only the skill will touch schema + view together, regenerate both clients, and update hooks/keys.
- [ ] Phoenix restart is present if 08 is open, absent if 08 is resolved.
- [ ] Root `AGENTS.md` growth is one sentence.

## Verification

Read the skill and the AGENTS pointer. Confirm RM-302 (`scripts/check-rm.sh`) still passes: `just check-rm`.
