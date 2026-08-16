# Backend contract

Elixir / Phoenix / Ecto under `backend/`. `elixir-conventions` is the checklist; this file wins when they disagree.

Prefer deletion, names over comments, functions over macros, explicit arguments, database guarantees, and tests.

## Layers

One way, never reversed:

```text
router → controller → context → schema / query → Repo → Postgres
```

| Layer | Owns |
| --- | --- |
| Router | Paths, pipelines, plugs |
| Controller | HTTP: params, status, render. One context call. |
| Context | Application verbs, transactions, query composition |
| Schema | Shape, changesets, pure query builders |
| Repo | Persistence |
| Postgres | Constraints, indexes, tenant isolation |

Controllers do not call `Repo` or decide domain policy. Schemas do not call `Repo`. Contexts do not know `conn`.

## Tenant

Every tenant-owned query is scoped by `business_id` from `%Easy.Ctx{}`, never from request params. If unsure, assume the data is tenant-owned. Test isolation on every public read, list, update, and delete.

```elixir
Order |> Order.for_business(ctx.business_id) |> Repo.get(id)
```

Trusted ids are `put_change/3` from Ctx, never `cast`.

## Returns

Public context functions return `{:ok, value} | {:error, reason}`. `reason` is a **bare atom** (`:not_found`, `:unauthorized`, `:forbidden`, `:conflict`, or a domain atom) or an `Ecto.Changeset.t()`. `FallbackController` maps those to HTTP. Bang functions stay in tests, migrations, seeds, and impossible states — not controllers.

## Ctx

`%Easy.Ctx{business_id, user_id, coach_id, client_id, owner?}` is built once from JWT claims and router scope. `coach_id` is set for a coach membership; `owner?` for the business owner. For client actors, the active-client HTTP plug or socket loads the accepted tenant-scoped client and sets `client_id`; Case-3 operations use `ctx.client_id` and never resolve identity again from `ctx.user_id`. Coach actors carry `client_id: nil`. Non-HTTP callers constructing a client Ctx pass the trusted client id.

Every tenant-scoped public context function takes `%Ctx{}` first. Pure reference reads with no tenant (`list_muscles`) may take plain args.

Controllers pass `conn.assigns.ctx`. They do not destructure `conn.assigns.claims` into raw ids.

## Three-case

The function name declares actor and target. `_for_user`, `_for_coach_user`, `_as_coach`, `_as_client` are retired.

| Case | Actor → target | Name |
| --- | --- | --- |
| Coach in system | coach → business scope | `verb_noun(ctx, …)` |
| Coach for a client | coach → one client | `verb_noun_{for,to}_client(ctx, client_id, …)` — `client_id` second |
| Client themselves | client → self | `verb_client_noun(ctx, …)` — no `client_id` arg |

Case 1 stamps `creator_id = ctx.user_id`. Case 2 authorizes the client in `ctx.business_id`. Case 3 targets `ctx.client_id`.

## Controllers

HTTP adapters: read `conn.assigns.ctx`, take params, call one context function, set status, render. Workflows that need a comment belong in a context. Errors go to `FallbackController`.

Writes use `OpenApiSpex.Plug.CastAndValidate` and a co-located `operation`. After the plug, the body is `conn.body_params` (RM-008). Nested object schemas that feed `cast_embed` / `cast_assoc` set `struct?: false` (RM-007).

Identity ids come from `conn.path_params` (strings) as explicit context args. The body carries only editable fields, which go to `cast/3`. `cast/3` is key-agnostic; do not probe `Map.get("x") || Map.get(:x)`.

Exception: `AuthController` (signup, OTP, token refresh) may render raw `json(%{...})`.

New multi-word path segments are kebab-case (`/workout-sessions`). Existing snake_case paths stay until a coordinated OpenAPI + frontend cutover.

## Contexts

Application verbs. They authorize, compose schema query builders, call `Repo`, run transactions, and wrap external I/O behind small modules that return `{:ok, _} | {:error, _}`.

List functions take one trailing `opts \\ []`. Pagination: `offset` default `0`, `limit` default `20`, max `100`. Count and list are two queries: `{:ok, %{count: n, <plural>: items}}`.

## Schemas

`insert_changeset` and `update_changeset` only. No `create_changeset`. No generic `changeset/2` on top-level schemas (embedded schemas may keep one `changeset/2` when there is a single write path).

Changesets are Ctx-ignorant. Canonical args: `business_id`, then actor, then parent, then `attrs`. Trusted identities (`business_id`, `creator_id`, parent ids) are positional `put_change/3`.

`Ecto.Enum` for closed sets. `timestamps(type: :utc_datetime)`. Explicit `binary_id` keys. Read values with `Ecto.Changeset.get_field/2`. Translate constraint errors into changeset errors.

`@spec` on every public function. No `@moduledoc` or `@doc`.

## Query builders

Pure, composable, `query \\ __MODULE__`, never `Repo`.

| Category | Shape |
| --- | --- |
| Row filter | `for_<dimension>(q, val)` — no-op on `nil`/`""` |
| Named subset | bare predicate (`active`, `templates`) |
| Ordering | named order with direction and an `:id` tie-break (`newest` is `[desc: inserted_at, desc: id]`) |
| Preload | `include_<assoc>` in the schema; tenant-scoped children take `business_id` or correlate `child.business_id == parent.business_id` |
| Domain composite | named multi-where built from the primitives |

`for_` filters, `include_` preloads. `with_*` is retired. `for_client` / `for_coach` already carry `business_id` — do not also pipe `for_business`.

Preload associations the JSON response includes. List endpoints that render children must preload them.

## OpenAPI

A public JSON endpoint is unfinished until implementation, generated spec, and Swagger UI agree. Operation lives next to the action. Schema and JSON view change together (RM-002). Then `just gen-api`.

Map user-controlled strings explicitly; never `String.to_atom/1` on input. Outbound HTTP is `Req`, behind a small module with normalized errors.

Invariants that matter belong in Postgres too (unique, FK, check, non-null, tenant-leading indexes).

## Tests

`SchemaCase` for schemas. Factories, not hand-rolled persisted structs, unless the test requires it.

Cover the rule: valid and invalid input, trusted ids not cast, tenant scope, cross-tenant denial, `{:error, reason}` for expected failures, controller status and rendered shape, `assert_schema` on write responses (RM-002, RM-005). Dates compared to today are derived from `Date.utc_today()`, not calendar literals (RM-016).

## Finish

While iterating, run the ticket's `mix test <path>`. Before resolving, `cd backend && mix precommit` (compile `--warnings-as-errors`, format, credo, full test). Do not claim those checks passed unless they were run.

Credo owns mechanical nesting. Reviews check this file. Legacy debt is fixed on the boundary you touch, not big-bang. New code on that boundary follows this file even when neighbours do not.
