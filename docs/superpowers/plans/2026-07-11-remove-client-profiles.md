# Remove Client Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the entire client-profile layer (JSON section maps, custom profile-field system, profile endpoints) so intake answers live only in the `FormSubmission`, then rename `Easy.ClientProfiles` → `Easy.Forms`.

**Architecture:** Three slices, each landing green: (1) coachapp stops using every profile surface while the backend still serves them; (2) backend deletes the profile system, drops three tables in one migration, regenerates both API clients; (3) mechanical context rename plus superseded-by notes in the two older spec docs. Spec: `docs/superpowers/specs/2026-07-11-remove-client-profiles-design.md`.

**Tech Stack:** Elixir/Phoenix/Ecto + OpenApiSpex (backend), React 19/Vite/RTK Query (coachapp), `just gen-api` codegen bridge.

## Global Constraints

- Backend: follow `backend/AGENTS.md`; run `mix precommit` (format, compile --warnings-as-errors, credo, test) before finishing any backend task.
- Frontend: `pnpm -C apps/coachapp-v2 build` must pass; `just lint` runs Biome with `--write` (review its changes) plus `scripts/check-rm.sh`.
- Never hand-edit `src/api/generated.ts` in either app — regenerate with `just gen-api`.
- Invariants that must survive (spec §Invariants): invite auto-assigns curated intake (once per business); intake submission completes the assignment; weight answers append `weight_entries` rows; roster `intake_incomplete` flag (FormAssignment-derived) unchanged; check-in scheduling/review/ratings/photos untouched.
- The clientapp is untouched at runtime (it only uses `/v1/client/me`); it is only rebuilt after client regeneration.
- All paths below are relative to the repo root `easy-mono/`.

---

### Task 1: Coachapp — remove profile UI surfaces

The coach app stops referencing every profile surface. Backend untouched; the app must build and run against the current API for the whole task.

**Files:**
- Delete: `frontend/apps/coachapp-v2/src/settings/profile-fields.tsx`
- Delete: `frontend/apps/coachapp-v2/src/clients/client-profile.tsx`
- Delete: `frontend/apps/coachapp-v2/src/clients/components/profile-field-input.tsx`
- Delete: `frontend/apps/coachapp-v2/src/api/client-profile.ts`
- Modify: `frontend/apps/coachapp-v2/src/router.tsx`
- Modify: `frontend/apps/coachapp-v2/src/@config/routes.ts`
- Modify: `frontend/apps/coachapp-v2/src/clients/components/client-detail-card.tsx`
- Modify: `frontend/apps/coachapp-v2/src/checkins/checkin-builder.tsx`
- Modify: `frontend/apps/coachapp-v2/src/api/checkins.ts`

**Interfaces:**
- Consumes: nothing from other tasks (frontier task).
- Produces: a coachapp with zero imports of `@/api/client-profile` — the precondition Task 2 relies on before deleting the endpoints and regenerating clients. `QuestionDraft` loses its `fieldKey` field; `draftToRequest` never emits `profile_mapping`.

- [ ] **Step 1: Delete the four dead files**

```bash
cd frontend
git rm apps/coachapp-v2/src/settings/profile-fields.tsx \
       apps/coachapp-v2/src/clients/client-profile.tsx \
       apps/coachapp-v2/src/clients/components/profile-field-input.tsx \
       apps/coachapp-v2/src/api/client-profile.ts
```

- [ ] **Step 2: Remove routes and constants**

In `apps/coachapp-v2/src/router.tsx` remove both the imports and the route entries:

```tsx
// DELETE these two imports:
import ClientProfilePage from '@/clients/client-profile';
import ProfileFields from '@/settings/profile-fields';

// DELETE these two route entries:
{path: ROUTES.CLIENT_PROFILE, Component: ClientProfilePage},
{path: ROUTES.SETTINGS_PROFILE_FIELDS, Component: ProfileFields},
```

In `apps/coachapp-v2/src/@config/routes.ts` delete both constants:

```ts
// DELETE:
CLIENT_PROFILE: '/clients/:id/profile',
SETTINGS_PROFILE_FIELDS: '/settings/client-profile-fields',
```

- [ ] **Step 3: Strip the Detail card down to membership rows**

In `apps/coachapp-v2/src/clients/components/client-detail-card.tsx`:

1. Delete the `@/api/client-profile` import block, the `Pencil` import, the `Link` import, and the `ROUTES` import (none are used after this step).
2. Delete `formatProfileValue` and `profileRows` helpers.
3. In `ClientDetailCard`, delete `profileQuery`/`fieldsQuery` and derive nothing from them; delete the "Personal" section and the header's Edit `<Link>`. Keep `FieldItem` and `membershipRows`. The component becomes:

```tsx
export default function ClientDetailCard({client}: {client: Client}) {
  const membership = membershipRows(client);

  return (
    <section className="rounded-3xl border-[1.5px] border-separator bg-surface p-5">
      <div className="mb-5">
        <h2 className="font-grotesk text-xl font-bold">Detail</h2>
        <Typography
          className="mt-1"
          color="muted"
          type="body-sm"
        >
          Goals &amp; membership
        </Typography>
      </div>

      <div>
        <Typography
          className="mb-3 uppercase tracking-wider text-accent"
          type="body-xs"
          weight="bold"
        >
          Membership
        </Typography>
        <div className="overflow-hidden rounded-[14px] border-[1.5px] border-separator bg-surface lg:rounded-[18px]">
          {membership.map((row) => (
            <FieldItem
              key={row.id}
              label={row.label}
              value={row.value}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
```

(The `Skeleton` import and the loading/error branches go too — with no queries there is nothing to wait on.)

- [ ] **Step 4: Remove the mapping dropdown from the check-in builder**

In `apps/coachapp-v2/src/checkins/checkin-builder.tsx`:

1. Delete the import `import {type ProfileFieldType, useListProfileFieldsQuery} from '@/api/client-profile';`.
2. Delete the `ProfileFieldOption` interface.
3. Remove the `profileFields` prop from `QuestionEditor` and `SectionEditor` (props type + destructuring + every call site that threads it).
4. In `QuestionEditor`, delete `const compatibleProfileFields = …` and the entire `{compatibleProfileFields.length > 0 ? ( <Select …>Save answer to profile field…</Select> ) : null}` block. Delete the now-unused `NONE` constant if nothing else references it.
5. In the builder component, delete `const {data: fieldsData} = useListProfileFieldsQuery();` and the `profileFields` mapping built from it.

- [ ] **Step 5: Remove `fieldKey`/`profile_mapping` from the draft mappers**

In `apps/coachapp-v2/src/api/checkins.ts`:

1. In the header comment, delete the sentence "A check-in template's question types are the same six as profile fields, so we reuse ProfileFieldType / FIELD_TYPE_LABELS from client-profile.ts."
2. In `QuestionDraft`, delete the line `fieldKey: null | string; // custom-field profile mapping (ProfileField.key) or null`.
3. In `newQuestion()`, drop `fieldKey: null,` from the returned object.
4. In `templateToDraft`, delete the two mapping lines so the question mapper reads:

```ts
questions: (Array.isArray(section.questions) ? section.questions : []).map((q: Record<string, unknown>) => {
  return {
    id: typeof q.id === 'string' ? q.id : '',
    key: uid(),
    label: typeof q.label === 'string' ? q.label : '',
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    required: q.required === true,
    type: (q.type as FormQuestionType) ?? 'text',
  };
}),
```

5. In `draftToRequest`, delete:

```ts
if (q.fieldKey) {
  question.profile_mapping = {field_key: q.fieldKey, kind: 'custom_field'};
}
```

- [ ] **Step 6: Sweep for stragglers**

```bash
grep -rn "client-profile\|ProfileField\|profile-fields\|CLIENT_PROFILE\|SETTINGS_PROFILE_FIELDS\|fieldKey\|profile_mapping" apps/coachapp-v2/src --include="*.ts" --include="*.tsx" | grep -v generated.ts
```

Expected: no output. (`generated.ts` still mentions profile endpoints until Task 2 regenerates it — that is fine; nothing imports them.)

- [ ] **Step 7: Build and lint**

```bash
pnpm -C apps/coachapp-v2 build
cd .. && just lint
```

Expected: both exit 0. Review any Biome writes.

- [ ] **Step 8: Browser-verify client detail and the builder**

Run `just web` (coachapp on port 2021, dev OTP is 123456). At 375px and desktop width verify:
- A client detail page shows the Membership card (no "Personal"/profile rows, no Edit link) and the check-ins card lists the "Intake" assignment with its latest submission answers.
- Check-in builder create/edit works with no "Save answer to profile field" select.
- `/settings/client-profile-fields` and `/clients/<id>/profile` no longer resolve.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(coachapp): remove profile UI surfaces; intake reads from check-ins card"
```

---

### Task 2: Backend — delete profile system, drop tables, regen API clients

**Files:**
- Delete: `backend/lib/easy/client_profiles/client_profile.ex`
- Delete: `backend/lib/easy/client_profiles/profile_field_definition.ex`
- Delete: `backend/lib/easy/client_profiles/profile_field_value.ex`
- Delete: `backend/lib/easy_web/controllers/coaches/client_profile_controller.ex` and `client_profile_json.ex`
- Delete: `backend/lib/easy_web/controllers/coaches/profile_field_controller.ex` and `profile_field_json.ex`
- Delete: `backend/lib/easy_web/controllers/clients/client_profile_controller.ex` and `client_profile_json.ex`
- Delete: `backend/test/easy_web/controllers/coaches/client_profile_controller_test.exs`, `backend/test/easy_web/controllers/coaches/profile_field_controller_test.exs`, `backend/test/easy_web/controllers/clients/client_profile_controller_test.exs`
- Create: `backend/priv/repo/migrations/<timestamp>_drop_client_profile_tables.exs`
- Modify: `backend/lib/easy/client_profiles.ex`, `backend/lib/easy/client_profiles/form_template.ex`, `backend/lib/easy/default_intake.ex`, `backend/lib/easy/clients.ex`, `backend/lib/easy_web/router.ex`, `backend/lib/easy_web/controllers/coaches/client_controller.ex`, `backend/lib/easy_web/open_api/schemas/client_profile.ex`, `backend/test/easy/client_profiles_test.exs`, `backend/test/support/factory.ex`
- Regenerate: `frontend/apps/coachapp-v2/src/api/generated.ts`, `frontend/apps/clientapp-v2/src/api/generated.ts` (via `just gen-api`, never by hand)

**Interfaces:**
- Consumes: Task 1's guarantee that no coachapp code imports the profile endpoints or emits `profile_mapping`.
- Produces: `Easy.ClientProfiles.submit_client_form_assignment/3` with error union `:not_found | :invalid_answers | :answers_required | :unknown_answer_keys | :missing_required_answers | :invalid_answer_values | :assignment_not_submittable | Ecto.Changeset.t()` (no `:invalid_profile_mapping`); `Easy.Clients.list_clients/2` returning plain `{:ok, %{clients: …, count: …, summary: …}}` with no `:profile_filter` opt and no `:invalid_profile_filter` error; `DefaultIntake.sections/0` questions without `profile_mapping` keys. Task 3 renames these modules but must not change these signatures.

- [ ] **Step 1: Delete schema files, controllers, views, and their tests**

```bash
cd backend
git rm lib/easy/client_profiles/client_profile.ex \
       lib/easy/client_profiles/profile_field_definition.ex \
       lib/easy/client_profiles/profile_field_value.ex \
       lib/easy_web/controllers/coaches/client_profile_controller.ex \
       lib/easy_web/controllers/coaches/client_profile_json.ex \
       lib/easy_web/controllers/coaches/profile_field_controller.ex \
       lib/easy_web/controllers/coaches/profile_field_json.ex \
       lib/easy_web/controllers/clients/client_profile_controller.ex \
       lib/easy_web/controllers/clients/client_profile_json.ex \
       test/easy_web/controllers/coaches/client_profile_controller_test.exs \
       test/easy_web/controllers/coaches/profile_field_controller_test.exs \
       test/easy_web/controllers/clients/client_profile_controller_test.exs
```

- [ ] **Step 2: Remove the eight routes**

In `backend/lib/easy_web/router.ex`, coach scope — delete:

```elixir
get "/clients/:client_id/profile", ClientProfileController, :show
patch "/clients/:client_id/profile", ClientProfileController, :update

get "/profile-fields", ProfileFieldController, :index
post "/profile-fields", ProfileFieldController, :create
patch "/profile-fields/:id", ProfileFieldController, :update
delete "/profile-fields/:id", ProfileFieldController, :delete
```

Client scope (`/v1/client`) — delete:

```elixir
get "/profile", ClientProfileController, :show
patch "/profile", ClientProfileController, :update
```

- [ ] **Step 3: Gut the profile surface of `Easy.ClientProfiles`**

In `backend/lib/easy/client_profiles.ex`:

1. Delete aliases `ClientProfile`, `ProfileFieldDefinition`, `ProfileFieldValue`.
2. Delete these functions entirely: `get_or_create_client_profile/1`, `get_or_create_profile/2`, `insert_profile/2`, `fetch_profile/2`, `update_profile/3`, `get_or_create_profile_for_client/2`, `update_profile_for_client/3`, `update_client_profile_sections/2` (and the Case-2-wrapper comment above them), `list_profile_fields/1`, `create_profile_field/2`, `update_profile_field/3`, `archive_profile_field/2`, `upsert_profile_field_value/5`, `get_profile_field/2`, `get_profile_field_by_key/2`, `apply_profile_mappings!/5`, `apply_section_mappings!/5` (both clauses), `apply_question_mapping!/5` (both clauses), `apply_profile_mapping!/5` (all three clauses, incl. the defensive-template comment above them), `core_profile_section/1` (all clauses), `safe_actor_atom/1` (all clauses), `invalid_profile_mapping_error/0`, `maybe_sync_intake!/4` (both clauses), `sync_intake_completed!/3`, `sync_intake_status!/2` (both clauses).
3. `submit_assignment!/4` loses its mapping line:

```elixir
defp submit_assignment!(ctx, client, assignment, answers) do
  template = assignment.form_template
  submitted_at = DateTime.utc_now(:second)

  attrs = %{
    "question_snapshot" => template.sections,
    "answers" => answers,
    "submitted_at" => submitted_at
  }

  submission = insert_submission!(ctx.business_id, client.id, assignment.id, attrs)
  append_weight_entries!(ctx.business_id, client, template.sections, answers, submission)
  complete_assignment!(assignment, submission)
end
```

4. `complete_assignment!` loses the sync call (and its now-unused args):

```elixir
defp complete_assignment!(assignment, submission) do
  case assignment |> FormAssignment.complete_changeset(submission.submitted_at) |> Repo.update() do
    {:ok, _assignment} -> submission
    {:error, reason} -> Repo.rollback(reason)
  end
end
```

5. `update_form_assignment_transaction/3` loses the sync call; `ctx` becomes unused, so drop it from the private fn and its caller:

```elixir
def update_form_assignment(%Ctx{} = ctx, assignment_id, attrs) do
  with {:ok, assignment} <- get_form_assignment(ctx.business_id, assignment_id),
       :ok <- Clients.authorize_client_id(ctx, assignment.client_id) do
    Repo.transaction(fn -> update_form_assignment_transaction(assignment, attrs) end)
  end
end

defp update_form_assignment_transaction(assignment, attrs) do
  case assignment |> FormAssignment.update_changeset(attrs) |> Repo.update() do
    {:ok, updated} -> updated
    {:error, changeset} -> Repo.rollback(changeset)
  end
end
```

6. In the `@spec` of `submit_client_form_assignment/3`, remove `| :invalid_profile_mapping` from the error union.

- [ ] **Step 4: Remove mapping validation from `FormTemplate` and mapping keys from `DefaultIntake`**

In `backend/lib/easy/client_profiles/form_template.ex`: delete `@core_sections`, `valid_question_mapping?/1`, and all `valid_mapping?/1` clauses; drop `valid_question_mapping?(question)` from the `valid_question?/1` conjunction; trim the mention of `profile_mapping` from the comment above `validate_sections/1`.

In `backend/lib/easy/default_intake.ex`: delete every `"profile_mapping" => %{…}` entry (and the trailing comma on the preceding line where needed). Questions keep `id`, `label`, `type`, `required`, `options`.

- [ ] **Step 5: Remove the dead profile filters from `Easy.Clients` and its controller**

In `backend/lib/easy/clients.ex`:

1. Delete `@profile_filter_sections`, `normalize_profile_filter/1` (both clauses), `normalize_profile_section/2` (all clauses), `normalize_filter_fields/3`, `filter_values/1`, `invalid_profile_filter/0`, `apply_profile_filters/3`, the `for section <- @profile_filter_sections` comprehension defining `apply_core_profile_filter/5`, and `apply_custom_profile_filter/4`. (Verify `filter_values/1` has no other caller before deleting; it is part of the normalize chain.)
2. `list_clients/2` drops the filter plumbing:

```elixir
@spec list_clients(Ctx.t(), keyword()) ::
        {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
def list_clients(%Ctx{} = ctx, opts \\ []) do
  search = Keyword.get(opts, :search, "")
  status = Keyword.get(opts, :status)
  stage = Keyword.get(opts, :stage)
  offset = max(Keyword.get(opts, :offset, 0), 0)
  limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

  base =
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> Client.search(search)
    |> Client.for_status(status)
    |> Client.for_stage(stage)

  ...keep the existing count/list/summary body unchanged, unwrapped from the `with`...
end
```

In `backend/lib/easy_web/controllers/coaches/client_controller.ex`: delete the whole `Operation.parameter(:profile_filter, …)` block from the `:index` operation and the `profile_filter: Map.get(params, "profile_filter", %{})` line from `index/2`'s opts.

- [ ] **Step 6: Delete the profile OpenApi schemas**

In `backend/lib/easy_web/open_api/schemas/client_profile.ex`:

1. Delete these modules: `CoachingClientProfileRequest`, `ClientCoachingProfileUpdateRequest`, `ClientProfileFieldRequest`, `ClientProfileFieldUpdateRequest`, `ClientProfileField`, `ClientProfileFieldResponse`, `ClientProfileFieldListResponse`, `CoachingClientProfile`, `ClientCoachingProfile`, `CoachingClientProfileResponse`, `ClientCoachingProfileResponse`.
2. In `ClientProfile.Common`: delete the `profile_mapping:` property from `question_schema/0`; delete `section_schema/0`, `section_properties/0`, and `sections/0` if the compiler confirms nothing still references them; **keep** `field_types/0` (feeds `question_types/0`).
3. Do NOT rename the surviving `ClientProfileFormTemplate*` / `ClientProfileFormAssignment*` / etc. schema titles — out of scope (spec §Out of scope).

- [ ] **Step 7: Write the drop migration**

Create `backend/priv/repo/migrations/<now-timestamp>_drop_client_profile_tables.exs` (use `date +%Y%m%d%H%M%S` for the timestamp — later than `20260711151000`):

```elixir
defmodule Easy.Repo.Migrations.DropClientProfileTables do
  use Ecto.Migration

  def up do
    drop table(:profile_field_values)
    drop table(:profile_field_definitions)
    drop table(:client_profiles)
  end

  def down do
    raise "irreversible: client profiles removed, see docs/superpowers/specs/2026-07-11-remove-client-profiles-design.md"
  end
end
```

(FK order: values reference definitions and clients; definitions and profiles reference business.)

Run: `mix ecto.migrate` — expected: three `drop table` lines, exit 0.

- [ ] **Step 8: Prune tests and factories**

In `backend/test/support/factory.ex`: delete `client_profile_factory/0`, `profile_field_definition_factory/0`, `profile_field_value_factory/0`, and any `"profile_mapping" => …` entries inside form-template factories/params.

In `backend/test/easy/client_profiles_test.exs`:
- Delete the `describe "client profile schemas"` block and every test that exercises profile CRUD, profile-field CRUD, value upserts, core/custom mappings, or `intake_status` sync (`describe "intake submission completes intake_status"` and `describe "update_form_assignment/3 intake sync"` — replace both with assertions on the FormAssignment only).
- Add/keep this shape for the submission path (adapt names to the existing factory helpers in the file):

```elixir
test "submitting intake completes the assignment and applies no side effects beyond weight" do
  # setup: business + client + intake assignment via assign_default_intake_to_client
  {:ok, submission} = ClientProfiles.submit_client_form_assignment(client_ctx, assignment.id, %{answers: answers})

  assignment = Repo.get!(FormAssignment, assignment.id)
  assert assignment.status == :completed
  assert assignment.completed_at == submission.submitted_at
end
```

- Keep (they must still pass unchanged): `assign_default_intake_to_client/2` (once-per-business get-or-create), default weekly check-in, weight-entry side effect, check-in schedule generation, review loop, `validate_answers/2`, visibility, and the tenant-guard block minus its profile-function entries.
- In the tenant-isolation describe, delete entries for the removed profile functions.

In `backend/test/easy/clients_test.exs` (and the client controller test): delete any `profile_filter` test cases.

- [ ] **Step 9: Full backend verify**

```bash
mix precommit
```

Expected: format/compile/credo/test all green, zero warnings. If `compile --warnings-as-errors` flags an unused alias or function left behind by Steps 3–6, delete it — that is the sweep working.

Also confirm the contract shrank:

```bash
grep -rn "profile" lib/easy_web/router.ex
```

Expected: no output. The existing OpenAPI route-coverage test enforces router↔spec agreement; Swagger UI check happens implicitly through it.

- [ ] **Step 10: Regenerate both API clients and build both apps**

```bash
cd .. && just gen-api
pnpm -C frontend/apps/coachapp-v2 build
pnpm -C frontend/apps/clientapp-v2 build
```

Expected: regen rewrites both `generated.ts` files (profile endpoints/schemas disappear); both builds exit 0. If a build fails on a missing generated type, a Task 1 straggler was missed — fix the importer, not the generated file. (If the dev phx server is running while you regen, restart it first — the OpenApiSpex spec is cached in dev.)

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(backend): remove client profiles; intake answers live in the submission"
```

---

### Task 3: Rename `Easy.ClientProfiles` → `Easy.Forms` + amend superseded specs

**Files:**
- Rename: `backend/lib/easy/client_profiles.ex` → `backend/lib/easy/forms.ex`
- Rename: `backend/lib/easy/client_profiles/` → `backend/lib/easy/forms/` (contains `check_in_schedule.ex`, `form_assignment.ex`, `form_submission.ex`, `form_template.ex` after Task 2)
- Rename: `backend/test/easy/client_profiles_test.exs` → `backend/test/easy/forms_test.exs`; `backend/test/easy/client_profiles/` → `backend/test/easy/forms/`
- Modify: every module referencing `Easy.ClientProfiles` (as of Task 2's end: the forms/check-in controllers and JSON views under `easy_web/controllers/{coaches,clients}/`, `lib/easy/check_in_sweeper.ex`, `lib/easy/clients.ex`, `lib/easy/fitness/weight_entry.ex`, plus tests)
- Modify: `docs/superpowers/specs/2026-07-09-client-lifecycle-subscription-intake-design.md`, `docs/superpowers/specs/2026-07-11-checkins-real-world-flow-design.md`

**Interfaces:**
- Consumes: Task 2's final module surface — rename only, zero signature changes.
- Produces: `Easy.Forms` and `Easy.Forms.{FormTemplate,FormAssignment,FormSubmission,CheckInSchedule}`; every public function keeps its exact name, arity, and return types.

- [ ] **Step 1: Move files and rewrite module names**

```bash
cd backend
git mv lib/easy/client_profiles.ex lib/easy/forms.ex
git mv lib/easy/client_profiles lib/easy/forms
git mv test/easy/client_profiles_test.exs test/easy/forms_test.exs
git mv test/easy/client_profiles test/easy/forms

# Whole-word module rename across backend source and tests.
# ("ClientProfiles" appears nowhere else; the OpenApi "ClientProfile"-titled
# schema modules are a different token and must NOT change.)
grep -rl "ClientProfiles" lib test | xargs perl -pi -e 's/\bClientProfiles\b/Forms/g'
```

- [ ] **Step 2: Confirm zero stragglers, zero signature drift**

```bash
grep -rn "ClientProfiles\|client_profiles" lib test
```

Expected: no output. Do NOT sweep `priv/repo/migrations` — historical migrations are immutable and legitimately mention the old table names.

- [ ] **Step 3: Full backend verify**

```bash
mix precommit
```

Expected: all green. Test count unchanged from Task 2's run — a rename must not add or lose tests.

- [ ] **Step 4: Add superseded-by notes to the two older specs**

In `docs/superpowers/specs/2026-07-09-client-lifecycle-subscription-intake-design.md`, under the `## 5. Default intake form` heading, insert:

```markdown
> **Superseded (2026-07-11):** profile mappings, the "hiding the builder" plan, and the
> `intake_status` sync below were removed by
> `2026-07-11-remove-client-profiles-design.md` — the profile tables and builder are
> deleted; intake answers live in the FormSubmission; the FormAssignment is the sole
> owner of intake status. The default-intake template + auto-assignment survive.
```

In `docs/superpowers/specs/2026-07-11-checkins-real-world-flow-design.md`, at the out-of-scope bullet mentioning "waist/hip presets are plain `number` questions with profile mappings", append:

```markdown
(Obsolete as of `2026-07-11-remove-client-profiles-design.md`: profile mappings no
longer exist; a future measurements feature needs its own design.)
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(backend): rename Easy.ClientProfiles to Easy.Forms; annotate superseded specs"
```

---

## Self-Review Notes

- **Spec coverage:** decisions 1–6 map to Tasks 1–3 (custom-field retirement + mapping UI → Task 1; mapping pipeline, table drops, endpoints, filters, OpenApi, DefaultIntake → Task 2; rename + spec notes → Task 3). Invariants are pinned by Task 2 Step 8's kept tests and Step 9's precommit.
- **Sequencing constraint:** Task 1 must land before Task 2's regen, or both frontends fail to build against the shrunken client. Task 3 is rename-only after deletion so the rename surface is minimal.
- **Known leftovers (deliberate, per spec):** surviving OpenAPI schema titles keep the `ClientProfile*` prefix; the `apps/coachapp-v2/src/api/client-profile.ts` deletion in Task 1 temporarily leaves `generated.ts` with unused profile endpoints until Task 2 regenerates it.
