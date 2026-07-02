defmodule Easy.Repo.Migrations.CreateClientProfilesFormsAndWeightEntries do
  use Ecto.Migration

  def change do
    create table(:weight_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :date, :date, null: false
      add :value, :decimal, precision: 5, scale: 2, null: false
      add :unit, :string, null: false
      add :note, :text

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:weight_entries, [:client_id, :date])
    create index(:weight_entries, [:business_id, :client_id, :date])

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

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :client_profiles_client_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create constraint(:client_profiles, :client_profiles_intake_status_check,
             check: "intake_status in ('assigned','in_progress','completed','dismissed')"
           )

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

    create constraint(:profile_field_definitions, :profile_field_definitions_section_check,
             check: "section in ('general','nutrition','training','lifestyle')"
           )

    create constraint(:profile_field_definitions, :profile_field_definitions_field_type_check,
             check: "field_type in ('text','number','boolean','date','select','multi_select')"
           )

    create constraint(
             :profile_field_definitions,
             :profile_field_definitions_filterable_field_type_check,
             check: "NOT (filterable = true AND field_type = 'text')"
           )

    create unique_index(:profile_field_definitions, [:business_id, :key],
             where: "archived_at IS NULL"
           )

    create unique_index(:profile_field_definitions, [:id, :business_id],
             name: :profile_field_definitions_id_business_id_index
           )

    create index(:profile_field_definitions, [:business_id, :section])

    create table(:profile_field_values, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :value, :map, null: false
      add :updated_by_type, :string, null: false
      add :updated_by_id, :binary_id
      add :updated_from_submission_id, :binary_id

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :profile_field_values_client_business_id_fkey
          ),
          null: false

      add :profile_field_definition_id,
          references(:profile_field_definitions,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :profile_field_values_definition_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create constraint(:profile_field_values, :profile_field_values_updated_by_type_check,
             check: "updated_by_type in ('coach','client','system')"
           )

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

    create constraint(:form_templates, :form_templates_purpose_check,
             check:
               "purpose in ('intake','weekly_check_in','nutrition_update','training_update','custom')"
           )

    create constraint(:form_templates, :form_templates_status_check,
             check: "status in ('active','archived')"
           )

    create index(:form_templates, [:business_id, :purpose])

    create unique_index(:form_templates, [:id, :business_id],
             name: :form_templates_id_business_id_index
           )

    create table(:form_assignments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :purpose, :string, null: false
      add :priority, :string, null: false, default: "normal"
      add :status, :string, null: false, default: "assigned"
      add :due_date, :date
      add :completed_at, :utc_datetime

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :form_assignments_client_business_id_fkey
          ),
          null: false

      add :form_template_id,
          references(:form_templates,
            type: :binary_id,
            on_delete: :restrict,
            with: [business_id: :business_id],
            name: :form_assignments_template_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create constraint(:form_assignments, :form_assignments_purpose_check,
             check:
               "purpose in ('intake','weekly_check_in','nutrition_update','training_update','custom')"
           )

    create constraint(:form_assignments, :form_assignments_priority_check,
             check: "priority in ('high','normal')"
           )

    create constraint(:form_assignments, :form_assignments_status_check,
             check: "status in ('assigned','in_progress','completed','dismissed')"
           )

    create index(:form_assignments, [:business_id, :client_id])
    create index(:form_assignments, [:business_id, :purpose, :status])

    create unique_index(:form_assignments, [:id, :client_id, :business_id],
             name: :form_assignments_id_client_id_business_id_index
           )

    create table(:form_submissions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :question_snapshot, {:array, :map}, default: [], null: false
      add :answers, :map, default: %{}, null: false
      add :submitted_by_type, :string, null: false
      add :submitted_by_id, :binary_id
      add :submitted_at, :utc_datetime, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :form_submissions_client_business_id_fkey
          ),
          null: false

      add :form_assignment_id,
          references(:form_assignments,
            type: :binary_id,
            on_delete: :delete_all,
            with: [client_id: :client_id, business_id: :business_id],
            name: :form_submissions_assignment_client_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create constraint(:form_submissions, :form_submissions_submitted_by_type_check,
             check: "submitted_by_type in ('coach','client','system')"
           )

    create index(:form_submissions, [:business_id, :client_id])
    create index(:form_submissions, [:form_assignment_id])
  end
end
