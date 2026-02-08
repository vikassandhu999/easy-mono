defmodule Easy.Repo.Migrations.CreateNutritionMeals do
  use Ecto.Migration

  def change do
    create table(:meals, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :macros, :jsonb, default: fragment("'{}'::jsonb")
      add :position, :integer, default: 0

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :plan_id, references(:plans, type: :binary_id, on_delete: :delete_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:meals, [:plan_id])
    create index(:meals, [:business_id])
    create unique_index(:meals, [:plan_id, :position])
  end
end
