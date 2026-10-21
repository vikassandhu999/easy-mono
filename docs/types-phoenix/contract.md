# Contract

This page is the closed set. If a case is not here, the design does not cover it, and implementation must not invent a slot, flag, or transformer to paper over it. Write the type and point `typed` at it.

The library lives under `EasyWeb.TypedRoute`, `EasyWeb.Type`, and `EasyWeb.Types`. Dual-run writes each app’s `schema.ts` from typed routes plus leftover OpenAPI. `just gen-api` dumps OpenAPI, runs openapi-typescript, then `mix typed_routes.gen`.

The rule: every JSON slot on `typed` is an Elixir type you wrote. Status is an integer next to that type. Plugs stay plugs. The router stays the router.

## Scope

This contract is HTTP JSON on `EasyWeb.Router`. WebSockets are unchanged.

A route is in scope when its success body is JSON (including `{204, nil}`). Out of scope:

* `OpenApiSpex.Plug.RenderSpec` and `OpenApiSpex.Plug.SwaggerUI`
* `WebhookController` (text/plain `send_resp`, not in either app’s `schema.ts`)

Health at `GET /api/health` is JSON. It is in scope.

## Type language

A wire type is an Elixir type that JSON can represent.

Allowed:

* `String.t()`
* `integer()`, `pos_integer()`, `non_neg_integer()`, `number()`
* `float()`
* `boolean()`
* `nil`
* `t | nil` and other unions of allowed types
* atom literals and unions of atom literals (`:dairy | :egg`)
* `[t]`
* `%{required(:k) => t, optional(:k2) => t}` (record: atom keys, closed)
* `%{String.t() => t}` (dictionary: any string key, values of type `t`)
* `json()` from `EasyWeb.Types` (any JSON value)
* remote types (`EasyWeb.Types.Nutrition.Recipe.t()`)
* `data(t)` and `page(t)` from `EasyWeb.Types`
* `DateTime.t()`, `Date.t()`, `Decimal.t()`

Illegal on the wire: `pid()`, funs, open `atom()`, open `map()`, keyword lists, Ecto schema structs as the JSON type, mixed atom-and-string key maps. The Mix task names the offending type path and exits non-zero.

`json()` is:

```elixir
@type json() ::
        String.t()
        | number()
        | boolean()
        | nil
        | [json()]
        | %{String.t() => json()}
```

Use it where the JSON is unstructured (`error_detail`, a form answer bag you have not closed). Do not use it to skip writing `Food.t()`.

Keys in a record type are atoms. Jason encodes them as JSON strings. TypeScript field names are those strings. Dictionary keys are strings on both sides.

Closed records. Extra JSON keys are 422. Dictionaries have no extra keys: every string key is allowed, and the value must match `t`.

Null vs missing:

* `optional(:notes) => String.t()` means the key may be absent. If present, it is a string, not JSON null.
* `required(:notes) => String.t() | nil` means the key is present and may be JSON null.

Do not use `optional` to mean “coach has this key, client does not.” Send the same JSON to both apps.

Resource ids on the wire are `String.t()`. There is no UUID format in the type language. Changesets still validate that an id exists.

`number()` is a JSON number (calories and other OpenAPI `:number` fields). `integer()` and friends reject a JSON float. `float()` accepts a JSON integer or float. `Decimal.t()` is a string.

Do not put defaults in a type. If `offset` may be omitted, it is `optional`. The context supplies `0`.

## Codecs

One table, not per-field annotations.

* `DateTime.t()` encodes as ISO-8601 strings
* `Date.t()` encodes as `YYYY-MM-DD`
* `Decimal.t()` encodes as strings
* atom unions encode as strings; inbound JSON must be one of those strings or 422
* path and query values arrive as strings and coerce to `integer()`, `pos_integer()`, `non_neg_integer()`, `number()`, `float()`, `boolean()` (`"true"` / `"false"` only), and `Date.t()` when the type says so

`[t]` in a query type is repeated keys (`categories=a&categories=b`).

## Envelopes

These are parameterized types in `EasyWeb.Types`, imported with `use EasyWeb.TypedRoute`:

```elixir
@type data(t) :: %{required(:data) => t}
@type page(t) :: %{required(:data) => [t], required(:count) => non_neg_integer()}
```

They are the JSON body. They are not tags in the `typed` macro.

Put `data/1` and `page/1` on the `ok:` slot so the route shows the HTTP body. `page(t)` is only when the JSON has `count`. A list without `count` is `data([t])`. `data(t | nil)` is allowed (`active` session).

## Type modules

Resource types live under `EasyWeb.Types`. Nutrition examples live under `EasyWeb.Types.Nutrition`.

`use EasyWeb.Type` defines `take/1`: keep keys that appear on `@type t`, drop the rest, run codecs, recurse into nested named types. `%Ecto.Association.NotLoaded{}` raises. `take/1` does not turn `nil` into `[]`.

If every key on `t` is a struct field or a nested type that already has a formatter, omit `format/1`. `take/1` is the formatter. If `t` has a key the struct does not have, compile fails until you define `format/1`.

`format/1` is outbound and only for that module’s `@type t`. `ok` calls `Recipe.format/1` (or `take/1`) when the type at that position is `Recipe.t()`. Nested `t`s recurse (`Food.t()` inside a recipe). Other named types on the module (`create`, `impact`, `list_query`) are shapes: inbound for the caster, or maps you already built for `ok`. They do not call `format/1`.

Name the maps you reuse:

* `t` is the read JSON
* `create` is the create body
* `update` is the patch body when it is not the same map as `create`. If it is the same map, point `body:` at `create`.
* `list_query` is query params for `:index`, including `offset` and `limit` when the client pages
* any other action that has a body or a custom inner map uses that action’s name: `add_extra`, `impact`, `replace_menu`

The same type may be used in more than one slot. `EasyWeb.Types.Revision.t()` is `%{required(:expected_revision) => pos_integer()}`. Delete uses `query: Revision.t()`.

Shared fragments:

* `EasyWeb.Types.Revision.t()` as above
* `EasyWeb.Types.ErrorResponse.t()` is the `ErrorJSON` app-error body:

```elixir
@type t :: %{
        required(:error_code) => String.t(),
        required(:error_message) => String.t(),
        optional(:error_detail) => json() | nil
      }
```

The last segment of the Elixir module is the TypeScript name (`Recipe`, `ErrorResponse`, `NutritionPlan`). Two modules under `EasyWeb.Types` must not share a last segment. The Mix task fails. Name the module `NutritionPlan`, not `Plan`.

`t` emits as `Recipe`. Other types emit as `RecipeCreate`, `RecipeUpdate`, `RecipeListQuery`, `RecipeImpact`, `DayAddExtra`.

## `typed`

A controller that `use EasyWeb.TypedRoute` declares one `typed` per router action on that module. `use` imports `typed`, `ok`, `data/1`, `page/1`, and plugs the caster on those actions. `action_fallback EasyWeb.FallbackController` stays. Alias type modules yourself.

The four keys, each an Elixir type except `ok` which is `{status, type}`:

* `body`. JSON body. Omit on GET and on actions with no body (`:copy`, `:archive`, `:delete` with no body).
* `query`. Query params. Omit when there are none.
* `path`. Path params whose type is not `String.t()`. Omit when every segment is a string.
* `ok`. `{status, body_type}`. Status is an integer (`200`, `201`, `204`), not a Phoenix atom. `body_type` is `data(t)`, `page(t)`, some other JSON map, or `nil`.

There are no other keys. No `encoding`. No `as`. No `headers`.

GET with `body:` is a compile error. A router action on a typed module without `typed` is a compile error. A controller file must not contain both `typed` and an OpenApiSpex `operation`.

POST/PATCH/PUT with `body` omitted: no JSON object, or `{}`. Any keys are 422.

HTTP method comes from the router (`get`, `post`, `patch`, `put`, `delete`). `typed` does not name the method.

## Path

HTTP path params are strings. The default type for every router segment is `String.t()`. Write `path:` when a segment is not a string:

```elixir
typed :add_extra,
  path: %{date: Date.t()},
  body: Day.add_extra(),
  ok: {201, data(Day.t())}
```

If `path:` is present, its keys must be a subset of the router segments. You do not redeclare `:id`. The generator still emits every segment on the TypeScript path (from the router). Overridden segments use the type you wrote. The rest are `string`.

Phoenix `:id` in the router is `{id}` in `schema.ts`, so `client.GET('/v1/coach/nutrition-recipes/{id}', { params: { path: { id } } })` stays valid.

## After the caster

After typed-route casting:

* `conn.body_params` is the body with atom keys
* `conn.path_params` and `conn.query_params` keep string keys
* values are coerced where the type is not `String.t()` (`offset` is an integer, `date` is `%Date{}`)
* the action’s second argument is still Phoenix’s string-key merge; do not read the body from it

Changesets still run in contexts. The caster does not enforce max length or “food exists.” Unknown record keys are 422. The caster must not drop them the way `Ecto.Changeset.cast/3` does.

## Success

`ok:` is always `{status, body_type}`.

```elixir
typed :show, ok: {200, data(Recipe.t())}
typed :create, body: Recipe.create(), ok: {201, data(Recipe.t())}
typed :update, body: Recipe.update(), ok: {200, data(Recipe.t())}
typed :index, query: Recipe.list_query(), ok: {200, page(Recipe.t())}
typed :copy, ok: {201, data(Recipe.t())}
typed :impact, ok: {200, data(Recipe.impact())}
typed :categories, ok: {200, data([String.t()])}
typed :delete, query: Revision.t(), ok: {204, nil}
typed :active, ok: {200, data(Session.t() | nil)}
```

`ok(conn, payload)` sends that status and JSON. `payload` has the same keys as `body_type`. Values under `data` are domain values when that position is a module’s `t`. Strings, numbers, and other JSON-ready values pass through. `ok` calls `format/1` (or `take/1`) at each `Module.t()`, then runs codecs, then checks the result.

```elixir
ok(conn, %{data: recipe})
ok(conn, %{data: recipes, count: count})
ok(conn, %{data: categories})
ok(conn, %{data: session_or_nil})
ok(conn)
```

`ok(conn)` is `{204, nil}`: status 204, empty body, no JSON content type. Do not call `put_status`, `render`, `json`, `put_view`, or `send_resp` on a typed action. `@before_compile` rejects those calls in that module.

Pass the domain struct into `data`, not an already-formatted map. A `%Food{}` where `Recipe.t()` is required has no `format/1` clause.

`{:error, reason}` still goes to `FallbackController`.

## Errors

Do not list 401, 404, or 422 on `typed`. Pipelines and `EasyWeb.FallbackController` own those statuses. The TypeScript client types success from `ok:` and uses `ApiError` for non-2xx. The error JSON shape is `EasyWeb.Types.ErrorResponse.t()`.

## Plugs

Do not put headers on `typed`. The generator reads the router pipeline and the controller plugs.

| Plug | TypeScript header |
| --- | --- |
| `EasyWeb.Plugs.Authenticate` | `Authorization` (Bearer) |
| `EasyWeb.Plugs.Idempotency` | `Idempotency-Key` (required UUID string) |

Auth is `pipe_through :require_coach` (Authenticate plus role). Diary writes use:

```elixir
plug EasyWeb.Plugs.Idempotency when action in [:add_extra, :log_planned_item, ...]
```

A new plug that must appear on the client is added to that table in the same change that adds the plug. It is not a `typed` key.

## TypeScript

`mix typed_routes.gen` overwrites:

* `frontend/apps/coachapp/src/api/schema.ts` from `/v1/coach`, `/v1/businesses`, `/v1/auth`, `/v1/public`, `/api`
* `frontend/apps/clientapp/src/api/schema.ts` and `frontend/apps/clientapp-v2/src/api/schema.ts` from `/v1/client`, `/v1/auth`, `/v1/public`, `/api`

Those prefixes are the live split. `/v1/webhooks` is excluded from these files.

`mix typed_routes.gen --check` exits non-zero on drift. CI runs `--check`. `just gen-api` points at this task.

The file keeps the `paths` shape `openapi-fetch` already indexes: path string, lowercase method, `parameters.{query,path,header,cookie}`, `requestBody.content['application/json']` when there is a body, `responses[status].content['application/json']` for JSON, no content for 204. Typed operations list only the success status. Hooks that read `paths['/v1/coach/nutrition-recipes']['get']` keep compiling.

Named types from `EasyWeb.Types` are top-level (`export type Recipe = ...`). A type is emitted into an app’s file when a route in that app’s prefixes references it (or nests it). Coach-only `RecipeCreate` does not appear in the client file.

Recursive resources use those named types. Do not inline `Food` inside every `RecipeIngredient`.

Hooks stay hand-written in `src/api/*.ts`. Runtime calls go through `call()` in `src/api/client.ts`. `call()` throws `ApiError` on non-2xx. `createClient<paths>` stays.

There are no generated functions. Path plus method is the index. When a resource converts, change `components['schemas']['Recipe']` to `Recipe`. Do not redeclare the JSON shape.

## Dual-run

One Mix task writes each `schema.ts`. It walks `EasyWeb.Router.__routes__()` (minus out-of-scope plugs), splits by prefix, and for each action:

* `typed` → emit from the Elixir types
* `open_api_operation/1` → emit from that operation, including leftover `components.schemas`
* neither → coverage test fails

Unconverted modules still appear in `components['schemas']`. Converted modules appear as named types. Both live under the same `paths` object so unconverted hooks keep type-checking.

Do not generate OpenAPI from a typed action. Scalar will not show converted routes. That lasts until the last `operation` is gone, then OpenAPI dump, `frontend/openapi/`, and `openapi-typescript` go away. `paths` stays in the openapi-fetch shape.

A controller file is OpenAPI or `typed`, not both. Convert one resource end to end (router already there, type module, controller, tests, generate, hook imports).

## Coverage

`backend/test/easy_web/controllers/open_api_route_coverage_test.exs` (renamed when OpenAPI is gone) asserts every in-scope router route has `typed` or `open_api_operation/1`. Write routes have the caster plug (typed caster or CastAndValidate).

## Names

Call the Elixir JSON type `t`, the create body `create`, the patch body `update`, the list filters `list_query`, other action maps by the action name. Call `data/1` and `page/1` the envelope types. Call `json()` unstructured JSON. Call the success helper `ok`. Call the Mix task `mix typed_routes.gen`. Call the error body `ErrorResponse`. Do not call the Elixir types “the schema” or “the spec.” Those names are OpenAPI.
