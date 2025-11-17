defmodule Easy.Repo.Migrations.CreateRecipes do
  use Ecto.Migration

  def change do
    create table(:recipes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :instructions, {:array, :string}, default: []
      add :instructions_as_text, :text
      add :prep_time_minutes, :integer
      add :cook_time_minutes, :integer
      add :servings, :integer, default: 1
      add :total_calories, :decimal
      add :total_protein, :decimal
      add :total_carbs, :decimal
      add :total_fats, :decimal
      add :total_fiber, :decimal
      add :status, :string, null: false, default: "active"

      add :business_id, references(:businesses, on_delete: :delete_all, type: :binary_id),
        null: false

      add :creator_id, references(:coaches, on_delete: :nilify_all, type: :binary_id)

      timestamps()
    end

    create index(:recipes, [:business_id])
    create index(:recipes, [:creator_id])
    create index(:recipes, [:status])
  end
end
