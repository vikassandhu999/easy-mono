# Check-ins Phase 1: Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three hygiene gaps in the forms domain: server-side answer validation on submit, `intake_status` sync on assignment dismiss/reopen, and coach UI to edit/dismiss an open assignment.

**Architecture:** Pure `validate_answers/2` helper on the `FormSubmission` schema, enforced in `Easy.ClientProfiles.submit_client_form_assignment/3`; `update_form_assignment/3` becomes a transaction that mirrors intake assignment status onto the client profile; a small actions component on the coach client-detail check-in card using the already-generated `useUpdateFormAssignmentMutation`.

**Tech Stack:** Elixir/Phoenix/Ecto (backend), React + RTK Query + HeroUI v3 (coachapp-v2).

**Spec:** `docs/superpowers/specs/2026-07-11-checkins-real-world-flow-design.md` §4 (submit-path changes, intake hygiene) and §5 (edit-due-date/dismiss on the client-detail card).

## Global Constraints

- `backend/AGENTS.md` is authority. Ctx-first context functions, `{:ok, _} | {:error, reason}` with **bare-atom** reasons (no tagged tuples), schemas never call `Repo`, controllers never call `Repo`, `@spec` on public functions, no `@moduledoc`/`@doc`.
- **Deliberate spec deviation:** spec §4 says "reject with a per-question error map" — that violates the bare-atom error convention. We return `:missing_required_answers` / `:invalid_answer_values` / `:unknown_answer_keys` instead; the clientapp already does per-question UX validation client-side. Task 2 updates the spec line.
- Every tenant-owned query scoped by `business_id`. Tests use factories (`insert(:form_template)` etc.) and existing patterns in `backend/test/easy/client_profiles_test.exs`.
- Run `mix precommit` (from `backend/`) before finishing backend work; `pnpm tsc --noEmit` + `just lint` for frontend (from `frontend/`).
- Template `sections` read from Postgres are **string-keyed** maps; question shape: `%{"id" => _, "label" => _, "type" => _, "required" => bool, "options" => [String.t()]}`. Answer value types sent by clientapp: text→string, number→JS number, boolean→boolean, date→ISO `"YYYY-MM-DD"` string, select→string, multi_select→string array.
- Frontend: HeroUI v3 tokens only (`accent/border/surface/muted` — v2 tokens like `primary`/`content*` are dead no-ops).
- Commit after every task; message style `fix(backend): …` / `feat(coachapp): …` with the Claude Fable co-author trailer.

---

### Task 1: `FormSubmission.validate_answers/2` (pure helper)

**Files:**
- Modify: `backend/lib/easy/client_profiles/form_submission.ex`
- Test: `backend/test/easy/client_profiles_test.exs` (add a `describe "validate_answers/2"` block)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Easy.ClientProfiles.FormSubmission.validate_answers(sections :: [map()], answers :: map()) :: :ok | {:error, :unknown_answer_keys | :missing_required_answers | :invalid_answer_values}` — Task 2 calls this from the context.

- [ ] **Step 1: Write the failing tests**

Add to `backend/test/easy/client_profiles_test.exs` (aliases for `FormSubmission` already exist at the top of the file; if not, add `alias Easy.ClientProfiles.FormSubmission`):

```elixir
describe "validate_answers/2" do
  @sections [
    %{
      "title" => "Week",
      "questions" => [
        %{"id" => "win", "label" => "Biggest win", "type" => "text", "required" => true},
        %{"id" => "weight", "label" => "Weight", "type" => "number", "required" => false},
        %{"id" => "slept-well", "label" => "Slept well?", "type" => "boolean", "required" => false},
        %{"id" => "start-date", "label" => "Start date", "type" => "date", "required" => false},
        %{
          "id" => "mood",
          "label" => "Mood",
          "type" => "select",
          "required" => false,
          "options" => ["Good", "Bad"]
        },
        %{
          "id" => "focus",
          "label" => "Focus areas",
          "type" => "multi_select",
          "required" => false,
          "options" => ["Training", "Nutrition"]
        }
      ]
    }
  ]

  test "accepts valid answers of every type" do
    answers = %{
      "win" => "Hit a PR",
      "weight" => 81.4,
      "slept-well" => true,
      "start-date" => "2026-07-11",
      "mood" => "Good",
      "focus" => ["Training", "Nutrition"]
    }

    assert :ok = FormSubmission.validate_answers(@sections, answers)
  end

  test "accepts omitted and blank optional answers" do
    assert :ok = FormSubmission.validate_answers(@sections, %{"win" => "x", "mood" => "", "focus" => []})
  end

  test "rejects a missing required answer" do
    assert {:error, :missing_required_answers} = FormSubmission.validate_answers(@sections, %{"weight" => 80})
    assert {:error, :missing_required_answers} = FormSubmission.validate_answers(@sections, %{"win" => ""})
  end

  test "rejects answers keyed by unknown question ids" do
    assert {:error, :unknown_answer_keys} =
             FormSubmission.validate_answers(@sections, %{"win" => "x", "hacked" => "boom"})
  end

  test "rejects wrong value types and out-of-options values" do
    for bad <- [
          %{"win" => 42},
          %{"win" => "x", "weight" => "eighty"},
          %{"win" => "x", "slept-well" => "yes"},
          %{"win" => "x", "start-date" => "not-a-date"},
          %{"win" => "x", "mood" => "Elated"},
          %{"win" => "x", "focus" => ["Training", "Sleep"]},
          %{"win" => "x", "focus" => "Training"}
        ] do
      assert {:error, :invalid_answer_values} = FormSubmission.validate_answers(@sections, bad),
             "expected rejection for #{inspect(bad)}"
    end
  end

  test "skips malformed sections and questions without crashing" do
    sections = [%{"title" => "no questions key"}, %{"questions" => "not-a-list"}, %{"questions" => ["junk"]}]
    assert :ok = FormSubmission.validate_answers(sections, %{})
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `mix test test/easy/client_profiles_test.exs 2>&1 | tail -20`
Expected: FAIL with `undefined function validate_answers/2`.

- [ ] **Step 3: Implement `validate_answers/2`**

Add to `backend/lib/easy/client_profiles/form_submission.ex` (public fn after the changesets, private helpers at the bottom; schema stays `Repo`-free):

```elixir
@spec validate_answers([map()], map()) ::
        :ok | {:error, :unknown_answer_keys | :missing_required_answers | :invalid_answer_values}
def validate_answers(sections, answers) when is_list(sections) and is_map(answers) do
  questions =
    for %{"questions" => qs} <- sections, is_list(qs), %{"id" => id} = q <- qs, is_binary(id), do: q

  known_ids = MapSet.new(questions, & &1["id"])

  cond do
    Enum.any?(Map.keys(answers), &(not MapSet.member?(known_ids, &1))) ->
      {:error, :unknown_answer_keys}

    Enum.any?(questions, &missing_required?(&1, answers)) ->
      {:error, :missing_required_answers}

    Enum.any?(questions, &invalid_value?(&1, answers)) ->
      {:error, :invalid_answer_values}

    true ->
      :ok
  end
end

defp missing_required?(%{"required" => true, "id" => id}, answers), do: blank_answer?(Map.get(answers, id))
defp missing_required?(_question, _answers), do: false

defp blank_answer?(value), do: value in [nil, "", []]

defp invalid_value?(%{"id" => id} = question, answers) do
  value = Map.get(answers, id)
  not blank_answer?(value) and not valid_value?(question["type"], value, question)
end

defp valid_value?("text", value, _q), do: is_binary(value)
defp valid_value?("number", value, _q), do: is_number(value)
defp valid_value?("boolean", value, _q), do: is_boolean(value)

defp valid_value?("date", value, _q),
  do: is_binary(value) and match?({:ok, _}, Date.from_iso8601(value))

defp valid_value?("select", value, q),
  do: is_binary(value) and value in question_options(q)

defp valid_value?("multi_select", value, q) do
  options = question_options(q)
  is_list(value) and value != [] and Enum.all?(value, &(is_binary(&1) and &1 in options))
end

defp valid_value?(_type, _value, _q), do: false

defp question_options(%{"options" => options}) when is_list(options), do: options
defp question_options(_q), do: []
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `mix test test/easy/client_profiles_test.exs 2>&1 | tail -5`
Expected: PASS (0 failures).

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/client_profiles/form_submission.ex backend/test/easy/client_profiles_test.exs
git commit -m "feat(backend): FormSubmission.validate_answers/2 pure answer validation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Enforce validation in the submit path

**Files:**
- Modify: `backend/lib/easy/client_profiles.ex:331-347` (`submit_client_form_assignment/3` + its `@spec`)
- Modify: `backend/lib/easy_web/controllers/fallback_controller.ex` (three clauses next to the existing `:invalid_answers` block at line ~203)
- Modify: `docs/superpowers/specs/2026-07-11-checkins-real-world-flow-design.md` (one line, spec deviation)
- Test: `backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs`

**Interfaces:**
- Consumes: `FormSubmission.validate_answers/2` from Task 1.
- Produces: `submit_client_form_assignment/3` additionally returns `{:error, :unknown_answer_keys | :missing_required_answers | :invalid_answer_values}`; all three render 422 via `FallbackController`.

- [ ] **Step 1: Write the failing controller tests**

Add to `backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs`, inside the existing submit `describe` block (follow the file's existing setup pattern for creating a client-authed conn and an assignment whose template has a required question — copy the setup used by the existing successful-submit test):

```elixir
test "rejects submission missing a required answer", %{conn: conn, assignment: assignment} do
  conn = post(conn, ~p"/v1/client/form-assignments/#{assignment.id}/submit", %{"answers" => %{}})

  assert %{"error" => _} = json_response(conn, 422)
  assert Repo.aggregate(Easy.ClientProfiles.FormSubmission, :count) == 0
end

test "rejects submission with unknown answer keys", %{conn: conn, assignment: assignment} do
  answers = valid_answers_for(assignment) |> Map.put("not-a-question", "boom")
  conn = post(conn, ~p"/v1/client/form-assignments/#{assignment.id}/submit", %{"answers" => answers})

  assert json_response(conn, 422)
end
```

Adapt names to the file's actual setup: if the existing tests build the assignment inline rather than in setup, do the same; `valid_answers_for/1` means "a map answering every required question in the assignment's template" — write it as a small private helper in the test file if one doesn't exist:

```elixir
defp valid_answers_for(assignment) do
  for %{"questions" => qs} <- assignment.form_template.sections,
      %{"id" => id, "required" => true, "type" => type} = q <- qs,
      into: %{} do
    value =
      case type do
        "text" -> "answer"
        "number" -> 1
        "boolean" -> true
        "date" -> "2026-07-11"
        "select" -> hd(q["options"])
        "multi_select" -> [hd(q["options"])]
      end

    {id, value}
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `mix test test/easy_web/controllers/clients/form_assignment_controller_test.exs 2>&1 | tail -20`
Expected: the two new tests FAIL (submission currently succeeds → 201/200, or count is 1).

- [ ] **Step 3: Wire validation into the context and fallback controller**

In `backend/lib/easy/client_profiles.ex`, extend the `with` chain (template is preloaded by `get_client_form_assignment` via `include_form_template`) and the `@spec`:

```elixir
@spec submit_client_form_assignment(Ctx.t(), String.t(), map()) ::
        {:ok, FormSubmission.t()}
        | {:error,
           :not_found
           | :invalid_answers
           | :answers_required
           | :unknown_answer_keys
           | :missing_required_answers
           | :invalid_answer_values
           | :assignment_not_submittable
           | :invalid_profile_mapping
           | Ecto.Changeset.t()}
def submit_client_form_assignment(%Ctx{} = ctx, assignment_id, attrs) do
  with {:ok, answers} <- answers_from_attrs(attrs),
       {:ok, client} <- get_client(ctx),
       {:ok, assignment} <- get_client_form_assignment(ctx, assignment_id),
       :ok <- ensure_assignment_submittable(assignment),
       :ok <- FormSubmission.validate_answers(assignment.form_template.sections, answers) do
    Repo.transaction(fn -> submit_assignment!(ctx, client, assignment, answers) end)
  end
end
```

In `backend/lib/easy_web/controllers/fallback_controller.ex`, add directly after the existing `:invalid_answers` clause (at line ~203):

```elixir
def call(conn, {:error, :unknown_answer_keys}) do
  call(conn, {:error, Error.unprocessable(%{fields: %{answers: ["reference unknown questions"]}})})
end

def call(conn, {:error, :missing_required_answers}) do
  call(conn, {:error, Error.unprocessable(%{fields: %{answers: ["required questions are missing answers"]}})})
end

def call(conn, {:error, :invalid_answer_values}) do
  call(conn, {:error, Error.unprocessable(%{fields: %{answers: ["contain invalid values"]}})})
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `mix test test/easy_web/controllers/clients/form_assignment_controller_test.exs test/easy/client_profiles_test.exs 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 5: Update the spec deviation line**

In `docs/superpowers/specs/2026-07-11-checkins-real-world-flow-design.md` §4, replace:

`* **Enforce \`required\`.** Reject submission with a per-question error map when a required question in the template snapshot has no answer. Trust-boundary fix; ships first.`

with:

`* **Enforce \`required\`.** Reject submission with a bare-atom 422 (\`:missing_required_answers\` / \`:invalid_answer_values\` / \`:unknown_answer_keys\`) when answers don't satisfy the template snapshot — per-question detail stays client-side, matching the backend's bare-atom error convention. Trust-boundary fix; ships first.`

- [ ] **Step 6: Commit**

```bash
git add backend/lib/easy/client_profiles.ex backend/lib/easy_web/controllers/fallback_controller.ex \
  backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs \
  docs/superpowers/specs/2026-07-11-checkins-real-world-flow-design.md
git commit -m "fix(backend): enforce required answers + answer shapes on form submission

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Sync `intake_status` on assignment dismiss/reopen

**Files:**
- Modify: `backend/lib/easy/client_profiles.ex:283-290` (`update_form_assignment/3`)
- Test: `backend/test/easy/client_profiles_test.exs`

**Interfaces:**
- Consumes: existing `get_or_create_profile/2`, `FormAssignment.update_changeset/2`.
- Produces: unchanged signature `update_form_assignment(ctx, assignment_id, attrs) :: {:ok, FormAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}` — but for `purpose: :intake` assignments the client profile's `intake_status` now mirrors the assignment status in the same transaction (`intake_completed_at` mirrors `completed_at`).

- [ ] **Step 1: Write the failing tests**

Add to `backend/test/easy/client_profiles_test.exs` (context section; use the file's existing helpers for building a coach `%Ctx{}` — grep for how other `update_*` context tests build `ctx`):

```elixir
describe "update_form_assignment/3 intake sync" do
  test "dismissing an intake assignment sets profile intake_status to dismissed" do
    client = insert_client()
    ctx = coach_ctx_for(client.business)
    template = insert(:form_template, business: client.business, purpose: :intake)

    assignment =
      insert(:form_assignment,
        business: client.business,
        client: client,
        form_template: template,
        purpose: :intake,
        status: :assigned
      )

    assert {:ok, %{status: :dismissed}} =
             ClientProfiles.update_form_assignment(ctx, assignment.id, %{status: :dismissed})

    assert {:ok, profile} = ClientProfiles.get_or_create_profile(ctx, client.id)
    assert profile.intake_status == :dismissed
    assert profile.intake_completed_at == nil
  end

  test "reopening a completed intake assignment resets profile intake_status" do
    client = insert_client()
    ctx = coach_ctx_for(client.business)
    template = insert(:form_template, business: client.business, purpose: :intake)

    assignment =
      insert(:form_assignment,
        business: client.business,
        client: client,
        form_template: template,
        purpose: :intake,
        status: :completed,
        completed_at: DateTime.utc_now(:second)
      )

    assert {:ok, %{status: :assigned}} =
             ClientProfiles.update_form_assignment(ctx, assignment.id, %{status: :assigned})

    assert {:ok, profile} = ClientProfiles.get_or_create_profile(ctx, client.id)
    assert profile.intake_status == :assigned
    assert profile.intake_completed_at == nil
  end

  test "updating a non-intake assignment does not touch the profile" do
    client = insert_client()
    ctx = coach_ctx_for(client.business)

    assignment =
      insert(:form_assignment, business: client.business, client: client, purpose: :weekly_check_in)

    {:ok, profile_before} = ClientProfiles.get_or_create_profile(ctx, client.id)

    assert {:ok, _} = ClientProfiles.update_form_assignment(ctx, assignment.id, %{status: :dismissed})

    {:ok, profile_after} = ClientProfiles.get_or_create_profile(ctx, client.id)
    assert profile_after.intake_status == profile_before.intake_status
  end
end
```

If a `coach_ctx_for/1`-style helper doesn't exist in the file, build the `%Easy.Ctx{}` the same way neighboring context tests do (e.g. `%Ctx{business_id: business.id, user_id: coach_user.id, role: :coach}` with an inserted coach) — match the file's precedent exactly. Note `purpose: :weekly_check_in` here matches today's enum; the phase-2 remap migration will update these literals.

- [ ] **Step 2: Run tests to verify they fail**

Run: `mix test test/easy/client_profiles_test.exs 2>&1 | tail -20`
Expected: the two intake tests FAIL (profile still has default `intake_status: :assigned` after dismiss → first test fails on `== :dismissed`).

- [ ] **Step 3: Implement the sync**

Replace `update_form_assignment/3` in `backend/lib/easy/client_profiles.ex`:

```elixir
@spec update_form_assignment(Ctx.t(), String.t(), map()) ::
        {:ok, FormAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}
def update_form_assignment(%Ctx{} = ctx, assignment_id, attrs) do
  with {:ok, assignment} <- get_form_assignment(ctx.business_id, assignment_id),
       :ok <- Clients.authorize_client_id(ctx, assignment.client_id) do
    Repo.transaction(fn ->
      case assignment |> FormAssignment.update_changeset(attrs) |> Repo.update() do
        {:ok, updated} ->
          sync_intake_status!(ctx, updated)
          updated

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end
end

defp sync_intake_status!(ctx, %FormAssignment{purpose: :intake} = assignment) do
  case get_or_create_profile(ctx, assignment.client_id) do
    {:ok, profile} ->
      profile
      |> Ecto.Changeset.change(
        intake_status: assignment.status,
        intake_completed_at: assignment.completed_at
      )
      |> Repo.update()
      |> case do
        {:ok, _profile} -> :ok
        {:error, reason} -> Repo.rollback(reason)
      end

    {:error, reason} ->
      Repo.rollback(reason)
  end
end

defp sync_intake_status!(_ctx, _assignment), do: :ok
```

Place `sync_intake_status!/2` next to the existing `maybe_sync_intake!/4` helpers (they are siblings; do not merge them — the submit path stamps `submitted_at`, this one mirrors whatever the update produced).

- [ ] **Step 4: Run tests to verify they pass**

Run: `mix test test/easy/client_profiles_test.exs 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/lib/easy/client_profiles.ex backend/test/easy/client_profiles_test.exs
git commit -m "fix(backend): mirror intake assignment status onto profile on dismiss/reopen

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Coach UI — edit due date / dismiss an open assignment

**Files:**
- Create: `frontend/apps/coachapp-v2/src/clients/components/checkin-assignment-actions.tsx`
- Modify: `frontend/apps/coachapp-v2/src/clients/components/client-checkins.tsx` (render the actions under the next-due assignment row)

**Interfaces:**
- Consumes: `useUpdateFormAssignmentMutation` from `@/api/checkins` (already generated; PATCH `/form-assignments/:id` accepts `{status?, priority?, due_date?}`), `ClientProfileFormAssignment` type.
- Produces: `<CheckinAssignmentActions assignment={...} />` — self-contained, no props consumed elsewhere.

- [ ] **Step 1: Create the actions component**

`frontend/apps/coachapp-v2/src/clients/components/checkin-assignment-actions.tsx`:

```tsx
/**
 * Inline actions for an open (not completed/dismissed) check-in assignment:
 * change the due date or dismiss it. Uses the existing PATCH endpoint.
 */
import {Button} from '@heroui/react';
import {useState} from 'react';

import {type ClientProfileFormAssignment, useUpdateFormAssignmentMutation} from '@/api/checkins';

const OPEN_STATUSES = ['assigned', 'in_progress'];

export default function CheckinAssignmentActions({assignment}: {assignment: ClientProfileFormAssignment}) {
  const [update, {isLoading}] = useUpdateFormAssignmentMutation();
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);

  if (!OPEN_STATUSES.includes(assignment.status)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted">
        Due
        <input
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
          disabled={isLoading}
          onChange={(e) => {
            if (e.target.value) {
              void update({id: assignment.id, due_date: e.target.value});
            }
          }}
          type="date"
          value={assignment.due_date ?? ''}
        />
      </label>
      {confirmingDismiss ? (
        <>
          <Button
            isDisabled={isLoading}
            onPress={() => void update({id: assignment.id, status: 'dismissed'})}
            size="sm"
            variant="danger"
          >
            Confirm dismiss
          </Button>
          <Button isDisabled={isLoading} onPress={() => setConfirmingDismiss(false)} size="sm" variant="ghost">
            Keep
          </Button>
        </>
      ) : (
        <Button isDisabled={isLoading} onPress={() => setConfirmingDismiss(true)} size="sm" variant="ghost">
          Dismiss
        </Button>
      )}
    </div>
  );
}
```

Before writing, check the actual `useUpdateFormAssignmentMutation` arg shape in `frontend/apps/coachapp-v2/src/api/checkins.ts` (generated client may wrap the body, e.g. `{id, body: {...}}` or `{id, clientProfileFormAssignmentUpdateRequest: {...}}`) and the exact `Button` variant names used elsewhere in the app (grep one existing `variant="danger"` usage; if the app uses a different destructive variant, match it). Adjust the two `update(...)` calls and variants to match reality — the component structure stands.

- [ ] **Step 2: Render it in the client check-in card**

In `frontend/apps/coachapp-v2/src/clients/components/client-checkins.tsx`: import the component and render `<CheckinAssignmentActions assignment={nextDue} />` inside the next-due assignment block, directly under the row that shows the status chip and due date (the block rendering `selectNextDue(...)`'s result). The RTK mutation invalidates the assignments list tag, so the card refreshes itself; verify the mutation's `invalidatesTags` in `api/checkins.ts` covers the list query used here — if not, add the tag to the generated-client enhancement in that file (pattern: `enhanceEndpoints`).

- [ ] **Step 3: Typecheck and lint**

Run (from `frontend/`): `pnpm --filter coachapp-v2 exec tsc --noEmit && cd .. && just lint 2>&1 | tail -5`
Expected: clean tsc; lint passes (check the actual tsc invocation in `frontend/apps/coachapp-v2/package.json` scripts and use that if it differs).

- [ ] **Step 4: Verify in the running app**

Start dev (`just web` + `just backend` if not running). On a client detail page with an open check-in assignment: change the due date → chip/date updates after refetch; dismiss → assignment leaves the next-due slot. For an intake assignment, dismissing should also clear the "Intake incomplete" flag on the clients list (Task 3's sync).

- [ ] **Step 5: Commit**

```bash
git add frontend/apps/coachapp-v2/src/clients/components/checkin-assignment-actions.tsx \
  frontend/apps/coachapp-v2/src/clients/components/client-checkins.tsx
git commit -m "feat(coachapp): edit due date and dismiss open check-in assignments

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Wrap-up verification

**Files:** none new.

- [ ] **Step 1: Full backend gate**

Run (from `backend/`): `mix precommit`
Expected: format clean, compile with no warnings, credo clean, all tests pass.

- [ ] **Step 2: Recurring-mistakes check**

Skim `docs/agents/recurring-mistakes.md` entries for backend forms + coachapp areas; run `scripts/check-rm.sh` via `just lint` if not already done in Task 4. Fix anything flagged.

- [ ] **Step 3: Commit any stragglers**

Only if steps 1–2 changed files:

```bash
git add -A && git commit -m "chore: phase-1 hygiene verification fixes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
