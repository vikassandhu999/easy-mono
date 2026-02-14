# API Contract Editing Rules

This file defines the required method to edit `docs/api_contract.yaml`.
Any agent or developer updating API contracts must follow these steps exactly.

## Scope

Apply this process whenever you:

- add/update/delete an endpoint,
- change request or response shapes,
- change enum values, nullable behavior, or validation constraints,
- add nested response data (preloads/associations),
- update UX/frontend behavior expectations in endpoint docs.

## Definition of success

An API contract change is complete only when all of the following are true:

1. Path-level definitions (`paths`) match controller behavior.
2. Component schemas match JSON renderers and changesets.
3. Endpoint descriptions explain UX role + frontend usage pattern.
4. Request/response examples are present and realistic.
5. YAML validates cleanly.
6. Relevant tests pass.

## Non-negotiable rules

1. Never change unrelated endpoints while editing a contract section.
2. Keep existing ordering/style in `api_contract.yaml`.
3. Keep `operationId` unique and stable; do not rename without reason.
4. Reuse shared responses (`Unauthorized`, `NotFound`, `UnprocessableEntity`) instead of inline duplicates.
5. Use `$ref` to component schemas for request/response bodies.
6. Quote URL and date/date-time literals in examples.
7. Keep examples tenant-safe and plausible for business-scoped APIs.

## Required path-level structure

For each changed operation under `paths` include:

- `summary`
- `description`
- `operationId`
- `security` (when auth-protected)
- `parameters` (path/query params as needed)
- `requestBody` (for POST/PATCH/PUT)
- `responses`

### Description requirements (frontend-aware)

Each endpoint `description` must include:

1. what role it plays in the UX flow,
2. when frontend should call it,
3. recommended client-state strategy (optimistic update, refetch, cache invalidation, etc.).

Descriptions must be actionable and implementation-oriented.

## Required requestBody rules

When an operation accepts a body:

1. Use schema `$ref` to `#/components/schemas/*Request`.
2. Add `examples.default.value` with a realistic payload.
3. Ensure example values satisfy schema constraints and backend validations.

## Required response rules

For success responses (`200`/`201`):

1. Use schema `$ref` to `#/components/schemas/*Response`.
2. Create endpoints must include at least one response example.
3. Response examples must reflect actual JSON renderer keys.

For common failures, include:

- `401` -> `#/components/responses/Unauthorized`
- `404` -> `#/components/responses/NotFound` (where applicable)
- `422` -> `#/components/responses/UnprocessableEntity` (for validation paths)

## Required component schema rules

When adding/changing schemas under `components.schemas`:

1. Keep field names/types aligned with controller JSON output.
2. Keep enums aligned with Ecto enum values.
3. Add `minimum`/`maximum` for numeric bounds present in validation logic.
4. Mark fields `nullable: true` when renderer may return `null`.
5. Keep `required` arrays accurate for fields guaranteed in output.

## Edit workflow (step-by-step)

1. Identify impacted endpoints and schemas from code changes.
2. Update `paths` operation blocks first.
3. Update/add component request/response schemas.
4. Add/update endpoint descriptions with UX + frontend guidance.
5. Add/update request and response examples.
6. Run YAML validation command.
7. Run relevant tests.
8. Review diff for unrelated contract churn.

## Validation checklist (must pass)

Run after every contract edit:

1. YAML syntax check:

```bash
ruby -e 'require "yaml"; YAML.load_file("docs/api_contract.yaml"); puts "ok"'
```

2. Execute relevant controller tests for changed endpoints.
3. If response schema changed, run tests that serialize/render those responses.

If any check fails, fix contract and/or code before marking complete.

## Training domain minimum standard

For training endpoints specifically, every operation must have:

- UX + frontend-focused `description`,
- request example (if request body exists),
- create response example for `201` endpoints,
- schema constraints matching backend rules (enum/nullable/min/max).
