# Cut over the workbench HTTP and OpenAPI contract

Type: task
Status: open
Blocked by: 11, 12, 13
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Expose the six explicit queue operations, strict reason schemas, canonical write commands, and regenerated frontend types as one breaking prototype cutover.

## Locked contract

* Keep `GET /v1/coach/workbench` with the accepted nested Programming counts.
* Add the six `GET /v1/coach/workbench/queues/...` operations from [Define the coordinated schema and API cutover](./06-define-coordinated-schema-api-cutover.md). Each returns `{data, count}`, accepts standard `offset` and `limit`, and has fixed server ordering. Programming alone accepts `service`, defaulting to `all`.
* Add the strict, closed, discriminator-based reason schemas and queue-specific item envelopes. Reject unknown properties and require non-empty reasons.
* Add response-only `joined_at`, canonical `required_services`, `waiting_since`, Invite/update required-service inputs, and the `service_type` template/submission shapes.
* Add `POST /v1/coach/conversations/:id/mark-handled` with `expected_last_message_at`; map success to 204, stale state to 409, and invisible rows to 404.
* Add `POST /v1/coach/form-assignments/:id/remind` as the no-body Intake reminder command; return 204 without changing assignment status or queue membership.
* Remove client-list queue filters and `waiting=true`; remove queue-only fields from the generic Client response. Keep `expiring_soon` as the roster fact and `last_message_role` as history.
* Update JSON views with their OpenApiSpex schemas in the same change, then regenerate both frontend clients with `just gen-api`.

## Edit surface

* `backend/lib/easy_web/router.ex`
* Coach Workbench, Conversation, Client, and Form Assignment controllers and JSON views
* `backend/lib/easy_web/open_api/schemas/`
* Controller and OpenAPI tests under `backend/test/easy_web/`
* Generated `frontend/openapi/*.json` and both apps' `src/api/schema.ts`

## Acceptance

* Generated OpenAPI contains the six queue paths and both commands, and contains none of the retired queue query parameters or generic Client queue fields.
* Schema/view parity tests cover every new envelope and reason variant.
* Both generated clients are produced only through `just gen-api`; neither schema file is hand-edited.
* This is intentionally a coordinated feature-branch cutover. Do not publish this ticket alone while downstream app tickets remain unresolved.

## Verification

Run focused controller/OpenAPI tests, `just gen-api`, and `mix precommit` from `backend/`. Record any expected downstream TypeScript failures for the app tickets rather than adding compatibility fields.
