defmodule Easy.Repo.Migrations.CreateTrainingPlans do
  use Ecto.Migration

  def change do
    create table(:training_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :is_template, :boolean, default: true, null: false
      add :status, :string, default: "active", null: false
      add :start_date, :date
      add :end_date, :date

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :author_id, references(:coaches, type: :binary_id, on_delete: :nothing), null: false
      add :client_id, references(:clients, type: :binary_id, on_delete: :nilify_all)

      add :original_template_id,
          references(:training_plans, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:training_plans, [:business_id])
    create index(:training_plans, [:business_id, :client_id])
    create index(:training_plans, [:original_template_id])

    create constraint(:training_plans, :valid_date_range,
             check: "end_date IS NULL OR start_date IS NULL OR end_date >= start_date"
           )

    create constraint(:training_plans, :assigned_plans_have_dates,
             check: "is_template = true OR (start_date IS NOT NULL AND end_date IS NOT NULL)"
           )
  end
end
