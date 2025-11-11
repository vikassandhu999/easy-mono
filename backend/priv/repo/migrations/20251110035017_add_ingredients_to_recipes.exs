defmodule Easy.Repo.Migrations.AddIngredientsToRecipes do
  use Ecto.Migration

  def change do
    alter table(:recipes) do
      add :ingredients, {:array, :string}, default: []
    end

    create index(:recipes, [:ingredients], using: :gin)
  end
end
