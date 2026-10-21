# About typed HTTP contracts

Coach and client resource routes use Elixir types, Phoenix routes, and TypeScript generated from those two. Auth retains OpenAPI. See [the route guide](add-a-route.md) for the current change workflow. The protocol stays HTTP. Controllers stay controllers. The React apps keep hand-written hooks.

The rule is one sentence: you write Elixir types for the JSON, and you point `typed` at those types. No operators that transform types. No inference from action names, path-segment names, or the success type into some other slot.

## Why the contract changed

The earlier OpenAPI contract required the router, `operation` macro, schema, JSON view, and generated TypeScript to agree. Schema and view drift motivated one JSON type shared by casting, formatting, and generation. The generated files remain `src/api/schema.ts` in coachapp, clientapp, and clientapp-v2.

OpenAPI braids shape, constraints, examples, docs, runtime cast, and client codegen into one artifact. Generating OpenAPI in secret still means thinking in OpenAPI.

Phoenix already owns method and path in `backend/lib/easy_web/router.ex`. Contexts already return `{:ok, value} | {:error, reason}`. `EasyWeb.FallbackController` already maps those reasons to status codes. JSON views already encode domain structs. Typed routes add one Elixir type for the wire, bound to the action. That type is what the caster, `format/1`, and the TypeScript emitter all read.

## Simple means unbraided

Rich Hickey’s “Simple Made Easy” is about not intertwining jobs, not about short syntax.

Types describe JSON shape. Changesets describe domain rules such as max length and “this food exists”. The router describes method and path. Plugs describe auth and idempotency. `format/1` turns a domain value into that JSON. The Mix task prints TypeScript.

tRPC would hide HTTP. GraphQL would change the protocol. `@derive {Jason.Encoder, only: [...]}` on an Ecto schema would leak `business_id` and skip computed fields such as `nutrients`. Generating the JSON type from the Ecto schema would encode the wrong fields. A `patch/1` helper that optionalizes `create` and injects `expected_revision` would be a second type language. `{:page, t}` as a macro tag would be the same sin.

## The four slots

`typed` has four JSON slots: `body`, `query`, `path`, `ok`. Each slot holds an Elixir type. Omit a slot when that part of HTTP is empty (GET has no body. A show has no query). There are no other keys.

`ok` is `{status, body_type}`. Status is an integer. `body_type` is the JSON object you send, or `nil` when there is no body.

Two parameterized types live in `EasyWeb.Types`. They are types, not macro tags:

```elixir
@type data(t) :: %{required(:data) => t}
@type page(t) :: %{required(:data) => [t], required(:count) => non_neg_integer()}
```

A type module under `EasyWeb.Types` holds `@type t` for the read JSON, `@type create` for the create body, `@type update` for the patch body when it differs, `@type list_query` for filters plus `offset` and `limit`, and one type per extra action that needs a body or a custom inner map (`impact`, `add_extra`). `format/1` exists when a key is computed. `take/1` is the formatter when every key is a struct field or a nested type that already formats.

`ok(conn, payload)` is the success return. The payload is the JSON body with domain values still in `data`. `ok` formats, checks in `:dev` and `:test`, and encodes. `ok(conn)` is `{204, nil}`. `{:error, reason}` still goes to `FallbackController`. Typed actions do not call `render`, `json`, or `send_resp`.

`mix typed_routes.gen` walks `EasyWeb.Router.__routes__()`, joins each route with `__typed_route__(action)` or leftover `open_api_operation/1`, and overwrites each app’s `src/api/schema.ts`. `--check` fails CI on drift. Split by the live prefixes: coach gets `/v1/coach`, `/v1/businesses`, `/v1/auth`, `/v1/public`, `/api`; client gets `/v1/client`, `/v1/auth`, `/v1/public`, `/api`. The file keeps the `paths` shape `openapi-fetch` already indexes. Hooks stay hand-written. `call()` still throws `ApiError` on non-2xx.

The generator also reads plugs, the same way it reads the router. `Authenticate` and `Idempotency` are plugs. They are not `typed` keys.

## What the type is

The type is a JSON-shaped Elixir type, not `Recipe.t()` the Ecto schema. The schema has `__meta__`, `business_id`, and associations that may be `%Ecto.Association.NotLoaded{}`. The wire has `nutrients`, signed media URLs, and flattened calories.

Allowed pieces are `String.t()`, integers, `number()`, `float()`, `boolean()`, `nil`, atom unions, lists, closed record maps, `%{String.t() => t}`, `json()`, remote types, `data/1`, `page/1`, `DateTime.t()`, `Date.t()`, and `Decimal.t()`. Keys in a record are atoms. Jason encodes them as JSON strings. TypeScript sees strings.

Closed records. Unknown JSON keys are 422. `Ecto.Changeset.cast/3` drops unknown keys. The caster must not.

`%Ecto.Association.NotLoaded{}` raises in `take/1`. A nil column that must be a list is handled in `format/1` (`allergens: food.allergens || []`). That line is visible. There is no hidden nil-to-empty rule in `take/1`.

## One default, then write the type

HTTP path params arrive as strings. Every path segment is `String.t()` until you say otherwise. Nutrition days write `path: %{date: Date.t()}`. You do not get `Date.t()` because the segment is named `date`.

Query params you want are on the query type, including `offset` and `limit` on list endpoints. `page(t)` does not add them.

Coach and client receive the same resource JSON. `creator_id` is on `Food.t()` for both.

You do not list 401, 404, and 422 on `typed`. The auth pipeline and `FallbackController` own those. One `EasyWeb.Types.ErrorResponse` is the error body.

Path plus method is how the client indexes a route. Named types use the Elixir module’s last segment (`Recipe`, `RecipeCreate`). There are no generated functions.

## What a controller looks like

The router is unchanged:

```elixir
get "/nutrition-recipes/:id", RecipeController, :show
post "/nutrition-recipes", RecipeController, :create
```

The controller drops `use OpenApiSpex.ControllerSpecs`, the `operation` blocks, and `CastAndValidate`:

```elixir
typed :show, ok: {200, data(Recipe.t())}
typed :create, body: Recipe.create(), ok: {201, data(Recipe.t())}
typed :update, body: Recipe.update(), ok: {200, data(Recipe.t())}
typed :index, query: Recipe.list_query(), ok: {200, RecipeIndex.t()}
typed :delete, ok: {204, nil}

def show(conn, %{"id" => id}) do
	with {:ok, recipe} <- Library.get_recipe(conn.assigns.ctx, id) do
		ok(conn, %{data: recipe})
	end
end

def delete(conn, _params) do
	with {:ok, _} <-
		   Library.delete_recipe(conn.assigns.ctx, conn.path_params["id"]) do
		ok(conn)
	end
end
```

That `with` is the action. `ok` reads `ok:` for this action, formats each `Recipe.t()`, sets the status, and encodes JSON. `{:error, reason}` falls through to `FallbackController`. Do not call `render`, `json`, or `send_resp`.

Diary writes add `plug EasyWeb.Plugs.Idempotency when action in [...]`. The extra path type is written:

```elixir
typed :add_extra,
	path: %{date: Date.t()},
	body: Day.add_extra(),
	ok: {201, data(Day.t())}
```

## Contract ownership

For typed resources, the Elixir type and `format/1` replace the OpenAPI schema and separate JSON view. Change both in the same edit, then generate. A controller file is OpenAPI or `typed`, not both.

Auth still depends on `backend/lib/easy_web/open_api/`, `EasyWeb.ApiSpec`, its `operation` declarations, casting, Swagger UI, and the OpenAPI generation step. Keep that tooling while auth uses it.

## What you do not build

Type transformers (`patch/1`, `Omit`, map merge). Macro tags that are not Elixir types (`{:page, t}`, `{:data, t}`). Path-segment name tables. Query params inferred from the success type. Per-route error unions. Success-tuple interception that treats `{:ok, recipe}` as an implicit render. `Jason.Encoder` on schemas. Hook codegen. An `encoding` or `as` key on `typed`. OpenAPI generated from typed routes “for Scalar.” A catch-all `def format(x), do: Map.from_struct(x)`.

## Generation

`rtk just gen-api` refreshes the auth OpenAPI input and runs the typed-route generator. The generator writes each app’s `schema.ts` from typed routes plus auth operations, so both contracts remain available to hand-written hooks. `mix typed_routes.gen --check` detects drift.
