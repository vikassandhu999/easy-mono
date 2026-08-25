# Flaws

What remains after dropping type transformers and inferred slots. The pattern is: write the type, point `typed` at it. Anything that is not that is listed here as accepted cost, not as a backlog to invent around.

## Costs you pay because you write the type twice

`create` and `update` share many keys and still have to be two maps. Create requires `name`. Patch requires `expected_revision` and makes `name` optional. Plan patch also has `start_date` / `end_date`. Copying fields is the price of not having `patch/1` or `Omit`. If those two maps drift, the caster and TypeScript follow whatever you wrote. They will not merge them for you.

`offset` and `limit` appear on every `list_query`. They are query params, so they live on the query type. `page(t)` is the response body. It does not add query fields. Repeating two keys is cheaper than inferring query from success.

## Costs the BEAM will not take on

Dialyzer will not fail a missing JSON key. It is a success typer. The walk inside `ok/2` in `:test` and `:dev` is the gate. There is no skip flag in test.

You still have a type compiler: expand remote types, `data/1`, `page/1`, unions, dictionaries, `json()`, an allowlist. Illegal wire types (`pid()`, open `map()`, open `atom()`) must fail the Mix task with the type path. A bug in the walker looks like wrong TypeScript. `--check` and `tsc` in the same PR are what catch it.

Macro stack traces still point at `typed`. The error should name the type (`Recipe has no type create`). `Macro.expand` is still how you debug expansion.

Two type modules must not share a last segment. `NutritionPlan` and `TrainingPlan`, not two modules named `Plan`. The Mix task fails. It will not prefix names for you.

## Costs that are the encoder, not the type

`Plan.format/1` stays as long as `NutritionPlanJSON`. The type names the output. It does not delete meal grouping. That logic does not go back in the controller.

`format/1` must produce a list where the type is `[t]`. `take/1` does not coerce `nil` to `[]`. If the column is nilable, `format/1` says `allergens: food.allergens || []`. Visible beats hidden.

## Costs that are this product

Closed records stay 422. Dictionaries (`%{String.t() => t}`) and `json()` exist because form answers and `error_detail` are not closed records. Using `json()` on a food is allowed and is a weak contract. Write `Food.t()` instead.

Error statuses stay off `typed`. `call()` throws `ApiError` with `EasyWeb.Types.ErrorResponse`. Putting 404 and 422 on every action recreates `operation` response lists.

`number()` is a JSON number, as in today’s nutrition OpenAPI. `Decimal.t()` is a string when the wire is a string. Resource ids are `String.t()` with no UUID format.

Coach and client share one `Food.t()`. The client app ignores `creator_id` if it does not display it. The JSON still has the key. Converting foods is a JSON change for the client app, not only a re-type.

`schema.ts` keeps the `openapi-fetch` `paths` shape so existing `client.GET('/v1/coach/...')` calls type-check. That is the HTTP shape the client already uses, not OpenAPI as a contract language.

Webhook responses stay `send_resp` text. They are not typed JSON and they are not in either app’s `schema.ts`.

## Costs of the rollout

A controller file is OpenAPI or `typed`, not both. Dual-run still lasts until the last resource moves. Agents will copy the nearest file. Convert a whole module.

`mix typed_routes.gen` merges typed routes with leftover OpenAPI operations into one `schema.ts`. Unconverted hooks keep compiling. Scalar does not see typed routes. Do not generate OpenAPI from `typed` to fill that gap.

`schema.ts` drifts until someone generates. CI runs `mix typed_routes.gen --check`.

These docs describe intent until the code exists. Grep them when the implementation lands or dies (RM-301).

## What not to add later

`patch/1`. `{:page, t}` or `{:data, t}` as macro tags. Path-segment name tables (`:date` means `Date.t()`). Query params inferred from `page/1`. Per-route error unions. Inferring `update` from the action name. A `format/1` catch-all. JSON types generated from Ecto schemas. An `encoding` or `as` key on `typed`. OpenAPI on the side for Scalar. Defaults stored in the type. Headers as `typed` keys.
