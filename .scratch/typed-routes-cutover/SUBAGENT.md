# Subagent prompt (paste verbatim, then fill RESOURCE)

Use composer-2.5. One resource per agent. Do not generate API files.

```
You are converting one HTTP resource from OpenApiSpex to EasyWeb.TypedRoute in easy-mono.

Read first:
- .scratch/typed-routes-cutover/spec.md (waves, name table, what you must not touch)
- docs/types-phoenix/add-a-route.md
- docs/types-phoenix/contract.md (four keys only: body, query, path, ok)
- backend/lib/easy_web/controllers/coaches/muscle_controller.ex (template)
- backend/lib/easy_web/types/training/muscle.ex (template)

RESOURCE: <fill: e.g. Equipment>
TYPE MODULE: <fill from the spec name table>
CONTROLLERS: <fill every controller file for this resource, coach and client>
JSON VIEWS: <fill the *_json.ex files you will delete>
HOOK FILES: <fill frontend/apps/*/src/api/*.ts that index this path>
TESTS: <fill the controller test files>

Do this:

1. Write the type module under EasyWeb.Types with use EasyWeb.Type. @type t is the read JSON (same keys as today’s JSON view / payload). create / update / list_query / extra action names as in add-a-route.md. Last segment MUST be the name in the spec table. Reuse EasyWeb.Types.Revision for expected_revision query/body. Same JSON to coach and client.

2. If every key on t is a struct field or a nested type that already formats, omit format/1. If a key is computed (nutrients, signed URLs, calories_per_100g), write format/1 that builds those keys. Nil list columns: `allergens: x.allergens || []` in format/1. NotLoaded raises; preload in the context if the view already expected the assoc. Do not generate types from the Ecto schema.

3. Convert EVERY listed controller in this resource. use EasyWeb.TypedRoute. Remove OpenApiSpex.ControllerSpecs, operation, CastAndValidate, tags. typed/2 per public action. ok(conn, %{data: ...}) or ok(conn) for 204. Read atom-key conn.body_params, string-key path/query. Delete the JSON view modules when nothing renders them. The file must not contain render, json, put_view, put_status, or send_resp (Health: rewrite to ok/2). Do not mix typed and operation in one file.

4. Tests go through the router. Assert status and JSON values. Drop OpenApiSpex.TestAssertions.assert_schema/3. Extra keys on a closed body or query are 422. Keep auth 403 tests.

5. In the hook file, export the named type from @/api/schema (export type {Equipment} from '@/api/schema'). Keep client.GET/PATCH paths. Do not edit schema.ts. Do not run just gen-api or mix typed_routes.gen.

6. mix format the Elixir you touched. mix test on the listed test files only. mix credo --strict on the listed Elixir files. Do not run the full suite.

Stop and report: paths you edited, remaining OpenAPI schema modules that only this resource used (parent will delete on generate if unreferenced), and whether format/1 was required.

Do not:
- Edit frontend/apps/*/src/api/schema.ts or frontend/openapi/
- Run just gen-api or mix typed_routes.gen
- Invent patch/1, Omit, encoding, as, or headers on typed
- Convert a second resource
- Touch AuthController or WebhookController unless RESOURCE is auth
- Change JSON field names or nullability vs the current view
```
