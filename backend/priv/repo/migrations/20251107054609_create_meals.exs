defmodule Easy.Repo.Migrations.CreateMeals do
  use Ecto.Migration

  def change do
    create table(:meals, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :name, :string, size: 255, null: false
      add :description, :text
      add :meal_type, :string, size: 20, null: false
      add :notes, :text
      add :status, :string, size: 20, null: false, default: "active"

      # Cached nutritional totals (calculated from recipes + ingredients)
      add :total_calories, :decimal, precision: 10, scale: 2
      add :total_protein, :decimal, precision: 10, scale: 2
      add :total_carbohydrates, :decimal, precision: 10, scale: 2
      add :total_fats, :decimal, precision: 10, scale: 2
      add :total_fiber, :decimal, precision: 10, scale: 2

      # Foreign keys
      add :business_id, references(:businesses, type: :uuid, on_delete: :nothing), null: false
      add :created_by_id, references(:coaches, type: :uuid, on_delete: :nothing), null: false

      timestamps()
    end

    # Indexes
    create index(:meals, [:business_id])
    create index(:meals, [:status])
    create index(:meals, [:meal_type])
    create index(:meals, [:name])
  end
end
