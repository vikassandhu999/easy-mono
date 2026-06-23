---
name: elixir-conventions
description: >
  The backend's Elixir/Phoenix/Ecto coding conventions, applied while WRITING
  and REVIEWING backend code. The authority is backend/AGENTS.md; this skill is
  the working checklist plus the verify step. Use whenever you write, change, or
  review anything under backend/ — contexts, schemas, controllers, changesets,
  query builders, migrations — or when the user mentions "conventions",
  "AGENTS.md", "Ctx-first", "three-case naming", "query builders", or asks for
  an Elixir backend review.
---

# Elixir Backend Conventions

The single source of truth is **`backend/AGENTS.md`**. Read it. This skill is the
fast checklist + the verify step so the conventions are actually followed, not
just documented. Don't invent rules here — if something's unclear, `AGENTS.md`
and `docs/superpowers/specs/2026-06-23-elixir-conventions-design.md` (Part A)
govern.

## Before you finish ANY backend change

Run the checks. Don't claim they passed unless you ran them.

```bash
cd backend && mix precommit   # format, compile --warnings-as-errors, credo, test
```

- `mix credo` owns the **mechanical** rules — fix every issue in the files you
  touched (don't add new ones; legacy debt elsewhere is tracked separately).
- `mix check` (`format --check-formatted`, `compile --warnings-as-errors`,
  `credo --strict`) is the stricter convention pass when you want it.

## Keystone rules (the ones most often missed)

**Actor context.** `%Easy.Ctx{business_id, user_id, role, client_id}` is built
once in the auth plug. Every tenant-scoped public context function takes `%Ctx{}`
**first**. Controllers pass `conn.assigns.ctx` — never destructure raw ids from
`conn.assigns.claims`. Pure reference reads (`list_muscles`) may take plain args.

**Three-case naming** (retires `_for_user` / `_for_coach_user` / `_as_coach` /
`_as_client`):

| Case | Shape | Example |
|---|---|---|
| Coach in system | `verb_noun(ctx, …)` | `create_plan(ctx, attrs)` |
| Coach for a client | `verb_noun_for_client(ctx, client_id, …)` (client_id 2nd) | `list_plans_for_client(ctx, client_id)` |
| Client for self | `verb_client_noun(ctx, …)` (target is ctx) | `list_client_plans(ctx)` |

**Schemas.** `insert_changeset`/`update_changeset` only — no `create_changeset`,
no generic `changeset/2`. Trusted ids (`business_id`, `creator_id`, parent ids)
are separate positional args set with `put_change/3`, never `cast`, never in
`attrs`; arg order is **`business_id` first**, then actor, then parent, then
`attrs`. `Ecto.Enum` for closed sets (not `:string` + `validate_inclusion`).
`timestamps(type: :utc_datetime)`. Explicit `binary_id` keys. No `@moduledoc`/
`@doc`; `@spec` on every public function. Schemas never call `Repo`.

**Query builders.** `for_<dim>` = filter (no-op on `nil`/`""`). `include_<assoc>`
= preload (lives in the schema, takes `business_id` to scope nested reads). Bare
predicate = named subset (`active`, `templates`). `newest`/`by_position` =
ordering. **`with_*` is retired.** Identity filters carry `business_id`:
`for_client(business_id, client_id)`, `for_coach(business_id, coach_id)` — don't
also pipe `for_business` when you've used those.

**Contexts.** `{:ok, value} | {:error, reason}` where `reason` is a **bare atom**
(`:not_found`, `:read_only_source`, …) or an `Ecto.Changeset.t()` — **not** a
tagged tuple. No bang functions outside tests/migrations/seeds. List functions
take one trailing `opts \\ []` (`:offset`/`:limit`, default 0/20, clamp max 100);
count + list is two explicit queries returning `{:ok, %{count: n, <plural>: items}}`.
`attrs` is always string-keyed (CastAndValidate) — no `Map.get("x") || Map.get(:x)`.

**Controllers.** Read `conn.assigns.ctx`, one context call, `with` → render,
errors to `FallbackController`. No `Repo`, no query building, no workflows.
`OpenApiSpex.Plug.CastAndValidate` on every write action + a co-located
`operation`. `business_id` never appears in any response.

## How this is enforced (so "everyone follows it")

1. **While writing** — this skill + `AGENTS.md` are the rules; `mix precommit`
   is the gate you run before finishing.
2. **At review** — the `.agents/skills/review` skill's Standards axis reviews the
   diff against `AGENTS.md`; the superpowers subagent-driven-development review
   loop carries these rules in each task's constraints.
3. **Mechanically** — stock `mix credo` + `mix format` catch the rote violations
   so review can focus on judgment.

Rules legacy code doesn't yet satisfy are tracked in
`docs/superpowers/specs/2026-06-23-elixir-conventions-design.md` Part B and fixed
per-context, not big-bang — so a change is judged against these conventions for
the code it touches.
