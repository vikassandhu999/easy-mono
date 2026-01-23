defmodule Easy.Repo.Migrations.CreateRecipes do
  use Ecto.Migration

  def change do
    create table(:recipes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false

      add :macros, :jsonb, default: fragment("'{}'::jsonb")
      add :serving_sizes, {:array, :jsonb}, default: []

      add :source, :string
      add :category, :string
      add :tags, {:array, :string}, default: []

      add :instructions, :text
      add :image_url, :string

      add :cooked_weight_g, :float
      add :service_size_type, :string, default: "serving_based"

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:recipes, [:business_id])
    create index(:recipes, [:business_id, "lower(name)"])

    create table(:recipe_ingredients, primary_key: false) do
      add :recipe_id, references(:recipes, type: :binary_id, on_delete: :delete_all),
        primary_key: true

      add :food_id, references(:foods, type: :binary_id, on_delete: :nilify_all),
        primary_key: true

      add :weight_g, :float
      add :amount, :float
      add :unit, :string

      timestamps(type: :utc_datetime)
    end
  end
end
