defmodule Easy.Repo.Migrations.CreateIngredients do
  use Ecto.Migration

  def change do
    create table(:ingredients, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :image_url, :string
      add :meta_info, :map, default: %{}

      add :business_id, references(:businesses, on_delete: :delete_all, type: :binary_id),
        null: false

      add :creator_id, references(:coaches, on_delete: :nilify_all, type: :binary_id)

      timestamps()
    end

    create index(:ingredients, [:business_id])
    create index(:ingredients, [:creator_id])
  end
end
