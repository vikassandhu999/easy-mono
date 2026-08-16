---
name: api-change
description: >
  Sequence for changing a public JSON endpoint or response field so OpenApiSpex,
  the JSON view, generated frontend types, and hand-written React Query hooks
  stay aligned. Use when adding or changing an API path, schema, JSON view,
  generated schema.ts, or a hand-written hook or query key that consumes the
  contract.
---

# API change

`backend/AGENTS.md` OpenAPI and `frontend/AGENTS.md` API are the contracts. This skill is the sequence that crosses both.

1. **Schema + view** — change the OpenApiSpex schema and the JSON view in the same edit (RM-002). Done when they name the same fields.
2. **Tests** — controller tests go through the real router. Write responses use `OpenApiSpex.TestAssertions.assert_schema/3`. Nested request schemas that feed `cast_embed` / `cast_assoc` set `struct?: false` (RM-007). Done when the focused controller test is green.
3. **Generate** — `just gen-api`. `src/api/schema.ts` is always overwritten. Done when both apps' generated files contain the new field or path.
4. **Hooks** — hand-written hooks in `src/api/*.ts` consume the new types. Invalidation lives in the mutation via `src/api/keys.ts` factories (RM-118, RM-143). Types come from `schema.ts`; no `as unknown as` on API objects (RM-106). Done when the owning hook and keys compile against the generated types.
5. **Restart** — fully restart `phx.server` before hitting the endpoint in the browser. Code-reload does not bust the spec cache (RM-004). Done when a request to the running server returns the new shape. Ticket 08 retires this step.
6. **Finish** — the focused controller test and `just gen-api` ran in this session. Done when both completed.
