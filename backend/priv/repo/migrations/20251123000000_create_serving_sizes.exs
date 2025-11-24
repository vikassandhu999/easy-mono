defmodule Easy.Repo.Migrations.CreateServingSizes do
  use Ecto.Migration

  def change do
    create table(:serving_sizes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string
      add :type, :string
      add :gram_weight, :decimal
      add :ingredient_id, references(:ingredients, on_delete: :delete_all, type: :binary_id)

      timestamps()
    end

    create index(:serving_sizes, [:ingredient_id])
  end
end
