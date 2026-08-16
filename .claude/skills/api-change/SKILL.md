---
name: api-change
description: >
  Sequence for changing a public JSON endpoint or response field so OpenApiSpex,
  the JSON view, generated frontend types, and hand-written React Query hooks
  stay aligned. Use when adding or changing an API path, schema, JSON view,
  generated schema.ts, or a hand-written hook or query key that consumes the
  contract. Parent dispatches a cheap subagent; the subagent derives the delta
  from git vs main, not from a parent field list.
---

# API change

`backend/AGENTS.md` OpenAPI and `frontend/AGENTS.md` API are the contracts. This skill is the sequence that crosses both.

## Dispatch (parent)

Do not write a field list. Do not summarise the diff. Launch one `generalPurpose` subagent with the harness model and the prompt below, verbatim.

| Harness | Model |
| --- | --- |
| Codex | `gpt-5.6-terra` |
| Cursor | `composer-2.5-fast` |
| Claude | `sonnet 5` |

Never `inherit`. If that harness's slug is not in the available list, use that harness's cheapest listed model. If the runtime cannot pick a subagent model, run **Layer** in this context — still from git, still with no field list.

Done when the subagent returns the touched paths, or the gaps in the diff. Then continue product work.

### Prompt

```
Read .claude/skills/api-change/SKILL.md and run Layer.

Derive the public JSON delta from git vs main. Do not wait for a field list from the parent. Do not invent types or nullability the diff does not determine.
```

## Layer (subagent)

Source of truth is the working tree vs `main`: the JSON views and controller operations in that diff. OpenApiSpex, tests, generated `schema.ts`, and hooks follow them. When a view and an OpenApiSpex module disagree, the view wins.

```text
git status --short
git diff main -- backend/lib/easy_web backend/test/easy_web frontend/apps/coachapp-v2/src/api frontend/apps/clientapp-v2/src/api
git ls-files --others --exclude-standard -- backend/lib/easy_web backend/test/easy_web frontend/apps/coachapp-v2/src/api frontend/apps/clientapp-v2/src/api
```

If that diff has no public JSON change, stop and say so.

1. **Schema + view** — change the OpenApiSpex schema and the JSON view in the same edit (RM-002). Done when they name the same fields as the view in the diff.
2. **Tests** — controller tests go through the real router. Write responses use `OpenApiSpex.TestAssertions.assert_schema/3`. Nested request schemas that feed `cast_embed` / `cast_assoc` set `struct?: false` (RM-007). Done when the focused controller test is green.
3. **Generate** — `just gen-api`. `src/api/schema.ts` is always overwritten. Done when both apps' generated files contain the new field or path.
4. **Hooks** — hand-written hooks in `src/api/*.ts` consume the new types. Invalidation lives in the mutation via `src/api/keys.ts` factories (RM-118, RM-143). Types come from `schema.ts`; no `as unknown as` on API objects (RM-106). Done when the owning hook and keys compile against the generated types.
5. **Finish** — the focused controller test and `just gen-api` ran in this session. In `:dev` the next request rebuilds the spec (`NoneCache`, RM-004). Done when both completed.

Return the touched paths. If type or nullability is not in the diff, return the gap and stop.
