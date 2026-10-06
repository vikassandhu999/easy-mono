# Slice 2 shared plan foundation

The shared plan implementation is under `Easy.Plans`. The training API keeps its existing JSON shape and behavior. No compatibility modules remain under `Easy.Training`.

## Changes

- Added `backend/lib/easy/plans/{template,plan,revision,programming,reader,domain}.ex`. Removed the old Training plan schemas and the Training programming and reader modules.
- Shared programming owns template create, copy and delete; assignment; revision publish and withdraw; archive and restore; future-only date changes; edit checks; and client locking.
- The domain registry selects `Easy.Training.Content` or `Easy.Nutrition.Content`. Shared writes validate and resolve content through that module. Training content adds its summary and coverage callbacks.
- All shared read and write queries take an explicit domain. The overlap query now filters by domain when it reads `plans`. Training and Nutrition can therefore cover the same client date.
- Updated training controllers, execution, history, client plan names, schemas, test factories and tests to use the shared modules. Revision lookup now requires a Ctx and domain and scopes its plan join by business.
- Updated shared schema references in the old prototype development scripts. Those scripts already reference relational Training modules removed in slice 1; they were not rewritten or run.

## API

`Easy.Plans.Programming`:

- `create_template(ctx, domain, attrs)`
- `duplicate_template(ctx, domain, id)`
- `assign_template_to_client(ctx, client_id, domain, template_id, attrs)`
- `update_plan(ctx, domain, id, expected_revision, attrs)`
- `withdraw_revision(ctx, domain, id, revision_id, expected_revision)`
- `archive_plan(ctx, domain, id, expected_revision)`
- `restore_plan(ctx, domain, id, expected_revision)`
- `delete_plan(ctx, domain, id, expected_revision)` (templates only)

`Easy.Plans.Reader`:

- `get_template(ctx, domain, id)` and `get_plan(ctx, domain, id)`
- `get_client_plan(ctx, domain, id)`
- `list_template_page(ctx, domain, opts \\ [])`
- `list_plan_page_for_client(ctx, client_id, domain, opts \\ [])`
- `list_client_plan_page(ctx, domain, opts \\ [])`
- `resolve_client_coverage(ctx, domain, date)`
- `current_plan_names_for_clients(ctx, domain, dates_by_client_id)`
- `revision_on(ctx, domain, plan_id, date)` returns a revision row or nil; validates tenant, domain and actor access.
- `local_date(ctx, date)`, `present(ctx, row, date \\ nil)` and `revision_value(row)` retain the existing shared transformations.

Schema changesets take `(business_id, coach_id, domain, attrs)`. Schema query `for_business(query \\ __MODULE__, business_id, domain)` always scopes business and domain together.

Domain callbacks:

- `empty() :: map()`
- `validate(ctx, content) :: {:ok, resolved_content} | {:error, reason}`
- `summary(content) :: map()` merged into plan output.
- `coverage(content) :: map()` merged into `%{date: date, plan: plan}`.

## Choices

- Domain is an explicit trusted argument, never an editable field or a default on shared schemas.
- Client-target operations keep client id second, in line with the backend contract. Other operations put domain second.
- Registry callbacks supply the few domain-specific read fields without adding domain branches to shared plan reads. Training supplies `workout_count` and `workouts`.
- Existing assignment, publication and archive semantics are preserved. Each domain resolver copies library values during the shared validation step.

## Verification

`rtk mix test test/easy/training test/easy/plans_test.exs test/easy_web/controllers/core_training_test.exs test/easy/coaching_access_test.exs test/easy/pagination_contract_test.exs test/easy/plan_coverage_concurrency_test.exs` passed: **49 tests, zero failures**.

The new shared tests cover domain isolation for reads, lists, mutations, assignment and withdrawal; tenant-scoped revision lookup; concurrent assignment behavior through the existing test; and independent Training and Nutrition coverage on the same date.

Scoped `rtk mix format` passed. `rtk mix compile` passed with warnings only for the Nutrition content callbacks, which had not yet been implemented at this checkpoint. Full slice verification remains with the root integration task.

Full Credo at the extraction checkpoint reports work in the Nutrition implementation and the journal alias order. Shared plan and training warnings were corrected.
