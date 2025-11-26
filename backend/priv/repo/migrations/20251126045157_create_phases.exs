defmodule Easy.Repo.Migrations.CreatePhases do
  use Ecto.Migration

  def change do
    create table(:phases, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :goal, :string
      add :position, :integer, default: 0, null: false

      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:phases, [:training_plan_id])
    create index(:phases, [:position])
  end
end
