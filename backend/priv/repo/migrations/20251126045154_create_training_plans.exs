defmodule Easy.Repo.Migrations.CreateTrainingPlans do
  use Ecto.Migration

  def change do
    create table(:training_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :is_template, :boolean, default: true, null: false
      add :duration_weeks, :integer

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :author_id, references(:coaches, type: :binary_id, on_delete: :restrict), null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all)

      add :original_template_id,
          references(:training_plans, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:training_plans, [:business_id])
    create index(:training_plans, [:author_id])
    create index(:training_plans, [:client_id])
    create index(:training_plans, [:is_template])
    create index(:training_plans, [:original_template_id])
  end
end
