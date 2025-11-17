defmodule Easy.Repo.Migrations.CreateMeals do
  use Ecto.Migration

  def change do
    create table(:meals, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :daytime, :string, null: false
      add :day_number, :integer, null: false
      add :label, :string
      add :time, :time
      add :notes, :text

      add :nutrition_plan_id,
          references(:nutrition_plans, on_delete: :delete_all, type: :binary_id),
          null: false

      timestamps()
    end

    create index(:meals, [:nutrition_plan_id])
    create index(:meals, [:day_number])
    create index(:meals, [:daytime])
  end
end
