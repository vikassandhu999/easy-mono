defmodule Easy.Repo.Migrations.CreateNutritionPlanItems do
  use Ecto.Migration

  def change do
    create table(:plan_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :day, :string, null: false
      add :meal_type, :string, null: false

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :meal_id, references(:meals, type: :binary_id, on_delete: :delete_all)
      add :plan_id, references(:plans, type: :binary_id, on_delete: :delete_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:plan_items, [:plan_id])
    create index(:plan_items, [:meal_id])
    create index(:plan_items, [:business_id])
  end
end
