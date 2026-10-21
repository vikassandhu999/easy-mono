defmodule Easy.Repo.Migrations.CreateFormsAndClientProgress do
  use Ecto.Migration

  def change do
    create table(:form_templates, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :name, :string, null: false
      add :purpose, :string, null: false
      add :sections, {:array, :map}, null: false, default: []
      add :status, :string, null: false, default: "active"
      add :system_key, :string
      add :system_version, :integer
      add :is_default_intake, :boolean, null: false, default: false
      add :revision, :integer, null: false, default: 1

      timestamps(type: :utc_datetime)
    end

    create index(:form_templates, [:business_id, :inserted_at, :id])
    create index(:form_templates, [:business_id, :purpose])
    create index(:form_templates, [:business_id, :status, :inserted_at, :id])

    create unique_index(:form_templates, [:business_id, :system_key],
             where: "system_key IS NOT NULL"
           )

    create unique_index(:form_templates, [:id, :business_id])

    create unique_index(:form_templates, [:business_id],
             name: :form_templates_one_default_intake_index,
             where: "is_default_intake"
           )

    create constraint(:form_templates, :form_templates_default_active_intake_check,
             check: "NOT is_default_intake OR (status = 'active' AND purpose = 'intake')"
           )

    create constraint(:form_templates, :form_templates_default_intake_purpose_check,
             check: "NOT is_default_intake OR purpose = 'intake'"
           )

    create constraint(:form_templates, :form_templates_purpose_check,
             check: "purpose in ('intake','check_in')"
           )

    create constraint(:form_templates, :form_templates_revision_check, check: "revision > 0")

    create constraint(:form_templates, :form_templates_status_check,
             check: "status in ('active','archived')"
           )

    create constraint(:form_templates, :form_templates_system_version_positive,
             check: "system_version IS NULL OR system_version > 0"
           )

    create table(:check_in_schedules, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :frequency, :string, null: false
      add :next_due_on, :date, null: false
      add :active, :boolean, null: false, default: true

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :check_in_schedules_client_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :form_template_id,
          references(:form_templates,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :check_in_schedules_template_business_id_fkey,
            on_delete: :restrict
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create index(:check_in_schedules, [:business_id, :client_id, :next_due_on])

    create index(:check_in_schedules, [:business_id, :client_id, "inserted_at DESC", "id DESC"],
             name: :check_in_schedules_client_cursor_index
           )

    create index(:check_in_schedules, [:next_due_on],
             name: :check_in_schedules_due_sweep_index,
             where: "active"
           )

    create unique_index(:check_in_schedules, [:id, :business_id])

    create unique_index(:check_in_schedules, [:client_id, :form_template_id],
             name: :check_in_schedules_one_active_index,
             where: "active"
           )

    create constraint(:check_in_schedules, :check_in_schedules_frequency_check,
             check: "frequency in ('once','weekly','biweekly','monthly')"
           )

    create table(:form_assignments, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :purpose, :string, null: false
      add :priority, :string, null: false, default: "normal"
      add :status, :string, null: false, default: "assigned"
      add :due_date, :date
      add :completed_at, :utc_datetime

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :form_assignments_client_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :form_template_id,
          references(:form_templates,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :form_assignments_template_business_id_fkey,
            on_delete: :restrict
          ),
          null: false

      add :check_in_schedule_id,
          references(:check_in_schedules,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :form_assignments_schedule_business_id_fkey,
            on_delete: :restrict
          )

      add :due_reminder_sent_at, :utc_datetime
      add :overdue_reminder_sent_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create index(:form_assignments, [:business_id, :check_in_schedule_id])
    create index(:form_assignments, [:business_id, :client_id])
    create index(:form_assignments, [:business_id, :purpose, :status])
    create unique_index(:form_assignments, [:id, :client_id, :business_id])

    create index(:form_assignments, [:purpose, :due_date],
             name: :form_assignments_reminder_sweep_index,
             where: "status IN ('assigned', 'in_progress')"
           )

    create constraint(:form_assignments, :form_assignments_priority_check,
             check: "priority in ('high','normal')"
           )

    create constraint(:form_assignments, :form_assignments_purpose_check,
             check: "purpose in ('intake','check_in')"
           )

    create constraint(:form_assignments, :form_assignments_status_check,
             check: "status in ('assigned','in_progress','completed','dismissed','missed')"
           )

    create table(:form_submissions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :question_snapshot, {:array, :map}, null: false, default: []
      add :answers, :map, null: false, default: %{}
      add :submitted_by_type, :string, null: false
      add :submitted_by_id, :binary_id
      add :submitted_at, :utc_datetime, null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :form_submissions_client_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :form_assignment_id,
          references(:form_assignments,
            type: :binary_id,
            with: [client_id: :client_id, business_id: :business_id],
            name: :form_submissions_assignment_client_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :reviewed_at, :utc_datetime
      add :reviewed_by_id, references(:users, type: :binary_id)

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:form_submissions, [:business_id, "inserted_at DESC", "id DESC"],
             name: :form_submissions_business_cursor_index
           )

    create index(:form_submissions, [:business_id, :client_id])
    create index(:form_submissions, [:business_id, :reviewed_at, :submitted_at])

    create index(:form_submissions, [:business_id, :client_id, "inserted_at DESC", "id DESC"],
             name: :form_submissions_client_cursor_index
           )

    create index(:form_submissions, [:form_assignment_id])
    create unique_index(:form_submissions, [:id, :client_id, :business_id])

    create constraint(:form_submissions, :form_submissions_submitted_by_type_check,
             check: "submitted_by_type in ('coach','client','system')"
           )

    create table(:weight_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :date, :date, null: false
      add :value, :decimal, null: false, precision: 5, scale: 2
      add :unit, :string, null: false
      add :note, :text
      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      add :form_submission_id,
          references(:form_submissions,
            type: :binary_id,
            with: [client_id: :client_id, business_id: :business_id],
            name: :weight_entries_submission_client_business_id_fkey,
            on_delete: :delete_all
          )

      add :revision, :integer, null: false, default: 1

      timestamps(type: :utc_datetime)
    end

    create index(:weight_entries, [:business_id, :client_id, :date])
    create index(:weight_entries, [:business_id, :client_id, :date, :inserted_at, :id])
    create index(:weight_entries, [:business_id, :client_id, :form_submission_id])
    create unique_index(:weight_entries, [:client_id, :date], where: "form_submission_id IS NULL")

    create constraint(:weight_entries, :weight_entries_positive_revision, check: "revision > 0")

    create table(:workbench_queue_snoozes, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :queue, :string, null: false
      add :snoozed_until, :date, null: false
      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:workbench_queue_snoozes, [:business_id, :client_id, :queue])

    create constraint(:workbench_queue_snoozes, :workbench_queue_snoozes_queue_check,
             check: "queue IN ('quiet', 'expiring')"
           )
  end
end
