defmodule Easy.Repo.Migrations.CreateIngredients do
  use Ecto.Migration

  def change do
    create table(:ingredients, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :name, :string, size: 255, null: false
      add :description, :text

      # Nutritional values per 100g
      add :calories, :decimal, precision: 10, scale: 2, null: false, default: 0
      add :protein, :decimal, precision: 10, scale: 2, null: false, default: 0
      add :carbohydrates, :decimal, precision: 10, scale: 2, null: false, default: 0
      add :fats, :decimal, precision: 10, scale: 2, null: false, default: 0
      add :fiber, :decimal, precision: 10, scale: 2, null: false, default: 0

      # Metadata
      add :source, :string, size: 100
      add :status, :string, size: 20, null: false, default: "active"

      # Foreign keys
      add :business_id, references(:businesses, type: :uuid, on_delete: :nothing), null: false
      add :created_by_id, references(:coaches, type: :uuid, on_delete: :nothing), null: false

      timestamps()
    end

    # Indexes
    create index(:ingredients, [:business_id])
    create index(:ingredients, [:status])
    create index(:ingredients, [:name])
  end
end
