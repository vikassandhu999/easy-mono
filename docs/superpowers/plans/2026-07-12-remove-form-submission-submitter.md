# Remove Form Submission Submitter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unused `submitted_by_type` and `submitted_by_id` form-submission provenance because every supported form submission is authored by the authenticated client already identified by `client_id`.

**Architecture:** Keep `form_submissions.client_id` as the single client identity and retain the existing client-context authorization plus assignment/client/business composite foreign key. Delete the speculative polymorphic actor fields from Postgres, Ecto, JSON responses, and OpenAPI; regenerate frontend API clients rather than editing generated files.

**Tech Stack:** Elixir, Phoenix, Ecto/PostgreSQL, OpenApiSpex, TypeScript RTK Query code generation

## Global Constraints

- Do not add a replacement actor abstraction or a new dependency.
- Preserve the existing `submit_client_form_assignment/3` authorization and the composite assignment/client/business foreign key.
- Treat migration `20260703000100_create_client_profiles_forms_and_weight_entries.exs` as applied history; remove the columns in a new migration.
- Preserve unrelated worktree changes, especially the existing edits in `backend/test/support/factory.ex`.
- Regenerate `frontend/openapi/easy-openapi.json` and both generated TypeScript clients with `just gen-api`; never hand-edit generated artifacts.
- `backend/AGENTS.md` is authoritative; finish with `mix precommit` from `backend/`.

---

### Task 1: Remove redundant form-submission actor provenance end to end

**Files:**
- Create: `backend/priv/repo/migrations/20260712130000_drop_form_submission_submitter.exs`
- Modify: `backend/lib/easy/forms/form_submission.ex:16-60`
- Modify: `backend/lib/easy/forms.ex:354-362`
- Modify: `backend/test/support/factory.ex:180-194`
- Modify: `backend/test/easy/forms_test.exs:123-142`
- Modify: `backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs:68-87`
- Modify: `backend/lib/easy_web/controllers/clients/form_assignment_json.ex:41-53`
- Modify: `backend/lib/easy_web/controllers/coaches/form_assignment_json.ex:46-59`
- Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex:1-10,455-490,511-555`
- Regenerate: `frontend/openapi/easy-openapi.json`
- Regenerate: `frontend/apps/coachapp-v2/src/api/generated.ts`
- Regenerate: `frontend/apps/clientapp-v2/src/api/generated.ts`

**Interfaces:**
- Consumes: `Forms.submit_client_form_assignment(%Ctx{}, assignment_id, attrs)` and the existing client/assignment tenant checks.
- Produces: `FormSubmission.insert_changeset(business_id, client_id, form_assignment_id, attrs)` with no submitter arguments; submission JSON and generated API types with no `submitted_by_type` property.

- [ ] **Step 1: Add the API regression assertion**

In `backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs`, extend the successful submission test immediately after its existing response assertions:

```elixir
assert %{"data" => data} = json_response(conn, 201)
assert data["answers"]["meal_prep_ability"] == "high"
assert data["form_assignment_id"] == assignment.id
refute Map.has_key?(data, "submitted_by_type")
assert Repo.get!(FormAssignment, assignment.id).status == :completed
```

- [ ] **Step 2: Run the focused test and confirm the obsolete response field is exposed**

Run:

```bash
cd backend && mix test test/easy_web/controllers/clients/form_assignment_controller_test.exs:69
```

Expected: FAIL at `refute Map.has_key?(data, "submitted_by_type")`.

- [ ] **Step 3: Add the forward-only database migration**

Create `backend/priv/repo/migrations/20260712130000_drop_form_submission_submitter.exs`:

```elixir
defmodule Easy.Repo.Migrations.DropFormSubmissionSubmitter do
  use Ecto.Migration

  def up do
    drop constraint(:form_submissions, :form_submissions_submitted_by_type_check)

    alter table(:form_submissions) do
      remove :submitted_by_type
      remove :submitted_by_id
    end
  end

  def down do
    raise "irreversible: form submissions are client-authored; submitter columns were redundant"
  end
end
```

Do not amend the original table-creation migration: it may already be deployed, and changing it would not update existing databases.

- [ ] **Step 4: Simplify the Ecto schema and changeset**

In `backend/lib/easy/forms/form_submission.ex`, delete `@actors`, both `submitted_by_*` fields, both submitter parameters, both `put_change/3` calls, the `submitted_by_type` required entry, and its check-constraint declaration. The resulting constructor must be:

```elixir
@spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
def insert_changeset(business_id, client_id, form_assignment_id, attrs) do
  %__MODULE__{}
  |> cast(attrs, [:question_snapshot, :answers, :submitted_at])
  |> put_change(:business_id, business_id)
  |> put_change(:client_id, client_id)
  |> put_change(:form_assignment_id, form_assignment_id)
  |> validate_required([
    :business_id,
    :client_id,
    :form_assignment_id,
    :question_snapshot,
    :answers,
    :submitted_at
  ])
  |> foreign_key_constraint(:business_id)
  |> foreign_key_constraint(:client_id, name: :form_submissions_client_business_id_fkey)
  |> foreign_key_constraint(:form_assignment_id,
    name: :form_submissions_assignment_client_business_id_fkey
  )
end
```

- [ ] **Step 5: Update the only production caller and test data**

In `backend/lib/easy/forms.ex`, keep the resolved client identity and call the shortened changeset:

```elixir
case FormSubmission.insert_changeset(business_id, client_id, assignment_id, attrs)
     |> Repo.insert() do
  {:ok, submission} -> submission
  {:error, reason} -> Repo.rollback(reason)
end
```

In `backend/test/easy/forms_test.exs`, update the composite-foreign-key test without weakening it:

```elixir
assert {:error, changeset} =
         FormSubmission.insert_changeset(business.id, submitting_client.id, assignment.id, attrs)
         |> Repo.insert()
```

In `backend/test/support/factory.ex`, remove only these two keys from `form_submission_factory/0`, preserving all unrelated in-progress edits:

```elixir
submitted_by_type: "client",
submitted_by_id: assignment.client_id,
```

- [ ] **Step 6: Remove submitter provenance from both JSON renderers**

Delete the following entry from both `submission_data/1` maps:

```elixir
submitted_by_type: submission.submitted_by_type,
```

The client and coach responses must continue returning IDs, snapshots, answers, submission/review timestamps, attachments, and insertion time unchanged.

- [ ] **Step 7: Remove the field from the OpenAPI contract**

In `backend/lib/easy_web/open_api/schemas/client_profile.ex`:

1. Delete `Common.submitted_by_types/0`.
2. Delete `submitted_by_type` from `ClientProfileFormSubmission.properties` and `.required`.
3. Delete `submitted_by_type` from `ClientProfileReviewQueueItem.properties` and `.required`.

Do not rename the existing `ClientProfile*` schema modules in this cleanup; that is unrelated naming debt.

- [ ] **Step 8: Run focused backend tests**

Run:

```bash
cd backend && mix test \
  test/easy/forms_test.exs \
  test/easy_web/controllers/clients/form_assignment_controller_test.exs \
  test/easy_web/controllers/coaches/check_in_review_controller_test.exs
```

Expected: all tests PASS. This verifies client ownership, cross-client rejection, submission serialization, review-queue serialization, and OpenAPI response conformance.

- [ ] **Step 9: Regenerate the OpenAPI document and both frontend clients**

From the repository root, run:

```bash
just gen-api
```

Expected generated diff:

- `submitted_by_type` disappears from the two submission schemas in `frontend/openapi/easy-openapi.json`.
- `submitted_by_type: 'coach' | 'client' | 'system'` disappears from the reachable submission interfaces in both generated TypeScript files.
- No unrelated endpoint or type changes appear.

If the command exits nonzero only because Biome reports known generated-file warnings, inspect the generated diff and run the verification commands below; do not hand-edit generated code.

- [ ] **Step 10: Verify no live submitter references remain**

Run:

```bash
rg -n "submitted_by_type|submitted_by_id|submitted_by_types" \
  backend/lib backend/test frontend/openapi/easy-openapi.json \
  frontend/apps/coachapp-v2/src/api/generated.ts \
  frontend/apps/clientapp-v2/src/api/generated.ts
```

Expected: no matches. Historical design documents may still describe the superseded schema and are not executable references.

- [ ] **Step 11: Run repository gates**

Run:

```bash
cd backend && mix precommit
cd ../frontend && pnpm exec biome check apps/coachapp-v2/src/api/generated.ts apps/clientapp-v2/src/api/generated.ts
cd .. && ./scripts/check-rm.sh
```

Expected: `mix precommit` and recurring-mistakes checks PASS. Biome may report the repository's known generated-file warnings; it must not introduce a new error related to this change.

- [ ] **Step 12: Review and commit only this cleanup**

Run:

```bash
git diff --no-index /dev/null \
  backend/priv/repo/migrations/20260712130000_drop_form_submission_submitter.exs || true
git diff -- \
  backend/lib/easy/forms/form_submission.ex \
  backend/lib/easy/forms.ex \
  backend/test/support/factory.ex \
  backend/test/easy/forms_test.exs \
  backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs \
  backend/lib/easy_web/controllers/clients/form_assignment_json.ex \
  backend/lib/easy_web/controllers/coaches/form_assignment_json.ex \
  backend/lib/easy_web/open_api/schemas/client_profile.ex \
  frontend/openapi/easy-openapi.json \
  frontend/apps/coachapp-v2/src/api/generated.ts \
  frontend/apps/clientapp-v2/src/api/generated.ts
```

Confirm the diff contains only actor-provenance deletion and generated consequences. Because the worktree has unrelated changes, stage only the intended hunks/files, then commit:

```bash
git add \
  docs/superpowers/plans/2026-07-12-remove-form-submission-submitter.md \
  backend/priv/repo/migrations/20260712130000_drop_form_submission_submitter.exs \
  backend/lib/easy/forms/form_submission.ex \
  backend/lib/easy/forms.ex \
  backend/test/easy/forms_test.exs \
  backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs \
  backend/lib/easy_web/controllers/clients/form_assignment_json.ex \
  backend/lib/easy_web/controllers/coaches/form_assignment_json.ex \
  backend/lib/easy_web/open_api/schemas/client_profile.ex \
  frontend/openapi/easy-openapi.json \
  frontend/apps/coachapp-v2/src/api/generated.ts \
  frontend/apps/clientapp-v2/src/api/generated.ts
git add -p backend/test/support/factory.ex
git commit -m "refactor(forms): remove redundant submission actor"
```

Expected: one focused commit; unrelated rich-chat and UI work remains unstaged and untouched.
