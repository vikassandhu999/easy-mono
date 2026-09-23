# How to add a typed route

Use this when the typed contract is in force for the resource you are touching. If the nearest controller still has `use OpenApiSpex.ControllerSpecs`, follow `.claude/skills/api-change/SKILL.md` instead. Do not add `typed` to a file that still has `operation`.

## Add or change the JSON type

Edit or create the module under `EasyWeb.Types`. Put the read JSON on `@type t`. Put the create body on `@type create`. Put the patch body on `@type update` when it differs from `create`. Put list filters, `offset`, and `limit` on `@type list_query`. Name any other action body or inner map after the action (`add_extra`, `impact`, `replace_menu`).

If every key on `t` is a struct field or a nested type with a formatter, stop. `take/1` formats it. If a key is computed, write `format/1`. Do not add a catch-all `format/1`. If a nilable column must be a list on the wire, write that in `format/1`. `NotLoaded` still raises.

Send the same JSON to coach and client. If a field exists, both apps get it.

The last segment of the module is the TypeScript name. Call a plan module `NutritionPlan`, not `Plan`.

## Bind the action

In `backend/lib/easy_web/router.ex`, add the method and path once.

In the controller, every JSON slot is a type. `ok` is `{status, body}`. There are no other keys on `typed`.

```elixir
use EasyWeb.TypedRoute

alias EasyWeb.Types.Nutrition.Recipe
alias EasyWeb.Types.Revision

typed :show, ok: {200, data(Recipe.t())}
typed :create, body: Recipe.create(), ok: {201, data(Recipe.t())}
typed :update, body: Recipe.update(), ok: {200, data(Recipe.t())}
typed :index, query: Recipe.list_query(), ok: {200, page(Recipe.t())}
typed :copy, ok: {201, data(Recipe.t())}
typed :impact, ok: {200, data(Recipe.impact())}
typed :delete, query: Revision.t(), ok: {204, nil}
typed :categories, ok: {200, data([String.t()])}
```

Omit `body` on GET and on POST with no JSON (`:copy`). Omit `query` when there is none. Path params are `String.t()` unless you write `path:`. For a date segment:

```elixir
typed :add_extra,
  path: %{date: Date.t()},
  body: Day.add_extra(),
  ok: {201, data(Day.t())}
```

If the action needs `Idempotency-Key`, add `plug EasyWeb.Plugs.Idempotency when action in [...]`. Do not put headers on `typed`.

## Return through `ok`

The payload keys match the body type. Domain values sit in `data`. `ok` formats them.

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

def index(conn, _params) do
  with {:ok, %{count: count, recipes: recipes}} <-
         Library.list_recipes(conn.assigns.ctx, conn.query_params) do
    ok(conn, %{data: recipes, count: count})
  end
end

def copy(conn, _params) do
  with {:ok, recipe} <- Library.copy_recipe(conn.assigns.ctx, conn.path_params["id"]) do
    ok(conn, %{data: recipe})
  end
end

def categories(conn, _params) do
  with {:ok, categories} <- Library.list_food_categories(conn.assigns.ctx) do
    ok(conn, %{data: categories})
  end
end

def delete(conn, _params) do
  with {:ok, _} <-
         Library.delete_recipe(
           conn.assigns.ctx,
           conn.path_params["id"],
           conn.query_params["expected_revision"]
         ) do
    ok(conn)
  end
end
```

Do not call `render`, `json`, or `send_resp`. Let `{:error, reason}` fall through to `FallbackController`.

After the caster, read the body from `conn.body_params` with atom keys. Read path ids from `conn.path_params` and filters from `conn.query_params` with string keys. Do not put `business_id` in the JSON.

## Generate and hook

Run `mix typed_routes.gen` (or `just gen-api` once that command points at it). During dual-run this still writes the whole file: typed routes from Elixir types, leftover routes from OpenAPI, so the rest of the app keeps compiling. Confirm the new field or path in both apps’ `src/api/schema.ts` if both consume it. CI runs `mix typed_routes.gen --check`.

In the owning `src/api/*.ts` file, export the named type (`Recipe`, `RecipeCreate`) from `schema.ts` and write or update the React Query hook. Replace `components['schemas']['Recipe']` with `Recipe`. Keep indexing the call through `paths['/v1/coach/nutrition-recipes']`. Put invalidation in the mutation. Do not redeclare the JSON shape.

## Test

Write the controller test through the router. Assert status and the JSON values you care about (RM-005). The typed checker asserts the shape. Do not use `OpenApiSpex.TestAssertions.assert_schema/3`.

Run `mix test` on that test file, then `cd backend && mix precommit` when the change is ready. Run `pnpm -C apps/coachapp build` or the client app equivalent so `tsc` sees the new `schema.ts`.
