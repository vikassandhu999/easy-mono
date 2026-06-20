# Client Profiles and Forms Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the backend foundation for client profiles, coach-defined profile fields, form templates, form assignments, and form submissions that update profile data.

**Architecture:** Add one cross-domain `Easy.ClientProfiles` context with focused schema modules under `Easy.ClientProfiles.*`. Keep existing `Easy.Clients` contact/profile behavior intact, then add new `/profile`, `/profile-fields`, `/form-templates`, and `/form-assignments` endpoints around the new context.

**Tech Stack:** Phoenix controllers, Ecto schemas/migrations, OpenApiSpex operation specs, ExMachina factories, ExUnit controller/context tests.

---

## Scope split

This plan implements only the profile/forms slice from `docs/superpowers/specs/2026-06-20-coaching-profile-nutrition-schema-api-design.md`.

Separate plans should cover:

* nutrition table/API rename and macro normalization
* threads
* generic attention endpoint

## File structure

Create:

* `backend/priv/repo/migrations/20260620140000_create_client_profiles_and_forms.exs` creates profile/form tables and indexes.
* `backend/lib/easy/client_profiles/client_profile.ex` owns `client_profiles`.
* `backend/lib/easy/client_profiles/profile_field_definition.ex` owns custom profile field definitions.
* `backend/lib/easy/client_profiles/profile_field_value.ex` owns custom field values.
* `backend/lib/easy/client_profiles/form_template.ex` owns reusable form templates.
* `backend/lib/easy/client_profiles/form_assignment.ex` owns assigned forms.
* `backend/lib/easy/client_profiles/form_submission.ex` owns immutable submissions.
* `backend/lib/easy/client_profiles.ex` is the public context.
* `backend/lib/easy_web/controllers/coaches/client_profile_controller.ex` exposes coach access to one client profile.
* `backend/lib/easy_web/controllers/coaches/client_profile_json.ex` renders coach profile responses.
* `backend/lib/easy_web/controllers/coaches/profile_field_controller.ex` exposes profile field definition CRUD.
* `backend/lib/easy_web/controllers/coaches/profile_field_json.ex` renders profile field definitions.
* `backend/lib/easy_web/controllers/coaches/form_template_controller.ex` exposes template CRUD plus assign.
* `backend/lib/easy_web/controllers/coaches/form_template_json.ex` renders form templates.
* `backend/lib/easy_web/controllers/coaches/form_assignment_controller.ex` exposes coach assignment list/update.
* `backend/lib/easy_web/controllers/coaches/form_assignment_json.ex` renders assignments.
* `backend/lib/easy_web/controllers/clients/client_profile_controller.ex` exposes client access to their coaching profile.
* `backend/lib/easy_web/controllers/clients/client_profile_json.ex` renders client profile responses.
* `backend/lib/easy_web/controllers/clients/form_assignment_controller.ex` exposes client assignment list/show/submit.
* `backend/lib/easy_web/controllers/clients/form_assignment_json.ex` renders client assignments and submissions.
* `backend/lib/easy_web/open_api/schemas/client_profile.ex` holds OpenAPI schemas for profile/forms.
* `backend/test/easy/client_profiles_test.exs` tests context behavior.
* `backend/test/easy_web/controllers/coaches/client_profile_controller_test.exs` tests coach profile endpoints.
* `backend/test/easy_web/controllers/coaches/profile_field_controller_test.exs` tests coach custom field endpoints.
* `backend/test/easy_web/controllers/coaches/form_template_controller_test.exs` tests coach form template/assignment endpoints.
* `backend/test/easy_web/controllers/clients/client_profile_controller_test.exs` tests client profile endpoints.
* `backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs` tests client form assignment submission.

Modify:

* `backend/lib/easy_web/router.ex` adds new kebab-case routes.
* `backend/test/support/factory.ex` adds factories.

Do not modify existing `/v1/client/me` or `/v1/coach/clients/:id` behavior in this plan.

---

## Task 1: Add tables and schema modules

**Files:**
* Create: `backend/priv/repo/migrations/20260620140000_create_client_profiles_and_forms.exs`
* Create: `backend/lib/easy/client_profiles/client_profile.ex`
* Create: `backend/lib/easy/client_profiles/profile_field_definition.ex`
* Create: `backend/lib/easy/client_profiles/profile_field_value.ex`
* Create: `backend/lib/easy/client_profiles/form_template.ex`
* Create: `backend/lib/easy/client_profiles/form_assignment.ex`
* Create: `backend/lib/easy/client_profiles/form_submission.ex`
* Modify: `backend/test/support/factory.ex`
* Test: `backend/test/easy/client_profiles_test.exs`

- [ ] **Step 1: Write failing schema tests**

Create `backend/test/easy/client_profiles_test.exs` with:

```elixir
defmodule Easy.ClientProfilesTest do
  use Easy.DataCase, async: false

  alias Easy.ClientProfiles
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.ClientProfiles.ProfileFieldValue
  alias Easy.ClientProfiles.FormAssignment

  describe "client profile schemas" do
    test "creates one profile per client" do
      client = insert(:client)

      assert {:ok, profile} = ClientProfiles.get_or_create_profile(client.business_id, client.id)
      assert profile.client_id == client.id
      assert profile.general == %{}
      assert profile.nutrition == %{}

      assert {:ok, same_profile} = ClientProfiles.get_or_create_profile(client.business_id, client.id)
      assert same_profile.id == profile.id
    end

    test "rejects filterable text custom fields" do
      business = insert(:business)

      changeset =
        ProfileFieldDefinition.insert_changeset(business.id, %{
          "section" => "nutrition",
          "label" => "Favorite foods",
          "key" => "favorite_foods",
          "field_type" => "text",
          "filterable" => true
        })

      refute changeset.valid?
      assert "cannot be filterable" in errors_on(changeset).filterable
    end

    test "accepts filterable select custom fields" do
      business = insert(:business)

      changeset =
        ProfileFieldDefinition.insert_changeset(business.id, %{
          "section" => "nutrition",
          "label" => "Meal prep ability",
          "key" => "meal_prep_ability",
          "field_type" => "select",
          "options" => ["low", "medium", "high"],
          "filterable" => true
        })

      assert changeset.valid?
    end

    test "rejects duplicate custom field keys in one business" do
      business = insert(:business)
      insert(:profile_field_definition, business: business, key: "meal_prep_ability")

      assert {:error, changeset} =
               ClientProfiles.create_profile_field(business.id, %{
                 "section" => "nutrition",
                 "label" => "Meal prep ability",
                 "key" => "meal_prep_ability",
                 "field_type" => "select",
                 "options" => ["low", "medium", "high"]
               })

      assert "has already been taken" in errors_on(changeset).key
    end

    test "stores one custom field value per client and field" do
      client = insert(:client)
      field = insert(:profile_field_definition, business: client.business)

      assert {:ok, value} =
               ClientProfiles.upsert_profile_field_value(
                 client.business_id,
                 client.id,
                 field.id,
                 "high",
                 %{type: "coach", id: client.creator_id, submission_id: nil}
               )

      assert value.value == "high"

      assert {:ok, updated} =
               ClientProfiles.upsert_profile_field_value(
                 client.business_id,
                 client.id,
                 field.id,
                 "low",
                 %{type: "coach", id: client.creator_id, submission_id: nil}
               )

      assert updated.id == value.id
      assert updated.value == "low"
    end

    test "form assignment statuses are constrained" do
      client = insert(:client)
      template = insert(:form_template, business: client.business)

      changeset =
        FormAssignment.insert_changeset(client.business_id, client.id, template.id, %{
          "purpose" => "intake",
          "priority" => "high",
          "status" => "submitted"
        })

      refute changeset.valid?
      assert "is invalid" in errors_on(changeset).status
    end
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && mix test test/easy/client_profiles_test.exs
```

Expected: fail because `Easy.ClientProfiles` modules do not exist.

- [ ] **Step 3: Create migration**

Create `backend/priv/repo/migrations/20260620140000_create_client_profiles_and_forms.exs`:

```elixir
defmodule Easy.Repo.Migrations.CreateClientProfilesAndForms do
  use Ecto.Migration

  def change do
    create table(:client_profiles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :general, :map, default: %{}, null: false
      add :nutrition, :map, default: %{}, null: false
      add :training, :map, default: %{}, null: false
      add :lifestyle, :map, default: %{}, null: false
      add :intake_status, :string, null: false, default: "assigned"
      add :intake_completed_at, :utc_datetime

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:client_profiles, [:client_id])
    create index(:client_profiles, [:business_id])

    create table(:profile_field_definitions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :section, :string, null: false
      add :label, :string, null: false
      add :key, :string, null: false
      add :field_type, :string, null: false
      add :options, {:array, :string}, default: [], null: false
      add :filterable, :boolean, default: false, null: false
      add :archived_at, :utc_datetime

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:profile_field_definitions, [:business_id, :key])
    create index(:profile_field_definitions, [:business_id, :section])

    create table(:profile_field_values, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :value, :map, null: false
      add :updated_by_type, :string, null: false
      add :updated_by_id, :binary_id
      add :updated_from_submission_id, :binary_id

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all),
        null: false

      add :profile_field_definition_id,
          references(:profile_field_definitions, type: :binary_id, on_delete: :delete_all),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:profile_field_values, [:client_id, :profile_field_definition_id])
    create index(:profile_field_values, [:business_id, :client_id])

    create table(:form_templates, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :purpose, :string, null: false
      add :sections, {:array, :map}, default: [], null: false
      add :status, :string, null: false, default: "active"

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create index(:form_templates, [:business_id, :purpose])

    create table(:form_assignments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :purpose, :string, null: false
      add :priority, :string, null: false, default: "normal"
      add :status, :string, null: false, default: "assigned"
      add :due_date, :date
      add :completed_at, :utc_datetime

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all),
        null: false

      add :form_template_id, references(:form_templates, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create index(:form_assignments, [:business_id, :client_id])
    create index(:form_assignments, [:business_id, :purpose, :status])

    create table(:form_submissions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :question_snapshot, {:array, :map}, default: [], null: false
      add :answers, :map, default: %{}, null: false
      add :submitted_by_type, :string, null: false
      add :submitted_by_id, :binary_id
      add :submitted_at, :utc_datetime, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all),
        null: false

      add :form_assignment_id,
          references(:form_assignments, type: :binary_id, on_delete: :delete_all),
          null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:form_submissions, [:business_id, :client_id])
    create index(:form_submissions, [:form_assignment_id])
  end
end
```

- [ ] **Step 4: Create schema modules**

Create the schema modules with these names and rules:

```elixir
defmodule Easy.ClientProfiles.ClientProfile do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @intake_statuses [:assigned, :in_progress, :completed, :dismissed]

  @type t :: %__MODULE__{}

  schema "client_profiles" do
    field :general, :map, default: %{}
    field :nutrition, :map, default: %{}
    field :training, :map, default: %{}
    field :lifestyle, :map, default: %{}
    field :intake_status, Ecto.Enum, values: @intake_statuses, default: :assigned
    field :intake_completed_at, :utc_datetime

    belongs_to :business, Orgs.Business
    belongs_to :client, Client

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs \\ %{}) do
    %__MODULE__{}
    |> cast(attrs, [:general, :nutrition, :training, :lifestyle, :intake_status, :intake_completed_at])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:business_id, :client_id])
    |> unique_constraint(:client_id, name: :client_profiles_client_id_index)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(profile, attrs) do
    profile
    |> cast(attrs, [:general, :nutrition, :training, :lifestyle, :intake_status, :intake_completed_at])
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(p in query, where: p.client_id == ^client_id)
  end
end
```

Create `ProfileFieldDefinition`, `ProfileFieldValue`, `FormTemplate`, `FormAssignment`, and `FormSubmission` with the same schema fields listed in the migration. Required validation rules:

```elixir
@sections ["general", "nutrition", "training", "lifestyle"]
@field_types ["text", "number", "boolean", "date", "select", "multi_select"]
@filterable_types ["number", "boolean", "date", "select", "multi_select"]
@purposes ["intake", "weekly_check_in", "nutrition_update", "training_update", "custom"]
@assignment_statuses ["assigned", "in_progress", "completed", "dismissed"]
@priorities ["high", "normal"]
@actors ["coach", "client", "system"]
```

Add these concrete checks:

```elixir
validate_inclusion(:field_type, @field_types)
validate_inclusion(:section, @sections)
validate_inclusion(:purpose, @purposes)
validate_inclusion(:status, @assignment_statuses)
validate_inclusion(:priority, @priorities)
validate_inclusion(:updated_by_type, @actors)
validate_inclusion(:submitted_by_type, @actors)
```

For `ProfileFieldDefinition`, add:

```elixir
defp validate_filterable_type(changeset) do
  type = get_field(changeset, :field_type)
  filterable = get_field(changeset, :filterable)

  if filterable == true and type not in @filterable_types do
    add_error(changeset, :filterable, "cannot be filterable")
  else
    changeset
  end
end
```

For `ProfileFieldValue`, cast `value` as `:map` and store primitive values wrapped as `%{"value" => value}` in the context.

- [ ] **Step 5: Add factories**

Add aliases in `backend/test/support/factory.ex`:

```elixir
alias Easy.ClientProfiles.ClientProfile
alias Easy.ClientProfiles.FormAssignment
alias Easy.ClientProfiles.FormSubmission
alias Easy.ClientProfiles.FormTemplate
alias Easy.ClientProfiles.ProfileFieldDefinition
alias Easy.ClientProfiles.ProfileFieldValue
```

Add factories:

```elixir
def client_profile_factory do
  client = build(:client)

  %ClientProfile{
    business: client.business,
    client: client,
    general: %{},
    nutrition: %{},
    training: %{},
    lifestyle: %{},
    intake_status: :assigned
  }
end

def profile_field_definition_factory do
  %ProfileFieldDefinition{
    business: build(:business),
    section: "nutrition",
    label: "Meal prep ability",
    key: sequence(:profile_field_key, &"meal_prep_ability_#{&1}"),
    field_type: "select",
    options: ["low", "medium", "high"],
    filterable: true
  }
end

def profile_field_value_factory do
  client = build(:client)
  definition = build(:profile_field_definition, business: client.business)

  %ProfileFieldValue{
    business: client.business,
    client: client,
    profile_field_definition: definition,
    value: %{"value" => "medium"},
    updated_by_type: "coach",
    updated_by_id: client.creator_id
  }
end

def form_template_factory do
  %FormTemplate{
    business: build(:business),
    name: sequence(:form_template_name, &"Intake #{&1}"),
    purpose: "intake",
    sections: [
      %{
        "title" => "Nutrition",
        "section" => "nutrition",
        "questions" => [
          %{
            "id" => "meal_prep_ability",
            "label" => "Meal prep ability",
            "type" => "select",
            "required" => true,
            "options" => ["low", "medium", "high"],
            "profile_mapping" => %{
              "kind" => "custom_field",
              "field_key" => "meal_prep_ability"
            }
          }
        ]
      }
    ],
    status: "active"
  }
end

def form_assignment_factory do
  client = build(:client)
  template = build(:form_template, business: client.business)

  %FormAssignment{
    business: client.business,
    client: client,
    form_template: template,
    purpose: "intake",
    priority: "high",
    status: "assigned"
  }
end

def form_submission_factory do
  assignment = build(:form_assignment)

  %FormSubmission{
    business: assignment.business,
    client: assignment.client,
    form_assignment: assignment,
    question_snapshot: assignment.form_template.sections,
    answers: %{"meal_prep_ability" => "high"},
    submitted_by_type: "client",
    submitted_by_id: assignment.client_id,
    submitted_at: DateTime.utc_now(:second)
  }
end
```

- [ ] **Step 6: Run migration/schema tests**

Run:

```bash
cd backend && mix test test/easy/client_profiles_test.exs
```

Expected: fail only because `Easy.ClientProfiles` context functions do not exist.

- [ ] **Step 7: Commit schema foundation**

```bash
git add backend/priv/repo/migrations/20260620140000_create_client_profiles_and_forms.exs backend/lib/easy/client_profiles backend/test/support/factory.ex backend/test/easy/client_profiles_test.exs
git commit -m "feat: add client profile form schemas"
```

---

## Task 2: Add `Easy.ClientProfiles` context

**Files:**
* Create: `backend/lib/easy/client_profiles.ex`
* Test: `backend/test/easy/client_profiles_test.exs`

- [ ] **Step 1: Add context API**

Create `backend/lib/easy/client_profiles.ex`:

```elixir
defmodule Easy.ClientProfiles do
  alias Easy.Clients.Client
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
  alias Easy.ClientProfiles.FormTemplate
  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.ClientProfiles.ProfileFieldValue
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec get_or_create_profile(String.t(), String.t()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def get_or_create_profile(business_id, client_id) do
    with {:ok, client} <- get_client(business_id, client_id) do
      case ClientProfile |> ClientProfile.for_business(business_id) |> ClientProfile.for_client(client.id) |> Repo.one() do
        nil ->
          business_id
          |> ClientProfile.insert_changeset(client.id)
          |> Repo.insert()

        %ClientProfile{} = profile ->
          {:ok, profile}
      end
    end
  end

  @spec update_profile(String.t(), String.t(), map()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile(business_id, client_id, attrs) do
    with {:ok, profile} <- get_or_create_profile(business_id, client_id) do
      profile
      |> ClientProfile.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec list_profile_fields(String.t()) :: {:ok, [ProfileFieldDefinition.t()]}
  def list_profile_fields(business_id) do
    fields =
      ProfileFieldDefinition
      |> ProfileFieldDefinition.for_business(business_id)
      |> ProfileFieldDefinition.active()
      |> ProfileFieldDefinition.ordered()
      |> Repo.all()

    {:ok, fields}
  end

  @spec create_profile_field(String.t(), map()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, Ecto.Changeset.t()}
  def create_profile_field(business_id, attrs) do
    business_id
    |> ProfileFieldDefinition.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec update_profile_field(String.t(), String.t(), map()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile_field(business_id, field_id, attrs) do
    with {:ok, field} <- get_profile_field(business_id, field_id) do
      field
      |> ProfileFieldDefinition.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec archive_profile_field(String.t(), String.t()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_profile_field(business_id, field_id) do
    update_profile_field(business_id, field_id, %{archived_at: DateTime.utc_now(:second)})
  end

  @spec upsert_profile_field_value(String.t(), String.t(), String.t(), any(), map()) ::
          {:ok, ProfileFieldValue.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def upsert_profile_field_value(business_id, client_id, field_id, value, actor) do
    with {:ok, _client} <- get_client(business_id, client_id),
         {:ok, field} <- get_profile_field(business_id, field_id) do
      attrs = %{
        "value" => %{"value" => value},
        "updated_by_type" => actor.type,
        "updated_by_id" => actor.id,
        "updated_from_submission_id" => actor.submission_id
      }

      case get_profile_field_value(business_id, client_id, field.id) do
        nil ->
          business_id
          |> ProfileFieldValue.insert_changeset(client_id, field.id, attrs)
          |> Repo.insert()

        %ProfileFieldValue{} = existing ->
          existing
          |> ProfileFieldValue.update_changeset(attrs)
          |> Repo.update()
      end
    end
  end

  @spec list_form_templates(String.t()) :: {:ok, [FormTemplate.t()]}
  def list_form_templates(business_id) do
    templates =
      FormTemplate
      |> FormTemplate.for_business(business_id)
      |> FormTemplate.ordered()
      |> Repo.all()

    {:ok, templates}
  end

  @spec create_form_template(String.t(), map()) ::
          {:ok, FormTemplate.t()} | {:error, Ecto.Changeset.t()}
  def create_form_template(business_id, attrs) do
    business_id
    |> FormTemplate.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec update_form_template(String.t(), String.t(), map()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_form_template(business_id, template_id, attrs) do
    with {:ok, template} <- get_form_template(business_id, template_id) do
      template
      |> FormTemplate.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_form_template(String.t(), String.t()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_form_template(business_id, template_id) do
    with {:ok, template} <- get_form_template(business_id, template_id) do
      Repo.delete(template)
    end
  end

  @spec assign_form_template(String.t(), String.t(), String.t(), map()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_form_template(business_id, template_id, client_id, attrs) do
    with {:ok, template} <- get_form_template(business_id, template_id),
         {:ok, client} <- get_client(business_id, client_id) do
      attrs =
        attrs
        |> Map.put_new("purpose", template.purpose)
        |> Map.put_new("priority", "normal")

      business_id
      |> FormAssignment.insert_changeset(client.id, template.id, attrs)
      |> Repo.insert()
    end
  end

  @spec list_form_assignments_for_client(String.t(), String.t()) ::
          {:ok, [FormAssignment.t()]} | {:error, :not_found}
  def list_form_assignments_for_client(business_id, client_id) do
    with {:ok, _client} <- get_client(business_id, client_id) do
      assignments =
        FormAssignment
        |> FormAssignment.for_business(business_id)
        |> FormAssignment.for_client(client_id)
        |> FormAssignment.with_template()
        |> FormAssignment.ordered()
        |> Repo.all()

      {:ok, assignments}
    end
  end

  @spec update_form_assignment(String.t(), String.t(), map()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_form_assignment(business_id, assignment_id, attrs) do
    with {:ok, assignment} <- get_form_assignment(business_id, assignment_id) do
      assignment
      |> FormAssignment.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec submit_form_assignment(String.t(), String.t(), String.t(), map()) ::
          {:ok, FormSubmission.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def submit_form_assignment(business_id, client_id, assignment_id, attrs) do
    with {:ok, assignment} <- get_client_form_assignment(business_id, client_id, assignment_id) do
      Repo.transaction(fn ->
        template = Repo.preload(assignment, :form_template).form_template
        answers = Map.get(attrs, "answers", %{})

        submission_attrs = %{
          "question_snapshot" => template.sections,
          "answers" => answers,
          "submitted_by_type" => "client",
          "submitted_by_id" => client_id,
          "submitted_at" => DateTime.utc_now(:second)
        }

        submission =
          case FormSubmission.insert_changeset(business_id, client_id, assignment.id, submission_attrs)
               |> Repo.insert() do
            {:ok, submission} -> submission
            {:error, reason} -> Repo.rollback(reason)
          end

        apply_profile_mappings!(business_id, client_id, template.sections, answers, submission)

        case assignment |> FormAssignment.update_changeset(%{"status" => "completed", "completed_at" => DateTime.utc_now(:second)}) |> Repo.update() do
          {:ok, _assignment} -> submission
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end
  end

  defp apply_profile_mappings!(business_id, client_id, sections, answers, submission) do
    Enum.each(sections, fn section ->
      section
      |> Map.get("questions", [])
      |> Enum.each(fn question ->
        mapping = Map.get(question, "profile_mapping")
        question_id = Map.get(question, "id")
        answer = Map.get(answers, question_id)

        if mapping && not is_nil(answer) do
          apply_profile_mapping!(business_id, client_id, mapping, answer, submission)
        end
      end)
    end)
  end

  defp apply_profile_mapping!(business_id, client_id, %{"kind" => "core", "section" => section, "field" => field}, answer, _submission) do
    with {:ok, section_key} <- core_profile_section(section),
         {:ok, profile} <- get_or_create_profile(business_id, client_id) do
      current = Map.get(profile, section_key) || %{}
      attrs = %{Atom.to_string(section_key) => Map.put(current, field, answer)}

      case update_profile(business_id, client_id, attrs) do
        {:ok, _profile} -> :ok
        {:error, reason} -> Repo.rollback(reason)
      end
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp core_profile_section("general"), do: {:ok, :general}
  defp core_profile_section("nutrition"), do: {:ok, :nutrition}
  defp core_profile_section("training"), do: {:ok, :training}
  defp core_profile_section("lifestyle"), do: {:ok, :lifestyle}
  defp core_profile_section(_), do: {:error, :invalid_profile_mapping}

  defp apply_profile_mapping!(business_id, client_id, %{"kind" => "custom_field", "field_key" => field_key}, answer, submission) do
    case get_profile_field_by_key(business_id, field_key) do
      {:ok, field} ->
        actor = %{type: "client", id: client_id, submission_id: submission.id}

        case upsert_profile_field_value(business_id, client_id, field.id, answer, actor) do
          {:ok, _value} -> :ok
          {:error, reason} -> Repo.rollback(reason)
        end

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp get_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp get_profile_field(business_id, field_id) do
    ProfileFieldDefinition
    |> ProfileFieldDefinition.for_business(business_id)
    |> Repo.get(field_id)
    |> ok_or_not_found()
  end

  defp get_profile_field_by_key(business_id, key) do
    ProfileFieldDefinition
    |> ProfileFieldDefinition.for_business(business_id)
    |> where([f], f.key == ^key and is_nil(f.archived_at))
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_profile_field_value(business_id, client_id, field_id) do
    ProfileFieldValue
    |> ProfileFieldValue.for_business(business_id)
    |> ProfileFieldValue.for_client(client_id)
    |> where([v], v.profile_field_definition_id == ^field_id)
    |> Repo.one()
  end

  defp get_form_template(business_id, template_id) do
    FormTemplate
    |> FormTemplate.for_business(business_id)
    |> Repo.get(template_id)
    |> ok_or_not_found()
  end

  defp get_form_assignment(business_id, assignment_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> FormAssignment.with_template()
    |> Repo.get(assignment_id)
    |> ok_or_not_found()
  end

  defp get_client_form_assignment(business_id, client_id, assignment_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> FormAssignment.for_client(client_id)
    |> FormAssignment.with_template()
    |> Repo.get(assignment_id)
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
```

- [ ] **Step 2: Run context tests**

Run:

```bash
cd backend && mix test test/easy/client_profiles_test.exs
```

Expected: pass.

- [ ] **Step 3: Commit context**

```bash
git add backend/lib/easy/client_profiles.ex backend/test/easy/client_profiles_test.exs
git commit -m "feat: add client profiles context"
```

---

## Task 3: Add profile endpoints

**Files:**
* Create: `backend/lib/easy_web/controllers/coaches/client_profile_controller.ex`
* Create: `backend/lib/easy_web/controllers/coaches/client_profile_json.ex`
* Create: `backend/lib/easy_web/controllers/clients/client_profile_controller.ex`
* Create: `backend/lib/easy_web/controllers/clients/client_profile_json.ex`
* Create: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Modify: `backend/lib/easy_web/router.ex`
* Test: `backend/test/easy_web/controllers/coaches/client_profile_controller_test.exs`
* Test: `backend/test/easy_web/controllers/clients/client_profile_controller_test.exs`

- [ ] **Step 1: Write endpoint tests**

Create `backend/test/easy_web/controllers/coaches/client_profile_controller_test.exs`:

```elixir
defmodule EasyWeb.Coaches.ClientProfileControllerTest do
  use Easy.ConnCase

  describe "GET /v1/coach/clients/:client_id/profile" do
    test "returns profile for client in coach business" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach)
      conn = build_conn() |> authenticate_coach(coach)

      conn = get(conn, "/v1/coach/clients/#{client.id}/profile")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["client_id"] == client.id
      assert data["nutrition"] == %{}
      assert data["training"] == %{}
      assert data["intake_status"] == "assigned"
    end

    test "returns 404 for other business client" do
      coach = insert(:coach)
      other_client = insert(:client)
      conn = build_conn() |> authenticate_coach(coach)

      conn = get(conn, "/v1/coach/clients/#{other_client.id}/profile")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/clients/:client_id/profile" do
    test "updates structured sections" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach)
      conn = build_conn() |> authenticate_coach(coach)

      conn =
        patch(conn, "/v1/coach/clients/#{client.id}/profile", %{
          "nutrition" => %{"goal" => "fat_loss", "meal_count" => 4},
          "training" => %{"days_per_week" => 5}
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["nutrition"]["goal"] == "fat_loss"
      assert data["training"]["days_per_week"] == 5
    end
  end
end
```

Create `backend/test/easy_web/controllers/clients/client_profile_controller_test.exs`:

```elixir
defmodule EasyWeb.Clients.ClientProfileControllerTest do
  use Easy.ConnCase

  describe "GET /v1/client/profile" do
    test "returns authenticated client profile" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      conn = build_conn() |> authenticate_client(client)

      conn = get(conn, "/v1/client/profile")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["client_id"] == client.id
      refute Map.has_key?(data, "business_id")
    end
  end

  describe "PATCH /v1/client/profile" do
    test "updates authenticated client profile sections" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      conn = build_conn() |> authenticate_client(client)

      conn =
        patch(conn, "/v1/client/profile", %{
          "lifestyle" => %{"sleep_hours" => 7},
          "nutrition" => %{"eating_out_frequency" => "weekly"}
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["lifestyle"]["sleep_hours"] == 7
      assert data["nutrition"]["eating_out_frequency"] == "weekly"
    end
  end
end
```

- [ ] **Step 2: Run endpoint tests to verify they fail**

Run:

```bash
cd backend && mix test test/easy_web/controllers/coaches/client_profile_controller_test.exs test/easy_web/controllers/clients/client_profile_controller_test.exs
```

Expected: fail with route/controller missing.

- [ ] **Step 3: Add controllers and JSON renderers**

Create coach controller:

```elixir
defmodule EasyWeb.Coaches.ClientProfileController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.ClientProfiles
  alias EasyWeb.OpenApi.Schemas.{ClientProfileRequest, ClientProfileResponse, ErrorResponse}

  tags ["coach client profiles"]

  operation :show,
    summary: "Get client profile",
    operation_id: "getCoachClientProfile",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Client profile", "application/json", ClientProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update client profile",
    operation_id: "updateCoachClientProfile",
    security: [%{"bearerAuth" => []}],
    request_body: {"Client profile request", "application/json", ClientProfileRequest, required: true},
    responses: [
      ok: {"Client profile", "application/json", ClientProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"client_id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, profile} <- ClientProfiles.get_or_create_profile(business_id, client_id) do
      render(conn, :show, profile: profile, include_business_id: true)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"client_id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, profile} <- ClientProfiles.update_profile(business_id, client_id, conn.body_params) do
      render(conn, :show, profile: profile, include_business_id: true)
    end
  end
end
```

Create client controller with the same actions, resolving `client_id` through the existing `Easy.Clients.get_client_for_user/2`.

Create renderers that output:

```elixir
data = %{
  id: profile.id,
  client_id: profile.client_id,
  general: profile.general,
  nutrition: profile.nutrition,
  training: profile.training,
  lifestyle: profile.lifestyle,
  intake_status: profile.intake_status,
  intake_completed_at: profile.intake_completed_at,
  inserted_at: profile.inserted_at,
  updated_at: profile.updated_at
}

if include_business_id do
  Map.put(data, :business_id, profile.business_id)
else
  data
end
```

- [ ] **Step 4: Add OpenAPI schemas**

Create `backend/lib/easy_web/open_api/schemas/client_profile.ex` with `ClientProfileRequest`, `ClientProfile`, and `ClientProfileResponse`. Use `additionalProperties: false` for request root and object maps for the four sections:

```elixir
properties: %{
  general: %Schema{type: :object, additionalProperties: true},
  nutrition: %Schema{type: :object, additionalProperties: true},
  training: %Schema{type: :object, additionalProperties: true},
  lifestyle: %Schema{type: :object, additionalProperties: true},
  intake_status: %Schema{type: :string, enum: ["assigned", "in_progress", "completed", "dismissed"]}
}
```

- [ ] **Step 5: Add routes**

In `backend/lib/easy_web/router.ex`, add coach routes in the coach scope:

```elixir
get "/clients/:client_id/profile", ClientProfileController, :show
patch "/clients/:client_id/profile", ClientProfileController, :update
```

Add client routes in the client scope:

```elixir
get "/profile", ClientProfileController, :show
patch "/profile", ClientProfileController, :update
```

- [ ] **Step 6: Run endpoint tests**

Run:

```bash
cd backend && mix test test/easy_web/controllers/coaches/client_profile_controller_test.exs test/easy_web/controllers/clients/client_profile_controller_test.exs
```

Expected: pass.

- [ ] **Step 7: Commit profile endpoints**

```bash
git add backend/lib/easy_web/controllers/coaches/client_profile_controller.ex backend/lib/easy_web/controllers/coaches/client_profile_json.ex backend/lib/easy_web/controllers/clients/client_profile_controller.ex backend/lib/easy_web/controllers/clients/client_profile_json.ex backend/lib/easy_web/open_api/schemas/client_profile.ex backend/lib/easy_web/router.ex backend/test/easy_web/controllers/coaches/client_profile_controller_test.exs backend/test/easy_web/controllers/clients/client_profile_controller_test.exs
git commit -m "feat: add client profile endpoints"
```

---

## Task 4: Add profile field endpoints

**Files:**
* Create: `backend/lib/easy_web/controllers/coaches/profile_field_controller.ex`
* Create: `backend/lib/easy_web/controllers/coaches/profile_field_json.ex`
* Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Modify: `backend/lib/easy_web/router.ex`
* Test: `backend/test/easy_web/controllers/coaches/profile_field_controller_test.exs`

- [ ] **Step 1: Write endpoint tests**

Create tests for:

* `GET /v1/coach/profile-fields` lists fields in the coach business.
* `POST /v1/coach/profile-fields` creates a select field.
* `POST /v1/coach/profile-fields` rejects filterable text fields with 422.
* `PATCH /v1/coach/profile-fields/:id` updates label/options.
* `DELETE /v1/coach/profile-fields/:id` archives field and removes it from list.

Use this representative test:

```elixir
test "creates a filterable select field", %{conn: conn} do
  conn =
    post(conn, "/v1/coach/profile-fields", %{
      "section" => "nutrition",
      "label" => "Meal prep ability",
      "key" => "meal_prep_ability",
      "field_type" => "select",
      "options" => ["low", "medium", "high"],
      "filterable" => true
    })

  assert %{"data" => data} = json_response(conn, 201)
  assert data["key"] == "meal_prep_ability"
  assert data["filterable"] == true
end
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd backend && mix test test/easy_web/controllers/coaches/profile_field_controller_test.exs
```

Expected: fail with missing controller/routes.

- [ ] **Step 3: Add controller**

Create actions `index`, `create`, `update`, and `delete`. `delete` calls `ClientProfiles.archive_profile_field/2` and returns no content.

Use operation IDs:

```text
listProfileFields
createProfileField
updateProfileField
deleteProfileField
```

- [ ] **Step 4: Add JSON renderer**

Render fields as:

```elixir
%{
  id: field.id,
  section: field.section,
  label: field.label,
  key: field.key,
  field_type: field.field_type,
  options: field.options,
  filterable: field.filterable,
  archived_at: field.archived_at,
  inserted_at: field.inserted_at,
  updated_at: field.updated_at
}
```

- [ ] **Step 5: Add routes**

In coach scope:

```elixir
get "/profile-fields", ProfileFieldController, :index
post "/profile-fields", ProfileFieldController, :create
patch "/profile-fields/:id", ProfileFieldController, :update
delete "/profile-fields/:id", ProfileFieldController, :delete
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd backend && mix test test/easy_web/controllers/coaches/profile_field_controller_test.exs
```

Expected: pass.

- [ ] **Step 7: Commit profile field endpoints**

```bash
git add backend/lib/easy_web/controllers/coaches/profile_field_controller.ex backend/lib/easy_web/controllers/coaches/profile_field_json.ex backend/lib/easy_web/open_api/schemas/client_profile.ex backend/lib/easy_web/router.ex backend/test/easy_web/controllers/coaches/profile_field_controller_test.exs
git commit -m "feat: add profile field endpoints"
```

---

## Task 5: Add form template and assignment endpoints

**Files:**
* Create: `backend/lib/easy_web/controllers/coaches/form_template_controller.ex`
* Create: `backend/lib/easy_web/controllers/coaches/form_template_json.ex`
* Create: `backend/lib/easy_web/controllers/coaches/form_assignment_controller.ex`
* Create: `backend/lib/easy_web/controllers/coaches/form_assignment_json.ex`
* Create: `backend/lib/easy_web/controllers/clients/form_assignment_controller.ex`
* Create: `backend/lib/easy_web/controllers/clients/form_assignment_json.ex`
* Modify: `backend/lib/easy_web/open_api/schemas/client_profile.ex`
* Modify: `backend/lib/easy_web/router.ex`
* Test: `backend/test/easy_web/controllers/coaches/form_template_controller_test.exs`
* Test: `backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs`

- [ ] **Step 1: Write coach endpoint tests**

Create tests for:

* create template
* list templates
* show template
* update template
* delete template
* assign template to client
* list assigned forms for a client

Representative assignment test:

```elixir
test "assigns a template to a client", %{conn: conn, coach: coach} do
  client = insert(:client, business: coach.business, creator: coach)
  template = insert(:form_template, business: coach.business)

  conn =
    post(conn, "/v1/coach/form-templates/#{template.id}/assign", %{
      "client_id" => client.id,
      "priority" => "high"
    })

  assert %{"data" => data} = json_response(conn, 201)
  assert data["client_id"] == client.id
  assert data["form_template_id"] == template.id
  assert data["purpose"] == "intake"
  assert data["priority"] == "high"
  assert data["status"] == "assigned"
end
```

- [ ] **Step 2: Write client endpoint tests**

Create tests for:

* `GET /v1/client/form-assignments` lists only authenticated client's assignments.
* `GET /v1/client/form-assignments/:id` returns one assignment.
* `POST /v1/client/form-assignments/:id/submit` stores submission, completes assignment, maps answers into profile/custom fields.

Representative submission test:

```elixir
test "submits assignment and updates custom profile value" do
  coach = insert(:coach)
  client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
  field = insert(:profile_field_definition, business: coach.business, key: "meal_prep_ability")
  template = insert(:form_template, business: coach.business)
  assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
  conn = build_conn() |> authenticate_client(client)

  conn =
    post(conn, "/v1/client/form-assignments/#{assignment.id}/submit", %{
      "answers" => %{"meal_prep_ability" => "high"}
    })

  assert %{"data" => data} = json_response(conn, 201)
  assert data["answers"]["meal_prep_ability"] == "high"

  value =
    Easy.ClientProfiles.ProfileFieldValue
    |> Easy.ClientProfiles.ProfileFieldValue.for_business(coach.business_id)
    |> Easy.ClientProfiles.ProfileFieldValue.for_client(client.id)
    |> Easy.Repo.one!()

  assert value.profile_field_definition_id == field.id
  assert value.value == %{"value" => "high"}
end
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
cd backend && mix test test/easy_web/controllers/coaches/form_template_controller_test.exs test/easy_web/controllers/clients/form_assignment_controller_test.exs
```

Expected: fail with missing controllers/routes.

- [ ] **Step 4: Add controllers and renderers**

Implement coach `FormTemplateController` actions:

```text
index
create
show
update
delete
assign
```

Implement coach `FormAssignmentController` actions:

```text
index
update
```

Implement client `FormAssignmentController` actions:

```text
index
show
submit
```

Render template fields:

```text
id, name, purpose, sections, status, inserted_at, updated_at
```

Render assignment fields:

```text
id, client_id, form_template_id, purpose, priority, status, due_date, completed_at, form_template, inserted_at, updated_at
```

Render submission fields:

```text
id, form_assignment_id, question_snapshot, answers, submitted_by_type, submitted_at, inserted_at
```

- [ ] **Step 5: Add routes**

Coach scope:

```elixir
get "/form-templates", FormTemplateController, :index
post "/form-templates", FormTemplateController, :create
get "/form-templates/:id", FormTemplateController, :show
patch "/form-templates/:id", FormTemplateController, :update
delete "/form-templates/:id", FormTemplateController, :delete
post "/form-templates/:id/assign", FormTemplateController, :assign
get "/clients/:client_id/form-assignments", FormAssignmentController, :index
patch "/form-assignments/:id", FormAssignmentController, :update
```

Client scope:

```elixir
get "/form-assignments", FormAssignmentController, :index
get "/form-assignments/:id", FormAssignmentController, :show
post "/form-assignments/:id/submit", FormAssignmentController, :submit
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd backend && mix test test/easy_web/controllers/coaches/form_template_controller_test.exs test/easy_web/controllers/clients/form_assignment_controller_test.exs
```

Expected: pass.

- [ ] **Step 7: Commit form endpoints**

```bash
git add backend/lib/easy_web/controllers/coaches/form_template_controller.ex backend/lib/easy_web/controllers/coaches/form_template_json.ex backend/lib/easy_web/controllers/coaches/form_assignment_controller.ex backend/lib/easy_web/controllers/coaches/form_assignment_json.ex backend/lib/easy_web/controllers/clients/form_assignment_controller.ex backend/lib/easy_web/controllers/clients/form_assignment_json.ex backend/lib/easy_web/open_api/schemas/client_profile.ex backend/lib/easy_web/router.ex backend/test/easy_web/controllers/coaches/form_template_controller_test.exs backend/test/easy_web/controllers/clients/form_assignment_controller_test.exs
git commit -m "feat: add form assignment endpoints"
```

---

## Task 6: Add profile filters to client list

**Files:**
* Modify: `backend/lib/easy/clients.ex`
* Modify: `backend/lib/easy_web/controllers/coaches/client_controller.ex`
* Modify: `backend/test/easy_web/controllers/coaches/client_controller_test.exs`

- [ ] **Step 1: Write failing filter tests**

Add tests:

```elixir
test "filters clients by core profile field", %{conn: conn, coach: coach, business: business} do
  matching = insert(:client, creator: coach, business: business)
  other = insert(:client, creator: coach, business: business)

  insert(:client_profile, business: business, client: matching, nutrition: %{"goal" => "fat_loss"})
  insert(:client_profile, business: business, client: other, nutrition: %{"goal" => "maintenance"})

  conn = get(conn, "/v1/coach/clients", %{"profile_filter" => %{"nutrition" => %{"goal" => "fat_loss"}}})
  assert %{"data" => [data]} = json_response(conn, 200)
  assert data["id"] == matching.id
end

test "filters clients by filterable custom field", %{conn: conn, coach: coach, business: business} do
  matching = insert(:client, creator: coach, business: business)
  other = insert(:client, creator: coach, business: business)
  field = insert(:profile_field_definition, business: business, key: "meal_prep_ability", filterable: true)

  insert(:profile_field_value, business: business, client: matching, profile_field_definition: field, value: %{"value" => "high"})
  insert(:profile_field_value, business: business, client: other, profile_field_definition: field, value: %{"value" => "low"})

  conn = get(conn, "/v1/coach/clients", %{"profile_filter" => %{"custom" => %{"meal_prep_ability" => "high"}}})
  assert %{"data" => [data]} = json_response(conn, 200)
  assert data["id"] == matching.id
end
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd backend && mix test test/easy_web/controllers/coaches/client_controller_test.exs
```

Expected: profile filter tests fail.

- [ ] **Step 3: Add filtering query**

Change `Clients.list_clients/5` to accept an optional sixth `profile_filter` parameter:

```elixir
@spec list_clients(String.t(), String.t(), String.t() | nil, non_neg_integer(), pos_integer(), map()) ::
        {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
def list_clients(business_id, search, status, offset, limit, profile_filter \\ %{}) do
  base =
    Client
    |> Client.for_business(business_id)
    |> Client.search(search)
    |> Client.with_status(status)
    |> apply_profile_filters(business_id, profile_filter)
```

Add these helpers in `Easy.Clients`:

```elixir
defp apply_profile_filters(query, _business_id, nil), do: query
defp apply_profile_filters(query, _business_id, filter) when filter == %{}, do: query

defp apply_profile_filters(query, business_id, profile_filter) when is_map(profile_filter) do
  query
  |> apply_core_profile_filters(business_id, profile_filter)
  |> apply_custom_profile_filters(business_id, Map.get(profile_filter, "custom", %{}))
end

defp apply_profile_filters(query, _business_id, _profile_filter), do: query

defp apply_core_profile_filters(query, business_id, profile_filter) do
  Enum.reduce(["general", "nutrition", "training", "lifestyle"], query, fn section, acc ->
    section_filters = Map.get(profile_filter, section, %{})

    if is_map(section_filters) do
      Enum.reduce(section_filters, acc, fn {field, value}, section_acc ->
        apply_core_profile_filter(section_acc, business_id, section, field, value)
      end)
    else
      acc
    end
  end)
end

defp apply_core_profile_filter(query, business_id, "general", field, value) do
  from c in query,
    where:
      fragment(
        "EXISTS (SELECT 1 FROM client_profiles cp WHERE cp.client_id = ? AND cp.business_id = ? AND cp.general ->> ? = ?)",
        c.id,
        ^business_id,
        ^field,
        ^to_string(value)
      )
end

defp apply_core_profile_filter(query, business_id, "nutrition", field, value) do
  from c in query,
    where:
      fragment(
        "EXISTS (SELECT 1 FROM client_profiles cp WHERE cp.client_id = ? AND cp.business_id = ? AND cp.nutrition ->> ? = ?)",
        c.id,
        ^business_id,
        ^field,
        ^to_string(value)
      )
end

defp apply_core_profile_filter(query, business_id, "training", field, value) do
  from c in query,
    where:
      fragment(
        "EXISTS (SELECT 1 FROM client_profiles cp WHERE cp.client_id = ? AND cp.business_id = ? AND cp.training ->> ? = ?)",
        c.id,
        ^business_id,
        ^field,
        ^to_string(value)
      )
end

defp apply_core_profile_filter(query, business_id, "lifestyle", field, value) do
  from c in query,
    where:
      fragment(
        "EXISTS (SELECT 1 FROM client_profiles cp WHERE cp.client_id = ? AND cp.business_id = ? AND cp.lifestyle ->> ? = ?)",
        c.id,
        ^business_id,
        ^field,
        ^to_string(value)
      )
end

defp apply_core_profile_filter(query, _business_id, _section, _field, _value), do: query

defp apply_custom_profile_filters(query, _business_id, custom_filters) when custom_filters in [nil, %{}],
  do: query

defp apply_custom_profile_filters(query, business_id, custom_filters) when is_map(custom_filters) do
  Enum.reduce(custom_filters, query, fn {field_key, value}, acc ->
    from c in acc,
      where:
        fragment(
          """
          EXISTS (
            SELECT 1
            FROM profile_field_values pfv
            JOIN profile_field_definitions pfd ON pfd.id = pfv.profile_field_definition_id
            WHERE pfv.client_id = ?
              AND pfv.business_id = ?
              AND pfd.business_id = ?
              AND pfd.key = ?
              AND pfd.filterable = true
              AND pfd.archived_at IS NULL
              AND pfv.value ->> 'value' = ?
          )
          """,
          c.id,
          ^business_id,
          ^business_id,
          ^field_key,
          ^to_string(value)
        )
  end)
end

defp apply_custom_profile_filters(query, _business_id, _custom_filters), do: query
```

- [ ] **Step 4: Wire controller param**

In `ClientController.index/2`:

```elixir
profile_filter = Map.get(params, "profile_filter", %{})
Clients.list_clients(business_id, search_term, status, offset, limit, profile_filter)
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd backend && mix test test/easy_web/controllers/coaches/client_controller_test.exs
```

Expected: pass.

- [ ] **Step 6: Commit filters**

```bash
git add backend/lib/easy/clients.ex backend/lib/easy_web/controllers/coaches/client_controller.ex backend/test/easy_web/controllers/coaches/client_controller_test.exs
git commit -m "feat: filter clients by profile"
```

---

## Task 7: Final verification

**Files:**
* Verify all files touched in this plan.

- [ ] **Step 1: Run focused tests**

Run:

```bash
cd backend && mix test test/easy/client_profiles_test.exs test/easy_web/controllers/coaches/client_profile_controller_test.exs test/easy_web/controllers/coaches/profile_field_controller_test.exs test/easy_web/controllers/coaches/form_template_controller_test.exs test/easy_web/controllers/clients/client_profile_controller_test.exs test/easy_web/controllers/clients/form_assignment_controller_test.exs test/easy_web/controllers/coaches/client_controller_test.exs
```

Expected: all pass.

- [ ] **Step 2: Compile with warnings as errors**

Run:

```bash
cd backend && mix compile --warnings-as-errors
```

Expected: exit 0.

- [ ] **Step 3: Verify generated OpenAPI can build**

Run:

```bash
cd backend && mix run --no-start -e 'EasyWeb.ApiSpec.spec() |> OpenApiSpex.OpenApi.to_map() |> Map.fetch!(:paths) |> Map.keys() |> Enum.filter(&String.contains?(&1, "profile")) |> IO.inspect()'
```

Expected output includes:

```text
"/v1/coach/clients/{client_id}/profile"
"/v1/coach/profile-fields"
"/v1/client/profile"
```

- [ ] **Step 4: Check staged diff hygiene**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. Status shows only files intentionally changed by this plan.

- [ ] **Step 5: Commit final verification note if needed**

If previous tasks were committed separately and no files remain changed, do not create an empty commit. If a verification-only fix was required, commit it:

```bash
git add backend
git commit -m "test: verify profile forms backend"
```

---

## Self-review

Spec coverage:

* `client_profiles`: Task 1, Task 2, Task 3.
* `profile_field_definitions` and `profile_field_values`: Task 1, Task 2, Task 4, Task 6.
* `form_templates`, `form_assignments`, `form_submissions`: Task 1, Task 2, Task 5.
* no approval queue: Task 2 submission applies mappings and completes assignment.
* soft intake: represented by assignment/profile status, no route gate added.
* filterable custom fields: Task 1 validation and Task 6 filtering.

Intentional exclusions:

* nutrition tables and kebab-case nutrition endpoints
* threads
* generic attention endpoint
* UX flows
