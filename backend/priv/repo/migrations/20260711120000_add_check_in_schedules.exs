defmodule Easy.Repo.Migrations.AddCheckInSchedules do
  use Ecto.Migration

  def up do
    drop constraint(:form_templates, :form_templates_purpose_check)
    drop constraint(:form_assignments, :form_assignments_purpose_check)
    drop constraint(:form_assignments, :form_assignments_status_check)

    execute("UPDATE form_templates SET purpose = 'check_in' WHERE purpose <> 'intake'")
    execute("UPDATE form_assignments SET purpose = 'check_in' WHERE purpose <> 'intake'")

    create constraint(:form_templates, :form_templates_purpose_check,
             check: "purpose in ('intake','check_in')"
           )

    create constraint(:form_assignments, :form_assignments_purpose_check,
             check: "purpose in ('intake','check_in')"
           )

    create constraint(:form_assignments, :form_assignments_status_check,
             check: "status in ('assigned','in_progress','completed','dismissed','missed')"
           )

    create table(:check_in_schedules, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :frequency, :string, null: false
      add :next_due_on, :date, null: false
      add :active, :boolean, null: false, default: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :check_in_schedules_client_business_id_fkey
          ),
          null: false

      add :form_template_id,
          references(:form_templates,
            type: :binary_id,
            on_delete: :restrict,
            with: [business_id: :business_id],
            name: :check_in_schedules_template_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create constraint(:check_in_schedules, :check_in_schedules_frequency_check,
             check: "frequency in ('once','weekly','biweekly','monthly')"
           )

    create index(:check_in_schedules, [:business_id, :client_id, :next_due_on])

    create unique_index(:check_in_schedules, [:id, :business_id],
             name: :check_in_schedules_id_business_id_index
           )

    create unique_index(:check_in_schedules, [:client_id, :form_template_id],
             where: "active",
             name: :check_in_schedules_one_active_index
           )

    alter table(:form_assignments) do
      add :check_in_schedule_id,
          references(:check_in_schedules,
            type: :binary_id,
            on_delete: :restrict,
            with: [business_id: :business_id],
            name: :form_assignments_schedule_business_id_fkey
          )

      add :due_reminder_sent_at, :utc_datetime
      add :overdue_reminder_sent_at, :utc_datetime
    end

    create index(:form_assignments, [:business_id, :check_in_schedule_id])
  end

  def down do
    alter table(:form_assignments) do
      remove :overdue_reminder_sent_at
      remove :due_reminder_sent_at
      remove :check_in_schedule_id
    end

    drop table(:check_in_schedules)

    drop constraint(:form_templates, :form_templates_purpose_check)
    drop constraint(:form_assignments, :form_assignments_purpose_check)
    drop constraint(:form_assignments, :form_assignments_status_check)

    execute("UPDATE form_assignments SET status = 'dismissed' WHERE status = 'missed'")
    execute("UPDATE form_templates SET purpose = 'weekly_check_in' WHERE purpose = 'check_in'")
    execute("UPDATE form_assignments SET purpose = 'weekly_check_in' WHERE purpose = 'check_in'")

    create constraint(:form_templates, :form_templates_purpose_check,
             check:
               "purpose in ('intake','weekly_check_in','nutrition_update','training_update','custom')"
           )

    create constraint(:form_assignments, :form_assignments_purpose_check,
             check:
               "purpose in ('intake','weekly_check_in','nutrition_update','training_update','custom')"
           )

    create constraint(:form_assignments, :form_assignments_status_check,
             check: "status in ('assigned','in_progress','completed','dismissed')"
           )
  end
end
