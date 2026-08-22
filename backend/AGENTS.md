# Backend contract

The contract for Elixir / Phoenix / Ecto under `backend/`. Follow it while writing and reviewing. Cursor loads it when you edit this tree.

Prefer deletion, names over comments, functions over macros, explicit arguments, database guarantees, and tests. Optimize one number inside a module: **jumps per story**, the count of times a reader's eyes leave the current function while following one public operation end to end. Function count and length are not the metric; jumps are.

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

Public context functions return `{:ok, value} | {:error, reason}`. `reason` is a **bare atom** (`:not_found`, `:unauthorized`, `:forbidden`, `:conflict`, or a domain atom) or an `Ecto.Changeset.t()`. `FallbackController` maps those to HTTP. Outside transactions, bang functions stay in tests, migrations, seeds, and impossible states, never in controllers.

## Regions

Position picks the error grammar; the writer never chooses a style and the reader never guesses one:

| Region | Grammar | Talks about |
| --- | --- | --- |
| Public function | `{:ok, v} \| {:error, reason}`; errors are FE contract data | input |
| Transaction body | bare values, `Repo.rollback(reason)`, same atom set | state |
| Leaf read | value or `nil`; caller branches | one row |
| Pure shaper | plain value; cannot fail | data shape |

Each command has one **airlock**: the function that opens `Repo.transaction`. Above it, `with` chains over casts. Below it, `Repo.rollback` is the early return Elixir lacks, and the body reads top to bottom:

```elixir
def replace_client_item(%Ctx{} = ctx, attrs) do          # tuple region: casts, then the airlock
  with {:ok, cmd} <- cast_replace_command(attrs),
       do: transact(ctx, fn client -> replace_item!(ctx, client, cmd) end)
end

defp replace_item!(ctx, client, cmd) do                  # bang region: one story, top to bottom
  if past?(cmd.date, client), do: Repo.rollback(:outside_correction_window)
  slot = get_slot_locked(client, cmd.date, cmd.meal_slot) || freeze_slot!(ctx, client, cmd)
  update_entry!(slot, cmd)
end
```

A deliberate dialect (precedent: Saša Jurić, "Towards Maintainable Elixir"), not ignorance of idiom. `with` stays above the airlock.

## Naming grammar

A name is `verb_object[_qualifier][marker]`, and its contract is computed, not memorized:

1. **Contract = f(verb, marker) only.** Object and qualifier never change the return shape: `get_plan` and `get_plan_by_slug` have identical contracts.
2. **Marker picks the failure grammar.** A bare name returns value or `nil`, or a tuple, per region. `!` returns the bare value or aborts (rollback in a transaction, raise outside). `?` returns a pure boolean, nothing else.
3. **Qualifiers refine selection only.** `by_` alternate key, `for_` scope, `locked` FOR UPDATE. `_or_` swaps the absence branch for the right-hand operation (`get_or_freeze_slot!`), the only lawful get-or-create.

| Verb | Operation | Returns |
| --- | --- | --- |
| `get_` | read by key | value or `nil`; with `!`, value or abort |
| `list_` | read many | collection; `{:ok, page}` when fallible |
| `cast_` | untrusted input to typed value, pure | `{:ok, v} \| {:error, r}` |
| `ensure_` | make-it-so, idempotent, may create | the thing |
| `validate_` | Ecto changeset pipelines only | changeset in, changeset out |
| `insert_` / `update_` / `delete_` | writes | Repo heritage |
| `?` suffix | pure predicate | boolean |
| `_attrs` suffix | pure map bound for a changeset | map |
| `_data` suffix | pure read-model map | map |

The public-function object comes from the three-case table; the grammar supplies verb and marker (`list_client_nutrition_days` is `list_` plus the case-3 object).

## Functions

| Rule | Summary |
| --- | --- |
| Defp license | Vocabulary (2+ call sites, or a registered domain word like `write_eligible?`), phase (a sub-story: `freeze_slot!`), or clause head (multi-clause match; no jump). A single-use fragment that only shortens its caller is confetti; inline it. |
| Command executors | Domain verb plus `!`: `switch_option!`, `log_extra!`. `record_` and `do_` prefixes say nothing `!` does not. |
| Rich-failure reads | Several business failure reasons make a domain verb, never `get_`: `redeem_invitation(token)` returns `:invalid \| :used \| :expired`. |
| One word | Ecosystem word first (`cast`, `get`, `lock`), registered domain word second (`freeze`, `fulfil`; new ones go in `CONTEXT.md`), coin last. Never a synonym for a concept that has a word. |
| Variants | The grammar defines legal names, not an inventory. Write the one variant a call site demands; one noun almost always has one function. |
| Retired | `fetch_`/`load_`/`find_` → `get_`; `resolve_` → `get_` or a domain verb; `persist_` → `insert_`/`update_`; `check_` → `?` or an inline guard; `validate_` outside changesets → the region's grammar. |

## Ctx

`%Easy.Ctx{business_id, user_id, coach_id, client_id, owner?}` is built once from JWT claims and router scope. `coach_id` is set for a coach membership; `owner?` for the business owner. For client actors, the active-client HTTP plug or socket loads the accepted tenant-scoped client and sets `client_id`; Case-3 operations use `ctx.client_id` and never resolve identity again from `ctx.user_id`. Coach actors carry `client_id: nil`. Non-HTTP callers constructing a client Ctx pass the trusted client id.

Every tenant-scoped public context function takes `%Ctx{}` first. Pure reference reads with no tenant (`list_muscles`) may take plain args.

Controllers pass `conn.assigns.ctx`. They do not destructure `conn.assigns.claims` into raw ids.

## Three-case

The function name declares actor and target. `_for_user`, `_for_coach_user`, `_as_coach`, `_as_client` are retired.

| Case | Actor → target | Name | Example |
| --- | --- | --- | --- |
| Coach in system | coach → business scope | `verb_noun(ctx, …)` | `create_plan(ctx, attrs)` |
| Coach for a client | coach → one client | `verb_noun_{for,to}_client(ctx, client_id, …)`, `client_id` second | `list_plans_for_client(ctx, client_id)` |
| Client themselves | client → self | `verb_client_noun(ctx, …)`, no `client_id` arg | `list_client_plans(ctx)` |

Case 1 stamps `creator_id = ctx.user_id`. Case 2 authorizes the client in `ctx.business_id`. Case 3 targets `ctx.client_id`.

## Controllers

HTTP adapters: read `conn.assigns.ctx`, take params, call one context function, set status, render. Workflows that need a comment belong in a context. Errors go to `FallbackController`.

Writes use `OpenApiSpex.Plug.CastAndValidate` and a co-located `operation`. After the plug, the body is `conn.body_params` (RM-008). Nested object schemas that feed `cast_embed` / `cast_assoc` set `struct?: false` (RM-007).

Identity ids come from `conn.path_params` (strings) as explicit context args. The body carries only editable fields, which go to `cast/3`. `cast/3` is key-agnostic; do not probe `Map.get("x") || Map.get(:x)`.

`business_id` stays out of JSON responses.

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
| Row filter | `for_<dimension>(q, val)`; no-op on `nil`/`""` |
| Named subset | bare predicate (`active`, `templates`) |
| Ordering | named order with direction and an `:id` tie-break (`newest` is `[desc: inserted_at, desc: id]`) |
| Preload | `include_<assoc>` in the schema; tenant-scoped children take `business_id` or correlate `child.business_id == parent.business_id` |
| Domain composite | named multi-where built from the primitives |

`for_` filters, `include_` preloads. `with_*` is retired. `for_client` / `for_coach` already carry `business_id`; do not also pipe `for_business`.

Preload associations the JSON response includes. List endpoints that render children must preload them.

## OpenAPI

A public JSON endpoint is unfinished until implementation, generated spec, and Swagger UI agree. Operation lives next to the action. Schema and JSON view change together (RM-002). The cutover sequence is the root **API** skill.

Map user-controlled strings explicitly; never `String.to_atom/1` on input. Outbound HTTP is `Req`, behind a small module with normalized errors.

Invariants that matter belong in Postgres too (unique, FK, check, non-null, tenant-leading indexes).

## Tests

`SchemaCase` for schemas. Factories, not hand-rolled persisted structs, unless the test requires it.

Cover the rule: valid and invalid input, trusted ids not cast, tenant scope, cross-tenant denial, `{:error, reason}` for expected failures, controller status and rendered shape, `assert_schema` on write responses (RM-002, RM-005). Dates compared to today are derived from `Date.utc_today()`, not calendar literals (RM-016).

## Finish

1. **Iterate.** `mix test <path>` named by the ticket. Done when that file is green. Credo and format issues in files you touched get fixed on this loop.
2. **Resolve.** `cd backend && mix precommit` (compile `--warnings-as-errors`, format, credo, full `mix test`). Done when it exits 0. Claim it passed only after it ran.

On files you touched, also check the grammar mechanically:

```bash
# retired verbs
grep -nE 'defp? (fetch|load|find|persist|check|resolve|record)_' <file>
# single-line predicates returning tuples (partial check; multi-line bodies need eyes)
grep -nE 'defp? [a-z_]+\?\(.*(\{:ok|\{:error)' <file>
```

Reviews check this file. Credo owns nesting. Legacy debt is fixed on the boundary you touch: a function you edit gets its lawful name in the same change (rename-on-touch, no rename-only PRs); new code on that boundary follows this file even when neighbours do not.
