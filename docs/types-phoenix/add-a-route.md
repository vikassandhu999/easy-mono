# Add or change an API route

Coach and client resource routes use typed contracts. Auth retains OpenApiSpex; use the [auth workflow](#auth-openapi-routes) below when the controller has `use OpenApiSpex.ControllerSpecs`. A controller file uses either `typed` or `operation`, never both.

## Define the JSON type

Edit the module under `backend/lib/easy_web/types/`. Put read JSON on `@type t`, the create body on `@type create`, and a differing patch body on `@type update`. Put list filters and pagination inputs on `@type list_query`. Name other action bodies or inner maps after the action.

If every key on `t` is a struct field or a nested type with a formatter, `take/1` formats it. For computed fields, write `format/1`. Do not add a catch-all formatter. Convert nilable columns to lists explicitly when the wire type requires a list. Unloaded associations still raise.

Coach and client receive the same resource JSON. The module's last segment becomes the TypeScript name: use `NutritionPlan`, not `Plan`.

## Bind the action

Add the method and path once in `backend/lib/easy_web/router.ex`. Declare each JSON slot in the controller. `ok` is `{status, body_type}`.

```elixir
use EasyWeb, :typed_controller

alias EasyWeb.Types.Nutrition.{Recipe, RecipeIndex}

typed :show, ok: {200, data(Recipe.t())}
typed :create, body: Recipe.create(), ok: {201, data(Recipe.t())}
typed :update, body: Recipe.update(), ok: {200, data(Recipe.t())}
typed :index, query: Recipe.list_query(), ok: {200, RecipeIndex.t()}
typed :copy, ok: {201, data(Recipe.t())}
typed :delete, ok: {204, nil}
```

Omit `body` on GET and on POST with no JSON. Omit `query` when there is none. Path params default to `String.t()`; write `path:` when a segment needs another type:

```elixir
typed :add_extra,
  path: %{date: Date.t()},
  body: Day.add_extra(),
  ok: {201, data(Day.t())}
```

Headers do not belong on `typed`. For actions that require `Idempotency-Key`, add `plug EasyWeb.Plugs.Idempotency when action in [...]`.

## Return through `ok`

The payload keys match the response type. Domain values sit in `data`; `ok` formats them.

```elixir
def show(conn, %{"id" => id}) do
  with {:ok, recipe} <- Library.get_recipe(conn.assigns.ctx, id) do
    ok(conn, %{data: recipe})
  end
end

def create(conn, _params) do
  with {:ok, recipe} <- Library.create_recipe(conn.assigns.ctx, conn.body_params) do
    ok(conn, %{data: recipe})
  end
end

def delete(conn, _params) do
  with {:ok, _} <- Library.delete_recipe(conn.assigns.ctx, conn.path_params["id"]) do
    ok(conn)
  end
end
```

Do not call `render`, `json`, or `send_resp` in typed actions. Let `{:error, reason}` fall through to `FallbackController`.

After casting, read atom-keyed bodies from `conn.body_params`. Read path ids and filters from `conn.path_params` and `conn.query_params` with string keys. Keep trusted ids out of editable bodies and `business_id` out of JSON responses. Changesets enforce domain rules; the caster validates the wire shape and rejects unknown record keys.

## Generate and update consumers

From the repository root, run `rtk just gen-api`. It regenerates `src/api/schema.ts` for coachapp, clientapp, and clientapp-v2 from typed routes and the remaining auth OpenAPI operations. Confirm the changed paths and fields in each consuming app. Never edit generated files by hand. `mix typed_routes.gen --check` detects generated drift.

In the owning `src/api/*.ts` file, re-export named types such as `Recipe` and `RecipeCreate` from `schema.ts`. Calls continue to use `paths` through `openapi-fetch`. Update the hand-written React Query hooks and put invalidation in the mutation hook. Do not redeclare the JSON shape.

## Verify

Test the controller through the router. Assert status, meaningful JSON values, invalid input, and tenant denial. Typed routes check response shape; do not add OpenApiSpex schema assertions to typed-route tests.

From `backend/`, run the focused test with `rtk mix test <path>`, then `rtk mix precommit` when the change is ready. From the repository root, build each affected app with `rtk pnpm -C frontend/apps/<app> build` and run `rtk pnpm -C frontend lint:ci`. Exercise changed UI flows using the root `AGENTS.md` browser guidance.

## Auth OpenAPI routes

For the remaining auth endpoints, keep the router, co-located `operation`, schema under `backend/lib/easy_web/open_api/`, and rendered JSON aligned. Retain `OpenApiSpex.Plug.CastAndValidate` where used and read the validated body from `conn.body_params`. Nested object schemas passed to `cast_embed` or `cast_assoc` use `struct?: false`.

Test these routes through the router with status and JSON-value assertions, plus `OpenApiSpex.TestAssertions.assert_schema/3` for the declared response schema. Regenerate with `rtk just gen-api`, inspect the generated spec and Swagger UI, update consuming hooks, and run the verification steps above. OpenAPI tooling remains required for auth.
