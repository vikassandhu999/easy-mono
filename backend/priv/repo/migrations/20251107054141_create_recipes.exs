defmodule Easy.Repo.Migrations.CreateRecipes do
  use Ecto.Migration

  def change do
    create table(:recipes, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :name, :string, size: 255, null: false
      add :description, :text
      add :instructions, :text
      add :prep_time_minutes, :integer
      add :servings, :integer, null: false, default: 1

      # Cached nutritional totals (calculated from ingredients)
      add :total_calories, :decimal, precision: 10, scale: 2
      add :total_protein, :decimal, precision: 10, scale: 2
      add :total_carbohydrates, :decimal, precision: 10, scale: 2
      add :total_fats, :decimal, precision: 10, scale: 2
      add :total_fiber, :decimal, precision: 10, scale: 2

      # Metadata
      add :status, :string, size: 20, null: false, default: "active"

      # Foreign keys
      add :business_id, references(:businesses, type: :uuid, on_delete: :nothing), null: false
      add :created_by_id, references(:coaches, type: :uuid, on_delete: :nothing), null: false

      timestamps()
    end

    # Indexes
    create index(:recipes, [:business_id])
    create index(:recipes, [:status])
    create index(:recipes, [:name])
  end
end
