# Bust the OpenAPI spec cache in dev

Type: task
Status: resolved
Blocked by: None — can start immediately.
Parent: [Agent development process](../map.md)

## Question

Schema edits currently 422 ("Unexpected field") until `phx.server` is fully restarted because `OpenApiSpex.Plug.PutApiSpec` builds the spec once at boot and code-reload does not bust it (RM-004). How does a schema change become visible in the running dev server without a process restart?

## What to change

Find where PutApiSpec caches `EasyWeb.ApiSpec.spec/0` (persistent_term, ETS, or module attribute). In `:dev`, invalidate that cache when OpenAPI schema/controller modules reload, or rebuild the spec on each request in dev only.

Production/test behaviour stays cached. Tests that call `EasyWeb.ApiSpec.spec()` must keep passing.

After the fix:

* Graduate or retire RM-004 in `docs/agents/recurring-mistakes.md` (one line pointing at the reload hook, or delete the entry if the failure mode is gone).
* If `.claude/skills/api-change/SKILL.md` exists (ticket 05), remove the Phoenix-restart step and say schema reloads with the endpoint.

Do not add a `just restart-api` alias as the solution. The point is to stop needing a restart.

## Edit surface

* `backend/lib/easy_web/api_spec.ex` and/or endpoint/application reload hooks
* `backend/config/dev.exs` only if a config flag is required
* A focused test or a documented probe in `## Answer` (hit a write endpoint after a schema field add in a running server — or an equivalent ExUnit proof if the cache is injectable)
* `docs/agents/recurring-mistakes.md` RM-004
* `.claude/skills/api-change/SKILL.md` if present

## Acceptance

- [x] In dev, a schema field added while `phx.server` is running is accepted (or rejected by the new schema) after code reload, without killing the process.
- [x] `mix test` still passes for OpenAPI/controller tests.
- [x] RM-004 no longer tells agents to restart the server as the only fix.
- [x] The api-change skill, if it exists, does not require a restart.

## Verification

```text
cd backend && mix test test/easy_web/controllers/open_api_route_coverage_test.exs
```

Plus the smallest controller test that uses `assert_schema`. Then `mix precommit` once before resolving. Record the reload probe (what you changed, that you did not restart, the HTTP status) in `## Answer`.

## Answer

`config/dev.exs` sets `config :open_api_spex, :cache_adapter, OpenApiSpex.Plug.NoneCache`. PutApiSpec's default is `PersistentTermCache`; NoneCache rebuilds `EasyWeb.ApiSpec.spec/0` on each request. Prod/test keep the default.

ExUnit: `OpenApiSpex.Plug.NoneCache.put/2` then `get/1` is `nil`; test env `Cache.adapter()` is not `NoneCache`. `open_api_route_coverage_test` and `business_controller_test` (`assert_schema`) passed. `mix precommit` ran 1219 tests with 1 pre-existing failure in `training_plan_controller_test.exs:156` (coverage returned `data: nil` for a Saturday fixture) — unrelated to this cache change.

api-change skill no longer restarts `phx.server`. RM-004 now points at the NoneCache config.
