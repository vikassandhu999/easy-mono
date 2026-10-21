defmodule Easy.Repo.Migrations.CreateCoachNextSteps do
  use Ecto.Migration

  def change do
    create table(:coach_next_steps, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            on_delete: :delete_all
          ),
          null: false

      add :creator_id, references(:users, type: :binary_id, on_delete: :nilify_all)

      add :form_assignment_id,
          references(:form_assignments,
            type: :binary_id,
            with: [client_id: :client_id, business_id: :business_id]
          )

      add :description, :text, null: false
      add :due_on, :date, null: false
      add :source, :string, null: false, default: "manual"
      add :completed_at, :utc_datetime
      add :request_id, :binary_id
      timestamps(type: :utc_datetime)
    end

    create constraint(:coach_next_steps, :coach_next_steps_description_check,
             check: "length(btrim(description)) BETWEEN 1 AND 1000"
           )

    create constraint(:coach_next_steps, :coach_next_steps_source_check,
             check:
               "source IN ('manual', 'overdue_request') AND (source <> 'overdue_request' OR form_assignment_id IS NOT NULL)"
           )

    create unique_index(:coach_next_steps, [:business_id, :form_assignment_id],
             where: "source = 'overdue_request'",
             name: :coach_next_steps_overdue_occurrence_index
           )

    create unique_index(:coach_next_steps, [:business_id, :client_id, :request_id])

    create index(:coach_next_steps, [:business_id, :client_id, :due_on, :id],
             where: "completed_at IS NULL"
           )
  end
end
